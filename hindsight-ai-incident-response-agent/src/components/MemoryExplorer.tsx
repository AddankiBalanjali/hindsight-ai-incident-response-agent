import React, { useState } from 'react';
import { HindsightMemoryRecord, SupportingMemoryCitation } from '../types';
import { Database, Search, Sparkles, CheckCircle2 } from 'lucide-react';

interface MemoryExplorerProps {
  memories: HindsightMemoryRecord[];
  onSearchRecall: (query: string) => Promise<SupportingMemoryCitation[]>;
}

export const MemoryExplorer: React.FC<MemoryExplorerProps> = ({
  memories,
  onSearchRecall,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SupportingMemoryCitation[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await onSearchRecall(query);
      setSearchResults(res);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSearchResults(null);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header and Bank Profile (28-32px title, 14-16px subtext) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <span>Hindsight Memory Bank</span>
          </h1>
          <p className="text-sm sm:text-[15px] text-slate-300 mt-1 leading-relaxed">
            Vectorized operational memory retaining continuous institutional intelligence across past production incidents.
          </p>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-xs self-start sm:self-auto shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-[#111928] border border-slate-800 text-slate-300 shadow-xs">
            Bank: <span className="text-cyan-400 font-semibold">sre-incident-bank-prod</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#111928] border border-slate-800 text-slate-300 shadow-xs">
            Experiences: <span className="text-cyan-400 font-semibold tabular-nums">{memories.length}</span>
          </div>
        </div>
      </div>

      {/* Interactive Memory Recall Search Box */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#111928] border border-slate-800 space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
            Interactive Multi-Strategy Recall Query
          </span>
          <span className="text-xs font-mono text-slate-400">
            BM25 + Dense Semantic Embeddings + Temporal Traversal
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 'MongoDB connection pool exhaustion', 'Redis OOM token validation', 'Kafka consumer lag'..."
              className="w-full pl-10 pr-3.5 h-10 rounded-lg bg-[#0B1120] border border-slate-700/80 text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSearching}
              className="h-10 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSearching ? 'Recalling...' : 'Recall'}</span>
            </button>
            {searchResults && (
              <button
                type="button"
                onClick={handleClear}
                className="h-10 px-3.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-sm font-medium cursor-pointer transition-colors focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:outline-hidden"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Quick query tags */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 text-xs font-mono">Sample queries:</span>
          {['MongoDB wait queue pool timeout', 'Redis volatile-lru eviction', 'Kafka consumer rebalance lag'].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setQuery(sample);
                onSearchRecall(sample).then(setSearchResults);
              }}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden rounded px-1.5 py-0.5 bg-[#0B1120] border border-slate-800"
            >
              "{sample}"
            </button>
          ))}
        </div>
      </div>

      {/* Search Results if active */}
      {searchResults !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
              Recall Search Results ({searchResults.length})
            </h3>
            <span className="text-slate-400 font-mono text-xs">Query: "{query}"</span>
          </div>

          {searchResults.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#111928] border border-slate-800 text-center text-sm text-slate-400">
              No memories in the bank matched this query with sufficient relevance score.
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((mem) => (
                <div
                  key={mem.incidentId}
                  className="p-5 rounded-xl bg-[#111928] border border-cyan-500/30 space-y-2.5 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 font-mono text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-cyan-400 font-bold">{mem.incidentId}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300">Similarity: <strong className="text-cyan-300">{mem.similarityScore}%</strong></span>
                      <span className="text-slate-600">·</span>
                      <span className="text-emerald-400">Outcome: {mem.outcome}</span>
                    </div>
                    <span className="text-slate-400 text-xs tabular-nums">
                      {new Date(mem.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 font-sans leading-relaxed">
                    {mem.summary}
                  </p>

                  <div className="p-3 rounded-lg bg-[#0B1120] font-mono text-xs text-slate-300 border border-slate-800 leading-relaxed">
                    <span className="text-cyan-400 font-semibold">Resolution: </span>
                    {mem.resolution}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Complete Bank Memory Catalog */}
      <div className="space-y-3">
        <h3 className="text-base sm:text-lg font-semibold text-white">
          Retained Experience Catalog ({memories.length})
        </h3>

        <div className="space-y-3">
          {memories.map((mem) => (
            <div
              key={mem.id}
              className="p-5 rounded-xl bg-[#111928] border border-slate-800 space-y-2.5 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800 pb-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-cyan-400 font-semibold">{mem.incidentId}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-200 font-medium">{mem.serviceName}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400">[{mem.category}]</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500">ID: {mem.id}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-emerald-400 font-semibold uppercase">Outcome: {mem.metadata.outcome}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400 tabular-nums">
                    {new Date(mem.metadata.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-200 font-sans leading-relaxed">
                {mem.content}
              </p>

              <div className="p-2.5 rounded-lg bg-[#0B1120] text-xs font-mono text-slate-400 border border-slate-800/80 leading-relaxed">
                <strong className="text-slate-300">Root Cause:</strong> {mem.metadata.rootCause} · <strong className="text-slate-300">Environment:</strong> {mem.metadata.environment}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
