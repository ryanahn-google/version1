import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  DollarSign,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import type { CampaignSessionResponse } from '../../../types/campaign';
import { RevisionModal } from '../../hitl/RevisionModal';

interface MediaExecutionViewProps {
  session: CampaignSessionResponse | null;
  onApproveOrRevise?: (
    action: 'approve' | 'revise',
    feedback?: string,
    deliverableUpdates?: Record<string, unknown>
  ) => void;
  onRollbackStage?: () => void;
  isLoading?: boolean;
}

export function MediaExecutionView({
  session,
  onApproveOrRevise,
  onRollbackStage,
  isLoading = false,
}: MediaExecutionViewProps) {
  const { t } = useLanguage();
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  const insights = session?.deliverables?.performanceInsights;
  const budget = session?.budgetAmount || 0;
  const currency =
    insights?.currency ||
    session?.currency ||
    'USD';
  const currencySymbol = currency === 'KRW' ? '₩' : '$';

  const allocations = insights?.channelAllocations || [];
  const isReviewPending = session?.status === 'PAUSED_FOR_REVIEW';

  return (
    <div className="p-6 space-y-6">
      {/* Human-in-the-Loop Review Banner (If Waiting for Approval at Stage 4) */}
      {isReviewPending && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  {t.planning.hitlReviewPending}
                </span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-medium">
                  {t.execution.hitlPending}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {t.execution.hitlDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onRollbackStage && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t.execution.rollbackBtn)) {
                    onRollbackStage();
                  }
                }}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <span>{t.execution.rollbackBtn}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setRevisionModalOpen(true)}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t.planning.requestRevision}</span>
            </button>
            <button
              type="button"
              onClick={() => onApproveOrRevise?.('approve')}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{t.execution.approveBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Top 6 Execution & Planning Targets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {t.execution.totalPlannedBudget}
          </span>
          <div className="text-base font-bold text-slate-900 font-mono mt-1">
            {currencySymbol} {budget.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            {t.analytics.adSpendDesc}
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {t.execution.plannedChannelsCount}
          </span>
          <div className="text-base font-bold text-blue-600 font-mono mt-1">
            {allocations.length}{t.execution.channelsUnit}
          </div>
          <span className="text-[10px] text-blue-600 font-medium mt-0.5 block">
            {t.execution.managementTitle}
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {t.execution.targetRoas}
          </span>
          <div className="text-base font-bold text-emerald-600 font-mono mt-1">
            {insights?.expectedRoas ? `${insights.expectedRoas}x` : '-'}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
            {t.analytics.roasDesc}
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            목표 전환수
          </span>
          <div className="text-base font-bold text-purple-600 font-mono mt-1">
            {insights?.projectedKpis?.estimatedConversions
              ? insights.projectedKpis.estimatedConversions.toLocaleString()
              : '-'}
          </div>
          <span className="text-[10px] text-purple-600 font-medium mt-0.5 block">
            예측 구매 전환
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            목표 노출수
          </span>
          <div className="text-base font-bold text-slate-800 font-mono mt-1">
            {insights?.projectedKpis?.estimatedImpressions
              ? insights.projectedKpis.estimatedImpressions.toLocaleString()
              : '-'}
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            예상 총 도달
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            목표 클릭수
          </span>
          <div className="text-base font-bold text-slate-800 font-mono mt-1">
            {insights?.projectedKpis?.estimatedClicks
              ? insights.projectedKpis.estimatedClicks.toLocaleString()
              : '-'}
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            예상 클릭 볼륨
          </span>
        </div>
      </div>

      {/* 채널별 집행 계획 관리 테이블 */}
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <span>{t.execution.managementTitle}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.execution.managementDesc}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="pb-3 font-semibold">{t.mmm.tableChannel}</th>
                <th className="pb-3 font-semibold text-right">{t.mmm.tableAllocation}</th>
                <th className="pb-3 font-semibold text-right">{t.mmm.tablePercentage}</th>
                <th className="pb-3 font-semibold pl-4">{t.mmm.tableRationale}</th>
                <th className="pb-3 font-semibold text-center">{t.common.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {t.execution.noChannels}
                  </td>
                </tr>
              ) : (
                allocations.map((item, idx) => {
                  const amt = item.allocationAmount
                    ? item.allocationAmount
                    : Math.round((budget * (item.percentage || 100 / (allocations.length || 1))) / 100);
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 font-semibold text-slate-900">
                        {item.channel}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-800 font-medium">
                        {currencySymbol} {amt.toLocaleString()}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-blue-600">
                        {item.percentage}%
                      </td>
                      <td className="py-3.5 pl-4 text-slate-600 text-xs max-w-md">
                        {item.rationale || '-'}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          {t.execution.statusReady}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom Grid: AI 권고사항 & 빠른 작업 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI 최적화 및 권고 사항 */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span>AI 최적화 권고 사항 (P4 Insights)</span>
          </h3>

          <div className="space-y-2.5">
            {insights?.recommendations && insights.recommendations.length > 0 ? (
              insights.recommendations.map((rec, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {rec}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-slate-400 text-xs">
                3단계에서 생성된 채널 최적화 권고가 전달되었습니다.
              </div>
            )}
          </div>
        </section>

        {/* 빠른 작업 */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <span>집행 프로세스</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <div>
                  <span className="font-semibold text-slate-800 block">채널 배분 일치 검증</span>
                  <span className="text-[11px] text-slate-500">3단계 MMM 예산 배분 스키마와 100% 동기화되었습니다.</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div>
                  <span className="font-semibold text-slate-800 block">Human-in-the-Loop 최종 승인</span>
                  <span className="text-[11px] text-slate-500">마케터 승인 완료 시 캠페인이 완료되고 5단계 성과 분석이 생성됩니다.</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </section>
      </div>

      {/* Revision Modal */}
      <RevisionModal
        stage="MEDIA_EXECUTION"
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        onSubmit={(feedback) => onApproveOrRevise?.('revise', feedback)}
        isLoading={isLoading}
      />
    </div>
  );
}
