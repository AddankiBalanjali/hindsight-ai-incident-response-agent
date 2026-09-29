import { AuditLogEntry, UserRole } from '../src/types';

class AuditService {
  private inMemoryLogs: AuditLogEntry[] = [
    {
      id: 'AUD-001',
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      actor: { id: 'usr-system-monitor', name: 'Simulated Ingestion Connector', role: 'Admin' },
      action: 'incident_created',
      targetId: 'INC-2026-7821',
      details: 'Automated alert ingestion created incident for payment-checkout-api (Severity: P1)',
      severity: 'critical',
      ipAddress: '10.0.12.44',
    },
    {
      id: 'AUD-002',
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      actor: { id: 'usr-agent-bot', name: 'Hindsight AI Agent', role: 'Engineer' },
      action: 'diagnosis_generated',
      targetId: 'INC-2026-7821',
      details: 'Groq LLM generated root cause hypothesis; recalled 1 past experience from Hindsight memory bank',
      severity: 'medium',
      ipAddress: 'internal-agent',
    },
  ];

  public log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const newEntry: AuditLogEntry = {
      id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.inMemoryLogs.unshift(newEntry);
    
    // Configurable retention limit in memory (keep latest 500)
    if (this.inMemoryLogs.length > 500) {
      this.inMemoryLogs.pop();
    }
    return newEntry;
  }

  public getLogs(filter?: {
    action?: string;
    severity?: string;
    actorRole?: UserRole;
    search?: string;
    limit?: number;
  }): AuditLogEntry[] {
    let list = [...this.inMemoryLogs];

    if (filter?.action && filter.action !== 'all') {
      list = list.filter(l => l.action === filter.action);
    }
    if (filter?.severity && filter.severity !== 'all') {
      list = list.filter(l => l.severity === filter.severity);
    }
    if (filter?.actorRole) {
      list = list.filter(l => l.actor.role === filter.actorRole);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(l => 
        l.details.toLowerCase().includes(q) ||
        l.targetId.toLowerCase().includes(q) ||
        l.actor.name.toLowerCase().includes(q)
      );
    }

    const limit = filter?.limit || 50;
    return list.slice(0, limit);
  }
}

export const auditService = new AuditService();
