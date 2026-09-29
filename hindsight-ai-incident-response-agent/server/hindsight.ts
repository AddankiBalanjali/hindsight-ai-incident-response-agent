import { HindsightClient } from '@vectorize-io/hindsight-client';
import { config } from './config';
import { HindsightMemoryRecord, SupportingMemoryCitation, ResolutionOutcome } from '../src/types';
import { SEED_HINDSIGHT_MEMORIES } from './seeds';

class HindsightMemoryService {
  private client: HindsightClient | null = null;
  private isConfigured: boolean = false;
  private connectionStatus: {
    status: 'connected' | 'not_configured' | 'error';
    message: string;
  } = { status: 'not_configured', message: 'Hindsight API Key not configured' };

  // Local memory cache / Demo bank for deterministic testing and fallback
  private memoryStore: Map<string, HindsightMemoryRecord> = new Map();

  constructor() {
    // Seed initial memories
    for (const mem of SEED_HINDSIGHT_MEMORIES) {
      this.memoryStore.set(mem.id, JSON.parse(JSON.stringify(mem)));
    }
  }

  public async init(): Promise<void> {
    if (!config.hindsight.isConfigured) {
      this.isConfigured = false;
      this.connectionStatus = {
        status: 'not_configured',
        message: 'HINDSIGHT_API_KEY missing. Active in DEMO MODE with seeded incident memory bank.',
      };
      return;
    }

    try {
      this.client = new HindsightClient({
        apiKey: config.hindsight.apiKey,
        baseUrl: config.hindsight.baseUrl,
      });

      this.isConfigured = true;
      this.connectionStatus = {
        status: 'connected',
        message: `Connected to Vectorize Hindsight API (Bank: ${config.hindsight.bankId})`,
      };
      console.log(`[Hindsight] Initialized client for bank: ${config.hindsight.bankId}`);
    } catch (err: any) {
      this.isConfigured = false;
      this.connectionStatus = {
        status: 'error',
        message: `Failed to initialize Hindsight client: ${err.message}`,
      };
      console.warn('[Hindsight] Initialization error:', err.message);
    }
  }

  public getStatus() {
    return {
      configured: this.isConfigured,
      mode: this.isConfigured ? ('vectorize_cloud' as const) : ('local_demo_bank' as const),
      bankId: config.hindsight.bankId,
      details: this.connectionStatus.message,
    };
  }

  /**
   * Retain an incident resolution experience in long-term memory
   */
  public async retainExperience(
    incidentId: string,
    serviceName: string,
    content: string,
    metadata: {
      severity: any;
      environment: string;
      outcome: ResolutionOutcome;
      rootCause: string;
    }
  ): Promise<HindsightMemoryRecord> {
    const memoryId = `MEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const record: HindsightMemoryRecord = {
      id: memoryId,
      bankId: config.hindsight.bankId,
      incidentId,
      serviceName,
      category: 'experience',
      content,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    };

    // Store in local bank (for instant query & demo fallback)
    this.memoryStore.set(record.id, record);

    // If official Hindsight API client is configured, send to Vectorize Hindsight
    if (this.isConfigured && this.client) {
      try {
        await this.client.retain(
          config.hindsight.bankId,
          content,
          {
            timestamp: new Date(),
            context: `Incident ${incidentId} resolution outcome: ${metadata.outcome}`,
            metadata: {
              incidentId,
              serviceName,
              severity: metadata.severity,
              outcome: metadata.outcome,
              rootCause: metadata.rootCause,
            },
            tags: [serviceName, metadata.environment, metadata.outcome, 'incident_resolution'],
          }
        );
        console.log(`[Hindsight] Retained experience in remote bank ${config.hindsight.bankId} for incident ${incidentId}`);
      } catch (err: any) {
        console.warn(`[Hindsight] Remote retain failed: ${err.message}. Retained in local bank.`);
      }
    }

    return record;
  }

  /**
   * Recall past relevant incident experiences matching symptoms or service queries.
   * Employs keyword / semantic matching. NEVER claims a past incident exists unless retrieved!
   */
  public async recallExperiences(query: string, limit: number = 3): Promise<SupportingMemoryCitation[]> {
    if (this.isConfigured && this.client) {
      try {
        const response: any = await this.client.recall(config.hindsight.bankId, query, {
          budget: 'mid',
        });

        // Parse official Hindsight recall response
        if (response && Array.isArray(response.results) && response.results.length > 0) {
          return response.results.slice(0, limit).map((r: any) => {
            const meta = r.metadata || {};
            return {
              incidentId: meta.incidentId || 'INC-HIST',
              summary: r.text || r.content || 'Historical incident pattern',
              resolution: meta.rootCause || r.text,
              outcome: (meta.outcome as ResolutionOutcome) || 'successful',
              similarityScore: Math.round((r.score || 0.85) * 100),
              timestamp: meta.timestamp || new Date().toISOString(),
            };
          });
        }
      } catch (err: any) {
        console.warn(`[Hindsight] Remote recall failed: ${err.message}. Falling back to local bank search.`);
      }
    }

    // Deterministic recall from local bank
    return this.recallFromLocalBank(query, limit);
  }

  /**
   * Deterministic local memory recall using term frequencies and keyword intersections
   */
  private recallFromLocalBank(query: string, limit: number): SupportingMemoryCitation[] {
    const qTerms = query.toLowerCase().split(/[\s,._-]+/).filter(t => t.length > 2);
    const scoredMemories: Array<{ record: HindsightMemoryRecord; score: number }> = [];

    for (const record of this.memoryStore.values()) {
      let score = 0;
      const textToSearch = `${record.content} ${record.serviceName} ${record.metadata.rootCause} ${record.metadata.outcome}`.toLowerCase();

      for (const term of qTerms) {
        if (textToSearch.includes(term)) {
          score += 15;
          // Exact token matches get extra weight
          if (new RegExp(`\\b${term}\\b`).test(textToSearch)) {
            score += 15;
          }
        }
      }

      // Bonus for domain keywords
      if (textToSearch.includes('connection pool') && query.toLowerCase().includes('pool')) score += 30;
      if (textToSearch.includes('mongodb') && query.toLowerCase().includes('mongo')) score += 25;
      if (textToSearch.includes('cursor') && query.toLowerCase().includes('cursor')) score += 25;
      if (textToSearch.includes('redis') && query.toLowerCase().includes('redis')) score += 30;
      if (textToSearch.includes('kafka') && query.toLowerCase().includes('kafka')) score += 30;

      if (score > 10) {
        // Normalize score between 60 and 96
        const normalized = Math.min(96, Math.max(62, Math.round(score)));
        scoredMemories.push({ record, score: normalized });
      }
    }

    // Sort descending by relevance score
    scoredMemories.sort((a, b) => b.score - a.score);

    return scoredMemories.slice(0, limit).map(({ record, score }) => ({
      incidentId: record.incidentId,
      summary: record.content,
      resolution: `Root Cause: ${record.metadata.rootCause}. Outcome: ${record.metadata.outcome}.`,
      outcome: record.metadata.outcome,
      similarityScore: score,
      timestamp: record.metadata.timestamp,
    }));
  }

  /**
   * Returns all memories currently in the bank
   */
  public getAllMemories(): HindsightMemoryRecord[] {
    return Array.from(this.memoryStore.values()).sort(
      (a, b) => new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
    );
  }

  /**
   * Delete or clear memory (for testing or reset)
   */
  public resetMemories(): void {
    this.memoryStore.clear();
    for (const mem of SEED_HINDSIGHT_MEMORIES) {
      this.memoryStore.set(mem.id, JSON.parse(JSON.stringify(mem)));
    }
  }
}

export const hindsightService = new HindsightMemoryService();
