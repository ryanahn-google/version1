import { CheckCircle2, Clock, AlertCircle, Terminal, Bot } from 'lucide-react';
import type { StageKey, CampaignSessionResponse, StageInfo } from '../../types/campaign';
import { STAGES } from '../../types/campaign';
import type { LogEntry } from '../../hooks/useCampaignStream';

interface DagTimelineProps {
  session: CampaignSessionResponse | null;
  selectedStage: StageKey;
  onSelectStage: (stage: StageKey) => void;
  logs: LogEntry[];
  isStreaming: boolean;
}

export function DagTimeline({
  session,
  selectedStage,
  onSelectStage,
  logs,
  isStreaming,
}: DagTimelineProps) {
  const currentStageIndex = session
    ? STAGES.findIndex((s) => s.id === session.currentStage)
    : -1;

  const getStageStatus = (stage: StageInfo, index: number) => {
    if (!session) return 'idle';

    const deliverables = session.deliverables;
    const hasDeliverable = deliverables && deliverables[stage.deliverableKey];

    if (session.status === 'COMPLETED') {
      return 'completed';
    }

    if (stage.id === session.currentStage) {
      if (session.status === 'PAUSED_FOR_REVIEW') return 'waiting_approval';
      if (isStreaming || session.status === 'RUNNING') return 'running';
      return hasDeliverable ? 'waiting_approval' : 'running';
    }

    if (index < currentStageIndex || hasDeliverable) {
      return 'completed';
    }

    return 'pending';
  };

  return (
    <section className="w-full md:w-96 lg:w-[420px] flex-shrink-0 bg-slate-950/40 border-r border-slate-800 flex flex-col justify-between overflow-hidden">
      {/* Stages DAG Stepper */}
      <div className="p-5 border-b border-slate-800 overflow-y-auto max-h-[50%]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Bot className="h-4 w-4 text-cyan-400" />
            Multi-Agent DAG Pipeline
          </h2>
          {session && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              {session.status}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {STAGES.map((stage, idx) => {
            const status = getStageStatus(stage, idx);
            const isSelected = selectedStage === stage.id;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onSelectStage(stage.id)}
                className={`w-full text-left p-3 rounded-lg border transition flex items-start gap-3 ${
                  isSelected
                    ? 'bg-slate-900 border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Status Indicator Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {status === 'completed' && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  )}
                  {status === 'running' && (
                    <div className="h-5 w-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  )}
                  {status === 'waiting_approval' && (
                    <Clock className="h-5 w-5 text-amber-400 animate-pulse" />
                  )}
                  {status === 'pending' && (
                    <div className="h-5 w-5 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500">
                      {idx + 1}
                    </div>
                  )}
                  {status === 'idle' && (
                    <div className="h-5 w-5 rounded-full border border-slate-800 flex items-center justify-center text-[10px] text-slate-600">
                      {idx + 1}
                    </div>
                  )}
                </div>

                {/* Stage Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {stage.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                        status === 'completed'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : status === 'waiting_approval'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800/60 font-medium'
                          : status === 'running'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60 animate-pulse'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {status === 'waiting_approval' ? 'Human Review' : status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {stage.agentName} &bull; <span className="font-mono text-slate-500">{stage.model}</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Streaming Agent Thought Logs Console */}
      <div className="p-4 flex-1 flex flex-col min-h-0 bg-slate-950/90 font-mono text-[11px]">
        <div className="flex items-center justify-between text-slate-400 mb-2 border-b border-slate-800 pb-1">
          <span className="flex items-center gap-1.5 text-xs text-slate-300">
            <Terminal className="h-3.5 w-3.5 text-blue-400" />
            Agent Thought Stream
          </span>
          <span className="text-[10px] text-slate-500">{logs.length} events</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 select-text">
          {logs.length === 0 ? (
            <p className="text-slate-600 italic py-4 text-center">
              Agent execution events will stream here...
            </p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="leading-relaxed flex items-start gap-1.5">
                <span className="text-slate-600 flex-shrink-0">{l.timestamp}</span>
                {l.level === 'error' && <AlertCircle className="h-3 w-3 text-rose-400 mt-0.5 flex-shrink-0" />}
                <span
                  className={
                    l.level === 'error'
                      ? 'text-rose-400'
                      : l.level === 'warn'
                      ? 'text-amber-300'
                      : l.level === 'success'
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }
                >
                  {l.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
