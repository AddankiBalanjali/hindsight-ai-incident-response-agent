import React, { useState } from 'react';
import { Incident, UserSession, Recommendation, RemediationExecution, ResolutionOutcome } from '../types';
import { 
  ArrowLeft, Brain, Shield, AlertTriangle, CheckCircle2, XCircle, 
  Terminal, Database, Play, Sparkles, RefreshCw, Copy, Check, FileText, ArrowRight, ShieldAlert
} from 'lucide-react';
import { PostMortemView } from './PostMortemView';

interface IncidentDetailProps {
  incident: Incident;
  currentUser: UserSession;
  onBack: () => void;
  onRefreshDiagnosis: (incidentId: string) => Promise<void>;
  onProposeRemediation: (incidentId: string, recommendationId: string) => Promise<void>;
  onApproval: (incidentId: string, remediationId: string, decision: 'approved' | 'rejected', rationale?: string) => Promise<void>;
  onExecute: (incidentId: string, remediationId: string, executeLive: boolean, confirmedRisk: boolean) => Promise<void>;
  onResolveIncident: (incidentId: string, confirmedRootCause: string, outcome: ResolutionOutcome, notes: string) => Promise<void>;
  isProcessing: boolean;
}

export const IncidentDetail: React.FC<IncidentDetailProps> = ({
  incident,
  currentUser,
  onBack,
  onRefreshDiagnosis,
  onProposeRemediation,
  onApproval,
  onExecute,
  onResolveIncident,
  isProcessing,
}) => {
  const [activeTab, setActiveTab] = useState<'triage' | 'logs' | 'remediation' | 'postmortem'>('triage');
  const [copiedLog, setCopiedLog] = useState(false);
  const [approvalRationale, setApprovalRationale] = useState('');
  const [selectedRemediationForApproval, setSelectedRemediationForApproval] = useState<string | null>(null);

  // Resolution Form State
  const [confirmedRootCause, setConfirmedRootCause] = useState(
    incident.confirmedRootCause || incident.diagnosis?.suspectedRootCauseHypothesis || ''
  );
  const [resolutionOutcome, setResolutionOutcome] = useState<ResolutionOutcome>(
    incident.confirmedResolutionOutcome || 'successful'
  );
  const [resolutionNotes, setResolutionNotes] = useState(
    incident.confirmedResolutionNotes || ''
  );
  const [showResolveModal, setShowResolveModal] = useState(false);

  const isResolved = incident.status === 'resolved';
  const isP1 = incident.severity === 'P1';

  const copySanitizedLogs = () => {
    const text = incident.sanitizedLogs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedRootCause.trim()) return;
    await onResolveIncident(incident.id, confirmedRootCause, resolutionOutcome, resolutionNotes);
    setShowResolveModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={onBack}
            className="h-10 px-3 rounded-lg bg-[#111928] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
            title="Back to incident list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
              <span className={`font-bold ${isP1 ? 'text-rose-400' : 'text-amber-400'}`}>
                [{incident.severity}]
              </span>
              <span className="text-cyan-300 font-semibold">{incident.id}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300 font-mono font-medium">{incident.serviceName}</span>
              <span className="text-slate-600">·</span>
              <span className="uppercase text-slate-400 tracking-wider">{incident.environment}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
              {incident.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => onRefreshDiagnosis(incident.id)}
            disabled={isProcessing || isResolved}
            className="h-10 px-4 rounded-lg bg-[#111928] border border-slate-800 hover:bg-slate-800 text-sm font-medium text-slate-300 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh Diagnosis</span>
          </button>

          {!isResolved && (
            <button
              onClick={() => setShowResolveModal(true)}
              className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-hidden"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Resolve & Retain</span>
            </button>
          )}

          {isResolved && (
            <div className="h-10 px-4 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-sm font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Resolved & Retained</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-sm sm:text-[15px] font-medium overflow-x-auto">
        <button
          onClick={() => setActiveTab('triage')}
          className={`pb-3 px-3.5 transition-colors cursor-pointer whitespace-nowrap focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden ${
            activeTab === 'triage'
              ? 'text-cyan-300 border-b-2 border-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Diagnosis & Recommendations
        </button>
        <button
          onClick={() => setActiveTab('remediation')}
          className={`pb-3 px-3.5 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden ${
            activeTab === 'remediation'
              ? 'text-cyan-300 border-b-2 border-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Remediation & Approvals
          {incident.remediations.filter(r => r.status === 'pending_approval').length > 0 && (
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
              {incident.remediations.filter(r => r.status === 'pending_approval').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-3.5 transition-colors cursor-pointer whitespace-nowrap focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden ${
            activeTab === 'logs'
              ? 'text-cyan-300 border-b-2 border-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sanitized Logs ({incident.sanitizedLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('postmortem')}
          className={`pb-3 px-3.5 transition-colors cursor-pointer whitespace-nowrap focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden ${
            activeTab === 'postmortem'
              ? 'text-cyan-300 border-b-2 border-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Post-Mortem
        </button>
      </div>

      {/* TAB 1: Triage, Groq Diagnosis & Hindsight Memories */}
      {activeTab === 'triage' && (
        <div className="space-y-6">
          {/* Observable Symptoms Overview */}
          <div className="rounded-xl bg-[#111928] border border-slate-800 p-5 sm:p-6 space-y-2 shadow-xs">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Observable Telemetry Symptoms
            </h3>
            <ul className="space-y-1.5 pt-1">
              {incident.symptoms.map((sym, idx) => (
                <li key={idx} className="text-sm sm:text-[15px] text-slate-200 font-mono flex items-start gap-2.5 leading-relaxed">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{sym}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Diagnosis Panel (Groq Engine) */}
          {incident.diagnosis ? (
            <div className="rounded-xl bg-[#111928] border border-slate-800 p-5 sm:p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base sm:text-lg font-semibold text-white">
                    Groq LLM Incident Diagnosis
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    ({incident.diagnosis.provider === 'groq' ? `Groq / ${incident.diagnosis.modelUsed}` : 'Deterministic SRE Engine'})
                  </span>
                </div>
                <div className="text-xs font-mono text-amber-400 flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  UNVERIFIED HYPOTHESIS · PENDING ENGINEER CONFIRMATION
                </div>
              </div>

              {/* Suspected Root Cause Hypothesis */}
              <div className="p-4 sm:p-5 rounded-lg bg-[#0B1120] border border-slate-800 space-y-1.5">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">
                  Suspected Root Cause Hypothesis
                </div>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
                  {incident.diagnosis.suspectedRootCauseHypothesis}
                </p>
              </div>

              {/* Blast Radius & Contributing Factors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-lg bg-[#0B1120] border border-slate-800/80 space-y-1.5">
                  <span className="font-mono text-xs text-slate-400 uppercase tracking-wider font-medium">Blast Radius</span>
                  <p className="text-slate-200 text-sm leading-relaxed">{incident.diagnosis.blastRadius}</p>
                </div>
                <div className="p-4 rounded-lg bg-[#0B1120] border border-slate-800/80 space-y-1.5">
                  <span className="font-mono text-xs text-slate-400 uppercase tracking-wider font-medium">Contributing Factors</span>
                  <ul className="space-y-1 text-slate-200 text-sm leading-relaxed">
                    {incident.diagnosis.contributingFactors.map((f, i) => (
                      <li key={i}>· {f}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recalled Hindsight Memories Section */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">
                      Hindsight Long-Term Memory Recall ({incident.diagnosis.recalledMemoryCount} retrieved)
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Bank: sre-incident-bank-prod
                  </span>
                </div>

                {incident.diagnosis.recalledMemories.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#0B1120] border border-slate-800 text-sm text-slate-400 leading-relaxed">
                    No relevant past incident experiences found in Hindsight memory bank for this failure signature.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incident.diagnosis.recalledMemories.map((mem) => (
                      <div
                        key={mem.incidentId}
                        className="p-4 rounded-lg bg-[#0B1120] border border-cyan-900/40 space-y-2 text-sm"
                      >
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2.5">
                            <span className="text-cyan-400 font-semibold">{mem.incidentId}</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-400">Similarity: <strong className="text-cyan-300 font-medium">{mem.similarityScore}%</strong></span>
                            <span className="text-slate-600">·</span>
                            <span className="text-emerald-400 font-medium">Outcome: {mem.outcome}</span>
                          </div>
                          <span className="text-slate-400 tabular-nums">
                            {new Date(mem.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-200 text-sm font-sans leading-relaxed">
                          {mem.summary}
                        </p>
                        <div className="text-xs font-mono text-slate-400 pt-1.5 border-t border-slate-800">
                          Prior Resolution: <span className="text-slate-200 font-medium">{mem.resolution}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Structured AI Recommendations */}
              <div className="pt-2 space-y-4">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">
                  Evidence-Backed Recommendations
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  {incident.diagnosis.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-5 rounded-xl bg-[#0B1120] border border-slate-800 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-cyan-400 uppercase font-semibold">[{rec.actionType}]</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-400">{rec.targetResource}</span>
                          </div>
                          <h5 className="text-base font-semibold text-white">
                            {rec.actionTitle}
                          </h5>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-mono font-bold text-cyan-300 tabular-nums">
                              {rec.confidenceScore}% Confidence
                            </div>
                            <div className="text-xs text-slate-400">
                              {rec.supportingIncidentIds.length > 0
                                ? `Grounded in ${rec.supportingIncidentIds.join(', ')}`
                                : 'Grounded in log evidence'}
                            </div>
                          </div>

                          <button
                            onClick={() => onProposeRemediation(incident.id, rec.id)}
                            disabled={isProcessing || isResolved}
                            className="h-8 px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Propose Dry-Run</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-slate-200 font-sans leading-relaxed">
                        {rec.description}
                      </p>

                      <div className="p-3 rounded-lg bg-slate-900 text-xs font-mono text-slate-300 space-y-1 leading-relaxed">
                        <div><strong className="text-slate-200">Reasoning:</strong> {rec.reasoning}</div>
                        <div><strong className="text-slate-200">Confidence Rationale:</strong> {rec.confidenceExplanation}</div>
                      </div>

                      {/* Risks, Verification & Rollback */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1 font-mono">
                        <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/30 space-y-1">
                          <div className="text-rose-400 font-semibold">Identified Risks</div>
                          <ul className="text-slate-300 space-y-0.5 leading-relaxed">
                            {rec.risks.map((r, i) => (
                              <li key={i}>· {r}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-900/30 space-y-1">
                          <div className="text-cyan-400 font-semibold">Verification Steps</div>
                          <ul className="text-slate-300 space-y-0.5 leading-relaxed">
                            {rec.verificationSteps.map((v, i) => (
                              <li key={i}>· {v}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/30 space-y-1">
                          <div className="text-amber-400 font-semibold">Rollback Procedure</div>
                          <ul className="text-slate-300 space-y-0.5 leading-relaxed">
                            {rec.rollbackInstructions.map((rb, i) => (
                              <li key={i}>· {rb}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-xl bg-[#111928] border border-slate-800 text-center space-y-3">
              <Brain className="w-8 h-8 text-cyan-400 mx-auto" />
              <h3 className="text-base font-semibold text-white">No Diagnosis Generated Yet</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                Trigger Groq AI diagnosis to evaluate sanitized logs and recall matching experiences from Hindsight.
              </p>
              <button
                onClick={() => onRefreshDiagnosis(incident.id)}
                disabled={isProcessing}
                className="h-10 px-5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
              >
                Run AI Diagnosis Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Remediation & Approval Queue */}
      {activeTab === 'remediation' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-[#111928] border border-slate-800 p-3.5 space-y-1 shadow-xs">
            <h3 className="text-xs font-semibold text-white flex items-center gap-2 font-mono uppercase">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              Remediation Safety Protocol
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              All automated actions are executed as <strong className="text-cyan-300">DRY-RUN</strong> by default. Arbitrary shell commands, raw database operations, and unverified AI commands are strictly prohibited. Execution on <span className="font-mono text-slate-200 uppercase">{incident.environment}</span> requires explicit sign-off by an authorized Engineer or Admin.
            </p>
          </div>

          {incident.remediations.length === 0 ? (
            <div className="p-8 rounded-lg bg-[#111928] border border-slate-800 text-center space-y-2">
              <Terminal className="w-7 h-7 text-slate-500 mx-auto" />
              <h3 className="text-xs font-semibold text-slate-300">No Remediations Proposed</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Go to the Diagnosis tab and click "Propose Dry-Run" on any recommendation to test and queue it for review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {incident.remediations.map((rem) => {
                const isPending = rem.status === 'pending_approval';
                const isApproved = rem.status === 'approved';
                const isExecuted = rem.status === 'executed';

                return (
                  <div
                    key={rem.id}
                    className="p-4 rounded-lg bg-[#111928] border border-slate-800 space-y-3 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-cyan-400 uppercase font-semibold">[{rem.actionType}]</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-300">{rem.targetResource}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-400 tabular-nums">ID: {rem.id}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Proposed by <strong>{rem.executedBy}</strong> · Mode: <span className="font-mono text-cyan-300">{rem.isDryRun ? 'DRY-RUN SIMULATION' : 'LIVE'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs px-2 py-0.5 rounded border uppercase ${
                            isPending
                              ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                              : isApproved
                              ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
                              : isExecuted
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                              : 'bg-rose-950/60 border-rose-800 text-rose-300'
                          }`}
                        >
                          {rem.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Before & After State Diff */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-2.5 rounded bg-[#0B1120] border border-rose-950/50 space-y-1">
                        <div className="text-rose-400 font-semibold text-[11px] uppercase">
                          Telemetry Before Remediation
                        </div>
                        <pre className="text-slate-300 overflow-x-auto text-[11px]">
                          {JSON.stringify(rem.beforeState, null, 2)}
                        </pre>
                      </div>

                      <div className="p-2.5 rounded bg-[#0B1120] border border-emerald-950/50 space-y-1">
                        <div className="text-emerald-400 font-semibold text-[11px] uppercase">
                          Simulated Telemetry After Remediation
                        </div>
                        <pre className="text-slate-300 overflow-x-auto text-[11px]">
                          {JSON.stringify(rem.afterState, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Execution Audit Log */}
                    <div className="p-2.5 rounded bg-[#0B1120] border border-slate-800 font-mono text-[11px] space-y-0.5">
                      <div className="text-slate-400 font-semibold">Audit Execution Trail:</div>
                      {rem.executionLog.map((logLine, idx) => (
                        <div key={idx} className="text-slate-300">
                          {logLine}
                        </div>
                      ))}
                    </div>

                    {/* Approval Controls */}
                    {isPending && (
                      <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Optional authorization rationale or review note..."
                            value={selectedRemediationForApproval === rem.id ? approvalRationale : ''}
                            onChange={(e) => {
                              setSelectedRemediationForApproval(rem.id);
                              setApprovalRationale(e.target.value);
                            }}
                            className="w-full h-8 px-3 rounded bg-[#0B1120] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                          />
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => onApproval(incident.id, rem.id, 'rejected', approvalRationale)}
                            disabled={isProcessing || currentUser.role === 'Viewer'}
                            className="h-8 px-3 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-1 focus-visible:ring-rose-400 focus-visible:outline-hidden"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => onApproval(incident.id, rem.id, 'approved', approvalRationale)}
                            disabled={isProcessing || currentUser.role === 'Viewer'}
                            className="h-8 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-hidden"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Authorize</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Approved Action Execution */}
                    {isApproved && (
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-400">
                          Approved by {rem.approvalDecision?.approvedBy}. Ready to execute.
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onExecute(incident.id, rem.id, false, false)}
                            disabled={isProcessing}
                            className="h-8 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:outline-hidden"
                          >
                            Dry-Run Verification
                          </button>
                          <button
                            onClick={() => onExecute(incident.id, rem.id, true, true)}
                            disabled={isProcessing || currentUser.role === 'Viewer'}
                            className="h-8 px-3 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Apply Controlled Execution</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Sanitized Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-cyan-400 font-semibold">AUTOMATIC SECRET REDACTION ACTIVE</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                Credentials, JWTs, and DB URIs sanitized before AI processing
              </span>
            </div>
            <button
              onClick={copySanitizedLogs}
              className="h-7 px-2.5 rounded bg-[#111928] border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden"
            >
              {copiedLog ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLog ? 'Copied' : 'Copy Logs'}</span>
            </button>
          </div>

          <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3.5 font-mono text-xs overflow-x-auto max-h-[500px]">
            {incident.sanitizedLogs.length === 0 ? (
              <div className="text-slate-500">No log records ingested for this incident.</div>
            ) : (
              <div className="space-y-1.5">
                {incident.sanitizedLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-500 shrink-0 tabular-nums">{log.timestamp}</span>
                    <span
                      className={`shrink-0 uppercase font-bold text-[10px] px-1 rounded ${
                        log.level === 'fatal'
                          ? 'bg-rose-950 text-rose-400'
                          : log.level === 'error'
                          ? 'bg-rose-950/60 text-rose-400'
                          : log.level === 'warn'
                          ? 'bg-amber-950/60 text-amber-400'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-slate-300 break-all">{log.message}</span>
                    {log.redactedItemCount ? (
                      <span className="text-[10px] text-amber-400 font-mono shrink-0">
                        [{log.redactedItemCount} redacted]
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Post-Mortem */}
      {activeTab === 'postmortem' && (
        <PostMortemView incident={incident} />
      )}

      {/* Resolve Incident & Hindsight Learning Loop Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111928] border border-slate-800 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Resolve Incident & Retain Memory
              </h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Confirmed Root Cause (Verified by Engineer)</label>
                <textarea
                  rows={2}
                  required
                  value={confirmedRootCause}
                  onChange={(e) => setConfirmedRootCause(e.target.value)}
                  placeholder="Describe the verified root cause..."
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Resolution Outcome</label>
                <select
                  value={resolutionOutcome}
                  onChange={(e) => setResolutionOutcome(e.target.value as ResolutionOutcome)}
                  className="w-full h-8 px-2 rounded bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-cyan-500 cursor-pointer text-xs"
                >
                  <option value="successful">Successful (Fully Mitigated)</option>
                  <option value="partial">Partial (Degradation reduced, follow-up needed)</option>
                  <option value="failed">Failed Attempt (Mitigation ineffective)</option>
                  <option value="inconclusive">Inconclusive (Self-healed / unconfirmed)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Resolution Notes</label>
                <textarea
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Key steps taken, config values changed, and verification metrics..."
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-800/40 text-cyan-200 text-[11px] leading-relaxed">
                <strong>Hindsight Learning Guarantee:</strong> Submitting will retain this confirmed experience into the official Hindsight Long-Term Memory Bank. Future incidents with matching symptoms will automatically recall this resolution!
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="h-8 px-3 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="h-8 px-3.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm & Retain in Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
