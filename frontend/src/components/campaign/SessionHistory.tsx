import { useState, useEffect, useCallback } from 'react';
import {
  History,
  RotateCw,
  Plus,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import type { CampaignSessionResponse, CampaignStatus } from '../../types/campaign';

interface SessionHistoryProps {
  onSelectSession: (sessionId: string) => void;
  currentSessionId?: string;
  onNewCampaign: () => void;
  refreshTrigger?: number;
}

export function SessionHistory({
  onSelectSession,
  currentSessionId,
  onNewCampaign,
  refreshTrigger,
}: SessionHistoryProps) {
  const [sessions, setSessions] = useState<CampaignSessionResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listUserCampaigns();
      setSessions(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '세션 목록을 불러오지 못했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, refreshTrigger]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            완료
          </span>
        );
      case 'PAUSED_FOR_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80">
            <Clock className="h-3 w-3 text-amber-400" />
            검토 대기
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80">
            <AlertCircle className="h-3 w-3 text-rose-400" />
            실패
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/80">
            <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
            진행 중
          </span>
        );
    }
  };

  const getStageShortName = (stage?: string) => {
    switch (stage) {
      case 'MARKET_SENSING':
        return 'Stage 1 (Market Sensing)';
      case 'STRATEGY_BRIEF':
        return 'Stage 2 (Strategy)';
      case 'CREATIVE_CONTENT':
        return 'Stage 3 (Creative)';
      case 'PERFORMANCE_INSIGHTS':
        return 'Stage 4 (Insights)';
      case 'COMPLETED':
        return 'All Stages Completed';
      default:
        return stage || '';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Actions */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            이전 세션 기록
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-400 rounded-full">
            {sessions.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={fetchSessions}
            disabled={loading}
            title="새로고침"
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onNewCampaign}
            className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded bg-blue-950/40 hover:bg-blue-900/40 border border-blue-800/60 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            새 캠페인
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-xs">세션 기록을 불러오는 중...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex flex-col gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchSessions}
            className="self-start text-[11px] text-rose-400 hover:text-rose-200 underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Empty State: No Sessions */}
      {!loading && !error && sessions.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl my-auto">
          <div className="h-12 w-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
            <History className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">이전 세션 기록이 없습니다</h3>
          <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed mb-4">
            아직 진행된 캠페인 세션이 없습니다. 새로운 캠페인 시뮬레이션을 시작해보세요.
          </p>
          <button
            type="button"
            onClick={onNewCampaign}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md shadow-blue-600/20 transition"
          >
            <Plus className="h-3.5 w-3.5" />새 캠페인 만들기
          </button>
        </div>
      )}

      {/* Sessions List */}
      {!loading && !error && sessions.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {sessions.map((item) => {
            const isSelected = item.sessionId === currentSessionId;
            return (
              <div
                key={item.sessionId}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSession(item.sessionId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectSession(item.sessionId);
                  }
                }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-blue-950/50 border-blue-500 shadow-md shadow-blue-950/50 ring-1 ring-blue-500/50'
                    : 'bg-slate-900/70 hover:bg-slate-850/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Brand & Product / Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-100 truncate">
                      {item.productName || 'Unnamed Product'}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {item.brandName || 'Nova Electronics'}
                    </p>
                  </div>
                  {renderStatusBadge(item.status)}
                </div>

                {/* Campaign Objective Preview */}
                {item.campaignObjective && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed bg-slate-950/40 p-1.5 rounded border border-slate-800/50">
                    {item.campaignObjective}
                  </p>
                )}

                {/* Footer Metadata */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-500" />
                    {formatDate(item.createdAt)}
                  </span>
                  {item.budgetAmount && (
                    <span className="flex items-center gap-0.5 text-slate-300 font-mono">
                      <DollarSign className="h-3 w-3 text-emerald-400" />
                      {item.budgetAmount.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Current Stage Indicator */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Layers className="h-3 w-3 text-cyan-500" />
                  <span className="text-slate-400">{getStageShortName(item.currentStage)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
