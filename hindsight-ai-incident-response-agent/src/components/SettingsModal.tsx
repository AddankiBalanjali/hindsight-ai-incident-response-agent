import React from 'react';
import { SystemHealthStatus } from '../types';
import { Shield, Database, Cpu, Brain, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemHealth: SystemHealthStatus | null;
  onRefreshHealth: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  systemHealth,
  onRefreshHealth,
}) => {
  if (!isOpen) return null;

  const mongo = systemHealth?.services.mongodb;
  const groq = systemHealth?.services.groq;
  const hindsight = systemHealth?.services.hindsight;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#111928] border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Integration Health & Service Configurations
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Operational Mode Banner */}
        <div className={`p-4 rounded-xl border text-sm leading-relaxed ${
          systemHealth?.isDemoMode
            ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
            : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2 font-mono font-bold uppercase mb-1 text-xs">
            <span className={`w-2 h-2 rounded-full ${systemHealth?.isDemoMode ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span>OPERATIONAL MODE: {systemHealth?.isDemoMode ? 'DEMO MODE' : 'PRODUCTION MODE'}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            {systemHealth?.isDemoMode
              ? 'External credentials (Atlas / Groq / Hindsight) are omitted or in sample format. The agent operates safely using deterministic mock engines and in-memory persistence.'
              : 'All production endpoints and API credentials are verified and active.'}
          </p>
        </div>

        {/* 3 Core Services Status & Actionable Instructions */}
        <div className="space-y-3.5 text-sm">
          {/* 1. MongoDB Atlas */}
          <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-white text-sm">1. MongoDB Atlas Storage</h3>
              </div>
              <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase ${
                mongo?.connected
                  ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                {mongo?.mode || 'in_memory_demo'}
              </span>
            </div>
            <p className="text-slate-400 font-mono text-xs">
              Status: {mongo?.details}
            </p>

            {!mongo?.connected && (
              <div className="p-3 rounded-lg bg-[#111928] border border-slate-800 text-slate-300 space-y-1.5 font-mono text-xs">
                <strong className="text-cyan-300 font-sans text-xs">Setup Instructions:</strong>
                <ol className="list-decimal pl-4 space-y-1 text-slate-300 leading-relaxed">
                  <li>Create a free cluster on <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">MongoDB Atlas</a>.</li>
                  <li>In Database Access, create a database user and record credentials.</li>
                  <li>Set <code className="text-cyan-300">MONGODB_URI="mongodb+srv://..."</code> in your environment.</li>
                </ol>
              </div>
            )}
          </div>

          {/* 2. Groq LLM API */}
          <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-white text-sm">2. Groq LLaMA-3.3 Diagnostic Engine</h3>
              </div>
              <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase ${
                groq?.configured
                  ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                {groq?.mode || 'mock_deterministic'}
              </span>
            </div>
            <p className="text-slate-400 font-mono text-xs">
              Status: {groq?.details}
            </p>

            {!groq?.configured && (
              <div className="p-3 rounded-lg bg-[#111928] border border-slate-800 text-slate-300 space-y-1.5 font-mono text-xs">
                <strong className="text-cyan-300 font-sans text-xs">Setup Instructions:</strong>
                <ol className="list-decimal pl-4 space-y-1 text-slate-300 leading-relaxed">
                  <li>Navigate to <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Groq Console</a> and generate an API key.</li>
                  <li>Set <code className="text-cyan-300">GROQ_API_KEY="gsk_..."</code> in your environment.</li>
                </ol>
              </div>
            )}
          </div>

          {/* 3. Official Vectorize Hindsight */}
          <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-white text-sm">3. Vectorize Hindsight Long-Term Memory</h3>
              </div>
              <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase ${
                hindsight?.configured
                  ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                {hindsight?.mode || 'local_demo_bank'}
              </span>
            </div>
            <p className="text-slate-400 font-mono text-xs">
              Status: {hindsight?.details}
            </p>

            {!hindsight?.configured && (
              <div className="p-3 rounded-lg bg-[#111928] border border-slate-800 text-slate-300 space-y-1.5 font-mono text-xs">
                <strong className="text-cyan-300 font-sans text-xs">Setup Instructions:</strong>
                <ol className="list-decimal pl-4 space-y-1 text-slate-300 leading-relaxed">
                  <li>Deploy Hindsight via <a href="https://vectorize.io" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Vectorize.io Hindsight</a>.</li>
                  <li>Set <code className="text-cyan-300">HINDSIGHT_API_KEY="hs_..."</code> and <code className="text-cyan-300">HINDSIGHT_BANK_ID="sre-incident-bank-prod"</code>.</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Security Parameters Info */}
        <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 text-xs font-mono text-slate-400 space-y-1 leading-relaxed">
          <div className="text-slate-200 font-semibold font-sans text-xs sm:text-sm">Active Security Guarantees:</div>
          <div>· Dry-run by default: <span className="text-cyan-400 font-medium">ENABLED</span></div>
          <div>· Allowed remediation envs: <span className="text-cyan-400 font-medium">development, staging</span> (production gated)</div>
          <div>· Automatic secret & token redaction: <span className="text-cyan-400 font-medium">ACTIVE</span></div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={onRefreshHealth}
            className="h-10 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 cursor-pointer transition-colors focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:outline-hidden"
          >
            Re-check Services
          </button>
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm text-white font-semibold cursor-pointer shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
