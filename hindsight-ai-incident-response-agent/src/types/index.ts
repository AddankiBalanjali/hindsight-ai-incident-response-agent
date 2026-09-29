export type Severity = 'P1' | 'P2' | 'P3' | 'P4';

export type IncidentStatus = 
  | 'investigating'
  | 'diagnosing'
  | 'approval_pending'
  | 'mitigating'
  | 'resolved'
  | 'escalated';

export type ResolutionOutcome = 'successful' | 'partial' | 'failed' | 'inconclusive';

export type UserRole = 'Admin' | 'Engineer' | 'Viewer';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface SanitizedLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  source: string;
  redactedItemCount?: number;
}

export interface SupportingMemoryCitation {
  incidentId: string;
  summary: string;
  resolution: string;
  outcome: ResolutionOutcome;
  similarityScore: number;
  timestamp: string;
}

export interface Recommendation {
  id: string;
  actionTitle: string;
  description: string;
  actionType: 'restart_service' | 'scale_connection_pool' | 'flush_redis_cache' | 'rollback_deployment' | 'failover_read_replica' | 'drain_node';
  targetResource: string;
  parameters: Record<string, string | number | boolean>;
  reasoning: string;
  confidenceScore: number; // 0 - 100
  confidenceExplanation: string;
  risks: string[];
  verificationSteps: string[];
  rollbackInstructions: string[];
  supportingIncidentIds: string[];
}

export interface AIDiagnosis {
  generatedAt: string;
  provider: 'groq' | 'demo_deterministic';
  modelUsed: string;
  suspectedRootCauseHypothesis: string;
  isHypothesisVerified: boolean; // explicitly false until human verifies
  symptomSummary: string;
  contributingFactors: string[];
  blastRadius: string;
  recalledMemoryCount: number;
  recalledMemories: SupportingMemoryCitation[];
  recommendations: Recommendation[];
}

export interface RemediationExecution {
  id: string;
  recommendationId: string;
  actionType: string;
  targetResource: string;
  executedBy: string;
  executedAt: string;
  isDryRun: boolean;
  status: 'pending_approval' | 'approved' | 'rejected' | 'executed' | 'failed';
  approvalDecision?: {
    approvedBy: string;
    decision: 'approved' | 'rejected';
    timestamp: string;
    rationale?: string;
  };
  beforeState: Record<string, any>;
  afterState: Record<string, any>;
  executionLog: string[];
  rollbackSteps: string[];
}

export interface PostMortem {
  id: string;
  incidentId: string;
  title: string;
  summary: string;
  timeline: Array<{ timestamp: string; event: string }>;
  impact: {
    durationMinutes: number;
    financialEstimateUSD: number;
    affectedUsersOrRequests: string;
    slaBreached: boolean;
  };
  detection: {
    method: string;
    alertName: string;
    meanTimeToDetectMinutes: number;
  };
  rootCauseStatus: 'identified_and_verified' | 'suspected' | 'unknown';
  rootCauseAnalysis: string;
  contributingFactors: string[];
  resolutionSummary: string;
  actionItems: Array<{ id: string; task: string; owner: string; status: 'open' | 'in_progress' | 'completed' }>;
  lessonsLearned: string[];
  generatedAt: string;
}

export interface Incident {
  id: string; // e.g. INC-2026-8941
  title: string;
  serviceName: string;
  environment: 'production' | 'staging' | 'development';
  severity: Severity;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  symptoms: string[];
  rawLogsSnippet: string;
  sanitizedLogs: SanitizedLogEntry[];
  diagnosis?: AIDiagnosis;
  remediations: RemediationExecution[];
  confirmedRootCause?: string;
  confirmedResolutionOutcome?: ResolutionOutcome;
  confirmedResolutionNotes?: string;
  postMortemId?: string;
  postMortem?: PostMortem;
  hindsightMemoryRetained: boolean;
  hindsightMemoryId?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: UserRole;
  };
  action: 'login' | 'incident_created' | 'diagnosis_generated' | 'remediation_proposed' | 'remediation_approved' | 'remediation_rejected' | 'remediation_executed' | 'incident_resolved' | 'memory_retained' | 'postmortem_generated' | 'settings_updated';
  targetId: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
}

export interface HindsightMemoryRecord {
  id: string;
  bankId: string;
  incidentId: string;
  serviceName: string;
  category: 'experience' | 'fact' | 'observation';
  content: string;
  metadata: {
    severity: Severity;
    environment: string;
    outcome: ResolutionOutcome;
    rootCause: string;
    timestamp: string;
  };
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'demo_mode';
  uptimeSeconds: number;
  environment: string;
  isDemoMode: boolean;
  services: {
    mongodb: {
      connected: boolean;
      mode: 'atlas_persistent' | 'in_memory_demo';
      details: string;
    };
    groq: {
      configured: boolean;
      mode: 'live_api' | 'mock_deterministic';
      model: string;
      details: string;
    };
    hindsight: {
      configured: boolean;
      mode: 'vectorize_cloud' | 'local_demo_bank';
      bankId: string;
      details: string;
    };
  };
}
