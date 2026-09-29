import React, { useState } from 'react';
import { Severity } from '../types';
import { Plus, X, Shield } from 'lucide-react';

interface NewIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    serviceName: string;
    environment: 'production' | 'staging' | 'development';
    severity: Severity;
    symptoms: string[];
    rawLogsSnippet: string;
  }) => Promise<void>;
  isProcessing: boolean;
}

export const NewIncidentModal: React.FC<NewIncidentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isProcessing,
}) => {
  const [title, setTitle] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development'>('production');
  const [severity, setSeverity] = useState<Severity>('P2');
  const [symptomsText, setSymptomsText] = useState('');
  const [rawLogs, setRawLogs] = useState('');

  if (!isOpen) return null;

  const handlePreFill = () => {
    setTitle('Checkout Payment Sockets Starved on Atlas Cluster');
    setServiceName('payment-checkout-api');
    setSeverity('P1');
    setSymptomsText('MongoWaitQueueFullException: 50/50 pool connections busy\nHTTP 504 Gateway Timeout on /v1/checkout/charge\nP99 latency spiked to 3.8s');
    setRawLogs(`[${new Date().toISOString()}] [ERROR] payment-checkout-api: MongoServerSelectionError: connection pool exhausted (maxPoolSize=50)
[${new Date().toISOString()}] [FATAL] payment-checkout-api: MongoWaitQueueFullException: waitQueueTimeoutMS=2500 exceeded
[${new Date().toISOString()}] [WARN] payment-checkout-api: URI mongodb+srv://pay_user:SecretPass123@prod.mongodb.net/checkout reported socket timeout
[${new Date().toISOString()}] [ERROR] payment-checkout-api: Authorization Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.s64... failed`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !serviceName.trim()) return;

    const symptoms = symptomsText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    await onSubmit({
      title,
      serviceName,
      environment,
      severity,
      symptoms: symptoms.length > 0 ? symptoms : ['Elevated error rate'],
      rawLogsSnippet: rawLogs,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#111928] border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Plus className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Manual Incident & Log Ingestion
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm font-sans">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePreFill}
              className="text-xs font-mono text-cyan-400 hover:underline cursor-pointer bg-[#0B1120] border border-cyan-800/40 px-2 py-1 rounded"
            >
              Fill Sample SRE Scenario
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium text-xs sm:text-sm">Incident Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Payment Gateway MongoDB Connection Starvation"
              className="w-full h-10 px-3 rounded-lg bg-[#0B1120] border border-slate-700/80 text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium text-xs sm:text-sm">Service Name</label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="payment-checkout-api"
                className="w-full h-10 px-3 rounded-lg bg-[#0B1120] border border-slate-700/80 font-mono text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium text-xs sm:text-sm">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="w-full h-10 px-2.5 rounded-lg bg-[#0B1120] border border-slate-700/80 text-white focus:outline-hidden focus:border-cyan-500 cursor-pointer font-mono text-xs sm:text-sm"
              >
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium text-xs sm:text-sm">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
                className="w-full h-10 px-2.5 rounded-lg bg-[#0B1120] border border-slate-700/80 text-white focus:outline-hidden focus:border-cyan-500 cursor-pointer font-mono uppercase text-xs sm:text-sm"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium text-xs sm:text-sm">Symptoms (one per line)</label>
            <textarea
              rows={3}
              value={symptomsText}
              onChange={(e) => setSymptomsText(e.target.value)}
              placeholder="HTTP 504 Gateway Timeout spike&#10;MongoDB wait queue full error"
              className="w-full p-3 rounded-lg bg-[#0B1120] border border-slate-700/80 font-mono text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs sm:text-sm leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-medium text-xs sm:text-sm">Raw Logs Snippet</label>
              <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Auto-sanitized
              </span>
            </div>
            <textarea
              rows={4}
              value={rawLogs}
              onChange={(e) => setRawLogs(e.target.value)}
              placeholder="Paste raw stacktraces, log lines with sensitive credentials..."
              className="w-full p-3 rounded-lg bg-[#0B1120] border border-slate-700/80 font-mono text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:outline-hidden text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="h-10 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer shadow-xs disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden text-sm"
            >
              {isProcessing ? 'Ingesting...' : 'Ingest & Trigger Diagnosis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
