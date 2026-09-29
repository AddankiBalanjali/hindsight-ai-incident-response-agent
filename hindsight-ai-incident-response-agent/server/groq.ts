import Groq from 'groq-sdk';
import { config } from './config';
import { AIDiagnosis, Recommendation, SupportingMemoryCitation, SanitizedLogEntry, Incident } from '../src/types';

class GroqDiagnosisService {
  private groqClient: Groq | null = null;
  private isConfigured: boolean = false;
  private connectionDetails: string = '';

  constructor() {
    if (config.groq.isConfigured) {
      try {
        this.groqClient = new Groq({ apiKey: config.groq.apiKey });
        this.isConfigured = true;
        this.connectionDetails = `Connected to Groq Cloud API (Model: ${config.groq.model})`;
      } catch (err: any) {
        this.isConfigured = false;
        this.connectionDetails = `Groq initialization failed: ${err.message}`;
      }
    } else {
      this.isConfigured = false;
      this.connectionDetails = 'GROQ_API_KEY missing. Active in DEMO MODE with deterministic SRE diagnostic engine.';
    }
  }

  public getStatus() {
    return {
      configured: this.isConfigured,
      mode: this.isConfigured ? ('live_api' as const) : ('mock_deterministic' as const),
      model: config.groq.model,
      details: this.connectionDetails,
    };
  }

  /**
   * Run incident diagnosis using Groq API (or deterministic fallback)
   * Grounded with sanitized evidence and memories recalled from Hindsight
   */
  public async diagnoseIncident(
    incident: Incident,
    recalledMemories: SupportingMemoryCitation[]
  ): Promise<AIDiagnosis> {
    const memoryContext = recalledMemories.length > 0
      ? recalledMemories
          .map(
            m => `[Past Incident: ${m.incidentId}] (Similarity: ${m.similarityScore}%, Outcome: ${m.outcome})
Summary: ${m.summary}
Resolution: ${m.resolution}`
          )
          .join('\n\n')
      : 'NO MATCHING PAST EXPERIENCES RETRIEVED. DO NOT FABRICATE PAST INCIDENTS.';

    const sanitizedLogSnippet = incident.sanitizedLogs
      .slice(0, 10)
      .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');

    // If Groq is configured, attempt real Groq LLaMA-3.3 call
    if (this.isConfigured && this.groqClient) {
      try {
        const prompt = `You are the Hindsight AI Incident Response Agent for HACKWITHHYDERABAD 3.0.
Diagnose the following operational incident based strictly on the provided evidence.

CRITICAL RULES:
1. Treat root causes as an unverified HYPOTHESIS only (never claim 100% certainty or verified fact).
2. ONLY cite past incident IDs that appear in the RECALLED EXPERIENCES section below. NEVER invent past incident numbers or claim a past incident exists unless it is present in the list.
3. Formulate safe, non-destructive remediation recommendations that are DRY-RUN by default.
4. Output MUST be valid JSON adhering to the specified schema.

SERVICE: ${incident.serviceName}
ENVIRONMENT: ${incident.environment}
SEVERITY: ${incident.severity}
SYMPTOMS: ${JSON.stringify(incident.symptoms)}

SANITIZED LOG EVIDENCE:
${sanitizedLogSnippet}

RECALLED HINDSIGHT MEMORY EXPERIENCES:
${memoryContext}

Respond ONLY with a JSON object with this exact shape:
{
  "suspectedRootCauseHypothesis": "string describing the hypothesis",
  "symptomSummary": "concise 1-line summary of observable degradation",
  "contributingFactors": ["string", "string"],
  "blastRadius": "string detailing affected callers and downstream systems",
  "recommendations": [
    {
      "actionTitle": "string",
      "description": "string",
      "actionType": "restart_service" | "scale_connection_pool" | "flush_redis_cache" | "rollback_deployment" | "failover_read_replica" | "drain_node",
      "targetResource": "string",
      "parameters": {},
      "reasoning": "string with rationale",
      "confidenceScore": number (50-95),
      "confidenceExplanation": "why this confidence level was assigned",
      "risks": ["string"],
      "verificationSteps": ["string"],
      "rollbackInstructions": ["string"],
      "supportingIncidentIds": ["string ID from recalled memories ONLY"]
    }
  ]
}`;

        const chatCompletion = await this.groqClient.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are an expert SRE on-call incident response AI assistant. Respond strictly with structured JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          model: config.groq.model,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        });

        const rawContent = chatCompletion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawContent);

        // Sanitize supporting incident IDs against recalledMemories only
        const allowedIds = new Set(recalledMemories.map(m => m.incidentId));
        const recommendations: Recommendation[] = (parsed.recommendations || []).map((rec: any, idx: number) => ({
          id: `REC-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
          actionTitle: rec.actionTitle || 'Remediation Step',
          description: rec.description || 'Apply configuration or infrastructure mitigation',
          actionType: rec.actionType || 'scale_connection_pool',
          targetResource: rec.targetResource || `${incident.serviceName}/default`,
          parameters: rec.parameters || {},
          reasoning: rec.reasoning || 'Derived from system diagnostics',
          confidenceScore: Math.min(98, Math.max(50, Number(rec.confidenceScore) || 75)),
          confidenceExplanation: rec.confidenceExplanation || 'Grounded on sanitized log evidence',
          risks: Array.isArray(rec.risks) ? rec.risks : ['Transient connection drop during rollout'],
          verificationSteps: Array.isArray(rec.verificationSteps) ? rec.verificationSteps : ['Check /healthz metrics'],
          rollbackInstructions: Array.isArray(rec.rollbackInstructions) ? rec.rollbackInstructions : ['Revert config map'],
          supportingIncidentIds: (rec.supportingIncidentIds || []).filter((id: string) => allowedIds.has(id)),
        }));

        return {
          generatedAt: new Date().toISOString(),
          provider: 'groq',
          modelUsed: config.groq.model,
          suspectedRootCauseHypothesis: parsed.suspectedRootCauseHypothesis || 'Hypothesis: Service degradation due to resource constraint',
          isHypothesisVerified: false,
          symptomSummary: parsed.symptomSummary || 'Elevated error rates and latency degradation',
          contributingFactors: parsed.contributingFactors || ['Connection pool starvation', 'Spike in inbound requests'],
          blastRadius: parsed.blastRadius || 'Downstream payment and order processing clients',
          recalledMemoryCount: recalledMemories.length,
          recalledMemories,
          recommendations,
        };
      } catch (err: any) {
        console.warn(`[Groq] Live API call failed: ${err.message}. Falling back to deterministic engine.`);
      }
    }

    // Deterministic Mock Diagnosis (DEMO MODE)
    return this.generateDeterministicDiagnosis(incident, recalledMemories);
  }

  /**
   * Deterministic diagnosis generator for DEMO MODE or offline runs
   */
  private generateDeterministicDiagnosis(
    incident: Incident,
    recalledMemories: SupportingMemoryCitation[]
  ): AIDiagnosis {
    const isMongoPoolIssue = 
      incident.serviceName.toLowerCase().includes('payment') ||
      incident.serviceName.toLowerCase().includes('order') ||
      incident.title.toLowerCase().includes('pool') ||
      incident.symptoms.some(s => s.toLowerCase().includes('pool') || s.toLowerCase().includes('mongo'));

    const isRedisIssue = incident.title.toLowerCase().includes('redis') || incident.serviceName.toLowerCase().includes('auth');
    const isKafkaIssue = incident.title.toLowerCase().includes('kafka') || incident.serviceName.toLowerCase().includes('inventory');

    const validPastIds = recalledMemories.map(m => m.incidentId);

    if (isMongoPoolIssue) {
      const recommendations: Recommendation[] = [
        {
          id: `REC-POOL-EXPAND-${incident.id.replace('INC-', '')}`,
          actionTitle: 'Expand MongoDB Connection Pool & Restart Driver Workers',
          description: 'Dynamically scale MongoDB client maxPoolSize parameter from 50 to 150 to absorb inbound queue congestion.',
          actionType: 'scale_connection_pool',
          targetResource: `${incident.serviceName}/mongodb-connection-pool`,
          parameters: {
            currentMaxPoolSize: 50,
            recommendedMaxPoolSize: 150,
            waitQueueTimeoutMS: 5000,
            replicaReplicas: 3,
          },
          reasoning: validPastIds.length > 0
            ? `Past incident ${validPastIds[0]} experienced identical connection starvation under promotional traffic. Scaling the pool eliminated blocked thread queues within 2 minutes.`
            : 'Symptom evidence confirms MongoWaitQueueFullException with all 50 sockets occupied. Increasing pool headroom resolves immediate thread starvation.',
          confidenceScore: validPastIds.length > 0 ? 94 : 82,
          confidenceExplanation: validPastIds.length > 0
            ? `High confidence (94%) reinforced by past incident ${validPastIds[0]} resolution in Hindsight memory bank.`
            : 'High confidence (82%) based on direct MongoServerSelectionError log signatures.',
          risks: [
            'Increasing client pool adds socket pressure on MongoDB Atlas primary node (current connection count 1,200/1,500).',
            'Does not fix underlying cursor leaks if application code does not release cursors.',
          ],
          verificationSteps: [
            'Monitor MongoDB Atlas connection count to confirm stabilization under 80% ceiling.',
            'Verify payment-checkout-api latency P99 drops below 120ms.',
            'Ensure HTTP 504 error count on /v1/checkout/charge decreases to 0.0%.',
          ],
          rollbackInstructions: [
            'Issue dry-run rollback command to reset maxPoolSize back to 50 in deployment ConfigMap.',
            'Trigger rolling rollback rollout via orchestrator: rollout undo deployment/payment-checkout-api.',
          ],
          supportingIncidentIds: validPastIds.slice(0, 1),
        },
        {
          id: `REC-POD-RESTART-${incident.id.replace('INC-', '')}`,
          actionTitle: 'Controlled Rolling Pod Restart to Evict Deadlocked Connections',
          description: 'Gracefully recycle service pods to release any orphaned socket handles and refresh connection state.',
          actionType: 'restart_service',
          targetResource: `${incident.serviceName}/deployment`,
          parameters: {
            strategy: 'RollingUpdate',
            maxUnavailable: 1,
            drainTimeoutSeconds: 30,
          },
          reasoning: 'Releasing hung node processes terminates dangling socket handles that are blocking the thread pool.',
          confidenceScore: 68,
          confidenceExplanation: 'Moderate confidence (68%); past records note that restarting without scaling pool causes immediate reconnect storms.',
          risks: [
            'May cause temporary reconnection spike against MongoDB Atlas primary during pod initialization.',
            'Transient drop in concurrent throughput during pod warmup.',
          ],
          verificationSteps: [
            'Ensure readiness probe returns 200 OK before traffic shifts to new pod.',
            'Observe zero connection reset errors in ingress proxy.',
          ],
          rollbackInstructions: [
            'Abort rolling restart if error rate on new pod exceeds 1% during canary phase.',
          ],
          supportingIncidentIds: [],
        },
      ];

      return {
        generatedAt: new Date().toISOString(),
        provider: 'demo_deterministic',
        modelUsed: 'deterministic-sre-engine-v1',
        suspectedRootCauseHypothesis: 'Hypothesis: Sudden inbound transaction surge caused MongoDB connection pool starvation (maxPoolSize=50 limit reached), resulting in thread wait queue timeouts and HTTP 504 responses.',
        isHypothesisVerified: false,
        symptomSummary: 'Severe 504 Gateway Timeout spike on checkout endpoints with MongoDB wait queue saturation.',
        contributingFactors: [
          'MaxPoolSize set to static conservative value of 50 in deployment config',
          'Traffic spike from concurrent payment callbacks',
          'Possible unclosed aggregation cursor holding sockets open',
        ],
        blastRadius: 'All active customer checkouts on payment-checkout-api and downstream Stripe webhook callbacks',
        recalledMemoryCount: recalledMemories.length,
        recalledMemories,
        recommendations,
      };
    }

    if (isRedisIssue) {
      return {
        generatedAt: new Date().toISOString(),
        provider: 'demo_deterministic',
        modelUsed: 'deterministic-sre-engine-v1',
        suspectedRootCauseHypothesis: 'Hypothesis: Redis session cluster maxmemory saturation caused volatile-lru eviction thrashing, resulting in auth token validation timeouts.',
        isHypothesisVerified: false,
        symptomSummary: 'Token validation latency elevated to 850ms with Redis OOM errors.',
        contributingFactors: ['Orphaned session tokens without TTL', 'Memory limit capped at 8GB'],
        blastRadius: 'All user authentication and session verification requests',
        recalledMemoryCount: recalledMemories.length,
        recalledMemories,
        recommendations: [
          {
            id: `REC-REDIS-${incident.id}`,
            actionTitle: 'Flush Orphaned JWT Cache & Reset LRU Policy',
            description: 'Purge non-essential session keys and switch memory eviction policy to allkeys-lru.',
            actionType: 'flush_redis_cache',
            targetResource: 'auth-service/redis-sessions',
            parameters: { cachePrefix: 'sess:jwt:*', newPolicy: 'allkeys-lru' },
            reasoning: 'Reclaims memory instantly without disturbing active persistent tokens.',
            confidenceScore: 91,
            confidenceExplanation: 'High confidence based on successful prior resolution.',
            risks: ['Brief cache warmup period with cold database lookups.'],
            verificationSteps: ['Check Redis used_memory < 60%', 'Verify auth latency < 15ms'],
            rollbackInstructions: ['Revert memory policy to volatile-lru'],
            supportingIncidentIds: validPastIds.slice(0, 1),
          },
        ],
      };
    }

    // Generic Fallback
    return {
      generatedAt: new Date().toISOString(),
      provider: 'demo_deterministic',
      modelUsed: 'deterministic-sre-engine-v1',
      suspectedRootCauseHypothesis: `Hypothesis: Resource constraint or dependency latency in service ${incident.serviceName}`,
      isHypothesisVerified: false,
      symptomSummary: `${incident.title} affecting service availability`,
      contributingFactors: incident.symptoms,
      blastRadius: `Service ${incident.serviceName} and immediate upstream consumers`,
      recalledMemoryCount: recalledMemories.length,
      recalledMemories,
      recommendations: [
        {
          id: `REC-GEN-${incident.id}`,
          actionTitle: `Graceful Rolling Restart of ${incident.serviceName}`,
          description: 'Recycle service worker containers with health checks.',
          actionType: 'restart_service',
          targetResource: `${incident.serviceName}/deployment`,
          parameters: { gracefulTimeoutSeconds: 30 },
          reasoning: 'Clears transient resource exhaustion and resets application runtime.',
          confidenceScore: 72,
          confidenceExplanation: 'Standard initial mitigation for unclassified worker degradation.',
          risks: ['Brief latency bump during container handover.'],
          verificationSteps: ['Verify health check 200 OK', 'Monitor error rate for 5 minutes'],
          rollbackInstructions: ['Roll back to previous replica revision'],
          supportingIncidentIds: validPastIds.slice(0, 1),
        },
      ],
    };
  }
}

export const groqService = new GroqDiagnosisService();
