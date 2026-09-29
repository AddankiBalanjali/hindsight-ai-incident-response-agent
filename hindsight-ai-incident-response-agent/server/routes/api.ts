import { Router, Request, Response } from 'express';
import { dbManager } from '../db';
import { hindsightService } from '../hindsight';
import { groqService } from '../groq';
import { remediationEngine } from '../remediation';
import { generatePostMortem } from '../postmortem';
import { auditService } from '../audit';
import { sanitizeLogText, parseAndSanitizeLogs } from '../sanitizer';
import { config } from '../config';
import { Incident, UserSession, UserRole, ResolutionOutcome, Recommendation } from '../../src/types';
import { SEED_PAYMENT_INCIDENT_ID } from '../seeds';

export const apiRouter = Router();

// Helper to extract mock/authenticated user session
function getUserFromRequest(req: Request): UserSession {
  const roleHeader = (req.headers['x-user-role'] as UserRole) || 'Engineer';
  const nameHeader = (req.headers['x-user-name'] as string) || 'SRE On-Call Engineer';
  const idHeader = (req.headers['x-user-id'] as string) || 'usr-sre-primary';
  const emailHeader = (req.headers['x-user-email'] as string) || 'sre-oncall@hackwithhyderabad.dev';

  return {
    id: idHeader,
    name: nameHeader,
    email: emailHeader,
    role: roleHeader,
  };
}

// -------------------------------------------------------------
// 1. HEALTH & INTEGRATION STATUS
// -------------------------------------------------------------
apiRouter.get('/health', (req: Request, res: Response) => {
  const mongoStatus = dbManager.getStatus();
  const groqStatus = groqService.getStatus();
  const hindsightStatus = hindsightService.getStatus();

  const isDegraded = !mongoStatus.connected || !groqStatus.configured || !hindsightStatus.configured;

  res.json({
    status: isDegraded ? (config.isDemoMode ? 'demo_mode' : 'degraded') : 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    isDemoMode: config.isDemoMode,
    services: {
      mongodb: mongoStatus,
      groq: groqStatus,
      hindsight: hindsightStatus,
    },
  });
});

// -------------------------------------------------------------
// 2. INCIDENTS LIST & INGESTION
// -------------------------------------------------------------
apiRouter.get('/incidents', async (req: Request, res: Response) => {
  try {
    const { status, severity, serviceName, search, page, limit } = req.query;
    const result = await dbManager.getIncidents({
      status: status as string,
      severity: severity as string,
      serviceName: serviceName as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to query incidents' });
  }
});

apiRouter.post('/incidents', async (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    const { title, serviceName, environment, severity, symptoms, rawLogsSnippet } = req.body;

    if (!title || !serviceName || !severity) {
      return res.status(400).json({ error: 'Missing required fields: title, serviceName, severity.' });
    }

    const sanitizedLogs = parseAndSanitizeLogs(rawLogsSnippet || '', serviceName);

    const newIncident: Incident = {
      id: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      serviceName,
      environment: environment || 'production',
      severity: severity || 'P2',
      status: 'investigating',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      symptoms: Array.isArray(symptoms) ? symptoms : [symptoms || 'Automated error threshold exceeded'],
      rawLogsSnippet: rawLogsSnippet || '',
      sanitizedLogs,
      remediations: [],
      hindsightMemoryRetained: false,
    };

    // Auto-triage: Recall memories and generate initial diagnosis
    const recalledMemories = await hindsightService.recallExperiences(
      `${newIncident.serviceName} ${newIncident.title} ${newIncident.symptoms.join(' ')}`,
      3
    );

    const diagnosis = await groqService.diagnoseIncident(newIncident, recalledMemories);
    newIncident.diagnosis = diagnosis;
    newIncident.status = diagnosis.recommendations.length > 0 ? 'approval_pending' : 'investigating';

    await dbManager.saveIncident(newIncident);

    auditService.log({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'incident_created',
      targetId: newIncident.id,
      details: `Created ${newIncident.severity} incident for ${newIncident.serviceName}. Recalled ${recalledMemories.length} memories.`,
      severity: newIncident.severity === 'P1' ? 'critical' : 'medium',
    });

    res.status(201).json(newIncident);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create incident' });
  }
});

// -------------------------------------------------------------
// 3. SINGLE INCIDENT & DIAGNOSIS
// -------------------------------------------------------------
apiRouter.get('/incidents/:id', async (req: Request, res: Response) => {
  try {
    const incident = await dbManager.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Attach postmortem if exists
    const postMortem = await dbManager.getPostMortemByIncidentId(incident.id);
    if (postMortem) {
      incident.postMortem = postMortem;
    }

    res.json(incident);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/incidents/:id/diagnose', async (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    const incident = await dbManager.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Recall from Hindsight long-term memory
    const query = `${incident.serviceName} ${incident.title} ${incident.symptoms.join(' ')}`;
    const recalledMemories = await hindsightService.recallExperiences(query, 3);

    // Call Groq AI diagnosis
    const diagnosis = await groqService.diagnoseIncident(incident, recalledMemories);
    incident.diagnosis = diagnosis;
    incident.status = 'approval_pending';
    await dbManager.saveIncident(incident);

    auditService.log({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'diagnosis_generated',
      targetId: incident.id,
      details: `Diagnosed ${incident.id} using ${diagnosis.provider}. Retrieved ${recalledMemories.length} memories.`,
      severity: 'medium',
    });

    res.json({ incident, diagnosis });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. REMEDIATIONS & HUMAN APPROVAL WORKFLOW
// -------------------------------------------------------------
apiRouter.post('/incidents/:id/remediations/propose', async (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    const incident = await dbManager.getIncidentById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { recommendationId } = req.body;
    const recommendation = incident.diagnosis?.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) {
      return res.status(400).json({ error: 'Recommendation not found on incident diagnosis' });
    }

    const execution = remediationEngine.proposeRemediation(incident, recommendation, user);
    incident.remediations.push(execution);
    incident.status = 'approval_pending';
    await dbManager.saveIncident(incident);

    res.status(201).json({ execution, incident });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/incidents/:id/remediations/:remId/approval', async (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    const incident = await dbManager.getIncidentById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { decision, rationale } = req.body;
    if (!decision || (decision !== 'approved' && decision !== 'rejected')) {
      return res.status(400).json({ error: "Decision must be 'approved' or 'rejected'" });
    }

    const updatedExecution = remediationEngine.processApproval(
      incident,
      req.params.remId,
      user,
      decision,
      rationale
    );

    await dbManager.saveIncident(incident);
    res.json({ execution: updatedExecution, incident });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/incidents/:id/remediations/:remId/execute', async (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    const incident = await dbManager.getIncidentById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { executeLive, confirmedRisk } = req.body;

    const updatedExecution = remediationEngine.executeRemediation(
      incident,
      req.params.remId,
      user,
      {
        executeLive: Boolean(executeLive),
        confirmedRisk: Boolean(confirmedRisk),
      }
    );

    incident.status = 'mitigating';
    await dbManager.saveIncident(incident);

    res.json({ execution: updatedExecution, incident });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. RESOLUTION & HINDSIGHT LEARNING LOOP
// -------------------------------------------------------------
apiRouter.post('/incidents/:id/resolve', async (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    if (user.role === 'Viewer') {
      return res.status(403).json({ error: 'Viewers cannot mark incidents as resolved' });
    }

    const incident = await dbManager.getIncidentById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { confirmedRootCause, outcome, notes } = req.body;
    if (!outcome) {
      return res.status(400).json({ error: 'Resolution outcome is required (successful | partial | failed | inconclusive)' });
    }

    incident.status = 'resolved';
    incident.resolvedAt = new Date().toISOString();
    incident.confirmedRootCause = confirmedRootCause || incident.diagnosis?.suspectedRootCauseHypothesis || 'Verified during remediation';
    incident.confirmedResolutionOutcome = outcome as ResolutionOutcome;
    incident.confirmedResolutionNotes = notes || 'Remediation completed successfully with verified telemetry metrics.';

    // LEARNING LOOP: Retain experience into Hindsight long-term memory system!
    const memoryExperienceContent = `Incident ${incident.id} on ${incident.serviceName} (${incident.environment}) confirmed ${outcome}.
Symptoms: ${incident.symptoms.join('; ')}.
Confirmed Root Cause: ${incident.confirmedRootCause}.
Resolution Actions: ${incident.remediations.map(r => `${r.actionType} on ${r.targetResource}`).join(', ') || notes}.
Outcome: ${outcome}. Notes: ${notes || 'Verified normal operation'}.`;

    const retainedMemory = await hindsightService.retainExperience(
      incident.id,
      incident.serviceName,
      memoryExperienceContent,
      {
        severity: incident.severity,
        environment: incident.environment,
        outcome: incident.confirmedResolutionOutcome,
        rootCause: incident.confirmedRootCause || 'Verified during remediation',
      }
    );

    incident.hindsightMemoryRetained = true;
    incident.hindsightMemoryId = retainedMemory.id;

    // Generate post-mortem automatically
    const postMortem = generatePostMortem(incident);
    incident.postMortemId = postMortem.id;
    incident.postMortem = postMortem;
    await dbManager.savePostMortem(postMortem);

    await dbManager.saveIncident(incident);

    auditService.log({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'incident_resolved',
      targetId: incident.id,
      details: `Resolved with outcome '${outcome}'. Retained in Hindsight Memory bank (${retainedMemory.id}).`,
      severity: 'high',
    });

    res.json({
      incident,
      retainedMemory,
      postMortem,
      message: 'Incident resolved and experience successfully retained in Hindsight long-term memory!',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 6. POST-MORTEM MANAGEMENT
// -------------------------------------------------------------
apiRouter.get('/incidents/:id/postmortem', async (req: Request, res: Response) => {
  try {
    let postMortem = await dbManager.getPostMortemByIncidentId(req.params.id);
    if (!postMortem) {
      const incident = await dbManager.getIncidentById(req.params.id);
      if (!incident) return res.status(404).json({ error: 'Incident not found' });
      postMortem = generatePostMortem(incident);
      await dbManager.savePostMortem(postMortem);
    }
    res.json(postMortem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/incidents/:id/postmortem', async (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    const incident = await dbManager.getIncidentById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const postMortem = generatePostMortem(incident);
    await dbManager.savePostMortem(postMortem);

    incident.postMortem = postMortem;
    incident.postMortemId = postMortem.id;
    await dbManager.saveIncident(incident);

    auditService.log({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'postmortem_generated',
      targetId: incident.id,
      details: `Generated post-mortem document: ${postMortem.id}`,
      severity: 'low',
    });

    res.json(postMortem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 7. MEMORY EXPLORER & SEARCH
// -------------------------------------------------------------
apiRouter.get('/memory', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (query && typeof query === 'string' && query.trim().length > 0) {
      const results = await hindsightService.recallExperiences(query.trim(), 10);
      return res.json({ query, results, total: results.length });
    }

    const allMemories = hindsightService.getAllMemories();
    res.json({
      bankId: config.hindsight.bankId,
      memories: allMemories,
      total: allMemories.length,
      status: hindsightService.getStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 8. AUDIT LOGS
// -------------------------------------------------------------
apiRouter.get('/audit', (req: Request, res: Response) => {
  const { action, severity, role, search, limit } = req.query;
  const logs = auditService.getLogs({
    action: action as string,
    severity: severity as string,
    actorRole: role as UserRole,
    search: search as string,
    limit: limit ? parseInt(limit as string, 10) : 50,
  });
  res.json({ logs, total: logs.length });
});

// -------------------------------------------------------------
// 9. CONNECTORS & INCIDENT SIMULATIONS
// -------------------------------------------------------------
apiRouter.get('/connectors', (req: Request, res: Response) => {
  res.json({
    webhookUrl: `${config.appUrl}/api/connectors/webhook`,
    availableSimulations: [
      {
        id: 'sim_payment_mongo_pool',
        title: 'Payment Gateway API - MongoDB Connection Pool Starvation',
        severity: 'P1',
        service: 'payment-checkout-api',
        description: 'Simulates connection queue saturation, unclosed aggregation stream leak, and 504 gateway timeouts.',
      },
      {
        id: 'sim_redis_eviction_auth',
        title: 'Auth Service - Redis Volatile LRU OOM Eviction',
        severity: 'P2',
        service: 'auth-service',
        description: 'Simulates non-expiring JWT refresh tokens filling cache RAM and causing 850ms validation latency.',
      },
      {
        id: 'sim_kafka_inventory_lag',
        title: 'Inventory Sync - Kafka Consumer Group Lag Accumulation',
        severity: 'P3',
        service: 'inventory-worker',
        description: 'Simulates batch timeout exceeding max.poll.interval.ms triggering constant consumer rebalances.',
      },
    ],
    readOnlyIntegrations: [
      {
        provider: 'Datadog',
        type: 'Monitor Webhook & Log Streaming',
        status: 'ready_for_credentials',
        docPath: '/docs/datadog-integration',
      },
      {
        provider: 'AWS CloudWatch',
        type: 'SNS Alarm Destination',
        status: 'ready_for_credentials',
        docPath: '/docs/cloudwatch-integration',
      },
      {
        provider: 'Grafana Loki / Prometheus Alertmanager',
        type: 'Alertmanager Webhook Receiver',
        status: 'ready_for_credentials',
        docPath: '/docs/grafana-integration',
      },
    ],
  });
});

apiRouter.post('/connectors/simulate', async (req: Request, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    const { scenarioId } = req.body;

    let title = 'Payment Gateway API Timeout & MongoDB Connection Pool Exhaustion';
    let serviceName = 'payment-checkout-api';
    let severity: any = 'P1';
    let symptoms = [
      'HTTP 504 Gateway Timeout spike to 68% on /v1/checkout/charge',
      'MongoWaitQueueFullException: Wait queue for connection exceeded 500ms',
      'MongoDB Atlas cluster connections saturated at 1,500 / 1,500 limit',
    ];
    let rawLogsSnippet = `[${new Date().toISOString()}] [ERROR] payment-checkout-api: MongoServerSelectionError: connection pool exhausted (maxPoolSize=50, waitQueueTimeoutMS=2500)
[${new Date().toISOString()}] [FATAL] payment-checkout-api: com.mongodb.MongoWaitQueueFullException: Too many threads waiting for connection (pool: 50/50 active, queue: 100)
[${new Date().toISOString()}] [ERROR] payment-checkout-api: POST /v1/checkout/charge customerId="cust_98124" auth="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.s64...REDACTED" failed with code 504`;

    if (scenarioId === 'sim_redis_eviction_auth') {
      title = 'Auth Service Token Validation Latency Spike & Redis Eviction';
      serviceName = 'auth-service';
      severity = 'P2';
      symptoms = [
        'Auth token verification latency 99th percentile increased from 8ms to 850ms',
        'Redis session cluster hit maxmemory policy volatile-lru, thrashing cache keys',
      ];
      rawLogsSnippet = `[${new Date().toISOString()}] [WARN] auth-service: Redis OOM command rejected: used memory 8.0GB exceeds maxmemory 8.0GB`;
    } else if (scenarioId === 'sim_kafka_inventory_lag') {
      title = 'Inventory Sync Kafka Consumer Lag Accumulation';
      serviceName = 'inventory-worker';
      severity = 'P3';
      symptoms = [
        'Kafka consumer group inventory-sync-group lag exceeded 45,000 messages',
        'Stock reservation events delayed by 18 minutes',
      ];
      rawLogsSnippet = `[${new Date().toISOString()}] [WARN] inventory-worker: Consumer rebalance triggered; commit failed for partition 3`;
    }

    const sanitizedLogs = parseAndSanitizeLogs(rawLogsSnippet, serviceName);

    const newIncident: Incident = {
      id: `INC-2026-${Math.floor(7000 + Math.random() * 2900)}`,
      title,
      serviceName,
      environment: 'production',
      severity,
      status: 'investigating',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      symptoms,
      rawLogsSnippet,
      sanitizedLogs,
      remediations: [],
      hindsightMemoryRetained: false,
    };

    // Auto-triage: Recall from Hindsight memory bank
    const recalledMemories = await hindsightService.recallExperiences(
      `${newIncident.serviceName} ${newIncident.title} ${newIncident.symptoms.join(' ')}`,
      3
    );

    const diagnosis = await groqService.diagnoseIncident(newIncident, recalledMemories);
    newIncident.diagnosis = diagnosis;
    newIncident.status = diagnosis.recommendations.length > 0 ? 'approval_pending' : 'investigating';

    await dbManager.saveIncident(newIncident);

    auditService.log({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'incident_created',
      targetId: newIncident.id,
      details: `Simulated scenario '${scenarioId || 'payment_mongo_pool'}' declared as ${newIncident.severity}`,
      severity: 'critical',
    });

    res.status(201).json(newIncident);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook endpoint for external monitoring systems (Datadog, Alertmanager, etc.)
apiRouter.post('/connectors/webhook', async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;
    const title = rawPayload.title || rawPayload.event || 'Ingested Alert from External Webhook';
    const serviceName = rawPayload.service || rawPayload.app || 'unknown-service';
    const severity = (rawPayload.severity as any) || 'P2';
    const symptoms = rawPayload.symptoms || [rawPayload.message || 'Alert threshold triggered'];
    const rawLogs = typeof rawPayload.logs === 'string' ? rawPayload.logs : JSON.stringify(rawPayload, null, 2);

    const sanitizedLogs = parseAndSanitizeLogs(rawLogs, serviceName);

    const newIncident: Incident = {
      id: `INC-2026-${Math.floor(5000 + Math.random() * 4900)}`,
      title,
      serviceName,
      environment: rawPayload.environment || 'production',
      severity,
      status: 'investigating',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      symptoms: Array.isArray(symptoms) ? symptoms : [String(symptoms)],
      rawLogsSnippet: rawLogs,
      sanitizedLogs,
      remediations: [],
      hindsightMemoryRetained: false,
    };

    const recalledMemories = await hindsightService.recallExperiences(
      `${newIncident.serviceName} ${newIncident.title}`,
      3
    );
    const diagnosis = await groqService.diagnoseIncident(newIncident, recalledMemories);
    newIncident.diagnosis = diagnosis;
    newIncident.status = 'approval_pending';

    await dbManager.saveIncident(newIncident);

    res.status(201).json({
      success: true,
      incidentId: newIncident.id,
      status: newIncident.status,
      recalledMemoryCount: recalledMemories.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
