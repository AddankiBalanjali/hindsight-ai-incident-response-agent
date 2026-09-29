import { Incident, PostMortem } from '../src/types';

export function generatePostMortem(incident: Incident): PostMortem {
  const durationMs = incident.resolvedAt
    ? new Date(incident.resolvedAt).getTime() - new Date(incident.createdAt).getTime()
    : Date.now() - new Date(incident.createdAt).getTime();
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

  const financialEstimate =
    incident.severity === 'P1'
      ? durationMinutes * 650
      : incident.severity === 'P2'
      ? durationMinutes * 220
      : durationMinutes * 60;

  const timeline = [
    {
      timestamp: new Date(incident.createdAt).toISOString(),
      event: `Incident declared as ${incident.severity} on service ${incident.serviceName} (${incident.environment}).`,
    },
  ];

  if (incident.diagnosis) {
    timeline.push({
      timestamp: incident.diagnosis.generatedAt,
      event: `Hindsight AI completed Groq diagnosis and retrieved ${incident.diagnosis.recalledMemoryCount} related historical experience(s).`,
    });
  }

  for (const rem of incident.remediations) {
    timeline.push({
      timestamp: rem.executedAt,
      event: `Remediation action '${rem.actionType}' performed by ${rem.executedBy} (Dry-run: ${rem.isDryRun ? 'Yes' : 'No'}, Status: ${rem.status}).`,
    });
  }

  if (incident.resolvedAt) {
    timeline.push({
      timestamp: incident.resolvedAt,
      event: `Incident confirmed resolved with outcome: ${incident.confirmedResolutionOutcome || 'successful'}.`,
    });
  }

  return {
    id: `PM-${incident.id.replace('INC-', '')}`,
    incidentId: incident.id,
    title: `Post-Mortem: ${incident.title}`,
    summary: `On ${new Date(incident.createdAt).toUTCString()}, ${incident.serviceName} experienced a ${incident.severity} degradation resulting in ${durationMinutes} minutes of customer impact before automated diagnosis and engineered remediation restored normal operations.`,
    timeline,
    impact: {
      durationMinutes,
      financialEstimateUSD: financialEstimate,
      affectedUsersOrRequests: `Approximately ${Math.min(50000, durationMinutes * 340)} requests affected during window`,
      slaBreached: durationMinutes > 15 && incident.severity === 'P1',
    },
    detection: {
      method: 'Synthetic SLO monitoring & automated log ingestion gateway',
      alertName: `${incident.serviceName.toUpperCase()}_HighErrorRate_P99`,
      meanTimeToDetectMinutes: 3,
    },
    rootCauseStatus: incident.confirmedRootCause ? 'identified_and_verified' : 'suspected',
    rootCauseAnalysis:
      incident.confirmedRootCause ||
      incident.diagnosis?.suspectedRootCauseHypothesis ||
      'Root cause investigation ongoing pending finalized post-incident review.',
    contributingFactors:
      incident.diagnosis?.contributingFactors && incident.diagnosis.contributingFactors.length > 0
        ? incident.diagnosis.contributingFactors
        : incident.symptoms,
    resolutionSummary:
      incident.confirmedResolutionNotes ||
      'Remediation plan executed with dry-run verification, human authorization, and service telemetry stabilization.',
    actionItems: [
      {
        id: `ACT-${incident.id.replace('INC-', '')}-01`,
        task: `Audit ${incident.serviceName} resource boundaries, timeouts, and connection pool configurations`,
        owner: 'SRE Core Team',
        status: 'open',
      },
      {
        id: `ACT-${incident.id.replace('INC-', '')}-02`,
        task: `Add early warning Prometheus alert threshold for wait-queue saturation at 70%`,
        owner: 'Observability Team',
        status: 'open',
      },
      {
        id: `ACT-${incident.id.replace('INC-', '')}-03`,
        task: `Retain incident resolution telemetry in Hindsight Long-Term Memory Bank`,
        owner: 'Hindsight AI Agent',
        status: incident.hindsightMemoryRetained ? 'completed' : 'in_progress',
      },
    ],
    lessonsLearned: [
      'Fast memory recall from Hindsight allowed instant identification of past failure signatures.',
      'Enforcing dry-run validation by default prevented unintended cluster cascading failures.',
      'Observability alerts should trigger earlier on queue saturation before 504 timeouts cascade to users.',
    ],
    generatedAt: new Date().toISOString(),
  };
}
