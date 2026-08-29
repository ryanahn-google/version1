import { useState } from 'react';
import { FileJson, Code, Download, Copy, Check } from 'lucide-react';
import type { StageKey, CampaignSessionResponse } from '../../types/campaign';
import { STAGES } from '../../types/campaign';
import { MarketSensingView } from './MarketSensingView';
import { StrategyBriefView } from './StrategyBriefView';
import { CreativeContentView } from './CreativeContentView';
import { PerformanceInsightsView } from './PerformanceInsightsView';

interface DeliverableInspectorProps {
  session: CampaignSessionResponse | null;
  selectedStage: StageKey;
  onSelectStage: (stage: StageKey) => void;
}

export function DeliverableInspector({
  session,
  selectedStage,
  onSelectStage,
}: DeliverableInspectorProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const deliverables = session?.deliverables;
  const stageInfo = STAGES.find((s) => s.id === selectedStage) || STAGES[0];
  const currentStageData = deliverables ? deliverables[stageInfo.deliverableKey] : null;

  const handleCopyJson = () => {
    if (!currentStageData) return;
    navigator.clipboard.writeText(JSON.stringify(currentStageData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!currentStageData) return;
    const blob = new Blob([JSON.stringify(currentStageData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = stageInfo.outputName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-slate-950/20 overflow-hidden">
      {/* Tab Navigation Header */}
      <div className="border-b border-slate-800 bg-slate-950/40 px-6 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-1 overflow-x-auto">
          {STAGES.map((st) => {
            const hasData = Boolean(deliverables && deliverables[st.deliverableKey]);
            const isSelected = selectedStage === st.id;

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onSelectStage(st.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>{st.name}</span>
                {hasData && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-emerald-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {currentStageData && (
            <>
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className={`p-1.5 rounded border text-xs flex items-center gap-1 transition ${
                  showRawJson
                    ? 'bg-slate-800 border-slate-600 text-white'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
                title="Toggle JSON View"
              >
                <Code className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">JSON</span>
              </button>
              <button
                type="button"
                onClick={handleCopyJson}
                className="p-1.5 rounded border border-slate-800 text-slate-400 hover:bg-slate-900 transition"
                title="Copy JSON"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="p-1.5 rounded border border-slate-800 text-slate-400 hover:bg-slate-900 transition"
                title="Download Deliverable"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Deliverable Content Canvas */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Deliverable Meta Banner */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <FileJson className="h-5 w-5 text-blue-400" />
              {stageInfo.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{stageInfo.description}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              {stageInfo.outputName}
            </span>
          </div>
        </div>

        {/* View Mode: Raw JSON or Rich Visualizer */}
        {showRawJson ? (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-emerald-300 overflow-x-auto select-text leading-relaxed">
            <pre>{JSON.stringify(currentStageData, null, 2)}</pre>
          </div>
        ) : (
          <>
            {selectedStage === 'MARKET_SENSING' && (
              <MarketSensingView data={deliverables?.marketSensing} />
            )}
            {selectedStage === 'STRATEGY_BRIEF' && (
              <StrategyBriefView data={deliverables?.campaignBrief} />
            )}
            {selectedStage === 'CREATIVE_CONTENT' && (
              <CreativeContentView data={deliverables?.creativeContent} />
            )}
            {selectedStage === 'PERFORMANCE_INSIGHTS' && (
              <PerformanceInsightsView
                data={deliverables?.performanceInsights}
                creativeContent={deliverables?.creativeContent}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
