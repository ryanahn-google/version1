import { DollarSign, ArrowUpRight, PieChart, CheckCircle, BarChart3, Image as ImageIcon } from 'lucide-react';
import type { PerformanceInsightsDeliverable, CreativeContentDeliverable } from '../../types/campaign';

interface PerformanceInsightsViewProps {
  data?: PerformanceInsightsDeliverable | null;
  creativeContent?: CreativeContentDeliverable | null;
}

export function PerformanceInsightsView({ data, creativeContent }: PerformanceInsightsViewProps) {
  if (!data) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
        <PieChart className="h-8 w-8 mb-2 stroke-1 text-slate-600" />
        <p className="text-sm">Stage 4: Performance & Insights deliverable has not been generated yet.</p>
      </div>
    );
  }

  const allocations = data.channelAllocations || [];
  const visualUrl = data.creativeAssetUrl || creativeContent?.assetUrl;

  return (
    <div className="space-y-5 text-sm">
      {/* Evaluated Creative Visual Concept Banner */}
      {visualUrl && (
        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-slate-900/80 border border-blue-900/50 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group flex-shrink-0">
            <img
              src={visualUrl}
              alt="Evaluated Campaign Asset"
              className="w-48 h-28 object-cover rounded-lg border border-slate-700/80 shadow-md transition group-hover:scale-[1.02]"
            />
            <span className="absolute bottom-1.5 right-1.5 bg-slate-950/80 text-[10px] font-mono text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
              16:9 Visual
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                Evaluated Campaign Creative Asset
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium">
                Nano Banana 2 Lite
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-100 truncate">
              {data.visualConceptSummary || creativeContent?.visualConceptTitle || 'Campaign Visual Mockup'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              This high-resolution creative visual concept was directly analyzed to project higher CTR and engagement across visually driven channels (Social Media and Digital Video).
            </p>
          </div>
        </div>
      )}

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Expected ROAS</span>
          <div className="flex items-baseline gap-1.5 text-emerald-400 font-bold text-xl font-mono">
            <span>{data.expectedRoas ? `${data.expectedRoas}x` : '3.8x'}</span>
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Total Budget</span>
          <div className="text-slate-100 font-bold text-xl font-mono">
            ${data.totalBudget ? data.totalBudget.toLocaleString() : '1,000,000'}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Projected Clicks</span>
          <div className="text-cyan-300 font-bold text-xl font-mono">
            {data.projectedKpis?.estimatedClicks ? data.projectedKpis.estimatedClicks.toLocaleString() : '-'}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Est. Conversions</span>
          <div className="text-purple-300 font-bold text-xl font-mono">
            {data.projectedKpis?.estimatedConversions ? data.projectedKpis.estimatedConversions.toLocaleString() : '-'}
          </div>
        </div>
      </div>

      {/* Budget Allocation Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-1.5">
          <DollarSign className="h-4 w-4" />
          Channel Budget Allocation Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="pb-2">Channel</th>
                <th className="pb-2 text-right">Allocated Budget ($)</th>
                <th className="pb-2 text-right">Share (%)</th>
                <th className="pb-2 pl-4">Strategic Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allocations.map((item, i) => (
                <tr key={i} className="hover:bg-slate-950/40 transition">
                  <td className="py-2.5 font-medium text-slate-200">{item.channel}</td>
                  <td className="py-2.5 text-right text-slate-300 font-mono">
                    ${item.allocationAmount ? item.allocationAmount.toLocaleString() : '-'}
                  </td>
                  <td className="py-2.5 text-right text-cyan-400 font-mono font-semibold">
                    {item.percentage}%
                  </td>
                  <td className="py-2.5 pl-4 text-slate-400 text-[11px] leading-relaxed">
                    {item.rationale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Projected KPI Details & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.projectedKpis && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Projected Performance KPIs
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Estimated Impressions:</span>
                <span className="font-mono text-slate-200">{data.projectedKpis.estimatedImpressions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Estimated Clicks:</span>
                <span className="font-mono text-slate-200">{data.projectedKpis.estimatedClicks.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Projected CTR:</span>
                <span className="font-mono text-emerald-400">{(data.projectedKpis.projectedCtr * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Conversions:</span>
                <span className="font-mono text-purple-300">{data.projectedKpis.estimatedConversions.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {data.recommendations && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              Recommendations
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">&bull;</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
