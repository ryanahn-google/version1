import { Terminal, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { LogEntry } from '../../hooks/useCampaignStream';
import type { StageKey } from '../../types/campaign';

interface AssistantAndLogsPanelProps {
  activeStage?: StageKey;
  logs: LogEntry[];
  isStreaming: boolean;
  campaignTitle?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function AssistantAndLogsPanel({
  logs,
  isStreaming,
  campaignTitle = 'Campaign Workspace',
  isOpen = true,
  onToggle,
}: AssistantAndLogsPanelProps) {
  const { t } = useLanguage();

  if (!isOpen) {
    return (
      <aside
        onClick={onToggle}
        className="w-12 flex-shrink-0 bg-white border-l border-[#e2e8f0] flex flex-col items-center py-3.5 gap-4 cursor-pointer hover:bg-slate-50 transition select-none z-10"
        title={t.logs.expand}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition"
          title={t.logs.expand}
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>

        <div className="relative p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
          <Terminal className="h-4 w-4" />
          {isStreaming && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-cyan-500 animate-ping" />
          )}
        </div>

        {logs.length > 0 && (
          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-mono font-bold">
            {logs.length}
          </span>
        )}

        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-[11px] font-bold text-slate-400 tracking-wider uppercase whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {t.logs.title}
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 lg:w-96 flex-shrink-0 bg-white border-l border-[#e2e8f0] flex flex-col justify-between overflow-hidden z-10 transition-all duration-300">
      {/* Top Header: Agent Logs */}
      <div className="p-3.5 border-b border-[#e2e8f0] bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900">{t.logs.title}</span>
              {logs.length > 0 && (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-mono font-semibold">
                  {logs.length}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]">
              {campaignTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming ? (
            <span className="text-[10px] text-cyan-600 font-bold animate-pulse">
              {t.logs.liveStream}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">
              {t.logs.idle}
            </span>
          )}
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition ml-1"
              title={t.logs.collapse}
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Thought Stream Console */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-slate-400 text-[11px]">
          <span>{t.logs.timeline}</span>
          <span>{logs.length} events</span>
        </div>

        {logs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 font-sans">
            <Terminal className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-medium text-slate-600 mb-1">
              {t.logs.noLogs}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
              {t.logs.noLogsDesc}
            </p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] leading-relaxed select-text transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px]">{log.timestamp}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold tracking-wider ${
                    log.level === 'error'
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : log.level === 'warn'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : log.level === 'success'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {log.level}
                </span>
              </div>
              <p
                className={`break-words ${
                  log.level === 'error'
                    ? 'text-rose-700 font-semibold'
                    : log.level === 'success'
                    ? 'text-emerald-800'
                    : 'text-slate-800'
                }`}
              >
                {log.message}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="p-2.5 px-4 border-t border-[#e2e8f0] bg-slate-50 flex items-center justify-between text-[10px] text-slate-500">
        <span className="font-mono">{t.logs.directStream}</span>
        <span className="text-emerald-600 font-medium">{t.logs.connected}</span>
      </div>
    </aside>
  );
}

export const AgentLogsPanel = AssistantAndLogsPanel;
