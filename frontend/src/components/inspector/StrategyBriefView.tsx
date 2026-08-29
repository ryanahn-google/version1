import { Compass, UserCheck, MessageSquare, Award, Volume2 } from 'lucide-react';
import type { CampaignBriefDeliverable } from '../../types/campaign';

export function StrategyBriefView({ data }: { data?: CampaignBriefDeliverable | null }) {
  if (!data) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
        <Compass className="h-8 w-8 mb-2 stroke-1 text-slate-600" />
        <p className="text-sm">Stage 2: Strategy & Brief deliverable has not been generated yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-sm">
      {/* Campaign Title & Value Proposition */}
      <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-800/40 rounded-lg p-4">
        {data.campaignTitle && (
          <div className="text-xs text-blue-400 font-mono uppercase tracking-wider mb-1">
            {data.campaignTitle}
          </div>
        )}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <Award className="h-4 w-4 text-blue-400" />
          Core Value Proposition
        </h3>
        <p className="text-slate-100 font-medium text-sm leading-snug">{data.coreValueProposition}</p>
      </div>

      {/* Target Personas */}
      {data.targetPersonas && data.targetPersonas.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
            <UserCheck className="h-4 w-4" />
            Target Personas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.targetPersonas.map((persona, i) => (
              <div key={i} className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                  <span className="font-semibold text-slate-100">{persona.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded">
                    {persona.demographics}
                  </span>
                </div>
                {persona.primaryNeeds && (
                  <div className="mb-2">
                    <span className="text-[11px] text-emerald-300/80 font-medium block">Primary Needs:</span>
                    <ul className="list-disc list-inside text-slate-400 text-[11px] mt-0.5 space-y-0.5">
                      {persona.primaryNeeds.map((need, idx) => (
                        <li key={idx}>{need}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {persona.barriers && (
                  <div>
                    <span className="text-[11px] text-rose-300/80 font-medium block">Adoption Barriers:</span>
                    <ul className="list-disc list-inside text-slate-400 text-[11px] mt-0.5 space-y-0.5">
                      {persona.barriers.map((barrier, idx) => (
                        <li key={idx}>{barrier}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messaging Pillars */}
      {data.messagingPillars && data.messagingPillars.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Key Messaging Pillars
          </h3>
          <div className="space-y-2.5">
            {data.messagingPillars.map((pillar, i) => (
              <div key={i} className="bg-slate-950/60 border border-slate-800 rounded p-3 text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-2">
                  <span className="text-cyan-400 font-mono">0{i + 1}.</span>
                  {pillar.pillar}
                </div>
                {pillar.keyMessage && (
                  <p className="text-slate-300 italic mt-1 text-xs">"{pillar.keyMessage}"</p>
                )}
                {pillar.proofPoints && (
                  <ul className="list-disc list-inside text-slate-400 text-[11px] mt-1.5 space-y-0.5 pl-2">
                    {pillar.proofPoints.map((pt, idx) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tone and Voice */}
      {data.toneAndVoice && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex items-center gap-3 text-xs">
          <Volume2 className="h-5 w-5 text-purple-400 flex-shrink-0" />
          <div>
            <span className="font-semibold text-slate-200 block text-xs">Tone & Voice Guidelines:</span>
            <span className="text-slate-400 text-xs">{data.toneAndVoice.join(' &bull; ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
