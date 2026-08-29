import { TrendingUp, Users, ShieldAlert, BarChart2, Lightbulb } from 'lucide-react';
import type { MarketSensingDeliverable } from '../../types/campaign';

export function MarketSensingView({ data }: { data?: MarketSensingDeliverable | null }) {
  if (!data) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
        <TrendingUp className="h-8 w-8 mb-2 stroke-1 text-slate-600" />
        <p className="text-sm">Stage 1: Market Sensing deliverable has not been generated yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-sm">
      {/* Target Market Overview */}
      {data.targetMarket && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4" />
            Target Market Profile
          </h3>
          <p className="text-slate-300 leading-relaxed text-xs">{data.targetMarket}</p>
        </div>
      )}

      {/* Consumer Trends */}
      {data.consumerTrends && data.consumerTrends.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Key Consumer Trends
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.consumerTrends.map((trend, i) => (
              <div key={i} className="bg-slate-950/60 border border-slate-800/80 rounded p-2.5 flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                <span className="text-xs font-medium text-slate-200">{trend}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Analysis */}
      {data.competitiveAnalysis && data.competitiveAnalysis.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Competitive Landscape
          </h3>
          <div className="space-y-2">
            {data.competitiveAnalysis.map((comp, i) => (
              <div key={i} className="bg-slate-950/60 border border-slate-800/80 rounded p-3 text-xs">
                <div className="font-semibold text-slate-200 mb-1">{comp.competitor}</div>
                {comp.strengths && (
                  <div className="text-slate-400 text-[11px]">
                    <span className="text-emerald-400 font-medium">Strengths:</span> {comp.strengths.join(', ')}
                  </div>
                )}
                {comp.vulnerabilities && (
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    <span className="text-rose-400 font-medium">Vulnerabilities:</span> {comp.vulnerabilities.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sentiment Overview & Strategic Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.sentimentOverview && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              Sentiment Signals
            </h3>
            <div className="bg-slate-950 px-3 py-2 rounded border border-slate-800 mb-2">
              <span className="text-slate-500 block text-[10px]">Sentiment Score</span>
              <span className="text-emerald-300 font-semibold font-mono text-sm">
                {(data.sentimentOverview.overallSentimentScore * 100).toFixed(0)}% Positive
              </span>
            </div>
            {data.sentimentOverview.positiveThemes && (
              <div className="text-xs text-slate-300">
                <span className="text-[11px] text-slate-500 block">Top Themes:</span>
                <span>{data.sentimentOverview.positiveThemes.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {data.strategicOpportunities && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4" />
              Strategic Opportunities
            </h3>
            <ul className="space-y-1 text-xs text-slate-300">
              {data.strategicOpportunities.map((op, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-400 mt-0.5">&bull;</span>
                  <span>{op}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
