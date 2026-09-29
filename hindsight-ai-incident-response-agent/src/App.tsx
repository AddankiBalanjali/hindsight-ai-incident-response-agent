import React, { useState, useEffect, useCallback } from 'react';
import { Incident, SystemHealthStatus, HindsightMemoryRecord, UserSession, ResolutionOutcome, SupportingMemoryCitation } from './types';
import { TopBar } from './components/TopBar';
import { DashboardOverview } from './components/DashboardOverview';
import { IncidentsList } from './components/IncidentsList';
import { IncidentDetail } from './components/IncidentDetail';
import { ApprovalQueueDrawer } from './components/ApprovalQueueDrawer';
import { MemoryExplorer } from './components/MemoryExplorer';
import { AuditLogView } from './components/AuditLogView';
import { ConnectorsView } from './components/ConnectorsView';
import { SettingsModal } from './components/SettingsModal';
import { SimulateIncidentModal } from './components/SimulateIncidentModal';
import { NewIncidentModal } from './components/NewIncidentModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [memories, setMemories] = useState<HindsightMemoryRecord[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatus | null>(null);

  const [currentUser, setCurrentUser] = useState<UserSession>({
    id: 'usr-sre-primary',
    name: 'SRE On-Call Engineer',
    email: 'sre-oncall@hackwithhyderabad.dev',
    role: 'Engineer',
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isNewIncidentOpen, setIsNewIncidentOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper headers for user role injection
  const getAuthHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'x-user-role': currentUser.role,
      'x-user-name': currentUser.name,
      'x-user-id': currentUser.id,
      'x-user-email': currentUser.email,
    };
  }, [currentUser]);

  // Load all system data
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [healthRes, incRes, memRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/incidents?limit=50'),
        fetch('/api/memory'),
      ]);

      if (healthRes.ok) {
        const health = await healthRes.json();
        setSystemHealth(health);
      }
      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData.incidents || []);
        // Update selected incident if one is open
        if (selectedIncident) {
          const updated = (incData.incidents || []).find((i: Incident) => i.id === selectedIncident.id);
          if (updated) setSelectedIncident(updated);
        }
      }
      if (memRes.ok) {
        const memData = await memRes.json();
        setMemories(memData.memories || []);
      }
    } catch (err: any) {
      console.error('Failed to load application data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedIncident]);

  useEffect(() => {
    loadData();
  }, []);

  // Handlers for Incident actions
  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncident(incident);
  };

  const handleRefreshDiagnosis = async (incidentId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/diagnose`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedIncident(data.incident);
        showToast('Diagnosis refreshed using Groq and Hindsight memory.');
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to refresh diagnosis');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProposeRemediation = async (incidentId: string, recommendationId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/remediations/propose`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ recommendationId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedIncident(data.incident);
        showToast('Remediation plan proposed as DRY-RUN and queued for approval.');
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to propose remediation');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproval = async (
    incidentId: string,
    remediationId: string,
    decision: 'approved' | 'rejected',
    rationale?: string
  ) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/remediations/${remediationId}/approval`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ decision, rationale }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedIncident(data.incident);
        showToast(`Remediation was ${decision} by ${currentUser.name}.`);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit approval decision');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecute = async (
    incidentId: string,
    remediationId: string,
    executeLive: boolean,
    confirmedRisk: boolean
  ) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/remediations/${remediationId}/execute`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ executeLive, confirmedRisk }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedIncident(data.incident);
        showToast(executeLive ? 'Remediation executed on target resource.' : 'Dry-run verification completed.');
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to execute remediation');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveIncident = async (
    incidentId: string,
    confirmedRootCause: string,
    outcome: ResolutionOutcome,
    notes: string
  ) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/resolve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ confirmedRootCause, outcome, notes }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedIncident(data.incident);
        showToast('Incident resolved! Confirmed experience retained in Hindsight Memory bank.');
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to resolve incident');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateScenario = async (scenarioId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/connectors/simulate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ scenarioId }),
      });
      if (res.ok) {
        const newIncident = await res.json();
        setIsSimulateOpen(false);
        showToast(`Simulation launched: ${newIncident.title}`);
        await loadData();
        setSelectedIncident(newIncident);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewIncident = async (data: any) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        setIsNewIncidentOpen(false);
        showToast(`Incident ${created.id} ingested successfully.`);
        await loadData();
        setSelectedIncident(created);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to ingest incident');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearchRecall = async (query: string): Promise<SupportingMemoryCitation[]> => {
    try {
      const res = await fetch(`/api/memory?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        return data.results || [];
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  // Compute pending approvals across all active incidents
  const pendingApprovalsCount = incidents.reduce((acc, inc) => {
    return acc + inc.remediations.filter(r => r.status === 'pending_approval').length;
  }, 0);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans selection:bg-cyan-900/50 selection:text-cyan-200 antialiased">
      {/* Top Bar with Strict Contract */}
      <TopBar
        currentTab={selectedIncident ? 'incident-detail' : currentTab}
        setCurrentTab={(tab) => {
          setSelectedIncident(null);
          setCurrentTab(tab);
        }}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        systemHealth={systemHealth}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSimulate={() => setIsSimulateOpen(true)}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Main Content Area - 1440px constraint with 8-point spacing */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#0F172A] border border-cyan-700/50 text-cyan-200 text-xs sm:text-sm font-mono flex items-center justify-between shadow-md animate-in fade-in duration-150">
            <span className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              <span>{toastMessage}</span>
            </span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-cyan-400 hover:text-white cursor-pointer ml-4 font-sans text-sm leading-none p-1 rounded hover:bg-cyan-950"
              aria-label="Dismiss toast"
            >
              ✕
            </button>
          </div>
        )}

        {/* Views */}
        {selectedIncident ? (
          <IncidentDetail
            incident={selectedIncident}
            currentUser={currentUser}
            onBack={() => setSelectedIncident(null)}
            onRefreshDiagnosis={handleRefreshDiagnosis}
            onProposeRemediation={handleProposeRemediation}
            onApproval={handleApproval}
            onExecute={handleExecute}
            onResolveIncident={handleResolveIncident}
            isProcessing={isProcessing}
          />
        ) : currentTab === 'overview' ? (
          <DashboardOverview
            incidents={incidents}
            memories={memories}
            systemHealth={systemHealth}
            onSelectIncident={handleSelectIncident}
            onOpenSimulate={() => setIsSimulateOpen(true)}
            onOpenNewIncident={() => setIsNewIncidentOpen(true)}
            onNavigateTab={setCurrentTab}
          />
        ) : currentTab === 'incidents' ? (
          <IncidentsList
            incidents={incidents}
            onSelectIncident={handleSelectIncident}
            onOpenNewIncident={() => setIsNewIncidentOpen(true)}
          />
        ) : currentTab === 'memory' ? (
          <MemoryExplorer
            memories={memories}
            onSearchRecall={handleSearchRecall}
          />
        ) : currentTab === 'approval-queue' ? (
          <ApprovalQueueDrawer
            incidents={incidents}
            currentUser={currentUser}
            onApproval={handleApproval}
            onExecute={handleExecute}
            onSelectIncident={handleSelectIncident}
            isProcessing={isProcessing}
          />
        ) : currentTab === 'audit' ? (
          <AuditLogView />
        ) : currentTab === 'connectors' ? (
          <ConnectorsView
            onSimulateScenario={handleSimulateScenario}
            isProcessing={isProcessing}
          />
        ) : null}
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemHealth={systemHealth}
        onRefreshHealth={loadData}
      />

      <SimulateIncidentModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onSimulateScenario={handleSimulateScenario}
        isProcessing={isProcessing}
      />

      <NewIncidentModal
        isOpen={isNewIncidentOpen}
        onClose={() => setIsNewIncidentOpen(false)}
        onSubmit={handleNewIncident}
        isProcessing={isProcessing}
      />
    </div>
  );
}
