import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  RefreshCw,
  Download,
  DollarSign,
  ChevronRight,
  Clock,
  RotateCcw,
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'WARNING'>('ALL');
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  const budget = session?.budgetAmount || 2000000;
  const spentAmount = Math.round(budget * 0.66);
  const remainingAmount = budget - spentAmount;
  const isReviewPending = session?.status === 'PAUSED_FOR_REVIEW';

  const defaultChannelRows = [
    {
      channel: 'Digital Video',
      status: 'ACTIVE',
      statusLabel: '집행 중',
      spent: '$ 460,000',
      pacing: 92,
      impressions: '12.4M',
      clicks: '246,000',
      ctr: '1.98%',
      conversions: '1,250',
      cvr: '0.51%',
      cpa: '$ 36.80',
      roas: '4.12',
    },
    {
      channel: 'Paid Search',
      status: 'ACTIVE',
      statusLabel: '집행 중',
      spent: '$ 330,000',
      pacing: 66,
      impressions: '8.6M',
      clicks: '184,000',
      ctr: '2.14%',
      conversions: '1,140',
      cvr: '0.62%',
      cpa: '$ 28.95',
      roas: '5.01',
    },
    {
      channel: 'Social (Meta)',
      status: 'ACTIVE',
      statusLabel: '집행 중',
      spent: '$ 280,000',
      pacing: 70,
      impressions: '15.2M',
      clicks: '301,000',
      ctr: '1.98%',
      conversions: '1,310',
      cvr: '0.43%',
      cpa: '$ 38.16',
      roas: '3.85',
    },
    {
      channel: 'Display Network',
      status: 'WARNING',
      statusLabel: '주의',
      spent: '$ 150,000',
      pacing: 50,
      impressions: '18.6M',
      clicks: '152,000',
      ctr: '0.82%',
      conversions: '610',
      cvr: '0.40%',
      cpa: '$ 46.50',
      roas: '2.81',
    },
    {
      channel: 'Samsung.com 리마케팅',
      status: 'ACTIVE',
      statusLabel: '집행 중',
      spent: '$ 70,000',
      pacing: 78,
      impressions: '3.1M',
      clicks: '78,000',
      ctr: '2.51%',
      conversions: '930',
      cvr: '1.19%',
      cpa: '$ 31.18',
      roas: '5.76',
    },
    {
      channel: 'Affiliate Partner',
      status: 'PENDING',
      statusLabel: '대기',
      spent: '$ 30,000',
      pacing: 0,
      impressions: '-',
      clicks: '-',
      ctr: '-',
      conversions: '-',
      cvr: '-',
      cpa: '-',
      roas: '-',
    },
  ];

  const [channelRows, setChannelRows] = useState(defaultChannelRows);

  const toggleChannelStatus = (index: number) => {
    const next = [...channelRows];
    const current = next[index].status;
    next[index] = {
      ...next[index],
      status: current === 'ACTIVE' ? 'PENDING' : 'ACTIVE',
      statusLabel: current === 'ACTIVE' ? '일시 정지' : '집행 중',
    };
    setChannelRows(next);
  };

  const filteredChannels = channelRows.filter((r) => {
    if (activeTab === 'ACTIVE') return r.status === 'ACTIVE';
    if (activeTab === 'WARNING') return r.status === 'WARNING';
    return true;
  });

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
                  Human-in-the-Loop 검토 대기
                </span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-medium">
                  Stage 4 승인 필요
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                설정된 채널별 광고 집행 상태 및 파라미터를 검토하고 최종 승인해주세요. 승인 시 캠페인이 완료되며 성과 분석(5단계)으로 진행됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onRollbackStage && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('3단계(미디어 계획 MMM)로 돌아가서 수정하시겠습니까? (이전 단계 산출물 재작성/수정 모드로 전환됩니다)')) {
                    onRollbackStage();
                  }
                }}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <span>← 3단계(미디어 계획)로 복귀</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setRevisionModalOpen(true)}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>수정 요청 (AI 재생성)</span>
            </button>
            <button
              type="button"
              onClick={() => onApproveOrRevise?.('approve')}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>집행 최종 승인 및 완료</span>
            </button>
          </div>
        </div>
      )}

      {/* Top 6 Execution KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            총 집행 예산
          </span>
          <div className="text-base font-bold text-slate-900 font-mono mt-1">
            ${budget.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            100% 계획
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            집행 금액
          </span>
          <div className="text-base font-bold text-blue-600 font-mono mt-1">
            ${spentAmount.toLocaleString()}
          </div>
          <span className="text-[10px] text-blue-600 font-medium mt-0.5 block">
            + 66% 소진
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            남은 예산
          </span>
          <div className="text-base font-bold text-slate-800 font-mono mt-1">
            ${remainingAmount.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            + 34% 잔여
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            예상 전환
          </span>
          <div className="text-base font-bold text-purple-600 font-mono mt-1">
            52,800
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
            + 68% 달성
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            평균 CPA
          </span>
          <div className="text-base font-bold text-slate-800 font-mono mt-1">
            $ 37.45
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
            목표 $41.15 달성
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            ROAS (예상)
          </span>
          <div className="text-base font-bold text-emerald-600 font-mono mt-1">
            4.23x
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
            목표 4.0x 초과
          </span>
        </div>
      </div>

      {/* 채널별 집행 현황 (Channel Execution Table) */}
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span>미디어 집행 관리</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              선택한 미디어에 대한 실시간 집행 현황과 성과를 모니터링하세요.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {(['ALL', 'ACTIVE', 'WARNING'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === tab
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? '전체' : tab === 'ACTIVE' ? '정상 집행' : '주의 필요'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="pb-3 font-semibold">채널</th>
                <th className="pb-3 font-semibold">상태</th>
                <th className="pb-3 font-semibold text-right">집행 금액</th>
                <th className="pb-3 font-semibold">예산 대비</th>
                <th className="pb-3 font-semibold text-right">노출</th>
                <th className="pb-3 font-semibold text-right">클릭</th>
                <th className="pb-3 font-semibold text-right">CTR</th>
                <th className="pb-3 font-semibold text-right">전환</th>
                <th className="pb-3 font-semibold text-right">전환율</th>
                <th className="pb-3 font-semibold text-right">CPA</th>
                <th className="pb-3 font-semibold text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredChannels.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition font-sans">
                  <td className="py-3 font-semibold text-slate-900">
                    {row.channel}
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => toggleChannelStatus(idx)}
                      title="클릭하여 상태 전환"
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer hover:opacity-80 transition ${
                        row.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : row.status === 'WARNING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {row.statusLabel}
                    </button>
                  </td>
                  <td className="py-3 text-right font-mono text-slate-800">
                    {row.spent}
                  </td>
                  <td className="py-3 min-w-[100px]">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.pacing > 85
                              ? 'bg-blue-600'
                              : row.pacing > 50
                              ? 'bg-cyan-500'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${row.pacing}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {row.pacing}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-right font-mono text-slate-600">
                    {row.impressions}
                  </td>
                  <td className="py-3 text-right font-mono text-slate-600">
                    {row.clicks}
                  </td>
                  <td className="py-3 text-right font-mono font-semibold text-slate-800">
                    {row.ctr}
                  </td>
                  <td className="py-3 text-right font-mono text-slate-600">
                    {row.conversions}
                  </td>
                  <td className="py-3 text-right font-mono text-slate-600">
                    {row.cvr}
                  </td>
                  <td className="py-3 text-right font-mono text-slate-700">
                    {row.cpa}
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-emerald-600">
                    {row.roas !== '-' ? `${row.roas}x` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom Grid: 알림 및 인사이트 & 빠른 작업 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 알림 및 인사이트 */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>알림 및 인사이트</span>
          </h3>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-700 leading-relaxed">
                  Digital Video 채널의 전환 성과가 우수하여 예산을 추가 투입해 성과를 극대화할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                className="text-[11px] font-semibold text-blue-600 px-2 py-1 bg-blue-50 rounded-lg hover:bg-blue-100 ml-2 flex-shrink-0"
              >
                추천 확인
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-700 leading-relaxed">
                  Display 채널의 CTR이 업계 평균 대비 낮습니다. 크리에이티브 소재 교체를 권장합니다.
                </p>
              </div>
              <button
                type="button"
                className="text-[11px] font-semibold text-amber-700 px-2 py-1 bg-amber-50 rounded-lg hover:bg-amber-100 ml-2 flex-shrink-0"
              >
                상세 보기
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-700 leading-relaxed">
                  SNS 채널의 CPA가 목표 대비 8% 높습니다. 타겟 세분화 및 소재 테스트를 제안합니다.
                </p>
              </div>
              <button
                type="button"
                className="text-[11px] font-semibold text-blue-600 px-2 py-1 bg-blue-50 rounded-lg hover:bg-blue-100 ml-2 flex-shrink-0"
              >
                리포트 보기
              </button>
            </div>
          </div>
        </section>

        {/* 빠른 작업 */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <span>빠른 작업</span>
          </h3>

          <div className="space-y-2 text-xs">
            <button
              type="button"
              className="w-full p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition flex items-center justify-between group text-left"
            >
              <div className="flex items-center gap-2.5">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <div>
                  <span className="font-semibold text-slate-800 block">예산 재분배</span>
                  <span className="text-[11px] text-slate-500">채널 간 예산을 신속히 재조정합니다.</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
            </button>

            <button
              type="button"
              className="w-full p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition flex items-center justify-between group text-left"
            >
              <div className="flex items-center gap-2.5">
                <RefreshCw className="h-4 w-4 text-purple-600" />
                <div>
                  <span className="font-semibold text-slate-800 block">광고 소재 교체</span>
                  <span className="text-[11px] text-slate-500">성과가 낮은 채널의 소재를 신규 에셋으로 교체합니다.</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
            </button>

            <button
              type="button"
              className="w-full p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition flex items-center justify-between group text-left"
            >
              <div className="flex items-center gap-2.5">
                <Download className="h-4 w-4 text-emerald-600" />
                <div>
                  <span className="font-semibold text-slate-800 block">집행 리포트 다운로드</span>
                  <span className="text-[11px] text-slate-500">현재 미디어 집행 현황 데이터를 CSV로 내보냅니다.</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
            </button>
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
