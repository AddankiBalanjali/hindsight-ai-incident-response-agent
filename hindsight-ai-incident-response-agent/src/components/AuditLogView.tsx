import React, { useState, useEffect } from 'react';
import { AuditLogEntry, UserRole } from '../types';
import { History, Search, Filter } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, severityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header (28-32px title, 14-16px subtext) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Audit Log</h1>
          <p className="text-sm sm:text-[15px] text-slate-300 mt-1 leading-relaxed">
            Immutable, timestamped record of diagnoses, approvals, dry-run remediations, and memory retention.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#111928] border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, incident ID, or action keywords..."
            className="w-full pl-10 pr-3.5 h-10 rounded-lg bg-[#0B1120] border border-slate-700/80 text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-10 px-3 rounded-lg bg-[#0B1120] border border-slate-700/80 text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All Actions</option>
              <option value="incident_created">Incident Created</option>
              <option value="diagnosis_generated">Diagnosis Generated</option>
              <option value="remediation_proposed">Remediation Proposed</option>
              <option value="remediation_approved">Remediation Approved</option>
              <option value="remediation_rejected">Remediation Rejected</option>
              <option value="remediation_executed">Remediation Executed</option>
              <option value="incident_resolved">Incident Resolved</option>
              <option value="memory_retained">Memory Retained</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-10 px-3 rounded-lg bg-[#0B1120] border border-slate-700/80 text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-slate-800 bg-[#111928] overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-400 font-mono">
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No audit records match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0B1120]/90 text-slate-400 font-mono text-xs">
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Timestamp</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Severity</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Actor & Role</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Action</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Target</th>
                  <th className="py-3 px-4 font-medium uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {logs.map((log) => {
                  const isCrit = log.severity === 'critical';
                  const isHigh = log.severity === 'high';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 tabular-nums whitespace-nowrap text-xs">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <span
                          className={`font-bold uppercase text-xs ${
                            isCrit
                              ? 'text-rose-400'
                              : isHigh
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          [{log.severity}]
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-slate-200 font-medium text-xs sm:text-sm">{log.actor.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">{log.actor.role}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-cyan-300 text-xs sm:text-sm whitespace-nowrap capitalize">
                        {log.action.replace(/_/g, ' ')}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">
                        {log.targetId}
                      </td>

                      <td className="py-3.5 px-4 text-slate-200 max-w-md font-sans text-xs sm:text-sm leading-relaxed">
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
