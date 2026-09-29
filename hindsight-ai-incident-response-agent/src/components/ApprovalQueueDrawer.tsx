import React, { useState } from 'react';
import { Incident, UserSession } from '../types';
import { ShieldAlert, CheckCircle2, XCircle, Play, AlertTriangle } from 'lucide-react';

interface ApprovalQueueDrawerProps {
  incidents: Incident[];
  currentUser: UserSession;
  onApproval: (incidentId: string, remediationId: string, decision: 'approved' | 'rejected', rationale?: string) => Promise<void>;
  onExecute: (incidentId: string, remediationId: string, executeLive: boolean, confirmedRisk: boolean) => Promise<void>;
  onSelectIncident: (incident: Incident) => void;
  isProcessing: boolean;
}

export const ApprovalQueueDrawer: React.FC<ApprovalQueueDrawerProps> = ({
  incidents,
  currentUser,
  onApproval,
  onExecute,
  onSelectIncident,
  isProcessing,
}) => {
  const [rationales, setRationales] = useState<Record<string, string>>({});

  // Collect all pending and approved remediations across all active incidents
  const queuedItems: Array<{ incident: Incident; remediation: any }> = [];
  for (const inc of incidents) {
    for (const rem of inc.remediations) {
      if (rem.status === 'pending_approval' || rem.status === 'approved') {
        queuedItems.push({ incident: inc, remediation: rem });
      }
    }
  }

  const handleRationaleChange = (remId: string, text: string) => {
    setRationales(prev => ({ ...prev, [remId]: text }));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header (28-32px title, 14-16px subtext) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <span>Approval Queue</span>
            {queuedItems.length > 0 && (
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {queuedItems.length} Pending
              </span>
            )}
          </h1>
          <p className="text-sm sm:text-[15px] text-slate-300 mt-1 leading-relaxed">
            Review dry-run telemetry simulations, evaluate environment risks, and authorize remediation actions.
          </p>
        </div>
      </div>

      {queuedItems.length === 0 ? (
        <div className="p-12 rounded-xl bg-[#111928] border border-slate-800 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-base sm:text-lg font-semibold text-white">Approval Queue Clear</h3>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            All proposed remediations have been reviewed or executed. Propose a dry-run remediation from any active incident to queue it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queuedItems.map(({ incident, remediation: rem }) => {
            const isPending = rem.status === 'pending_approval';
            const isApproved = rem.status === 'approved';
            const rationale = rationales[rem.id] || '';

            return (
              <div
                key={rem.id}
                className="p-5 sm:p-6 rounded-xl bg-[#111928] border border-slate-800 space-y-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="text-rose-400 font-bold">[{incident.severity}]</span>
                      <button
                        onClick={() => onSelectIncident(incident)}
                        className="text-cyan-400 hover:underline font-semibold focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden rounded px-0.5"
                      >
                        {incident.id}
                      </button>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-200">{incident.serviceName}</span>
                      <span className="text-slate-600">·</span>
                      <span className="uppercase text-slate-400">{incident.environment}</span>
                    </div>
                    <h4 className="text-sm sm:text-base font-semibold text-white mt-1">
                      {rem.actionType.toUpperCase()}: {rem.targetResource}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono px-2.5 py-1 rounded-md border uppercase font-medium ${
                        isPending
                          ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                          : 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
                      }`}
                    >
                      {rem.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Dry-Run Telemetry Diff */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-lg bg-[#0B1120] border border-rose-950/50 space-y-1.5">
                    <div className="text-xs text-rose-400 font-semibold uppercase tracking-wide">Current State (Degraded)</div>
                    <pre className="text-slate-300 text-xs overflow-x-auto leading-relaxed">
                      {JSON.stringify(rem.beforeState, null, 2)}
                    </pre>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#0B1120] border border-emerald-950/50 space-y-1.5">
                    <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">Predicted After State (Healthy)</div>
                    <pre className="text-slate-300 text-xs overflow-x-auto leading-relaxed">
                      {JSON.stringify(rem.afterState, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Action Controls */}
                {isPending && (
                  <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Add authorization rationale or review comments..."
                        value={rationale}
                        onChange={(e) => handleRationaleChange(rem.id, e.target.value)}
                        className="w-full h-10 px-3.5 rounded-lg bg-[#0B1120] border border-slate-700/80 text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => onApproval(incident.id, rem.id, 'rejected', rationale)}
                        disabled={isProcessing || currentUser.role === 'Viewer'}
                        className="h-10 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-sm font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors focus-visible:ring-1 focus-visible:ring-rose-400 focus-visible:outline-hidden"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => onApproval(incident.id, rem.id, 'approved', rationale)}
                        disabled={isProcessing || currentUser.role === 'Viewer'}
                        className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-hidden"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Authorize</span>
                      </button>
                    </div>
                  </div>
                )}

                {isApproved && (
                  <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                    <span className="font-mono text-slate-300 text-xs sm:text-sm">
                      Approved by <strong className="text-white">{rem.approvalDecision?.approvedBy}</strong>. Ready to execute.
                    </span>
                    <button
                      onClick={() => onExecute(incident.id, rem.id, true, true)}
                      disabled={isProcessing || currentUser.role === 'Viewer'}
                      className="h-10 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
                    >
                      <Play className="w-4 h-4" />
                      <span>Apply Controlled Execution</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
