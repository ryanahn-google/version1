import { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  PieChart,
  Check,
  CheckCircle2,
  Sliders,
  Clock,
  RotateCcw,
  Edit3,
  Trash2,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { CampaignSessionResponse } from '../../../types/campaign';
import { RevisionModal } from '../../hitl/RevisionModal';

interface MediaPlanMmmViewProps {
  session: CampaignSessionResponse | null;
  onApproveOrRevise?: (
    action: 'approve' | 'revise',
    feedback?: string,
    deliverableUpdates?: Record<string, unknown>
  ) => void;
  onRollbackStage?: () => void;
  isLoading?: boolean;
}

interface Scenario {
  id: string;
  name: string;
  subtitle: string;
  roas: number;
  sales: string;
  cpa: number;
  isAiRecommended?: boolean;
}

const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: 'A',
    name: '시나리오 A',
    subtitle: '균형 성장 최적화',
    roas: 4.92,
    sales: '$ 9.84M',
    cpa: 41.15,
    isAiRecommended: true,
  },
  {
    id: 'B',
    name: '시나리오 B',
    subtitle: '매출 극대화',
    roas: 4.35,
    sales: '$ 10.72M',
    cpa: 46.21,
  },
  {
    id: 'C',
    name: '시나리오 C',
    subtitle: '전환 극대화',
    roas: 5.31,
    sales: '$ 9.12M',
    cpa: 38.72,
  },
  {
    id: 'D',
    name: '시나리오 D',
    subtitle: '효율 최적화',
    roas: 5.78,
    sales: '$ 8.65M',
    cpa: 36.11,
  },
];

export function MediaPlanMmmView({
  session,
  onApproveOrRevise,
  onRollbackStage,
  isLoading = false,
}: MediaPlanMmmViewProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState('A');
  const [appliedScenarioId, setAppliedScenarioId] = useState('A');
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  const insights = session?.deliverables?.performanceInsights;
  const initialBudget = session?.budgetAmount || 2000000;
  const isReviewPending = session?.status === 'PAUSED_FOR_REVIEW';

  // Editable deliverable states
  const [budgetAmount, setBudgetAmount] = useState<number>(
    insights?.totalBudget || initialBudget
  );
  const [roasVal, setRoasVal] = useState<number>(insights?.expectedRoas || 4.92);
  const [conversionsVal, setConversionsVal] = useState<number>(
    insights?.projectedKpis?.estimatedConversions || 48600
  );
  const [impressionsVal, setImpressionsVal] = useState<number>(
    insights?.projectedKpis?.estimatedImpressions || 12000000
  );
  const [clicksVal, setClicksVal] = useState<number>(
    insights?.projectedKpis?.estimatedClicks || 408000
  );
  const [ctrVal, setCtrVal] = useState<number>(
    insights?.projectedKpis?.projectedCtr || 3.4
  );
  const [recommendations, setRecommendations] = useState<string[]>(
    insights?.recommendations && insights.recommendations.length > 0
      ? insights.recommendations
      : [
          '디지털 비디오 채널의 타깃팅을 20-30대 고관여층으로 집중하여 전환 극대화',
          '검색 광고의 경우 블랙프라이데이 2주 전부터 브랜드 키워드 입찰가 25% 상향',
          '소셜 미디어 리타겟팅 빈도를 3회로 제한하여 피로도 최소화 및 ROAS 방어',
        ]
  );

  const defaultAllocations = [
    {
      channel: 'Digital Video',
      percentage: 35,
      allocationAmount: Math.round(initialBudget * 0.35),
      rationale: '고화질 영상 브랜딩 및 인지도',
    },
    {
      channel: 'Paid Search',
      percentage: 25,
      allocationAmount: Math.round(initialBudget * 0.25),
      rationale: '구매 의도 검색어 독점',
    },
    {
      channel: 'Social Media',
      percentage: 20,
      allocationAmount: Math.round(initialBudget * 0.2),
      rationale: '타겟 세그먼트 도달',
    },
    {
      channel: 'Display Network',
      percentage: 10,
      allocationAmount: Math.round(initialBudget * 0.1),
      rationale: '리타겟팅 배너',
    },
    {
      channel: 'Affiliate',
      percentage: 5,
      allocationAmount: Math.round(initialBudget * 0.05),
      rationale: '제휴 파트너 전환',
    },
    {
      channel: 'Others',
      percentage: 5,
      allocationAmount: Math.round(initialBudget * 0.05),
      rationale: '실험적 신규 채널',
    },
  ];

  const [allocations, setAllocations] = useState(
    insights?.channelAllocations && insights.channelAllocations.length > 0
      ? insights.channelAllocations
      : defaultAllocations
  );

  useEffect(() => {
    if (insights) {
      if (insights.channelAllocations && insights.channelAllocations.length > 0) {
        setAllocations(insights.channelAllocations);
      }
      if (insights.totalBudget) setBudgetAmount(insights.totalBudget);
      if (insights.expectedRoas) setRoasVal(insights.expectedRoas);
      if (insights.projectedKpis) {
        if (insights.projectedKpis.estimatedConversions) setConversionsVal(insights.projectedKpis.estimatedConversions);
        if (insights.projectedKpis.estimatedImpressions) setImpressionsVal(insights.projectedKpis.estimatedImpressions);
        if (insights.projectedKpis.estimatedClicks) setClicksVal(insights.projectedKpis.estimatedClicks);
        if (insights.projectedKpis.projectedCtr) setCtrVal(insights.projectedKpis.projectedCtr);
      }
      if (insights.recommendations && insights.recommendations.length > 0) {
        setRecommendations(insights.recommendations);
      }
    }
  }, [insights]);

  const handlePercentageChange = (idx: number, newPercent: number) => {
    const safePercent = Math.max(0, Math.min(100, isNaN(newPercent) ? 0 : newPercent));
    const next = [...allocations];
    next[idx] = {
      ...next[idx],
      percentage: safePercent,
      allocationAmount: Math.round(budgetAmount * (safePercent / 100)),
    };
    setAllocations(next);
  };

  const handleAddChannel = () => {
    setAllocations((prev) => [
      ...prev,
      {
        channel: 'New Channel',
        percentage: 0,
        allocationAmount: 0,
        rationale: '신규 채널 실험 및 전환 테스트',
      },
    ]);
  };

  const handleDeleteChannel = (idx: number) => {
    setAllocations((prev) => prev.filter((_, i) => i !== idx));
  };

  const getDeliverableUpdates = () => ({
    performanceInsights: {
      ...(insights || {}),
      totalBudget: Number(budgetAmount),
      currency: session?.currency || 'USD',
      channelAllocations: allocations,
      expectedRoas: Number(roasVal),
      projectedKpis: {
        estimatedImpressions: Number(impressionsVal),
        estimatedClicks: Number(clicksVal),
        estimatedConversions: Number(conversionsVal),
        projectedCtr: Number(ctrVal),
      },
      recommendations,
    },
  });

  const handleApprove = () => {
    if (!onApproveOrRevise) return;
    onApproveOrRevise('approve', undefined, getDeliverableUpdates());
  };

  const totalPercentage = allocations.reduce((sum, item) => sum + (item.percentage || 0), 0);
  const totalBudgetStr = `$ ${budgetAmount.toLocaleString()}`;

  const colors = [
    '#1A56DB', // Blue
    '#06B6D4', // Cyan
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#94A3B8', // Slate
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Human-in-the-Loop Review Banner (If Waiting for Approval at Stage 3) */}
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
                  Stage 3 승인 필요
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                MMM 인텔리전스로 도출된 채널별 예산 배분을 검토하고 필요 시 직접 수정한 후 승인해주세요. 승인 시 4단계(미디어 집행)로 진행됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onRollbackStage && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('2단계(콘텐츠)로 돌아가서 수정하시겠습니까? (이전 단계 산출물 재작성/수정 모드로 전환됩니다)')) {
                    onRollbackStage();
                  }
                }}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <span>← 2단계(콘텐츠)로 복귀</span>
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
              onClick={handleApprove}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>미디어 계획 승인 및 4단계 진행</span>
            </button>
          </div>
        </div>
      )}

      {/* Top 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: 총 예산 */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              총 예산
            </span>
            <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
              <Edit3 className="h-3 w-3" />
              수정 가능
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-lg font-bold text-slate-900 font-mono">$</span>
            <input
              type="number"
              value={budgetAmount}
              onChange={(e) => {
                const newBudget = Number(e.target.value);
                setBudgetAmount(newBudget);
                const next = allocations.map((a) => ({
                  ...a,
                  allocationAmount: Math.round(newBudget * ((a.percentage || 0) / 100)),
                }));
                setAllocations(next);
              }}
              className="w-full text-lg font-bold text-slate-900 font-mono bg-[#f8fafc] border border-slate-200 rounded-lg px-2 py-0.5 focus:bg-white focus:border-blue-500 focus:outline-none transition"
            />
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            100% 계획 배분
          </span>
        </div>

        {/* Card 2: 예상 매출 */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            예상 매출 (자동 계산)
          </span>
          <div className="text-xl font-bold text-blue-600 font-mono mt-1">
            $ {((budgetAmount * roasVal) / 1000000).toFixed(2)}M
          </div>
          <span className="text-[10px] text-blue-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" />
            <span>▲ 18.2% vs 유사</span>
          </span>
        </div>

        {/* Card 3: 예상 ROAS */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              예상 ROAS
            </span>
            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <Edit3 className="h-3 w-3" />
              수정 가능
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              step="0.01"
              value={roasVal}
              onChange={(e) => setRoasVal(Number(e.target.value))}
              className="w-24 text-xl font-bold text-emerald-600 font-mono bg-[#f8fafc] border border-slate-200 rounded-lg px-2 py-0.5 focus:bg-white focus:border-emerald-500 focus:outline-none transition"
            />
            <span className="text-xl font-bold text-emerald-600 font-mono">x</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" />
            <span>▲ 16.4% vs 유사</span>
          </span>
        </div>

        {/* Card 4: 예상 구매전환수 */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              예상 구매전환수
            </span>
            <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
              <Edit3 className="h-3 w-3" />
              수정 가능
            </span>
          </div>
          <input
            type="number"
            value={conversionsVal}
            onChange={(e) => setConversionsVal(Number(e.target.value))}
            className="w-full text-xl font-bold text-purple-600 font-mono bg-[#f8fafc] border border-slate-200 rounded-lg px-2 py-0.5 mt-1 focus:bg-white focus:border-purple-500 focus:outline-none transition"
          />
          <span className="text-[10px] text-purple-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" />
            <span>▲ 19.1%</span>
          </span>
        </div>

        {/* Card 5: 예상 도달 & 클릭 세부 지표 */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              예상 노출 / 클릭 / CTR
            </span>
            <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
              <Edit3 className="h-3 w-3" />
              수정 가능
            </span>
          </div>
          <div className="space-y-1.5 mt-1.5 text-xs">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] text-slate-500 font-medium">노출수:</span>
              <input
                type="number"
                value={impressionsVal}
                onChange={(e) => setImpressionsVal(Number(e.target.value))}
                className="w-24 font-mono text-[11px] font-bold text-slate-800 bg-[#f8fafc] border border-slate-200 rounded px-1.5 py-0.5 text-right focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] text-slate-500 font-medium">클릭수:</span>
              <input
                type="number"
                value={clicksVal}
                onChange={(e) => setClicksVal(Number(e.target.value))}
                className="w-24 font-mono text-[11px] font-bold text-slate-800 bg-[#f8fafc] border border-slate-200 rounded px-1.5 py-0.5 text-right focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] text-slate-500 font-medium">CTR(%):</span>
              <input
                type="number"
                step="0.1"
                value={ctrVal}
                onChange={(e) => setCtrVal(Number(e.target.value))}
                className="w-24 font-mono text-[11px] font-bold text-blue-600 bg-[#f8fafc] border border-slate-200 rounded px-1.5 py-0.5 text-right focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 채널 별 예산 제안 (Budget Allocation Matrix) */}
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-blue-600" />
            <span>채널 별 예산 제안 (Budget Allocation)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            MMM(Marketing Mix Modeling) 인텔리전스를 통해 최적화된 채널별 예산 배분입니다. 채널명, 비중, 배분액, 근거를 직접 수정할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Donut Chart Visualization */}
          <div className="flex flex-col items-center justify-center p-4">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {/* SVG Ring Slices */}
                {(() => {
                  let accumulatedPercent = 0;
                  return allocations.map((item, idx) => {
                    const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                    const strokeDashoffset = -accumulatedPercent;
                    accumulatedPercent += item.percentage;
                    return (
                      <circle
                        key={idx}
                        cx="18"
                        cy="18"
                        r="14"
                        fill="transparent"
                        stroke={colors[idx % colors.length]}
                        strokeWidth="5"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500 hover:opacity-80"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-400 font-medium uppercase">
                  총 예산
                </span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {totalBudgetStr}
                </span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 text-[11px]">
              {allocations.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors[idx % colors.length] }}
                  />
                  <span className="text-slate-600 truncate">{item.channel}</span>
                  <span className="font-mono font-bold text-slate-800">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Allocation Table (Editable) */}
          <div className="lg:col-span-2 overflow-x-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                <span>채널별 비중 직접 수정 (합계: </span>
                <span
                  className={`font-mono font-bold ${
                    totalPercentage === 100 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {totalPercentage}%
                </span>
                <span>)</span>
              </span>
              <div className="flex items-center gap-2">
                {totalPercentage !== 100 && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                    비중 합계가 100%가 되도록 조정해주세요
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleAddChannel}
                  className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                >
                  <Plus className="h-3 w-3" />
                  <span>채널 추가</span>
                </button>
              </div>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="pb-2 font-semibold">채널명</th>
                  <th className="pb-2 font-semibold text-right">비중 (%)</th>
                  <th className="pb-2 font-semibold text-right">예산 배분</th>
                  <th className="pb-2 font-semibold">전략적 근거 (Rationale)</th>
                  <th className="pb-2 font-semibold text-center w-8">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-2 text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colors[idx % colors.length] }}
                        />
                        <input
                          type="text"
                          value={item.channel}
                          onChange={(e) => {
                            const next = [...allocations];
                            next[idx] = { ...next[idx], channel: e.target.value };
                            setAllocations(next);
                          }}
                          className="w-28 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-blue-600">
                      <div className="inline-flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={item.percentage}
                          onChange={(e) => handlePercentageChange(idx, Number(e.target.value))}
                          className="w-14 px-1.5 py-0.5 text-right font-mono font-semibold text-blue-600 bg-[#f8fafc] border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:outline-none transition"
                        />
                        <span>%</span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-mono text-slate-700">
                      <div className="inline-flex items-center justify-end gap-0.5">
                        <span>$</span>
                        <input
                          type="number"
                          value={item.allocationAmount}
                          onChange={(e) => {
                            const newAmt = Number(e.target.value);
                            const next = [...allocations];
                            next[idx] = {
                              ...next[idx],
                              allocationAmount: newAmt,
                              percentage: budgetAmount > 0 ? Math.round((newAmt / budgetAmount) * 100) : 0,
                            };
                            setAllocations(next);
                          }}
                          className="w-24 px-1.5 py-0.5 text-right font-mono text-xs text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:outline-none transition"
                        />
                      </div>
                    </td>
                    <td className="py-2 text-slate-600">
                      <input
                        type="text"
                        value={item.rationale || ''}
                        onChange={(e) => {
                          const next = [...allocations];
                          next[idx] = { ...next[idx], rationale: e.target.value };
                          setAllocations(next);
                        }}
                        className="w-full bg-[#f8fafc] border border-slate-200 rounded px-2 py-0.5 text-[11px] text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none"
                        placeholder="전략적 근거 입력"
                      />
                    </td>
                    <td className="py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteChannel(idx)}
                        disabled={allocations.length <= 1}
                        className="text-slate-400 hover:text-red-500 transition disabled:opacity-30 p-1"
                        title="채널 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* AI 성과 최적화 추천사항 (Optimization Recommendations) */}
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">AI 성과 최적화 추천사항 (Recommendations)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                성과 분석 에이전트가 제안한 최적화 전략을 검토하고 필요 시 직접 수정하거나 추가하세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRecommendations([...recommendations, '신규 채널 타깃팅 및 크리에이티브 A/B 테스트 권장'])}
            className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>추천 항목 추가</span>
          </button>
        </div>
        <div className="space-y-2.5">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="flex items-center gap-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl p-2.5">
              <span className="text-blue-600 font-bold text-xs w-5 text-right">{idx + 1}.</span>
              <input
                type="text"
                value={rec}
                onChange={(e) => {
                  const next = [...recommendations];
                  next[idx] = e.target.value;
                  setRecommendations(next);
                }}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none transition"
                placeholder="추천 전략 입력"
              />
              <button
                type="button"
                onClick={() => setRecommendations(recommendations.filter((_, i) => i !== idx))}
                disabled={recommendations.length <= 1}
                className="text-slate-400 hover:text-red-500 p-1.5 transition disabled:opacity-30 rounded-lg hover:bg-red-50"
                title="추천 삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 시나리오 비교 (Scenario Comparison) */}
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600" />
              <span>시나리오 비교</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              목적에 따라 AI가 추천하는 다양한 채널 예산 믹스 시나리오를 비교해 보세요.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {DEFAULT_SCENARIOS.map((sc) => {
            const isSelected = selectedScenarioId === sc.id;
            const isApplied = appliedScenarioId === sc.id;

            return (
              <div
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900">
                      {sc.name}
                    </span>
                    {sc.isAiRecommended && (
                      <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        AI 추천
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-600 font-medium block mb-3">
                    {sc.subtitle}
                  </span>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[11px]">예상 ROAS:</span>
                      <span className="font-bold font-mono text-emerald-600">
                        {sc.roas}x
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[11px]">예상 매출:</span>
                      <span className="font-bold font-mono text-slate-800">
                        {sc.sales}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[11px]">예상 CPA:</span>
                      <span className="font-bold font-mono text-slate-700">
                        ${sc.cpa.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  {isApplied ? (
                    <span className="text-blue-700 font-semibold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      <span>적용됨</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">선택하기</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            * MMM 모델은 최근 24개월간 축적된 데이터와 외부 요인(시즌성, 경쟁사 활동 등)을 기반으로 예측되었습니다.
          </p>
          <button
            type="button"
            onClick={() => setAppliedScenarioId(selectedScenarioId)}
            className="px-5 py-2.5 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>선택한 시나리오 적용</span>
          </button>
        </div>
      </section>

      {/* Revision Modal */}
      <RevisionModal
        stage="PERFORMANCE_INSIGHTS"
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        onSubmit={(feedback) => onApproveOrRevise?.('revise', feedback, getDeliverableUpdates())}
        isLoading={isLoading}
      />
    </div>
  );
}
