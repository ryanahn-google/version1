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
  Edit3,
  DollarSign,
  Lightbulb,
  Plus,
  Trash2,
  Smile,
  MessageSquare,
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { apiClient } from '../../../api/client';
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

export function PlanningView({
  session,
  initialPrompt,
  onStartSimulation,
  onApproveOrRevise,
  isLoading,
}: PlanningViewProps) {
  const { locale, t } = useLanguage();
  const [currency, setCurrency] = useState<'USD' | 'KRW'>(
    (session?.currency as 'USD' | 'KRW') || 'USD'
  );
  const currencySymbol = currency === 'KRW' ? '₩' : '$';

  const [brandName, setBrandName] = useState(session?.brandName || '');
  const [productName, setProductName] = useState(session?.productName || '');
  const [objective, setObjective] = useState(
    initialPrompt || session?.campaignObjective || ''
  );
  const [targetAudience, setTargetAudience] = useState(
    session?.deliverables?.marketSensing?.targetMarket || ''
  );
  const [budget, setBudget] = useState(
    session?.budgetAmount || (currency === 'KRW' ? 2500000000 : 2000000)
  );
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    session?.channels || ['Social Media', 'Search Ads', 'Digital Video']
  );
  const [isInterpretingPrompt, setIsInterpretingPrompt] = useState(false);

  useEffect(() => {
    if (initialPrompt && !session) {
      setIsInterpretingPrompt(true);
      apiClient
        .parsePrompt({ prompt: initialPrompt, language: locale })
        .then((res) => {
          if (res.brandName) setBrandName(res.brandName);
          if (res.productName) setProductName(res.productName);
          if (res.campaignObjective) setObjective(res.campaignObjective);
          else setObjective(initialPrompt);
          if (res.targetAudience) setTargetAudience(res.targetAudience);
          if (res.budgetAmount) setBudget(res.budgetAmount);
          if (res.currency === 'KRW' || res.currency === 'USD') setCurrency(res.currency);
          if (res.channels && res.channels.length > 0) setSelectedChannels(res.channels);
        })
        .catch((err) => {
          console.warn('Failed to parse prompt with LLM:', err);
          setObjective(initialPrompt);
        })
        .finally(() => {
          setIsInterpretingPrompt(false);
        });
    }
  }, [initialPrompt]);

  const [activeStrategyTab, setActiveStrategyTab] = useState<
    'SUMMARY' | 'TARGET' | 'MESSAGING' | 'CHANNELS'
  >('SUMMARY');
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  // Deliverables from Backend
  const briefData = session?.deliverables?.campaignBrief;
  const marketData = session?.deliverables?.marketSensing;

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
      : []
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
    marketData?.sentimentOverview?.positiveThemes || []
  );
  const [frictionPoints, setFrictionPoints] = useState<string[]>(
    marketData?.sentimentOverview?.frictionPoints || []
  );
  const [sentimentScore, setSentimentScore] = useState<number>(
    marketData?.sentimentOverview?.overallSentimentScore ?? 0.8
  );

  useEffect(() => {
    if (session) {
      if (session.brandName) setBrandName(session.brandName);
      if (session.productName) setProductName(session.productName);
      if (session.campaignObjective) setObjective(session.campaignObjective);
      if (session.budgetAmount) setBudget(session.budgetAmount);
      if (session.channels) setSelectedChannels(session.channels);
      if (session.currency) setCurrency(session.currency as 'USD' | 'KRW');
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

  const handleCurrencyChange = (newCurrency: 'USD' | 'KRW') => {
    if (newCurrency === currency) return;
    setCurrency(newCurrency);
    if (newCurrency === 'KRW' && budget <= 10000000) {
      setBudget(2500000000);
    } else if (newCurrency === 'USD' && budget >= 10000000) {
      setBudget(2000000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !objective.trim() || selectedChannels.length === 0) return;
    onStartSimulation({
      brandName: brandName.trim() || 'Nova Electronics',
      productName: productName.trim() || 'Campaign Product',
      campaignObjective: objective.trim(),
      targetAudience: targetAudience.trim() || (locale === 'ko' ? '주요 잠재 고객층' : 'Target audience segment'),
      budgetAmount: budget,
      currency,
      language: locale,
      channels: selectedChannels,
      stream: false,
    });
  };

  const handleAddPersona = () => {
    setTargetPersonas((prev) => [
      ...prev,
      {
        name: locale === 'ko' ? '신규 타겟 페르소나' : 'New Target Persona',
        demographics: locale === 'ko' ? '연령대/직업군 입력' : 'Age / Demographic profile',
        primaryNeeds: [locale === 'ko' ? '주요 필요 니즈 입력' : 'Primary need statement'],
        barriers: [locale === 'ko' ? '장애 요인 입력' : 'Key purchase barrier'],
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
        pillar: locale === 'ko' ? '신규 메시지 필라' : 'New Messaging Pillar',
        keyMessage: locale === 'ko' ? '핵심 전달 메시지를 입력하세요.' : 'Enter core key message statement.',
        proofPoints: [locale === 'ko' ? '제품 기술 및 실증 근거' : 'Supporting proof point'],
      },
    ]);
  };

  const handleDeletePillar = (idx: number) => {
    setMessagingPillars((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddTrend = () => {
    setConsumerTrends((prev) => [
      ...prev,
      locale === 'ko' ? '신규 시장 트렌드 입력' : 'New consumer behavior trend',
    ]);
  };

  const handleDeleteTrend = (idx: number) => {
    setConsumerTrends((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddOpportunity = () => {
    setStrategicOpportunities((prev) => [
      ...prev,
      locale === 'ko' ? '신규 전략적 기회 입력' : 'New strategic opportunity',
    ]);
  };

  const handleDeleteOpportunity = (idx: number) => {
    setStrategicOpportunities((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddCompetitor = () => {
    setCompetitiveAnalysis((prev) => [
      ...prev,
      {
        competitor: locale === 'ko' ? '신규 경쟁사명' : 'New Competitor Brand',
        strengths: [locale === 'ko' ? '경쟁사 강점' : 'Competitor key strength'],
        vulnerabilities: [locale === 'ko' ? '경쟁사 취약점 및 공략 포인트' : 'Competitor vulnerability / exploit angle'],
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
                  {t.planning.hitlReviewPending}
                </span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-medium">
                  {t.planning.stage1ReviewRequired}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {t.planning.hitlReviewDesc}
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
              <span>{t.planning.requestRevision}</span>
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{t.planning.approveAndProceed}</span>
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
              {t.planning.stage1ApprovedNotice}
            </span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            {t.planning.approvedBadge}
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
                <span>{t.planning.briefTitle}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.planning.briefDesc}
              </p>
            </div>

            {isInterpretingPrompt && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-2.5 text-xs text-blue-700 animate-pulse">
                <Sparkles className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
                <span>
                  {locale === 'ko'
                    ? 'AI가 자연어 프롬프트를 분석하여 캠페인 브리프를 자동으로 채우고 있습니다...'
                    : 'AI is interpreting your natural language prompt into campaign brief parameters...'}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* 캠페인 목표 */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Target className="h-3.5 w-3.5 text-blue-600" />
                  <span>{t.planning.objective}</span>
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  disabled={isFormDisabled || isLoading}
                  placeholder={t.planning.objectivePlaceholder}
                  rows={3}
                  required
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 resize-none transition"
                />
              </div>

              {/* 제품 / 서비스 & 브랜드 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.planning.product}
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    disabled={isFormDisabled || isLoading}
                    placeholder={t.planning.productPlaceholder}
                    required
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg px-3 py-2 text-slate-800 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.planning.brand}
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    disabled={isFormDisabled || isLoading}
                    placeholder={t.planning.brandPlaceholder}
                    required
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg px-3 py-2 text-slate-800 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* 타겟 고객군 (Full width) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3 text-purple-600" />
                  <span>{t.planning.targetAudience}</span>
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  disabled={isFormDisabled || isLoading}
                  placeholder={t.planning.targetPlaceholder}
                  required
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg px-3 py-2 text-slate-800 focus:outline-none transition"
                />
              </div>

              {/* 통화 선택 & 예산 설정 (Dual Currency Support) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-emerald-600" />
                    <span>{t.planning.currencyLabel}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleCurrencyChange('USD')}
                      disabled={isFormDisabled || isLoading}
                      className={`py-1.5 rounded-md text-xs font-bold transition ${
                        currency === 'USD'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCurrencyChange('KRW')}
                      disabled={isFormDisabled || isLoading}
                      className={`py-1.5 rounded-md text-xs font-bold transition ${
                        currency === 'KRW'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      KRW (₩)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <span>{t.planning.budget} ({currency})</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step={currency === 'KRW' ? 10000000 : 10000}
                      min={0}
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      disabled={isFormDisabled || isLoading}
                      required
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg pl-8 pr-3 py-2 text-slate-800 focus:outline-none transition font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 마케팅 채널 선택 */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  {t.planning.channels}
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
                      ? t.planning.runningSimulation
                      : isReviewPending || briefData
                      ? t.planning.reRunSimulation
                      : t.planning.startSimulation}
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
                  <span>{t.planning.aiProposalTitle}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.planning.aiProposalDesc}
                </p>
              </div>
              {briefData && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  {t.planning.analysisCompleted}
                </span>
              )}
            </div>

            {/* Sub Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
              {[
                { id: 'SUMMARY', label: t.planning.tabs.summary },
                { id: 'TARGET', label: t.planning.tabs.target },
                { id: 'MESSAGING', label: t.planning.tabs.messaging },
                { id: 'CHANNELS', label: t.planning.tabs.channels },
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
                          {t.planning.campaignTitleLabel}
                        </span>
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Edit3 className="h-3 w-3" />
                          {t.content.editableBadge}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={campaignTitle}
                        onChange={(e) => setCampaignTitle(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none transition"
                        placeholder={t.planning.campaignTitlePlaceholder}
                      />
                    </div>

                    {briefData?.coreValueProposition && (
                      <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-blue-600" />
                            {t.planning.coreValuePropLabel}
                          </span>
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            {t.content.editableBadge}
                          </span>
                        </div>
                        <textarea
                          value={coreValueProposition}
                          onChange={(e) => setCoreValueProposition(e.target.value)}
                          rows={3}
                          className="w-full bg-white border border-blue-200 focus:border-blue-500 rounded-lg p-2.5 text-xs text-slate-800 font-medium leading-relaxed focus:outline-none resize-none transition"
                          placeholder={t.planning.coreValuePropPlaceholder}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: TARGET */}
                {activeStrategyTab === 'TARGET' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          {t.planning.targetMarketLabel}
                        </span>
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Edit3 className="h-3 w-3" />
                          {t.content.editableBadge}
                        </span>
                      </div>
                      <textarea
                        value={targetMarket}
                        onChange={(e) => setTargetMarket(e.target.value)}
                        rows={3}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none resize-none transition"
                        placeholder={t.planning.targetMarketPlaceholder}
                      />
                    </div>

                    {/* 소비자 감성 분석 (Sentiment Overview) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Smile className="h-3.5 w-3.5 text-emerald-600" />
                          {t.planning.sentimentTitle}
                        </span>
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Edit3 className="h-3 w-3" />
                          {t.content.editableBadge}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-emerald-700 font-semibold block mb-1">
                            {t.planning.positiveThemes}
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
                            {t.planning.frictionPoints}
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
                          {t.planning.sentimentScore}:
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
                          {t.planning.personasTitle}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            {t.content.editableBadge}
                          </span>
                          <button
                            type="button"
                            onClick={handleAddPersona}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="h-3 w-3" />
                            <span>{t.planning.addPersona}</span>
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
                              {locale === 'ko' ? `페르소나 #${idx + 1}` : `Persona #${idx + 1}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeletePersona(idx)}
                              disabled={targetPersonas.length <= 1}
                              className="text-slate-400 hover:text-red-500 p-1 transition disabled:opacity-30"
                              title={locale === 'ko' ? '페르소나 삭제' : 'Delete Persona'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                                {t.planning.personaName}
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
                                {t.planning.demographics}
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
                              {t.planning.primaryNeeds}
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
                              {t.planning.barriers}
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
                          {t.planning.toneAndVoiceTitle}
                        </span>
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Edit3 className="h-3 w-3" />
                          {t.content.editableBadge}
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
                        placeholder={t.planning.toneAndVoicePlaceholder}
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
                          {t.planning.messagingTitle}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            {t.content.editableBadge}
                          </span>
                          <button
                            type="button"
                            onClick={handleAddPillar}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="h-3 w-3" />
                            <span>{t.planning.addPillar}</span>
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
                              {locale === 'ko' ? `0${idx + 1}. 메시징 필라` : `0${idx + 1}. Messaging Pillar`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeletePillar(idx)}
                              disabled={messagingPillars.length <= 1}
                              className="text-slate-400 hover:text-red-500 p-1 transition disabled:opacity-30"
                              title={locale === 'ko' ? '필라 삭제' : 'Delete Pillar'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              {t.planning.pillarName}
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
                              {t.planning.keyMessage}
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
                              {t.planning.proofPoints}
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
                          {t.planning.trendsTitle}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            {t.content.editableBadge}
                          </span>
                          <button
                            type="button"
                            onClick={handleAddTrend}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="h-3 w-3" />
                            <span>{t.planning.addTrend}</span>
                          </button>
                        </div>
                      </div>
                      {consumerTrends.map((tVal, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <input
                            type="text"
                            value={tVal}
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
                            title={locale === 'ko' ? '트렌드 삭제' : 'Delete Trend'}
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
                          {t.planning.opportunitiesTitle}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            {t.content.editableBadge}
                          </span>
                          <button
                            type="button"
                            onClick={handleAddOpportunity}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="h-3 w-3" />
                            <span>{t.planning.addOpportunity}</span>
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
                            title={locale === 'ko' ? '기회 삭제' : 'Delete Opportunity'}
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
                          {t.planning.competitorsTitle}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            {t.content.editableBadge}
                          </span>
                          <button
                            type="button"
                            onClick={handleAddCompetitor}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition"
                          >
                            <Plus className="h-3 w-3" />
                            <span>{t.planning.addCompetitor}</span>
                          </button>
                        </div>
                      </div>
                      {competitiveAnalysis.map((comp, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 text-xs shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-1 mr-2">
                              <span className="text-slate-400 font-semibold text-[10px]">{t.planning.competitorName}:</span>
                              <input
                                type="text"
                                value={comp.competitor}
                                onChange={(e) => {
                                  const next = [...competitiveAnalysis];
                                  next[idx] = { ...next[idx], competitor: e.target.value };
                                  setCompetitiveAnalysis(next);
                                }}
                                className="font-bold text-slate-900 bg-[#f8fafc] border border-slate-200 rounded px-2 py-0.5 text-xs w-36"
                                placeholder={t.planning.competitorName}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteCompetitor(idx)}
                              disabled={competitiveAnalysis.length <= 1}
                              className="text-slate-400 hover:text-red-500 p-1 transition disabled:opacity-30"
                              title={locale === 'ko' ? '경쟁사 삭제' : 'Delete Competitor'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              {t.planning.strengths}
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
                              placeholder={t.planning.strengths}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              {t.planning.vulnerabilities}
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
                              placeholder={t.planning.vulnerabilities}
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
                  {t.planning.waitingTitle}
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                  {t.planning.waitingDesc}
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
