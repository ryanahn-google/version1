import { DollarSign, ArrowUpRight, PieChart, CheckCircle, BarChart3 } from 'lucide-react';
import type { PerformanceInsightsDeliverable } from '../../types/campaign';

export function PerformanceInsightsView({ data }: { data?: PerformanceInsightsDeliverable | null }) {
  if (!data) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
        <PieChart className="h-8 w-8 mb-2 stroke-1 text-slate-600" />
        <p className="text-sm">Stage 4: Performance & Insights deliverable has not been generated yet.</p>
      </div>
    );
  }

  const allocations = data.channelAllocations || [];

  return (
    <div className="space-y-5 text-sm">
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
