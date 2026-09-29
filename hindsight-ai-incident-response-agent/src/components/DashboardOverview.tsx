import React from 'react';
import { Incident, SystemHealthStatus, HindsightMemoryRecord } from '../types';
import { AlertTriangle, Activity, Database, Clock, ShieldAlert, Cpu, ArrowRight, Sparkles, Plus, CheckCircle2 } from 'lucide-react';

interface DashboardOverviewProps {
  incidents: Incident[];
  memories: HindsightMemoryRecord[];
  systemHealth: SystemHealthStatus | null;
  onSelectIncident: (incident: Incident) => void;
  onOpenSimulate: () => void;
  onOpenNewIncident: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  incidents,
  memories,
  systemHealth,
  onSelectIncident,
  onOpenSimulate,
  onOpenNewIncident,
  onNavigateTab,
}) => {
  const activeIncidents = incidents.filter(i => i.status !== 'resolved');
  const p1Incidents = activeIncidents.filter(i => i.severity === 'P1');

  // Check for critical active incident (e.g. Payment Gateway or highest severity active incident)
  const priorityIncident = activeIncidents.find(i => i.severity === 'P1') || activeIncidents[0];

  // Microservices topology health registry
  const services = [
    {
      name: 'payment-checkout-api',
      tier: 'Tier 1',
      status: priorityIncident?.serviceName.includes('payment') ? 'degraded' : 'nominal',
      activeIncidentId: priorityIncident?.serviceName.includes('payment') ? priorityIncident.id : undefined,
      telemetry: priorityIncident?.serviceName.includes('payment') ? '504 Spike · Pool 100%' : 'p99: 42ms · 0.02% err',
    },
    {
      name: 'orders-service',
      tier: 'Tier 1',
      status: 'nominal',
      telemetry: 'p99: 68ms · Pool: 24/150',
    },
    {
      name: 'auth-service',
      tier: 'Tier 1',
      status: 'nominal',
      telemetry: 'p99: 14ms · Redis RAM: 22%',
    },
    {
      name: 'inventory-worker',
      tier: 'Tier 2',
      status: 'nominal',
      telemetry: 'Lag: 12 msg · 4 workers',
    },
    {
      name: 'mongodb-atlas-primary',
      tier: 'Database',
      status: priorityIncident?.serviceName.includes('payment') ? 'warning' : 'nominal',
      telemetry: priorityIncident?.serviceName.includes('payment') ? 'Conns: 1,480/1,500' : 'Conns: 312/1,500',
    },
    {
      name: 'hindsight-memory-bank',
      tier: 'AI Memory',
      status: 'nominal',
      telemetry: `${memories.length} retained items`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-bold text-white leading-tight">
            Overview
          </h1>
          <p className="text-[15px] text-slate-300 mt-1 leading-[1.6]">
            Autonomous incident triage, Groq-powered diagnosis, and official Hindsight long-term memory
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <button
            onClick={onOpenNewIncident}
            className="h-10 px-4 rounded-lg bg-[#111928] border border-slate-700/80 hover:bg-slate-800 text-[15px] font-medium leading-[1.5] text-slate-200 flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
          >
            <Plus className="w-4 h-4 text-slate-400" />
            <span>Ingest Incident</span>
          </button>
          <button
            onClick={onOpenSimulate}
            className="h-10 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[15px] font-medium leading-[1.5] flex items-center gap-2 transition-colors cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
          >
            <Sparkles className="w-4 h-4" />
            <span>Simulate Failure</span>
          </button>
        </div>
      </div>

      {/* 2. Active Incident Banner (Requirement 4 & 5: exact typography, separate metadata row, vertical separation, aligned column) */}
      {priorityIncident && (
        <div className="rounded-xl border border-rose-900/50 bg-[#111928] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
          <div className="min-w-0 flex-1">
            {/* Separate metadata row with 12px to 16px gap, 13px font size, 1.6 line-height */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[13px] leading-[1.6]">
              <span className="px-2.5 py-1 rounded-md bg-rose-950 text-rose-300 border border-rose-800 font-mono font-bold tracking-wide">
                {priorityIncident.severity} ACTIVE
              </span>
              <span className="font-mono text-slate-200 font-semibold">{priorityIncident.id}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300 font-medium">{priorityIncident.serviceName}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 uppercase tracking-wide font-mono">{priorityIncident.environment}</span>
            </div>

            {/* Incident title on its own line with 12px to 16px vertical separation: 22px, font-weight 600, line-height 1.4 */}
            <h2 className="mt-3.5 text-[22px] font-semibold text-white leading-[1.4]">
              {priorityIncident.title}
            </h2>

            {/* Incident description with clear 8px gap: 15px, font-weight 400, line-height 1.65 */}
            <p className="mt-2 text-[15px] font-normal text-slate-300 leading-[1.65] max-w-4xl">
              {priorityIncident.symptoms.join(' · ')}
            </p>
          </div>

          {/* Action button in separate aligned column on desktop, stacked below on mobile. Button text: 15px, font-weight 500, line-height 1.5 */}
          <div className="shrink-0 self-stretch md:self-center mt-2 md:mt-0">
            <button
              onClick={() => onSelectIncident(priorityIncident)}
              className="h-10 w-full md:w-auto px-5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[15px] font-medium leading-[1.5] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-hidden"
            >
              <span>View Diagnosis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. SRE Metrics Grid (Requirement 8: 28-36px values, uniform height, aligned labels, responsive columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Active Incidents */}
        <div className="p-5 rounded-xl bg-[#111928] border border-slate-800 flex flex-col justify-between min-h-[116px]">
          <div className="flex items-center justify-between text-xs font-medium font-mono text-slate-400 uppercase tracking-wider">
            <span>Active Incidents</span>
            <AlertTriangle className={`w-4 h-4 ${activeIncidents.length > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className="text-3xl sm:text-[32px] font-bold font-mono text-white tabular-nums my-1.5 leading-none">
            {activeIncidents.length}
          </div>
          <div className="text-xs text-slate-400 truncate">
            {p1Incidents.length} Critical P1 · {activeIncidents.length - p1Incidents.length} Other
          </div>
        </div>

        {/* Stored Memories */}
        <div className="p-5 rounded-xl bg-[#111928] border border-slate-800 flex flex-col justify-between min-h-[116px]">
          <div className="flex items-center justify-between text-xs font-medium font-mono text-slate-400 uppercase tracking-wider">
            <span>Stored Memories</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl sm:text-[32px] font-bold font-mono text-cyan-300 tabular-nums my-1.5 leading-none">
            {memories.length}
          </div>
          <div className="text-xs text-slate-400 truncate">
            Vectorize Hindsight bank
          </div>
        </div>

        {/* Mean Time to Detect */}
        <div className="p-5 rounded-xl bg-[#111928] border border-slate-800 flex flex-col justify-between min-h-[116px]">
          <div className="flex items-center justify-between text-xs font-medium font-mono text-slate-400 uppercase tracking-wider">
            <span>Mean Time To Detect</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl sm:text-[32px] font-bold font-mono text-white tabular-nums my-1.5 leading-none">
            3.2<span className="text-sm font-normal text-slate-400 ml-1.5">min</span>
          </div>
          <div className="text-xs text-slate-400 truncate">
            SLO latency monitoring
          </div>
        </div>

        {/* Mean Time to Resolve */}
        <div className="p-5 rounded-xl bg-[#111928] border border-slate-800 flex flex-col justify-between min-h-[116px]">
          <div className="flex items-center justify-between text-xs font-medium font-mono text-slate-400 uppercase tracking-wider">
            <span>Mean Time To Resolve</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl sm:text-[32px] font-bold font-mono text-emerald-400 tabular-nums my-1.5 leading-none">
            18.5<span className="text-sm font-normal text-slate-400 ml-1.5">min</span>
          </div>
          <div className="text-xs text-slate-400 truncate">
            -42% with memory recall
          </div>
        </div>

        {/* Remediation Safety */}
        <div className="p-5 rounded-xl bg-[#111928] border border-slate-800 sm:col-span-2 lg:col-span-3 xl:col-span-1 flex flex-col justify-between min-h-[116px]">
          <div className="flex items-center justify-between text-xs font-medium font-mono text-slate-400 uppercase tracking-wider">
            <span>Remediation Safety</span>
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-cyan-300 my-1.5 leading-tight">
            DRY-RUN DEFAULT
          </div>
          <div className="text-xs text-slate-400 truncate">
            Human approval enforced
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout: Service Health & Incident Activity (Requirement 9) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Service Health Matrix */}
        <div className="lg:col-span-1 rounded-xl bg-[#111928] border border-slate-800 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Service Topology
            </h3>
            <span className="text-xs font-mono text-slate-400">Status</span>
          </div>

          <div className="p-4 sm:p-5 space-y-3 flex-1">
            {services.map((svc) => (
              <div
                key={svc.name}
                className="p-3.5 rounded-lg border border-slate-800/80 bg-[#0B1120] flex items-center justify-between gap-3 text-sm hover:border-slate-700 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        svc.status === 'nominal'
                          ? 'bg-emerald-500'
                          : svc.status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-rose-500 animate-pulse'
                      }`}
                    />
                    <span className="font-mono text-sm font-medium text-slate-200 truncate">
                      {svc.name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    <span className="text-slate-300">{svc.tier}</span> · {svc.telemetry}
                  </div>
                </div>

                {svc.activeIncidentId && (
                  <button
                    onClick={() => {
                      const inc = incidents.find(i => i.id === svc.activeIncidentId);
                      if (inc) onSelectIncident(inc);
                    }}
                    className="shrink-0 text-xs px-2.5 py-1 rounded-md bg-rose-950 text-rose-300 border border-rose-800 hover:text-white font-medium cursor-pointer focus-visible:ring-1 focus-visible:ring-rose-400 focus-visible:outline-hidden"
                  >
                    Investigate
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400">Ready to test response?</span>
            <button
              onClick={onOpenSimulate}
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden rounded px-1.5 py-0.5"
            >
              Simulate Failure →
            </button>
          </div>
        </div>

        {/* Right Columns: Recent Incidents & Memory Stream */}
        <div className="lg:col-span-2 rounded-xl bg-[#111928] border border-slate-800 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">
                Recent Incidents & Memory Recall
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('incidents')}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden rounded px-1.5 py-0.5"
            >
              View all ({incidents.length}) →
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-3.5 flex-1">
            {incidents.slice(0, 4).map((incident) => {
              const isResolved = incident.status === 'resolved';
              const isP1 = incident.severity === 'P1';

              return (
                <div
                  key={incident.id}
                  onClick={() => onSelectIncident(incident)}
                  className="p-4 sm:p-5 rounded-lg border border-slate-800/80 bg-[#0B1120] hover:border-slate-700 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <span
                        className={`font-mono font-bold text-xs ${
                          isP1
                            ? 'text-rose-400'
                            : incident.severity === 'P2'
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        [{incident.severity}]
                      </span>
                      <span className="font-mono text-cyan-300 font-semibold">{incident.id}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300 font-mono font-medium">{incident.serviceName}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400 font-mono tabular-nums">
                        {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-semibold text-white leading-snug">
                      {incident.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>Status: <strong className="text-slate-200 capitalize font-medium">{incident.status.replace('_', ' ')}</strong></span>
                      <span>·</span>
                      <span className="uppercase font-mono text-slate-400">{incident.environment}</span>
                      {incident.diagnosis && (
                        <>
                          <span>·</span>
                          <span className="text-cyan-400 font-mono">
                            {incident.diagnosis.recalledMemoryCount} memories recalled
                          </span>
                        </>
                      )}
                      {incident.hindsightMemoryRetained && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-400 font-mono">✓ Retained in Memory</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIncident(incident);
                      }}
                      className="h-8 px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs sm:text-[13px] font-medium text-slate-200 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden"
                    >
                      {isResolved ? 'Post-Mortem' : 'Investigate →'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
