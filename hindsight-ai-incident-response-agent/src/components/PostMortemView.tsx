import React, { useState } from 'react';
import { Incident, PostMortem } from '../types';
import { FileText, Download, CheckCircle, Clock } from 'lucide-react';

interface PostMortemViewProps {
  incident: Incident;
}

export const PostMortemView: React.FC<PostMortemViewProps> = ({ incident }) => {
  const pm = incident.postMortem;
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!pm) {
    return (
      <div className="p-8 rounded-lg bg-slate-900/90 border border-slate-800 text-center space-y-2">
        <FileText className="w-7 h-7 text-slate-500 mx-auto" />
        <h3 className="text-xs font-semibold text-white">Post-Mortem Pending</h3>
        <p className="text-xs text-slate-400">
          A post-mortem report will be automatically compiled upon incident resolution.
        </p>
      </div>
    );
  }

  const exportMarkdown = () => {
    const md = `# ${pm.title}
**Incident ID:** ${pm.incidentId}  
**Generated At:** ${new Date(pm.generatedAt).toUTCString()}  
**Root Cause Status:** ${pm.rootCauseStatus}  

---

## 1. Executive Summary
${pm.summary}

## 2. Impact Assessment
- **Downtime / Degradation Duration:** ${pm.impact.durationMinutes} minutes
- **Estimated Financial Impact:** $${pm.impact.financialEstimateUSD.toLocaleString()} USD
- **Affected Surface:** ${pm.impact.affectedUsersOrRequests}
- **SLA Breached:** ${pm.impact.slaBreached ? 'YES' : 'NO'}

## 3. Incident Timeline
${pm.timeline.map(t => `- **${t.timestamp}:** ${t.event}`).join('\n')}

## 4. Detection & Telemetry
- **Detection Method:** ${pm.detection.method}
- **Alert Name:** ${pm.detection.alertName}
- **Mean Time to Detect (MTTD):** ${pm.detection.meanTimeToDetectMinutes} minutes

## 5. Root Cause & Contributing Factors
${pm.rootCauseAnalysis}

### Contributing Factors:
${pm.contributingFactors.map(f => `- ${f}`).join('\n')}

## 6. Resolution Summary
${pm.resolutionSummary}

## 7. Action Items & Prevention Tasks
${pm.actionItems.map(a => `- [${a.status === 'completed' ? 'x' : ' '}] **${a.task}** (Owner: ${a.owner})`).join('\n')}

## 8. Lessons Learned
${pm.lessonsLearned.map(l => `- ${l}`).join('\n')}
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PostMortem_${pm.incidentId}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('Markdown downloaded');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const exportJSON = () => {
    const jsonStr = JSON.stringify(pm, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PostMortem_${pm.incidentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('JSON downloaded');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header and Download Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-xl bg-[#111928] border border-slate-800 shadow-xs">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase font-semibold tracking-wider">
            OFFICIAL SRE POST-MORTEM REPORT · {pm.id}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            {pm.title}
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          {downloadSuccess && (
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              <span>{downloadSuccess}</span>
            </span>
          )}
          <button
            onClick={exportMarkdown}
            className="h-10 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:outline-hidden"
          >
            <Download className="w-4 h-4" />
            <span>Markdown</span>
          </button>
          <button
            onClick={exportJSON}
            className="h-10 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:outline-hidden"
          >
            <Download className="w-4 h-4" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#111928] border border-slate-800 space-y-2 text-sm shadow-xs">
        <h3 className="font-mono text-slate-400 uppercase text-xs font-semibold tracking-wider">
          1. Incident Summary
        </h3>
        <p className="text-slate-200 leading-relaxed font-sans text-sm sm:text-[15px]">
          {pm.summary}
        </p>
      </div>

      {/* Impact Metric Cards (28-36px values) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#111928] border border-slate-800">
          <div className="text-xs text-slate-400 font-mono uppercase tracking-wide">Downtime Duration</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums mt-1">
            {pm.impact.durationMinutes}<span className="text-sm font-normal text-slate-400 ml-1">mins</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#111928] border border-slate-800">
          <div className="text-xs text-slate-400 font-mono uppercase tracking-wide">Financial Impact</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tabular-nums mt-1">
            ${pm.impact.financialEstimateUSD.toLocaleString()}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#111928] border border-slate-800">
          <div className="text-xs text-slate-400 font-mono uppercase tracking-wide">SLA Status</div>
          <div className={`text-base sm:text-lg font-bold font-mono mt-1 ${pm.impact.slaBreached ? 'text-rose-400' : 'text-emerald-400'}`}>
            {pm.impact.slaBreached ? 'BREACHED' : 'HONORED'}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#111928] border border-slate-800">
          <div className="text-xs text-slate-400 font-mono uppercase tracking-wide">Root Cause Status</div>
          <div className="text-sm sm:text-base font-semibold text-cyan-300 font-mono mt-1 capitalize">
            {pm.rootCauseStatus.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#111928] border border-slate-800 space-y-3.5 shadow-xs">
        <h3 className="font-mono text-slate-400 uppercase text-xs font-semibold tracking-wider">
          2. Event Timeline
        </h3>
        <div className="space-y-3 relative border-l border-slate-800 ml-2.5 pl-4">
          {pm.timeline.map((item, idx) => (
            <div key={idx} className="relative">
              <span className="w-2 h-2 rounded-full bg-cyan-400 absolute -left-[21px] top-1.5 ring-4 ring-[#111928]" />
              <div className="font-mono text-xs text-slate-400 tabular-nums">{item.timestamp}</div>
              <div className="text-slate-200 mt-1 text-sm sm:text-[15px] leading-relaxed font-sans">{item.event}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Root Cause Analysis & Resolution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="p-5 sm:p-6 rounded-xl bg-[#111928] border border-slate-800 space-y-2 shadow-xs">
          <h3 className="font-mono text-slate-400 uppercase text-xs font-semibold tracking-wider">
            3. Root Cause Analysis
          </h3>
          <p className="text-slate-200 leading-relaxed font-sans text-sm sm:text-[15px]">
            {pm.rootCauseAnalysis}
          </p>
          <div className="pt-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wide">Contributing Factors:</span>
            <ul className="space-y-1 mt-1 text-slate-300 text-sm">
              {pm.contributingFactors.map((f, i) => (
                <li key={i}>· {f}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-xl bg-[#111928] border border-slate-800 space-y-2 shadow-xs">
          <h3 className="font-mono text-slate-400 uppercase text-xs font-semibold tracking-wider">
            4. Resolution & Verification
          </h3>
          <p className="text-slate-200 leading-relaxed font-sans text-sm sm:text-[15px]">
            {pm.resolutionSummary}
          </p>
        </div>
      </div>

      {/* Action Items */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#111928] border border-slate-800 space-y-3 shadow-xs">
        <h3 className="font-mono text-slate-400 uppercase text-xs font-semibold tracking-wider">
          5. Action Items & Prevention Tasks
        </h3>
        <div className="space-y-2">
          {pm.actionItems.map((act) => (
            <div
              key={act.id}
              className="p-3 rounded-lg bg-[#0B1120] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-cyan-400 text-xs font-semibold">{act.id}</span>
                <span className="text-slate-200 text-sm">{act.task}</span>
              </div>
              <div className="flex items-center gap-2.5 font-mono text-xs">
                <span className="text-slate-400">Owner: {act.owner}</span>
                <span className={`px-2 py-0.5 rounded font-medium ${
                  act.status === 'completed'
                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40'
                    : 'bg-amber-950/70 text-amber-400 border border-amber-800/40'
                }`}>
                  {act.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lessons Learned */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#111928] border border-slate-800 space-y-2 text-sm shadow-xs">
        <h3 className="font-mono text-slate-400 uppercase text-xs font-semibold tracking-wider">
          6. SRE Lessons Learned
        </h3>
        <ul className="space-y-1.5 text-slate-300 text-sm sm:text-[15px] leading-relaxed">
          {pm.lessonsLearned.map((l, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-cyan-400">•</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
