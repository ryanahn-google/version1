import { useState } from 'react';
import {
  Sparkles,
  Send,
  Layers,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { CampaignSummaryResponse } from '../../types/campaign';

interface HomeDashboardProps {
  campaigns: CampaignSummaryResponse[];
  isLoadingCampaigns: boolean;
  onOpenCampaign: (session: CampaignSummaryResponse) => void;
  onNewCampaign: (prefillPrompt?: string) => void;
}

export function HomeDashboard({
  campaigns,
  isLoadingCampaigns,
  onOpenCampaign,
  onNewCampaign,
}: HomeDashboardProps) {
  const { locale, t } = useLanguage();
  const [promptText, setPromptText] = useState('');

  const quickPromptChips = locale === 'ko' ? [
    '유사 제품 캠페인 성과 요약해줘',
    '신제품 런칭 캠페인 아이디어 제안해줘',
    '최적의 미디어 믹스 제안해줘',
    '20대 타겟 브랜드 인지도 캠페인 기획해줘',
  ] : [
    'Summarize performance for similar campaigns',
    'Generate launch strategy for new product',
    'Recommend optimal media mix allocation',
    'Plan brand awareness campaign for Gen-Z',
  ];

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;
    onNewCampaign(promptText.trim());
  };

  const getStageLabel = (stage?: string) => {
    switch (stage) {
      case 'MARKET_SENSING':
      case 'STRATEGY_BRIEF':
        return t.header.statusPlanning;
      case 'CREATIVE_CONTENT':
        return t.stepper.step2;
      case 'PERFORMANCE_INSIGHTS':
        return t.stepper.step3;
      case 'MEDIA_EXECUTION':
        return t.stepper.step4;
      case 'COMPLETED':
        return t.header.statusCompleted;
      default:
        return t.header.statusPlanning;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PAUSED_FOR_REVIEW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            {t.header.statusPaused}
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            {t.header.statusRunning}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            {t.header.statusCompleted}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {t.common.status}
          </span>
        );
    }
  };

  const getProgressPercentage = (campaign: CampaignSummaryResponse) => {
    if (campaign.status === 'COMPLETED') return 100;
    switch (campaign.currentStage) {
      case 'MARKET_SENSING':
        return 20;
      case 'STRATEGY_BRIEF':
        return 40;
      case 'CREATIVE_CONTENT':
        return 60;
      case 'PERFORMANCE_INSIGHTS':
        return 80;
      default:
        return 20;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 lg:p-8 space-y-8">
      {/* Hero Box: AI Marketing Assistant */}
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 lg:p-8 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span>{t.home.aiMarketingAssistant}</span>
          </div>

          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-4 tracking-tight">
            {t.home.heroTitle}
          </h2>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {quickPromptChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onNewCampaign(chip)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f1f5f9] hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium border border-[#e2e8f0] hover:border-blue-200 transition"
              >
                <span className="text-blue-500 font-bold">+</span>
                <span>{chip}</span>
              </button>
            ))}
          </div>

          {/* Conversational Prompt Box */}
          <form onSubmit={handlePromptSubmit} className="relative">
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={t.home.askAiPlaceholder}
              className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:border-blue-500 focus:bg-white rounded-xl pl-4 pr-12 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition shadow-inner"
            />
            <button
              type="submit"
              disabled={!promptText.trim()}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#1a56db] hover:bg-blue-700 text-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              title={t.home.sendPromptTitle}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <p className="text-[11px] text-slate-400 mt-2.5">
            {t.home.heroSubtitle}
          </p>
        </div>
      </section>

      {/* Recent Campaigns Table (Full Width) */}
      <section className="w-full bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.home.campaignHistoryTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.home.campaignHistoryDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNewCampaign()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold transition shadow-sm"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{t.nav.newCampaign}</span>
            </button>
          </div>

          {isLoadingCampaigns ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
              {t.common.loading}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="h-56 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <Layers className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-600 mb-1">
                {t.nav.noSessions}
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mb-3">
                {t.nav.emptySessionsDesc}
              </p>
              <button
                type="button"
                onClick={() => onNewCampaign()}
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium hover:bg-blue-100 transition"
              >
                {t.nav.newCampaign}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs table-fixed">
                <colgroup>
                  <col className="w-[28%]" /> {/* Campaign Name */}
                  <col className="w-[18%]" /> {/* Step */}
                  <col className="w-[18%]" /> {/* Budget */}
                  <col className="w-[18%]" /> {/* Progress */}
                  <col className="w-[9%]" />  {/* ROAS */}
                  <col className="w-[9%]" />  {/* Status */}
                </colgroup>
                <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="pb-3 font-semibold pl-2">{t.home.campaignName}</th>
                    <th className="pb-3 font-semibold pl-2">{t.common.step}</th>
                    <th className="pb-3 font-semibold pl-2">{t.planning.budget}</th>
                    <th className="pb-3 font-semibold pl-2 pr-4">{t.home.progress}</th>
                    <th className="pb-3 font-semibold text-right pr-2">ROAS</th>
                    <th className="pb-3 font-semibold text-center">{t.common.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map((camp) => {
                    const title =
                      camp.productName ||
                      camp.sessionId.slice(0, 18) ||
                      (locale === 'ko' ? '캠페인' : 'Campaign');
                    const stageLabel = getStageLabel(camp.currentStage);
                    const progress = getProgressPercentage(camp);
                    const symbol = camp.currency === 'KRW' ? '₩' : '$';
                    const budget = camp.budgetAmount
                      ? `${symbol} ${camp.budgetAmount.toLocaleString()}`
                      : `${symbol} 0`;
                    const roas =
                      typeof camp.expectedRoas === 'number'
                        ? `${camp.expectedRoas}x`
                        : '-';

                    return (
                      <tr
                        key={camp.sessionId}
                        onClick={() => onOpenCampaign(camp)}
                        className="hover:bg-slate-50 cursor-pointer transition group"
                      >
                        <td className="py-3 font-semibold text-slate-800 group-hover:text-blue-600 truncate pl-2">
                          {title}
                        </td>
                        <td className="py-3 text-slate-600 truncate pl-2">{stageLabel}</td>
                        <td className="py-3 text-slate-700 font-mono pl-2">
                          {budget}
                        </td>
                        <td className="py-3 pl-2 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">
                              {progress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-mono font-semibold text-emerald-600 pr-2">
                          {roas}
                        </td>
                        <td className="py-3 text-center">
                          {getStatusBadge(camp.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
