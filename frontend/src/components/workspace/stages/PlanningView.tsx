import { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  Award,
  Users,
  Target,
  BarChart3,
  Edit3,
  DollarSign,
  Lightbulb,
  Plus,
  Trash2,
  Smile,
  MessageSquare,
} from 'lucide-react';
import type {
  CampaignSessionResponse,
  CreateCampaignRequest,
  CampaignBriefDeliverable,
  MarketSensingDeliverable,
} from '../../../types/campaign';
import { RevisionModal } from '../../hitl/RevisionModal';

type TargetPersona = NonNullable<CampaignBriefDeliverable['targetPersonas']>[number];
type MessagingPillar = NonNullable<CampaignBriefDeliverable['messagingPillars']>[number];
type CompetitorAnalysis = NonNullable<MarketSensingDeliverable['competitiveAnalysis']>[number];

interface PlanningViewProps {
  session: CampaignSessionResponse | null;
  initialPrompt?: string;
  onStartSimulation: (req: CreateCampaignRequest) => void;
  onApproveOrRevise?: (
    action: 'approve' | 'revise',
    feedback?: string,
    deliverableUpdates?: Record<string, unknown>
  ) => void;
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
  onApproveOrRevise,
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
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  // Deliverables from Backend
  const briefData = session?.deliverables?.campaignBrief;
  const marketData = session?.deliverables?.marketSensing;
  const insightsData = session?.deliverables?.performanceInsights;

  // Editable Deliverable States (Stage 1)
  const [coreValueProposition, setCoreValueProposition] = useState(
    briefData?.coreValueProposition || ''
  );
  const [campaignTitle, setCampaignTitle] = useState(
    briefData?.campaignTitle || productName || ''
  );
  const [toneAndVoice, setToneAndVoice] = useState<string[]>(
    briefData?.toneAndVoice && briefData.toneAndVoice.length > 0
      ? briefData.toneAndVoice
      : ['프리미엄 (Premium)', '혁신적인 (Innovative)', '신뢰감 있는 (Authoritative)']
  );
  const [targetMarket, setTargetMarket] = useState(
    marketData?.targetMarket || ''
  );
  const [targetPersonas, setTargetPersonas] = useState<TargetPersona[]>(
    briefData?.targetPersonas || []
  );
  const [messagingPillars, setMessagingPillars] = useState<MessagingPillar[]>(
    briefData?.messagingPillars || []
  );
  const [consumerTrends, setConsumerTrends] = useState<string[]>(
    marketData?.consumerTrends || []
  );
  const [strategicOpportunities, setStrategicOpportunities] = useState<string[]>(
    marketData?.strategicOpportunities || []
  );
  const [competitiveAnalysis, setCompetitiveAnalysis] = useState<CompetitorAnalysis[]>(
    marketData?.competitiveAnalysis || []
  );
  const [positiveThemes, setPositiveThemes] = useState<string[]>(
    marketData?.sentimentOverview?.positiveThemes && marketData.sentimentOverview.positiveThemes.length > 0
      ? marketData.sentimentOverview.positiveThemes
      : ['AI 혁신 기능에 대한 높은 기대감', '플래그십 디자인 호평']
  );
  const [frictionPoints, setFrictionPoints] = useState<string[]>(
    marketData?.sentimentOverview?.frictionPoints && marketData.sentimentOverview.frictionPoints.length > 0
      ? marketData.sentimentOverview.frictionPoints
      : ['출고가 부담감', '사전 예약 혜택 비교']
  );
  const [sentimentScore, setSentimentScore] = useState<number>(
    marketData?.sentimentOverview?.overallSentimentScore ?? 0.82
  );

  useEffect(() => {
    if (session) {
      if (session.brandName) setBrandName(session.brandName);
      if (session.productName) setProductName(session.productName);
      if (session.campaignObjective) setObjective(session.campaignObjective);
      if (session.budgetAmount) setBudget(session.budgetAmount);
      if (session.channels) setSelectedChannels(session.channels);
    }
  }, [session]);

  useEffect(() => {
    if (briefData) {
      if (briefData.coreValueProposition) setCoreValueProposition(briefData.coreValueProposition);
      if (briefData.campaignTitle) setCampaignTitle(briefData.campaignTitle);
      if (briefData.targetPersonas) setTargetPersonas(briefData.targetPersonas);
      if (briefData.messagingPillars) setMessagingPillars(briefData.messagingPillars);
      if (briefData.toneAndVoice && briefData.toneAndVoice.length > 0) setToneAndVoice(briefData.toneAndVoice);
    }
    if (marketData) {
      if (marketData.targetMarket) setTargetMarket(marketData.targetMarket);
      if (marketData.consumerTrends) setConsumerTrends(marketData.consumerTrends);
      if (marketData.strategicOpportunities) setStrategicOpportunities(marketData.strategicOpportunities);
      if (marketData.competitiveAnalysis) setCompetitiveAnalysis(marketData.competitiveAnalysis);
      if (marketData.sentimentOverview) {
        if (marketData.sentimentOverview.positiveThemes) setPositiveThemes(marketData.sentimentOverview.positiveThemes);
        if (marketData.sentimentOverview.frictionPoints) setFrictionPoints(marketData.sentimentOverview.frictionPoints);
        if (marketData.sentimentOverview.overallSentimentScore !== undefined) setSentimentScore(marketData.sentimentOverview.overallSentimentScore);
      }
    }
  }, [briefData, marketData]);

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

  const handleAddPersona = () => {
    setTargetPersonas((prev) => [
      ...prev,
      {
        name: '신규 타겟 페르소나',
        demographics: '연령대/직업군 입력',
        primaryNeeds: ['주요 필요 니즈 입력'],
        barriers: ['장애 요인 입력'],
      },
    ]);
  };

  const handleDeletePersona = (idx: number) => {
    setTargetPersonas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddPillar = () => {
    setMessagingPillars((prev) => [
      ...prev,
      {
        pillar: '신규 메시지 필라',
        keyMessage: '핵심 전달 메시지를 입력하세요.',
        proofPoints: ['제품 기술 및 실증 근거'],
      },
    ]);
  };

  const handleDeletePillar = (idx: number) => {
    setMessagingPillars((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddTrend = () => {
    setConsumerTrends((prev) => [...prev, '신규 시장 트렌드 입력']);
  };

  const handleDeleteTrend = (idx: number) => {
    setConsumerTrends((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddOpportunity = () => {
    setStrategicOpportunities((prev) => [...prev, '신규 전략적 기회 입력']);
  };

  const handleDeleteOpportunity = (idx: number) => {
    setStrategicOpportunities((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddCompetitor = () => {
    setCompetitiveAnalysis((prev) => [
      ...prev,
      {
        competitor: '신규 경쟁사명',
        strengths: ['경쟁사 강점'],
        vulnerabilities: ['경쟁사 취약점 및 공략 포인트'],
      },
    ]);
  };

  const handleDeleteCompetitor = (idx: number) => {
    setCompetitiveAnalysis((prev) => prev.filter((_, i) => i !== idx));
  };

  // Deliverable Updates aggregator for auto-save on approve or revise
  const getDeliverableUpdates = () => ({
    campaignBrief: {
      ...(briefData || {}),
      campaignTitle: campaignTitle || productName,
      coreValueProposition,
      targetPersonas,
      messagingPillars,
      toneAndVoice,
    },
    marketSensing: {
      ...(marketData || {}),
      targetMarket,
      consumerTrends,
      strategicOpportunities,
      competitiveAnalysis,
      sentimentOverview: {
        positiveThemes,
        frictionPoints,
        overallSentimentScore: Number(sentimentScore),
      },
    },
  });

  const handleApprove = () => {
    if (!onApproveOrRevise) return;
    onApproveOrRevise('approve', undefined, getDeliverableUpdates());
  };

  const isFormDisabled = Boolean(session && session.status === 'RUNNING');
  const isReviewPending =
    session?.status === 'PAUSED_FOR_REVIEW' &&
    (session?.currentStage === 'STRATEGY_BRIEF' ||
      session?.currentStage === 'MARKET_SENSING');
  const isStage1Approved =
    session?.status === 'COMPLETED' ||
    (session?.currentStage &&
      session.currentStage !== 'MARKET_SENSING' &&
      session.currentStage !== 'STRATEGY_BRIEF');

  return (
    <div className="p-6 space-y-6">
      {/* Human-in-the-Loop Review Banner */}
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
                  Stage 1 전략 승인 필요
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                AI가 제안한 마켓 센싱과 캠페인 전략을 검토하고 필요 시 직접 수정한 후 승인해주세요. 승인 시 2단계(콘텐츠 제작)로 진행됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
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
              <span>전략 승인 및 2단계 진행</span>
            </button>
          </div>
        </div>
      )}

      {/* Stage 1 Approved Indicator Banner */}
      {isStage1Approved && (
        <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-3.5 px-5 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800">
              1단계(기획) 마케팅 전략이 승인되었습니다. (2단계 콘텐츠 제작 단계로 이동 가능)
            </span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            승인 완료
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: 캠페인 브리프 설정 (Campaign Brief Form Card) */}
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
                            ? 'bg-purple-50 border-purple-300 text-purple-700 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {kpi}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Button: Run Simulation */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isFormDisabled || isLoading}
                  className="w-full bg-[#1a56db] hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 text-xs"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>
                    {isLoading
                      ? '시뮬레이션 실행 중...'
                      : isReviewPending || briefData
                      ? '시뮬레이션 재실행'
                      : '시뮬레이션 시작'}
                  </span>
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
                    {/* 캠페인 콘셉트 제목 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          캠페인 콘셉트 명칭 (Campaign Title)
                        </span>
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Edit3 className="h-3 w-3" />
                          직접 수정 가능
                        </span>
                      </div>
                      <input
                        type="text"
                        value={campaignTitle}
                        onChange={(e) => setCampaignTitle(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none transition"
                        placeholder="캠페인 제목 입력"
                      />
                    </div>

                    {briefData?.coreValueProposition && (
                      <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-blue-600" />
                            핵심 가치 제안 (Core Value Proposition)
                          </span>
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            직접 수정 가능
                          </span>
                        </div>
                        <textarea
                          value={coreValueProposition}
                          onChange={(e) => setCoreValueProposition(e.target.value)}
                          rows={3}
                          className="w-full bg-white border border-blue-200 focus:border-blue-500 rounded-lg p-2.5 text-xs text-slate-800 font-medium leading-relaxed focus:outline-none resize-none transition"
                          placeholder="핵심 가치 제안 입력"
                        />
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
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          타겟 시장 분석 (Target Market)
                        </span>
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Edit3 className="h-3 w-3" />
                          수정 가능
                        </span>
                      </div>
                      <textarea
                        value={targetMarket}
                        onChange={(e) => setTargetMarket(e.target.value)}
                        rows={3}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none resize-none transition"
                        placeholder="타겟 시장 분석 내용 입력"
                      />
                    </div>

                    {/* 소비자 감성 분석 (Sentiment Overview) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Smile className="h-3.5 w-3.5 text-emerald-600" />
                          소비자 감성 분석 (Sentiment Overview)
                        </span>
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Edit3 className="h-3 w-3" />
                          직접 수정 가능
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-emerald-700 font-semibold block mb-1">
                            긍정 반응 요인 (Positive Themes, 쉼표 구분)
                          </label>
                          <input
                            type="text"
                            value={positiveThemes.join(', ')}
                            onChange={(e) =>
                              setPositiveThemes(
                                e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                              )
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-amber-700 font-semibold block mb-1">
                            불편/우려 요인 (Friction Points, 쉼표 구분)
                          </label>
                          <input
                            type="text"
                            value={frictionPoints.join(', ')}
                            onChange={(e) =>
                              setFrictionPoints(
                                e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                              )
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-none transition"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5">
                        <span className="text-xs text-slate-600 font-medium">
                          종합 감성 지수 (-1.0 ~ +1.0):
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.05"
                            min="-1"
                            max="1"
                            value={sentimentScore}
                            onChange={(e) => setSentimentScore(Number(e.target.value))}
                            className="w-20 font-mono text-xs font-bold text-emerald-600 bg-[#f8fafc] border border-slate-200 rounded px-2 py-0.5 text-right focus:bg-white focus:outline-none"
                          />
                          <span className="text-xs font-bold text-emerald-600 font-mono">
                            {sentimentScore > 0 ? `+${sentimentScore.toFixed(2)}` : sentimentScore.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 block">
                          타겟 페르소나 (Target Personas)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            수정 가능
                          </span>
                          <button
                            type="button"
                            onClick={handleAddPersona}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="h-3 w-3" />
                            <span>페르소나 추가</span>
                          </button>
                        </div>
                      </div>
                      {targetPersonas.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500">
                              페르소나 #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeletePersona(idx)}
                              disabled={targetPersonas.length <= 1}
                              className="text-slate-400 hover:text-red-500 p-1 transition disabled:opacity-30"
                              title="페르소나 삭제"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                                페르소나 이름/직무
                              </label>
                              <input
                                type="text"
                                value={p.name}
                                onChange={(e) => {
                                  const next = [...targetPersonas];
                                  next[idx] = { ...next[idx], name: e.target.value };
                                  setTargetPersonas(next);
                                }}
                                className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                                인구통계 (Demographics)
                              </label>
                              <input
                                type="text"
                                value={p.demographics}
                                onChange={(e) => {
                                  const next = [...targetPersonas];
                                  next[idx] = { ...next[idx], demographics: e.target.value };
                                  setTargetPersonas(next);
                                }}
                                className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none transition"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              주요 니즈 (Primary Needs, 쉼표 구분)
                            </label>
                            <input
                              type="text"
                              value={(p.primaryNeeds || []).join(', ')}
                              onChange={(e) => {
                                const next = [...targetPersonas];
                                next[idx] = {
                                  ...next[idx],
                                  primaryNeeds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                };
                                setTargetPersonas(next);
                              }}
                              className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              장애 요인 (Barriers, 쉼표 구분)
                            </label>
                            <input
                              type="text"
                              value={(p.barriers || []).join(', ')}
                              onChange={(e) => {
                                const next = [...targetPersonas];
                                next[idx] = {
                                  ...next[idx],
                                  barriers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                };
                                setTargetPersonas(next);
                              }}
                              className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none transition"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 3: MESSAGING */}
                {activeStrategyTab === 'MESSAGING' && (
                  <div className="space-y-4">
                    {/* 브랜드 톤앤보이스 가이드라인 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                          브랜드 톤앤보이스 가이드라인 (Tone & Voice)
                        </span>
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Edit3 className="h-3 w-3" />
                          직접 수정 가능
                        </span>
                      </div>
                      <input
                        type="text"
                        value={toneAndVoice.join(', ')}
                        onChange={(e) =>
                          setToneAndVoice(
                            e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="브랜드 보이스 형용사 및 가이드라인 (쉼표 구분)"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none transition"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {toneAndVoice.map((tv, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full"
                          >
                            #{tv}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800 block">
                          핵심 메시지 전략 (Messaging Pillars)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            수정 가능
                          </span>
                          <button
                            type="button"
                            onClick={handleAddPillar}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="h-3 w-3" />
                            <span>필라 추가</span>
                          </button>
                        </div>
                      </div>
                      {messagingPillars.map((pillar, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-blue-900 font-mono">
                              0{idx + 1}. 메시징 필라
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeletePillar(idx)}
                              disabled={messagingPillars.length <= 1}
                              className="text-slate-400 hover:text-red-500 p-1 transition disabled:opacity-30"
                              title="필라 삭제"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              필라 명칭
                            </label>
                            <input
                              type="text"
                              value={pillar.pillar}
                              onChange={(e) => {
                                const next = [...messagingPillars];
                                next[idx] = { ...next[idx], pillar: e.target.value };
                                setMessagingPillars(next);
                              }}
                              className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-blue-900 focus:bg-white focus:border-blue-500 focus:outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              핵심 메시지 (Key Message)
                            </label>
                            <textarea
                              value={pillar.keyMessage}
                              onChange={(e) => {
                                const next = [...messagingPillars];
                                next[idx] = { ...next[idx], keyMessage: e.target.value };
                                setMessagingPillars(next);
                              }}
                              rows={2}
                              className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none resize-none transition"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              증빙 포인트 (Proof Points, 쉼표 구분)
                            </label>
                            <input
                              type="text"
                              value={(pillar.proofPoints || []).join(', ')}
                              onChange={(e) => {
                                const next = [...messagingPillars];
                                next[idx] = {
                                  ...next[idx],
                                  proofPoints: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                };
                                setMessagingPillars(next);
                              }}
                              className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none transition"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 4: CHANNELS & MARKET SENSING */}
                {activeStrategyTab === 'CHANNELS' && (
                  <div className="space-y-4">
                    {/* 소비자 트렌드 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">
                          소비자 트렌드 (Consumer Trends)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            수정 가능
                          </span>
                          <button
                            type="button"
                            onClick={handleAddTrend}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="h-3 w-3" />
                            <span>트렌드 추가</span>
                          </button>
                        </div>
                      </div>
                      {consumerTrends.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <input
                            type="text"
                            value={t}
                            onChange={(e) => {
                              const next = [...consumerTrends];
                              next[idx] = e.target.value;
                              setConsumerTrends(next);
                            }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteTrend(idx)}
                            disabled={consumerTrends.length <= 1}
                            className="text-slate-400 hover:text-red-500 p-1 transition disabled:opacity-30"
                            title="트렌드 삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* 전략적 기회 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">
                          전략적 기회 (Strategic Opportunities)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            수정 가능
                          </span>
                          <button
                            type="button"
                            onClick={handleAddOpportunity}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="h-3 w-3" />
                            <span>기회 추가</span>
                          </button>
                        </div>
                      </div>
                      {strategicOpportunities.map((op, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <input
                            type="text"
                            value={op}
                            onChange={(e) => {
                              const next = [...strategicOpportunities];
                              next[idx] = e.target.value;
                              setStrategicOpportunities(next);
                            }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteOpportunity(idx)}
                            disabled={strategicOpportunities.length <= 1}
                            className="text-slate-400 hover:text-red-500 p-1 transition disabled:opacity-30"
                            title="기회 삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* 경쟁사 분석 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs block">
                          경쟁사 분석 (Competitive Analysis)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            수정 가능
                          </span>
                          <button
                            type="button"
                            onClick={handleAddCompetitor}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="h-3 w-3" />
                            <span>경쟁사 추가</span>
                          </button>
                        </div>
                      </div>
                      {competitiveAnalysis.map((comp, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 text-xs shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-1 mr-2">
                              <span className="text-slate-400 font-semibold text-[10px]">경쟁사:</span>
                              <input
                                type="text"
                                value={comp.competitor}
                                onChange={(e) => {
                                  const next = [...competitiveAnalysis];
                                  next[idx] = { ...next[idx], competitor: e.target.value };
                                  setCompetitiveAnalysis(next);
                                }}
                                className="font-bold text-slate-900 bg-[#f8fafc] border border-slate-200 rounded px-2 py-0.5 text-xs w-36"
                                placeholder="경쟁사명"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteCompetitor(idx)}
                              disabled={competitiveAnalysis.length <= 1}
                              className="text-slate-400 hover:text-red-500 p-1 transition disabled:opacity-30"
                              title="경쟁사 삭제"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              강점 (Strengths, 쉼표 구분)
                            </label>
                            <input
                              type="text"
                              value={(comp.strengths || []).join(', ')}
                              onChange={(e) => {
                                const next = [...competitiveAnalysis];
                                next[idx] = {
                                  ...next[idx],
                                  strengths: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                };
                                setCompetitiveAnalysis(next);
                              }}
                              className="w-full bg-[#f8fafc] border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none"
                              placeholder="강점 키워드 입력"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              취약점 및 공략 포인트 (Vulnerabilities, 쉼표 구분)
                            </label>
                            <input
                              type="text"
                              value={(comp.vulnerabilities || []).join(', ')}
                              onChange={(e) => {
                                const next = [...competitiveAnalysis];
                                next[idx] = {
                                  ...next[idx],
                                  vulnerabilities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                };
                                setCompetitiveAnalysis(next);
                              }}
                              className="w-full bg-[#f8fafc] border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none"
                              placeholder="취약점 키워드 입력"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
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
                  좌측의 '시뮬레이션 시작' 버튼을 누르면 AI Agent 파이프라인이 마켓 센싱과 최적화된 마케팅 전략을 생성합니다.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Revision Modal for Stage 1 Strategy Brief */}
      <RevisionModal
        stage="STRATEGY_BRIEF"
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        onSubmit={(feedback) => onApproveOrRevise?.('revise', feedback, getDeliverableUpdates())}
        isLoading={isLoading}
      />
    </div>
  );
}
