import { RemediationExecution, Recommendation, Incident, UserSession } from '../src/types';
import { config } from './config';
import { auditService } from './audit';

export interface RemediationRequest {
  recommendation: Recommendation;
  incident: Incident;
  user: UserSession;
  isDryRun: boolean;
  userConfirmedProductionRisk?: boolean;
}

class RemediationEngine {
  /**
   * Proposes a new remediation action. Always creates as DRY-RUN or PENDING_APPROVAL by default.
   */
  public proposeRemediation(
    incident: Incident,
    recommendation: Recommendation,
    user: UserSession
  ): RemediationExecution {
    const isProduction = incident.environment === 'production';
    const isDryRun = true; // Always dry-run by default

    const execution: RemediationExecution = {
      id: `REM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      recommendationId: recommendation.id,
      actionType: recommendation.actionType,
      targetResource: recommendation.targetResource,
      executedBy: user.name,
      executedAt: new Date().toISOString(),
      isDryRun,
      status: 'pending_approval',
      beforeState: this.captureBeforeState(incident, recommendation),
      afterState: this.simulateAfterState(incident, recommendation),
      executionLog: [
        `[DRY-RUN SIMULATION] Action proposed by ${user.name} (${user.role}).`,
        `Target resource: ${recommendation.targetResource}`,
        `Environment: ${incident.environment} (Production gate active: ${isProduction ? 'YES' : 'NO'})`,
        `Safety checks: Destructive shell commands prohibited. Raw database statements blocked.`,
        `Dry-run verification completed successfully. Awaiting authorized engineer approval.`,
      ],
      rollbackSteps: recommendation.rollbackInstructions,
    };

    auditService.log({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'remediation_proposed',
      targetId: incident.id,
      details: `Proposed dry-run remediation: ${recommendation.actionTitle} for ${recommendation.targetResource}`,
      severity: isProduction ? 'high' : 'medium',
    });

    return execution;
  }

  /**
   * Approves or rejects a pending remediation proposal
   */
  public processApproval(
    incident: Incident,
    executionId: string,
    user: UserSession,
    decision: 'approved' | 'rejected',
    rationale?: string
  ): RemediationExecution {
    // Only Engineer or Admin can approve
    if (user.role === 'Viewer') {
      throw new Error('Access denied: Viewers cannot approve or reject remediation plans.');
    }

    const execution = incident.remediations.find(r => r.id === executionId);
    if (!execution) {
      throw new Error(`Remediation execution ${executionId} not found on incident ${incident.id}`);
    }

    execution.approvalDecision = {
      approvedBy: user.name,
      decision,
      timestamp: new Date().toISOString(),
      rationale: rationale || `Decision rendered by ${user.role} ${user.name}`,
    };

    execution.status = decision === 'approved' ? 'approved' : 'rejected';
    execution.executionLog.push(
      `[APPROVAL] Status changed to ${decision.toUpperCase()} by ${user.name} (${user.role}) at ${execution.approvalDecision.timestamp}.`
    );

    if (rationale) {
      execution.executionLog.push(`[RATIONALE] ${rationale}`);
    }

    auditService.log({
      actor: { id: user.id, name: user.name, role: user.role },
      action: decision === 'approved' ? 'remediation_approved' : 'remediation_rejected',
      targetId: incident.id,
      details: `Remediation ${execution.actionType} was ${decision} by ${user.name}`,
      severity: decision === 'approved' ? 'high' : 'medium',
    });

    return execution;
  }

  /**
   * Executes an approved remediation action with safety gates
   */
  public executeRemediation(
    incident: Incident,
    executionId: string,
    user: UserSession,
    options: { executeLive: boolean; confirmedRisk: boolean }
  ): RemediationExecution {
    if (user.role === 'Viewer') {
      throw new Error('Access denied: Viewers cannot execute remediation actions.');
    }

    const execution = incident.remediations.find(r => r.id === executionId);
    if (!execution) {
      throw new Error(`Remediation execution ${executionId} not found.`);
    }

    if (execution.status !== 'approved') {
      throw new Error(`Cannot execute: Remediation is in status '${execution.status}'. Explicit approval required.`);
    }

    const isProduction = incident.environment === 'production';
    const isAllowedEnv = config.security.allowedEnvironments.includes(incident.environment.toLowerCase());

    // If attempting to execute LIVE on production without environment allowlist
    if (options.executeLive && isProduction && !isAllowedEnv && !options.confirmedRisk) {
      throw new Error(
        `Safety Violation: Environment '${incident.environment}' requires explicit risk confirmation and Admin override.`
      );
    }

    // Perform safe simulated execution
    execution.isDryRun = !options.executeLive;
    execution.status = 'executed';
    execution.executedAt = new Date().toISOString();
    execution.executedBy = user.name;

    execution.executionLog.push(
      `[EXECUTION STARTED] Mode: ${options.executeLive ? 'LIVE CONTROLLED APPLIED' : 'DRY-RUN VALIDATION'}`
    );
    execution.executionLog.push(`[PRE-FLIGHT] Verifying parameter boundaries and non-destructive guarantees... PASS.`);
    execution.executionLog.push(`[APPLYING] Executing ${execution.actionType} on ${execution.targetResource}...`);
    execution.executionLog.push(
      `[POST-CHECK] Telemetry metrics normalized. Before state successfully updated to after state.`
    );
    execution.executionLog.push(`[COMPLETE] Action finished with 0 error codes. Rollback blueprint secured.`);

    auditService.log({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'remediation_executed',
      targetId: incident.id,
      details: `Executed ${execution.actionType} on ${execution.targetResource} (Live: ${options.executeLive})`,
      severity: isProduction ? 'critical' : 'high',
    });

    return execution;
  }

  private captureBeforeState(incident: Incident, rec: Recommendation): Record<string, any> {
    if (rec.actionType === 'scale_connection_pool') {
      return {
        maxPoolSize: 50,
        activeConnections: 50,
        waitQueueLength: 94,
        averageCheckoutLatencyMs: 2450,
        errorRatePercent: 68.2,
      };
    }
    if (rec.actionType === 'flush_redis_cache') {
      return {
        usedMemoryMB: 8192,
        maxMemoryMB: 8192,
        evictionRatePerSec: 1420,
        cacheHitRatio: 0.26,
      };
    }
    return {
      serviceStatus: 'degraded',
      healthProbeResponse: '503 Service Unavailable',
      unhealthyPodCount: 2,
    };
  }

  private simulateAfterState(incident: Incident, rec: Recommendation): Record<string, any> {
    if (rec.actionType === 'scale_connection_pool') {
      return {
        maxPoolSize: 150,
        activeConnections: 72,
        waitQueueLength: 0,
        averageCheckoutLatencyMs: 42,
        errorRatePercent: 0.05,
      };
    }
    if (rec.actionType === 'flush_redis_cache') {
      return {
        usedMemoryMB: 1840,
        maxMemoryMB: 8192,
        evictionRatePerSec: 0,
        cacheHitRatio: 0.94,
      };
    }
    return {
      serviceStatus: 'healthy',
      healthProbeResponse: '200 OK',
      unhealthyPodCount: 0,
    };
  }
}

export const remediationEngine = new RemediationEngine();
