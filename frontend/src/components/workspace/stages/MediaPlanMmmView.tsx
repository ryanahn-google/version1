import { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Check,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import type { CampaignSessionResponse } from '../../../types/campaign';

interface MediaPlanMmmViewProps {
  session: CampaignSessionResponse | null;
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

export function MediaPlanMmmView({ session }: MediaPlanMmmViewProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState('A');
  const [appliedScenarioId, setAppliedScenarioId] = useState('A');

  const insights = session?.deliverables?.performanceInsights;
  const initialBudget = session?.budgetAmount || 2000000;

  const totalBudgetStr = `$ ${initialBudget.toLocaleString()}`;
  const roasVal = insights?.expectedRoas || 4.92;
  const expectedSalesVal = `$ ${(
    (initialBudget * roasVal) /
    1000000
  ).toFixed(2)}M`;
  const conversionsVal = insights?.projectedKpis?.estimatedConversions
    ? insights.projectedKpis.estimatedConversions.toLocaleString()
    : '48,600';
  const cpaVal = `$ 41.15`;

  // Channel allocations
  const channelAllocations =
    insights?.channelAllocations && insights.channelAllocations.length > 0
      ? insights.channelAllocations
      : [
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
      {/* Top 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: 총 예산 */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            총 예산
          </span>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            {totalBudgetStr}
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            100% 계획 배분
          </span>
        </div>

        {/* Card 2: 예상 매출 */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            예상 매출
          </span>
          <div className="text-xl font-bold text-blue-600 font-mono mt-1">
            {expectedSalesVal}
          </div>
          <span className="text-[10px] text-blue-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" />
            <span>▲ 18.2% vs 유사</span>
          </span>
        </div>

        {/* Card 3: 예상 ROAS */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            예상 ROAS
          </span>
          <div className="text-xl font-bold text-emerald-600 font-mono mt-1">
            {roasVal}x
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" />
            <span>▲ 16.4% vs 유사</span>
          </span>
        </div>

        {/* Card 4: 예상 구매전환수 */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            예상 구매전환수
          </span>
          <div className="text-xl font-bold text-purple-600 font-mono mt-1">
            {conversionsVal}
          </div>
          <span className="text-[10px] text-purple-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" />
            <span>▲ 19.1%</span>
          </span>
        </div>

        {/* Card 5: 예상 CPA */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            예상 CPA
          </span>
          <div className="text-xl font-bold text-slate-800 font-mono mt-1">
            {cpaVal}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowDownRight className="h-3 w-3" />
            <span>▼ -12.3% 절감</span>
          </span>
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
            MMM(Marketing Mix Modeling) 인텔리전스를 통해 최적화된 채널별 예산 배분입니다.
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
                  return channelAllocations.map((item, idx) => {
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
              {channelAllocations.map((item, idx) => (
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

          {/* Allocation Table */}
          <div className="lg:col-span-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="pb-3 font-semibold">채널</th>
                  <th className="pb-3 font-semibold text-right">예산 배분</th>
                  <th className="pb-3 font-semibold text-right">비중 (%)</th>
                  <th className="pb-3 font-semibold text-right">예상 도달수</th>
                  <th className="pb-3 font-semibold text-right">예상 ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {channelAllocations.map((item, idx) => {
                  const estReach = `${(item.percentage * 1.1).toFixed(1)}M`;
                  const estRoas = (roasVal * (1 - (idx - 1) * 0.05)).toFixed(2);
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 font-semibold text-slate-800 flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colors[idx % colors.length] }}
                        />
                        <span>{item.channel}</span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-700">
                        ${item.allocationAmount ? item.allocationAmount.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold text-blue-600">
                        {item.percentage}%
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-500">
                        {estReach}
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold text-emerald-600">
                        {estRoas}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
