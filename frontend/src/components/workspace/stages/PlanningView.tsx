import { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  CheckCircle2,
  Users,
  Target,
  DollarSign,
  Layers,
  Award,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import type {
  CampaignSessionResponse,
  CreateCampaignRequest,
} from '../../../types/campaign';

interface PlanningViewProps {
  session: CampaignSessionResponse | null;
  initialPrompt?: string;
  onStartSimulation: (req: CreateCampaignRequest) => void;
  isLoading: boolean;
}

const AVAILABLE_CHANNELS = [
  'Social Media',
  'Search Ads',
  'Digital Video',
  'Display Network',
  'Influencer Collab',
  'Retail Media',
];

const KPI_OPTIONS = ['ROAS', '전환 수', '전환율', '매출', 'CPA'];

export function PlanningView({
  session,
  initialPrompt,
  onStartSimulation,
  isLoading,
}: PlanningViewProps) {
  const [brandName, setBrandName] = useState(session?.brandName || 'Nova Electronics');
  const [productName, setProductName] = useState(
    session?.productName || 'Black Friday Galaxy S27'
  );
  const [objective, setObjective] = useState(
    initialPrompt ||
      session?.campaignObjective ||
      '미국 블랙프라이데이 기간 동안 Galaxy S27의 프리미엄 AI 기능과 한정 혜택을 강조하여 구매 전환을 극대화하는 전략을 제안해줘.'
  );
  const [targetAudience, setTargetAudience] = useState(
    '미국 내 25-45세 프리미엄 스마트폰 구매 의향자'
  );
  const [country, setCountry] = useState('미국 (United States)');
  const [duration, setDuration] = useState('2025.11.01 ~ 2025.11.30 (30일)');
  const [budget, setBudget] = useState(session?.budgetAmount || 2000000);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    session?.channels || ['Social Media', 'Search Ads', 'Digital Video']
  );
  const [selectedKpis, setSelectedKpis] = useState<string[]>([
    'ROAS',
    '전환 수',
    '전환율',
    '매출',
    'CPA',
  ]);

  const [activeStrategyTab, setActiveStrategyTab] = useState<
    'SUMMARY' | 'TARGET' | 'MESSAGING' | 'CHANNELS'
  >('SUMMARY');

  useEffect(() => {
    if (session) {
      if (session.brandName) setBrandName(session.brandName);
      if (session.productName) setProductName(session.productName);
      if (session.campaignObjective) setObjective(session.campaignObjective);
      if (session.budgetAmount) setBudget(session.budgetAmount);
      if (session.channels) setSelectedChannels(session.channels);
    }
  }, [session]);

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const toggleKpi = (kpi: string) => {
    setSelectedKpis((prev) =>
      prev.includes(kpi) ? prev.filter((k) => k !== kpi) : [...prev, kpi]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !objective || selectedChannels.length === 0) return;
    onStartSimulation({
      brandName,
      productName,
      campaignObjective: objective,
      targetAudience,
      budgetAmount: budget,
      currency: 'USD',
      channels: selectedChannels,
      stream: false,
    });
  };

  const briefData = session?.deliverables?.campaignBrief;
  const marketData = session?.deliverables?.marketSensing;
  const insightsData = session?.deliverables?.performanceInsights;

  const isFormDisabled = Boolean(session && session.status === 'RUNNING');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Column 1: 캠페인 브리프 (Campaign Brief Card) */}
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>캠페인 브리프</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              캠페인의 목표와 전략을 설정하여 AI가 인사이트를 제안해드려요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 캠페인 목표 */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-blue-600" />
                <span>캠페인 목표</span>
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                disabled={isFormDisabled || isLoading}
                rows={3}
                required
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 resize-none transition"
              />
            </div>

            {/* 제품 / 서비스 & 브랜드 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  제품 / 서비스
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  disabled={isFormDisabled || isLoading}
                  required
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg px-3 py-2 text-slate-800 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  브랜드명
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  disabled={isFormDisabled || isLoading}
                  required
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg px-3 py-2 text-slate-800 focus:outline-none transition"
                />
              </div>
            </div>

            {/* 타겟 & 국가/지역 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3 text-purple-600" />
                  <span>타겟</span>
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  disabled={isFormDisabled || isLoading}
                  required
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg px-3 py-2 text-slate-800 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  국가 / 지역
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={isFormDisabled || isLoading}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg px-3 py-2 text-slate-800 focus:outline-none transition"
                />
              </div>
            </div>

            {/* 캠페인 기간 & 예산 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  캠페인 기간
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  disabled={isFormDisabled || isLoading}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg px-3 py-2 text-slate-800 focus:outline-none transition font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-emerald-600" />
                  <span>예산 (USD)</span>
                </label>
                <input
                  type="number"
                  step={10000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  disabled={isFormDisabled || isLoading}
                  required
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg px-3 py-2 text-slate-800 focus:outline-none transition font-mono"
                />
              </div>
            </div>

            {/* 마케팅 채널 선택 */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                주요 마케팅 채널
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_CHANNELS.map((ch) => {
                  const active = selectedChannels.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      disabled={isFormDisabled || isLoading}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                        active
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 주요 KPI */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                주요 KPI
              </label>
              <div className="flex flex-wrap gap-1.5">
                {KPI_OPTIONS.map((kpi) => {
                  const active = selectedKpis.includes(kpi);
                  return (
                    <button
                      key={kpi}
                      type="button"
                      onClick={() => toggleKpi(kpi)}
                      disabled={isFormDisabled || isLoading}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                        active
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {kpi}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isFormDisabled || isLoading}
                className="flex-1 bg-[#1a56db] hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 text-xs"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>
                  {isLoading ? '시뮬레이션 실행 중...' : '저장 및 다음 단계 (실행)'}
                </span>
              </button>
              <button
                type="button"
                disabled={isFormDisabled || isLoading}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                임시 저장
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Column 2: AI 전략 제안 (AI Strategy Proposal Card) */}
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span>AI 전략 제안</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                수집된 마켓 센싱과 캠페인 브리프를 토대로 최적화된 전략을 제시합니다.
              </p>
            </div>
            {briefData && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                분석 완료
              </span>
            )}
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
            {[
              { id: 'SUMMARY', label: '전략 요약' },
              { id: 'TARGET', label: '타겟 인사이트' },
              { id: 'MESSAGING', label: '메시지 전략' },
              { id: 'CHANNELS', label: '채널 제안' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveStrategyTab(tab.id as typeof activeStrategyTab)
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeStrategyTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Strategy Content */}
          {briefData || marketData ? (
            <div className="space-y-4 text-xs">
              {/* Tab 1: SUMMARY */}
              {activeStrategyTab === 'SUMMARY' && (
                <div className="space-y-4">
                  {briefData?.coreValueProposition && (
                    <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                      <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-blue-600" />
                        핵심 가치 제안 (Core Value Proposition)
                      </span>
                      <p className="text-slate-800 font-medium leading-relaxed">
                        {briefData.coreValueProposition}
                      </p>
                    </div>
                  )}

                  {/* 예상 성과 (MMM 예측) Card */}
                  <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block mb-3 flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-emerald-600" />
                      예상 성과 (MMM 예측)
                    </span>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">
                          예상 ROAS
                        </span>
                        <span className="text-sm font-bold text-emerald-600 font-mono">
                          {insightsData?.expectedRoas
                            ? `${insightsData.expectedRoas}x`
                            : '4.2x'}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium block">
                          ▲ 16%
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">
                          예상 매출
                        </span>
                        <span className="text-sm font-bold text-slate-800 font-mono">
                          $ 9.2M
                        </span>
                        <span className="text-[10px] text-blue-600 font-medium block">
                          ▲ 18%
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">
                          예상 전환 수
                        </span>
                        <span className="text-sm font-bold text-purple-600 font-mono">
                          {insightsData?.projectedKpis?.estimatedConversions
                            ? insightsData.projectedKpis.estimatedConversions.toLocaleString()
                            : '42,500'}
                        </span>
                        <span className="text-[10px] text-purple-600 font-medium block">
                          ▲ 20%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 핵심 전략 요약 Bullets */}
                  <div>
                    <span className="text-xs font-bold text-slate-800 block mb-2">
                      핵심 전략 요약
                    </span>
                    <ul className="space-y-1.5 text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>AI 카메라, 배터리, 성능 등 핵심 기능을 중심으로 가치 전달</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>블랙 프라이데이 한정 번들 및 트레이드인 혜택 강조</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>리타겟팅 및 CRM 연계를 통한 전환 효율 극대화</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>프리미엄 관심자 타겟 중심의 퍼포먼스 마케팅 집중</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 2: TARGET */}
              {activeStrategyTab === 'TARGET' && (
                <div className="space-y-3">
                  {marketData?.targetMarket && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-700 block mb-1">
                        타겟 시장 분석
                      </span>
                      <p className="text-slate-600 leading-relaxed">
                        {marketData.targetMarket}
                      </p>
                    </div>
                  )}
                  {briefData?.targetPersonas && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-800 block">
                        타겟 페르소나
                      </span>
                      {briefData.targetPersonas.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-white border border-slate-200"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-900">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {p.demographics}
                            </span>
                          </div>
                          {p.primaryNeeds && (
                            <p className="text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-700">
                                주요 니즈:
                              </span>{' '}
                              {p.primaryNeeds.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: MESSAGING */}
              {activeStrategyTab === 'MESSAGING' && (
                <div className="space-y-3">
                  {briefData?.messagingPillars?.map((pillar, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                        <span className="text-blue-600 font-mono">0{idx + 1}.</span>
                        <span>{pillar.pillar}</span>
                      </div>
                      <p className="text-slate-600 italic">
                        "{pillar.keyMessage}"
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 4: CHANNELS */}
              {activeStrategyTab === 'CHANNELS' && (
                <div className="space-y-3">
                  {marketData?.consumerTrends && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="font-bold text-slate-800 block mb-1">
                        소비자 트렌드
                      </span>
                      <ul className="list-disc list-inside text-slate-600 space-y-1">
                        {marketData.consumerTrends.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <Lightbulb className="h-8 w-8 text-slate-300 mb-2" />
              <p className="font-medium text-xs text-slate-600 mb-1">
                시뮬레이션 실행 대기 중
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                좌측의 '저장 및 다음 단계' 버튼을 누르면 AI Agent 파이프라인이 마켓 센싱과 최적화된 마케팅 전략을 생성합니다.
              </p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <span className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">
            상세 전략 보기 &gt;
          </span>
        </div>
      </section>
    </div>
  );
}
