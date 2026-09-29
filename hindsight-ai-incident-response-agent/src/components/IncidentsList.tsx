import React, { useState, useMemo } from 'react';
import { Incident, Severity } from '../types';
import { Search, Plus, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface IncidentsListProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  onOpenNewIncident: () => void;
}

export const IncidentsList: React.FC<IncidentsListProps> = ({
  incidents,
  onSelectIncident,
  onOpenNewIncident,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && inc.status === 'resolved') return false;
        if (statusFilter !== 'active' && inc.status !== statusFilter) return false;
      }
      if (severityFilter !== 'all' && inc.severity !== severityFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = inc.title.toLowerCase().includes(q);
        const matchId = inc.id.toLowerCase().includes(q);
        const matchService = inc.serviceName.toLowerCase().includes(q);
        const matchSymptoms = inc.symptoms.some(s => s.toLowerCase().includes(q));
        if (!matchTitle && !matchId && !matchService && !matchSymptoms) return false;
      }
      return true;
    });
  }, [incidents, search, statusFilter, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / itemsPerPage));
  const paginatedIncidents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredIncidents.slice(start, start + itemsPerPage);
  }, [filteredIncidents, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Header and Controls (Page title 28-32px, subtext 14-16px) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            Incidents
          </h1>
          <p className="text-sm sm:text-[15px] text-slate-300 mt-1 leading-[1.6]">
            Real-time telemetry triage, Groq hypotheses, and official Hindsight memory recall
          </p>
        </div>

        <button
          onClick={onOpenNewIncident}
          className="h-10 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto shadow-sm focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
        >
          <Plus className="w-4 h-4" />
          <span>Ingest Incident</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 sm:p-4 rounded-xl bg-[#111928] border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search incidents by ID, service, symptoms, or error signatures..."
            className="w-full pl-10 pr-4 h-10 rounded-lg bg-[#0B1120] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Segmented Controls for Status */}
        <div className="flex items-center gap-1 p-1 bg-[#0B1120] rounded-lg border border-slate-800 shrink-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'approval_pending', label: 'In Queue' },
            { id: 'resolved', label: 'Resolved' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden ${
                statusFilter === tab.id
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Severity Select */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-400 font-mono text-xs uppercase tracking-wider">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 px-3 rounded-lg bg-[#0B1120] border border-slate-800 text-sm text-slate-200 focus:outline-hidden focus:border-cyan-500 cursor-pointer font-medium"
          >
            <option value="all">All Severities</option>
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - High</option>
            <option value="P3">P3 - Medium</option>
            <option value="P4">P4 - Low</option>
          </select>
        </div>
      </div>

      {/* Incidents Data Table */}
      <div className="rounded-xl border border-slate-800 bg-[#111928] overflow-hidden shadow-xs">
        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-slate-200">No Incidents Found</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              No incidents match the selected filter criteria. Try clearing search or ingest a new incident.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0B1120]/80 text-slate-400 font-mono text-xs tracking-wider">
                    <th className="py-3.5 px-4 font-semibold uppercase">SEVERITY</th>
                    <th className="py-3.5 px-4 font-semibold uppercase">ID</th>
                    <th className="py-3.5 px-4 font-semibold uppercase">SERVICE & TITLE</th>
                    <th className="py-3.5 px-4 font-semibold uppercase">STATUS</th>
                    <th className="py-3.5 px-4 font-semibold uppercase">HINDSIGHT MEMORY</th>
                    <th className="py-3.5 px-4 font-semibold uppercase text-right">TIMESTAMP</th>
                    <th className="py-3.5 px-4 font-semibold uppercase text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {paginatedIncidents.map((incident) => {
                    const isP1 = incident.severity === 'P1';
                    const isP2 = incident.severity === 'P2';
                    const isResolved = incident.status === 'resolved';

                    return (
                      <tr
                        key={incident.id}
                        onClick={() => onSelectIncident(incident)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        {/* Severity */}
                        <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                          <span
                            className={`font-bold text-xs sm:text-sm ${
                              isP1
                                ? 'text-rose-400'
                                : isP2
                                ? 'text-amber-400'
                                : 'text-cyan-400'
                            }`}
                          >
                            [{incident.severity}]
                          </span>
                        </td>

                        {/* ID */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-cyan-300 whitespace-nowrap">
                          {incident.id}
                        </td>

                        {/* Service & Title */}
                        <td className="py-3.5 px-4 max-w-md">
                          <div className="font-mono text-xs font-medium text-slate-400 group-hover:text-cyan-300 transition-colors">
                            {incident.serviceName}
                          </div>
                          <div className="text-sm sm:text-[15px] font-semibold text-white truncate mt-0.5 leading-snug">
                            {incident.title}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`capitalize font-mono text-xs sm:text-[13px] ${
                              isResolved
                                ? 'text-emerald-400 font-medium'
                                : incident.status === 'approval_pending'
                                ? 'text-amber-400 font-semibold'
                                : 'text-cyan-400 font-medium'
                            }`}
                          >
                            {incident.status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Hindsight Memory Recall & Retain Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-300 font-mono text-xs sm:text-[13px]">
                          {incident.hindsightMemoryRetained ? (
                            <span className="text-emerald-400 font-medium">✓ Retained in Bank</span>
                          ) : incident.diagnosis ? (
                            <span className="text-cyan-300 font-medium">
                              {incident.diagnosis.recalledMemoryCount} recalled
                            </span>
                          ) : (
                            <span className="text-slate-500">Pending diagnosis</span>
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 text-right font-mono text-slate-400 tabular-nums whitespace-nowrap text-xs sm:text-[13px]">
                          {new Date(incident.createdAt).toLocaleDateString()} {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectIncident(incident);
                            }}
                            className="h-8 px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-[13px] font-semibold transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden"
                          >
                            {isResolved ? 'Post-Mortem' : 'Investigate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination and Count footer */}
            <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-400 font-mono">
              <div>
                Showing <span className="text-slate-200 font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-200 font-semibold">{Math.min(currentPage * itemsPerPage, filteredIncidents.length)}</span> of <span className="text-slate-200 font-semibold">{filteredIncidents.length}</span> incidents
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md bg-[#0B1120] border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 text-xs sm:text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md bg-[#0B1120] border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
