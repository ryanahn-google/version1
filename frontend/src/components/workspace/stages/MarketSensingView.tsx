import { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  Edit3,
  Lightbulb,
  Plus,
  Trash2,
  Smile,
  Compass,
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { apiClient } from '../../../api/client';
import type {
  CampaignSessionResponse,
  CreateCampaignRequest,
  MarketSensingDeliverable,
} from '../../../types/campaign';
import { RevisionModal } from '../../hitl/RevisionModal';

type CompetitorAnalysis = NonNullable<
  MarketSensingDeliverable['competitiveAnalysis']
>[number];

interface MarketSensingViewProps {
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

export function MarketSensingView({
  session,
  initialPrompt,
  onStartSimulation,
  onApproveOrRevise,
  isLoading,
}: MarketSensingViewProps) {
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

  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  // Deliverables from Backend
  const marketData = session?.deliverables?.marketSensing;

  // Editable Deliverable States (Stage 1 Market Sensing)
  const [targetMarket, setTargetMarket] = useState(
    marketData?.targetMarket || ''
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
    if (marketData) {
      if (marketData.targetMarket) setTargetMarket(marketData.targetMarket);
      if (marketData.consumerTrends) setConsumerTrends(marketData.consumerTrends);
      if (marketData.strategicOpportunities) setStrategicOpportunities(marketData.strategicOpportunities);
      if (marketData.competitiveAnalysis) setCompetitiveAnalysis(marketData.competitiveAnalysis);
      if (marketData.sentimentOverview) {
        if (marketData.sentimentOverview.positiveThemes) setPositiveThemes(marketData.sentimentOverview.positiveThemes);
        if (marketData.sentimentOverview.frictionPoints) setFrictionPoints(marketData.sentimentOverview.frictionPoints);
        if (marketData.sentimentOverview.overallSentimentScore !== undefined) {
          setSentimentScore(marketData.sentimentOverview.overallSentimentScore);
        }
      }
    }
  }, [marketData]);

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
      targetAudience:
        targetAudience.trim() ||
        (locale === 'ko' ? '주요 잠재 고객층' : 'Target audience segment'),
      budgetAmount: budget,
      currency,
      language: locale,
      channels: selectedChannels,
      stream: false,
    });
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
        vulnerabilities: [
          locale === 'ko'
            ? '경쟁사 취약점 및 공략 포인트'
            : 'Competitor vulnerability / exploit angle',
        ],
      },
    ]);
  };

  const handleDeleteCompetitor = (idx: number) => {
    setCompetitiveAnalysis((prev) => prev.filter((_, i) => i !== idx));
  };

  // Deliverable Updates aggregator for auto-save on approve or revise
  const getDeliverableUpdates = () => ({
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
    session?.currentStage === 'MARKET_SENSING';
  const isStage1Approved =
    session?.status === 'COMPLETED' ||
    (session?.currentStage && session.currentStage !== 'MARKET_SENSING');

  return (
    <div className="p-6 space-y-6">
      {/* Human-in-the-Loop Review Banner (Stage 1 Market Sensing) */}
      {isReviewPending && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
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
                  {locale === 'ko'
                    ? 'Stage 1 시장 감지 검토 필요'
                    : 'Stage 1 Market Sensing Review Required'}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {locale === 'ko'
                  ? 'AI Agent가 수집한 시장 감지 및 경쟁사 분석 결과를 검토하고 수정한 후 승인해주세요. 승인 시 2단계(전략 브리프 수립)가 시작됩니다.'
                  : 'Review and edit the market sensing and competitor analysis. Approving will dispatch Stage 2 (Strategy & Brief Agent).'}
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
              className="px-5 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {locale === 'ko'
                  ? '시장 감지 승인 및 2단계 진행'
                  : 'Approve & Proceed to Stage 2'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Stage 1 Approved Indicator Banner */}
      {isStage1Approved && (
        <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-3.5 px-5 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800">
              {locale === 'ko'
                ? '1단계(시장 감지) 분석 결과가 승인 완료되었습니다. (2단계 전략 브리프로 진행됨)'
                : 'Stage 1 (Market Sensing) analysis has been approved.'}
            </span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            {t.planning.approvedBadge}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: 캠페인 브리프 설정 폼 */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
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
              <div className="mb-4 p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center gap-2.5 text-blue-800 text-xs animate-pulse">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span>
                  {locale === 'ko'
                    ? '자연어 프롬프트에서 캠페인 파라미터를 추출 중입니다...'
                    : 'Extracting campaign parameters from prompt...'}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* 브랜드명 & 제품명 */}
              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg p-2 text-slate-800 focus:outline-none transition text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.planning.product} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    disabled={isFormDisabled || isLoading}
                    required
                    placeholder={t.planning.productPlaceholder}
                    className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg p-2 text-slate-800 focus:outline-none transition text-xs"
                  />
                </div>
              </div>

              {/* 캠페인 목표 */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.planning.objective} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  disabled={isFormDisabled || isLoading}
                  required
                  rows={3}
                  placeholder={t.planning.objectivePlaceholder}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg p-2 text-slate-800 focus:outline-none resize-none transition text-xs"
                />
              </div>

              {/* 타겟 고객군 */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.planning.targetAudience}
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  disabled={isFormDisabled || isLoading}
                  placeholder={t.planning.targetPlaceholder}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-lg p-2 text-slate-800 focus:outline-none transition text-xs"
                />
              </div>

              {/* 통화 & 예산 */}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.planning.currencyLabel}
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-[#f1f5f9] p-1 rounded-lg border border-[#cbd5e1]">
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
                    <span>
                      {t.planning.budget} ({currency})
                    </span>
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
                  className="w-full bg-[#1a56db] hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50 text-xs"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>
                    {isLoading
                      ? t.planning.runningSimulation
                      : isReviewPending || marketData
                      ? t.planning.reRunSimulation
                      : t.planning.startSimulation}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Column 2: [P1] Market Sensing Analysis Card */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="h-4 w-4 text-blue-600" />
                  <span>
                    {locale === 'ko'
                      ? 'Stage 1. [P1] 시장 감지 & 경쟁 분석'
                      : 'Stage 1. [P1] Market Sensing & Intelligence'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {locale === 'ko'
                    ? '실시간 웹 검색 및 마켓 센싱 에이전트가 도출한 시장/경쟁사 분석 결과입니다.'
                    : 'Target market dynamics, consumer sentiment, trends, and competitive intelligence.'}
                </p>
              </div>
              {marketData && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  {t.planning.analysisCompleted}
                </span>
              )}
            </div>

            {/* Content */}
            {marketData ? (
              <div className="space-y-4 text-xs">
                {/* 타겟 시장 분석 */}
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
                    rows={2}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none resize-none transition"
                    placeholder={t.planning.targetMarketPlaceholder}
                  />
                </div>

                {/* 소비자 감성 분석 */}
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
                            e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean)
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
                            e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean)
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
                        {sentimentScore > 0
                          ? `+${sentimentScore.toFixed(2)}`
                          : sentimentScore.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

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
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-1 mr-2">
                          <span className="text-slate-400 font-semibold text-[10px]">
                            {t.planning.competitorName}:
                          </span>
                          <input
                            type="text"
                            value={comp.competitor}
                            onChange={(e) => {
                              const next = [...competitiveAnalysis];
                              next[idx] = {
                                ...next[idx],
                                competitor: e.target.value,
                              };
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
                              strengths: e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
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
                              vulnerabilities: e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
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
            ) : (
              <div className="h-64 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <Lightbulb className="h-8 w-8 text-slate-300 mb-2" />
                <p className="font-medium text-xs text-slate-600 mb-1">
                  {t.planning.waitingTitle}
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                  {locale === 'ko'
                    ? "좌측에서 '시뮬레이션 시작' 버튼을 누르면 [P1] Market Sensing 에이전트가 시장 데이터와 감성 분석을 시작합니다."
                    : "Click 'Start Simulation' on the left to dispatch the [P1] Market Sensing Agent."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Revision Modal for Stage 1 Market Sensing */}
      <RevisionModal
        stage="MARKET_SENSING"
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        onSubmit={(feedback) =>
          onApproveOrRevise?.('revise', feedback, getDeliverableUpdates())
        }
        isLoading={isLoading}
      />
    </div>
  );
}
