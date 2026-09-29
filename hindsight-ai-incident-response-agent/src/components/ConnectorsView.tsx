import React, { useState } from 'react';
import { Sparkles, Copy, Check, Radio } from 'lucide-react';

interface ConnectorsViewProps {
  onSimulateScenario: (scenarioId: string) => Promise<void>;
  isProcessing: boolean;
}

export const ConnectorsView: React.FC<ConnectorsViewProps> = ({
  onSimulateScenario,
  isProcessing,
}) => {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const webhookUrl = `${window.location.origin}/api/connectors/webhook`;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header (28-32px title, 14-16px subtext) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Connectors</h1>
          <p className="text-sm sm:text-[15px] text-slate-300 mt-1 leading-relaxed">
            Production alert webhook listeners and simulation triggers for HACKWITHHYDERABAD 3.0.
          </p>
        </div>
      </div>

      {/* Simulated Incident Scenarios (1-Click Trigger) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            Simulated Incident Scenarios
          </h2>
          <span className="text-xs font-mono text-slate-400">Zero production changes required</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scenario 1: Payment API to MongoDB Connection Pool Exhaustion */}
          <div className="p-5 rounded-xl bg-[#111928] border border-rose-900/40 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-rose-400 font-bold">[P1 CRITICAL]</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300 font-mono">MongoDB</span>
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-white">
                Payment API Connection Pool Failure
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                Flash-sale traffic exhausts maxPoolSize=50, triggering MongoWaitQueueFullException and HTTP 504 gateway timeouts.
              </p>
            </div>

            <button
              onClick={() => onSimulateScenario('sim_payment_mongo_pool')}
              disabled={isProcessing}
              className="h-9 w-full rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-hidden"
            >
              <Sparkles className="w-4 h-4" />
              <span>Simulate P1 Scenario</span>
            </button>
          </div>

          {/* Scenario 2: Redis Session Cache OOM */}
          <div className="p-5 rounded-xl bg-[#111928] border border-amber-900/40 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-amber-400 font-bold">[P2 HIGH]</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300 font-mono">Redis OOM</span>
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-white">
                Auth Token Validation Latency
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                Missing session token TTL triggers volatile-lru eviction thrashing, driving token verification latency to 850ms.
              </p>
            </div>

            <button
              onClick={() => onSimulateScenario('sim_redis_eviction_auth')}
              disabled={isProcessing}
              className="h-9 w-full rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-hidden"
            >
              <Sparkles className="w-4 h-4" />
              <span>Simulate P2 Scenario</span>
            </button>
          </div>

          {/* Scenario 3: Kafka Consumer Rebalance Lag */}
          <div className="p-5 rounded-xl bg-[#111928] border border-cyan-900/40 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-cyan-400 font-bold">[P3 MEDIUM]</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300 font-mono">Kafka Lag</span>
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-white">
                Inventory Consumer Group Lag
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                Slow database bulk writes trigger rebalance loops, delaying stock reservation events by 18 minutes.
              </p>
            </div>

            <button
              onClick={() => onSimulateScenario('sim_kafka_inventory_lag')}
              disabled={isProcessing}
              className="h-9 w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
            >
              <Sparkles className="w-4 h-4" />
              <span>Simulate P3 Scenario</span>
            </button>
          </div>
        </div>
      </div>

      {/* Webhook Endpoint for Real Production Observability */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#111928] border border-slate-800 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            Active Webhook Ingestion Endpoint
          </h2>
          <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
            STATUS: LISTENING
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="flex-1 h-10 px-3.5 rounded-lg bg-[#0B1120] border border-slate-700/80 font-mono text-xs sm:text-sm text-slate-300 select-all"
          />
          <button
            onClick={copyUrl}
            className="h-10 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-medium text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:outline-hidden"
          >
            {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedWebhook ? 'Copied' : 'Copy URL'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 font-mono leading-relaxed">
          Accepts POST HTTP JSON payloads with fields: <code className="text-cyan-300 font-mono">title</code>, <code className="text-cyan-300 font-mono">service</code>, <code className="text-cyan-300 font-mono">severity</code>, <code className="text-cyan-300 font-mono">symptoms</code>, and <code className="text-cyan-300 font-mono">logs</code>.
        </p>
      </div>

      {/* Documented Read-Only Integration Paths */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#111928] border border-slate-800 space-y-4 shadow-xs">
        <h2 className="text-base sm:text-lg font-semibold text-white">
          Documented Read-Only Provider Integration Paths
        </h2>

        <div className="space-y-3 text-xs sm:text-sm">
          <div className="p-4 rounded-lg bg-[#0B1120] border border-slate-800 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-semibold text-slate-200 font-mono text-xs sm:text-sm">1. Datadog Monitor Webhook Integration</span>
              <span className="text-slate-400 font-mono text-xs">Read-only webhook</span>
            </div>
            <p className="text-slate-300 font-sans text-xs sm:text-sm leading-relaxed">
              In Datadog, navigate to <strong>Integrations → Webhooks</strong>. Configure a new webhook with URL pointing to this endpoint. In Monitor notification messages, include <code className="text-cyan-300 font-mono">@webhook-hindsight-agent</code> with payload <code className="text-cyan-300 font-mono">{`{"title": "$EVENT_TITLE", "service": "$TAGS[service]", "severity": "$ALERT_TYPE"}`}</code>.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#0B1120] border border-slate-800 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-semibold text-slate-200 font-mono text-xs sm:text-sm">2. AWS CloudWatch Alarms / SNS Topic</span>
              <span className="text-slate-400 font-mono text-xs">SNS HTTPS Subscription</span>
            </div>
            <p className="text-slate-300 font-sans text-xs sm:text-sm leading-relaxed">
              Subscribe this webhook URL to an AWS SNS topic configured as the action for CloudWatch Alarm state changes. The agent automatically acknowledges subscription verifications and ingests Alarm state transitions.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#0B1120] border border-slate-800 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-semibold text-slate-200 font-mono text-xs sm:text-sm">3. Prometheus Alertmanager / Grafana Loki</span>
              <span className="text-slate-400 font-mono text-xs">Alertmanager webhook_config</span>
            </div>
            <p className="text-slate-300 font-sans text-xs sm:text-sm leading-relaxed">
              In <code className="text-slate-200 font-mono">alertmanager.yml</code>, define a receiver pointing to <code className="text-cyan-300 font-mono">{webhookUrl}</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
