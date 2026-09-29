import React from 'react';
import { Sparkles, X } from 'lucide-react';

interface SimulateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateScenario: (scenarioId: string) => Promise<void>;
  isProcessing: boolean;
}

export const SimulateIncidentModal: React.FC<SimulateIncidentModalProps> = ({
  isOpen,
  onClose,
  onSimulateScenario,
  isProcessing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#111928] border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Simulate Failure Scenarios (HACKWITHHYDERABAD 3.0)
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed font-sans">
          Inject realistic SRE telemetry to trigger secret sanitization, Groq diagnosis, and Hindsight memory recall:
        </p>

        <div className="space-y-3">
          {/* Option 1: Payment API MongoDB Pool */}
          <div
            onClick={() => onSimulateScenario('sim_payment_mongo_pool')}
            className="p-4 rounded-xl bg-[#0B1120] border border-rose-900/40 hover:border-rose-500/80 transition-colors cursor-pointer space-y-1.5 group shadow-xs focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-hidden"
            tabIndex={0}
            role="button"
            onKeyDown={(e) => e.key === 'Enter' && onSimulateScenario('sim_payment_mongo_pool')}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-rose-400 font-bold">[P1 CRITICAL]</span>
              <span className="text-slate-400">Payment Service</span>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-rose-300 transition-colors">
              Payment Gateway: MongoDB Connection Pool Saturated
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              High-concurrency checkout traffic exhausts maxPoolSize=50, triggering MongoWaitQueueFullException and 504 timeouts.
            </p>
          </div>

          {/* Option 2: Auth Service Redis */}
          <div
            onClick={() => onSimulateScenario('sim_redis_eviction_auth')}
            className="p-4 rounded-xl bg-[#0B1120] border border-amber-900/40 hover:border-amber-500/80 transition-colors cursor-pointer space-y-1.5 group shadow-xs focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-hidden"
            tabIndex={0}
            role="button"
            onKeyDown={(e) => e.key === 'Enter' && onSimulateScenario('sim_redis_eviction_auth')}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-400 font-bold">[P2 HIGH]</span>
              <span className="text-slate-400">Auth Service</span>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
              Auth Token Validation Latency & Redis OOM
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Session tokens without TTL cause Redis volatile-lru eviction thrashing, driving token verification latency to 850ms.
            </p>
          </div>

          {/* Option 3: Kafka Inventory Lag */}
          <div
            onClick={() => onSimulateScenario('sim_kafka_inventory_lag')}
            className="p-4 rounded-xl bg-[#0B1120] border border-cyan-900/40 hover:border-cyan-500/80 transition-colors cursor-pointer space-y-1.5 group shadow-xs focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-hidden"
            tabIndex={0}
            role="button"
            onKeyDown={(e) => e.key === 'Enter' && onSimulateScenario('sim_kafka_inventory_lag')}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-400 font-bold">[P3 MEDIUM]</span>
              <span className="text-slate-400">Inventory Sync</span>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              Inventory Kafka Consumer Lag Accumulation
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Slow database bulk writes trigger rebalance loops, delaying stock updates by 18 minutes.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-300 hover:text-white cursor-pointer transition-colors focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:outline-hidden"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
