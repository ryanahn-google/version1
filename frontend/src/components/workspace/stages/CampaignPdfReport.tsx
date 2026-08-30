import React from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Image as ImageIcon,
  Users,
  Target,
  FileCheck,
} from 'lucide-react';
import type { CampaignSessionResponse } from '../../../types/campaign';
import type { Locale } from '../../../i18n/translations';

interface CampaignPdfReportProps {
  session: CampaignSessionResponse | null;
  locale: Locale;
  currencySymbol: string;
  sales: string;
  conversions: string;
  cvrDisplay: string;
  avgCpa: number;
}

export const CampaignPdfReport = React.forwardRef<HTMLDivElement, CampaignPdfReportProps>(
  ({ session, locale, currencySymbol: _currencySymbol, sales, conversions, cvrDisplay, avgCpa }, ref) => {
    if (!session) return null;

    const isKo = locale === 'ko';
    const brief = session.deliverables?.campaignBrief;
    const market = session.deliverables?.marketSensing;
    const creative = session.deliverables?.creativeContent;
    const insights = session.deliverables?.performanceInsights;

    const currency = (session.currency as 'USD' | 'KRW') || 'USD';
    const sym = currency === 'KRW' ? '₩' : '$';

    const budget = session.budgetAmount || 0;
    const roas = insights?.expectedRoas || 0;
    const allocations = insights?.channelAllocations || [];
    const formattedDate = new Date().toLocaleDateString(isKo ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <div
        ref={ref}
        id="mvc-campaign-report-printable"
        className="flex flex-col gap-6 bg-slate-200 p-0 text-slate-900 font-sans"
        style={{ color: '#0f172a' }}
      >
        {/* ========================================================================= */}
        {/* PAGE 1: Executive Summary, Key Metrics, & Stage 1 Strategic Brief          */}
        {/* ========================================================================= */}
        <div
          id="mvc-pdf-page-1"
          className="w-[794px] h-[1123px] max-h-[1123px] bg-white p-7 box-border flex flex-col justify-between overflow-hidden shadow-md mx-auto"
        >
          <div className="space-y-4">
            {/* Cover / Header Section */}
            <header className="border-b-2 border-blue-600 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
                    M
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                      {isKo
                        ? '통합 마케팅 전략 및 성과 보고서'
                        : 'Integrated Marketing Strategy & Performance Report'}
                    </h1>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Nova Electronics — Marketing Value Creator (MVC) Autonomous Executive Brief
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                    {isKo ? '최종 거버넌스 승인 완료' : 'Final Governance Approved'}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{formattedDate}</p>
                </div>
              </div>

              {/* Campaign Key Metadata Bar */}
              <div className="grid grid-cols-4 gap-2.5 mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">
                    {isKo ? '캠페인 제품' : 'Product / Campaign'}
                  </span>
                  <span className="font-bold text-slate-900 truncate block text-xs">
                    {session.productName || 'Campaign Product'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">
                    {isKo ? '브랜드명' : 'Brand Name'}
                  </span>
                  <span className="font-bold text-slate-900 truncate block text-xs">
                    {session.brandName || 'Nova Electronics'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">
                    {isKo ? '세션 ID' : 'Session ID'}
                  </span>
                  <span className="font-mono text-slate-600 truncate block text-xs">
                    {session.sessionId.slice(0, 16)}...
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">
                    {isKo ? '통화 기준' : 'Currency'}
                  </span>
                  <span className="font-bold text-blue-600 font-mono text-xs">
                    {currency} ({sym})
                  </span>
                </div>
              </div>
            </header>

            {/* Executive Summary Metrics Grid */}
            <section className="space-y-2">
              <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                <span>
                  {isKo
                    ? '핵심 성과 지표 요약 (Executive Metrics)'
                    : 'Executive Performance Metrics'}
                </span>
              </h2>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <span className="text-[9px] text-blue-700 font-bold uppercase block mb-0.5">
                    {isKo ? '총 집행 예산' : 'Total Budget'}
                  </span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {sym} {budget.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                  <span className="text-[9px] text-emerald-700 font-bold uppercase block mb-0.5">
                    {isKo ? '예상 총 매출' : 'Projected Revenue'}
                  </span>
                  <span className="text-base font-black text-emerald-700 font-mono">
                    {sym} {sales}
                  </span>
                </div>
                <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                  <span className="text-[9px] text-indigo-700 font-bold uppercase block mb-0.5">
                    {isKo ? '목표 ROAS' : 'Expected ROAS'}
                  </span>
                  <span className="text-base font-black text-indigo-700 font-mono">
                    {roas}x
                  </span>
                </div>
                <div className="p-2.5 bg-purple-50/60 border border-purple-100 rounded-xl">
                  <span className="text-[9px] text-purple-700 font-bold uppercase block mb-0.5">
                    {isKo ? '예상 구매전환수' : 'Total Conversions'}
                  </span>
                  <span className="text-base font-black text-purple-700 font-mono">
                    {conversions}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-[9px] text-slate-500 font-semibold block">
                    {isKo ? '전환율 (CVR)' : 'Conversion Rate (CVR)'}
                  </span>
                  <span className="font-bold text-slate-800 font-mono text-xs">{cvrDisplay}</span>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-[9px] text-slate-500 font-semibold block">
                    {isKo ? '평균 전환비용 (CPA)' : 'Average CPA'}
                  </span>
                  <span className="font-bold text-slate-800 font-mono text-xs">
                    {sym} {avgCpa.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-[9px] text-slate-500 font-semibold block">
                    {isKo ? '예상 클릭수 (Clicks)' : 'Estimated Clicks'}
                  </span>
                  <span className="font-bold text-slate-800 font-mono text-xs">
                    {insights?.projectedKpis?.estimatedClicks?.toLocaleString() || '-'}
                  </span>
                </div>
              </div>
            </section>

            {/* Stage 1: Market Sensing & Campaign Brief Decisions */}
            <section className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-bold">
                  Stage 1
                </span>
                <h2 className="text-xs font-bold text-slate-900">
                  {isKo
                    ? '마켓 센싱 및 캠페인 브리프 전략 결정사항'
                    : 'Market Sensing & Campaign Brief Strategic Decisions'}
                </h2>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <Target className="h-3 w-3 text-blue-600" />
                    <span>{isKo ? '캠페인 목표 (Campaign Objective)' : 'Campaign Objective'}</span>
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium bg-white p-2 rounded-lg border border-slate-200 text-xs">
                    {session.campaignObjective || '-'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <Users className="h-3 w-3 text-purple-600" />
                      <span>{isKo ? '타겟 고객군 (Target Market)' : 'Target Market'}</span>
                    </span>
                    <p className="text-slate-800 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                      {market?.targetMarket || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <Award className="h-3 w-3 text-emerald-600" />
                      <span>{isKo ? '핵심 가치 제안 (Core Value Prop)' : 'Core Value Proposition'}</span>
                    </span>
                    <p className="text-slate-800 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                      {brief?.coreValueProposition || '-'}
                    </p>
                  </div>
                </div>

                {/* Personas */}
                {brief?.targetPersonas && brief.targetPersonas.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 block mb-1">
                      {isKo ? '타겟 페르소나 프로필 (Target Personas)' : 'Target Personas'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {brief.targetPersonas.slice(0, 2).map((p, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-2 rounded-lg border border-slate-200 text-[10px] leading-tight"
                        >
                          <span className="font-bold text-blue-700 block mb-0.5">
                            {p.name} ({p.demographics})
                          </span>
                          <p className="text-slate-600 truncate">
                            <strong className="text-slate-700">{isKo ? '니즈: ' : 'Needs: '}</strong>
                            {(p.primaryNeeds || []).join(', ')}
                          </p>
                          <p className="text-slate-600 truncate">
                            <strong className="text-slate-700">{isKo ? '장벽: ' : 'Barriers: '}</strong>
                            {(p.barriers || []).join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messaging Pillars */}
                {brief?.messagingPillars && brief.messagingPillars.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 block mb-1">
                      {isKo ? '핵심 메시지 전략 (Messaging Pillars)' : 'Strategic Messaging Pillars'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {brief.messagingPillars.slice(0, 2).map((m, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-2 rounded-lg border border-slate-200 text-[10px]"
                        >
                          <span className="font-bold text-slate-900 block mb-0.5">{m.pillar}</span>
                          <p className="text-slate-600 leading-snug line-clamp-2">{m.keyMessage}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consumer Trends */}
                {market?.consumerTrends && market.consumerTrends.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 block mb-0.5">
                      {isKo ? '감지된 시장 트렌드 (Consumer Trends)' : 'Observed Consumer Trends'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {market.consumerTrends.slice(0, 4).map((tVal, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] text-slate-700 font-medium"
                        >
                          • {tVal}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Page 1 Footer */}
          <footer className="pt-3 border-t border-slate-200 text-slate-400 text-[9px] flex items-center justify-between">
            <div>
              <span>Nova Electronics Corp. • Marketing Value Creator (MVC) Multi-Agent System</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Page 1 of 2</span>
              <span> • Confidential Executive Brief</span>
            </div>
          </footer>
        </div>

        {/* ========================================================================= */}
        {/* PAGE 2: Stage 2 Creative, Stage 3 Media Planning, & Stage 4 Signoff        */}
        {/* ========================================================================= */}
        <div
          id="mvc-pdf-page-2"
          className="w-[794px] h-[1123px] max-h-[1123px] bg-white p-7 box-border flex flex-col justify-between overflow-hidden shadow-md mx-auto"
        >
          <div className="space-y-4">
            {/* Page 2 Top Header */}
            <header className="border-b border-slate-200 pb-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                  MVC Deliverables
                </span>
                <span className="font-bold text-slate-800 text-xs">
                  {session.productName || 'Campaign Product'} —{' '}
                  {isKo ? '실행 및 거버넌스 산출물' : 'Execution & Governance Deliverables'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{formattedDate}</span>
            </header>

            {/* Stage 2: Creative Content Deliverable (With Visual Image!) */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[9px] font-bold">
                  Stage 2
                </span>
                <h2 className="text-xs font-bold text-slate-900">
                  {isKo
                    ? '크리에이티브 비주얼 에셋 및 광고 카피라이팅'
                    : 'Creative Visual Asset & Copywriting Deliverable'}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                {/* Visual Image Deliverable */}
                <div>
                  <span className="text-[10px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3 text-purple-600" />
                    <span>{isKo ? '생성된 비주얼 에셋 (Imagen 3 / GCS)' : 'Generated Visual Asset'}</span>
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center h-[180px]">
                    {creative?.assetUrl ? (
                      <img
                        src={creative.assetUrl}
                        alt="Campaign Asset Deliverable"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        <ImageIcon className="h-6 w-6 mx-auto text-slate-500 mb-1" />
                        <span>{isKo ? '에셋 이미지 로드 대기' : 'Visual Asset Preview'}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 px-1 font-mono">
                    <span className="truncate max-w-[200px]">{creative?.visualConceptTitle || 'Concept'}</span>
                    <span>{creative?.aspectRatio || '16:9'}</span>
                  </div>
                </div>

                {/* Copywriting & Prompts */}
                <div className="space-y-2 text-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">
                      {isKo ? '메인 헤드라인' : 'Primary Headline'}
                    </span>
                    <p className="font-bold text-xs text-slate-900 bg-white p-2 rounded-lg border border-slate-200">
                      {creative?.headlineCopy || '-'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">
                      {isKo ? '광고 바디 카피' : 'Advertising Body Copy'}
                    </span>
                    <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 leading-relaxed text-[11px] line-clamp-3">
                      {creative?.bodyCopy || '-'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">
                        {isKo ? '행동 유도 버튼 (CTA)' : 'Call To Action (CTA)'}
                      </span>
                      <span className="inline-block font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[10px]">
                        {creative?.callToAction || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">
                        {isKo ? '스토리지 보안' : 'Storage Security'}
                      </span>
                      <span className="inline-block text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-semibold">
                        Direct VPC Egress GCS
                      </span>
                    </div>
                  </div>

                  {creative?.visualPromptUsed && (
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">
                        {isKo ? '합성 프롬프트' : 'Visual Generation Prompt'}
                      </span>
                      <p className="text-[9px] font-mono text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200 truncate">
                        {creative.visualPromptUsed}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Stage 3: Media Planning & MMM Budget Allocation */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-bold">
                  Stage 3
                </span>
                <h2 className="text-xs font-bold text-slate-900">
                  {isKo
                    ? '미디어 계획 및 MMM 채널별 예산 최적화 배분'
                    : 'Media Planning & MMM Channel Budget Allocations'}
                </h2>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <table className="w-full text-left text-xs">
                  <thead className="text-[9px] text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="pb-1.5 font-semibold">{isKo ? '채널명' : 'Channel'}</th>
                      <th className="pb-1.5 font-semibold text-right">{isKo ? '배분 예산' : 'Allocation'}</th>
                      <th className="pb-1.5 font-semibold text-right">{isKo ? '비중' : 'Share'}</th>
                      <th className="pb-1.5 font-semibold pl-3">{isKo ? '전략적 배분 근거' : 'Rationale'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allocations.slice(0, 5).map((item, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="py-1.5 px-2 font-semibold text-slate-900 text-[11px]">{item.channel}</td>
                        <td className="py-1.5 px-2 text-right font-mono font-medium text-slate-800 text-[11px]">
                          {sym} {item.allocationAmount ? item.allocationAmount.toLocaleString() : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-blue-600 text-[11px]">
                          {item.percentage}%
                        </td>
                        <td className="py-1.5 px-3 text-slate-600 text-[10px] truncate max-w-[260px]">
                          {item.rationale || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {insights?.recommendations && insights.recommendations.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-700 block mb-1">
                      {isKo ? 'AI 마케팅 최적화 권고 사항' : 'Strategic Optimization Recommendations'}
                    </span>
                    <div className="space-y-1">
                      {insights.recommendations.slice(0, 2).map((rec, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-slate-700 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Stage 4: Media Execution & Readiness Verification */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-bold">
                  Stage 4
                </span>
                <h2 className="text-xs font-bold text-slate-900">
                  {isKo
                    ? '미디어 집행 검증 및 거버넌스 승인'
                    : 'Media Execution Verification & Governance Signoff'}
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">
                    {isKo ? '채널 준비 상태' : 'Channel Readiness'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>
                      {allocations.length}
                      {isKo ? '개 채널 세팅 완료' : ' Channels Verified'}
                    </span>
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">
                    {isKo ? '보안 & 가드레일' : 'Governance & Safety'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-blue-700 font-bold text-[11px]">
                    <FileCheck className="h-3 w-3 text-blue-600" />
                    <span>Model Armor / OIDC Passed</span>
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">
                    {isKo ? '최종 승인 주체' : 'Human Approval'}
                  </span>
                  <span className="font-bold text-slate-800 text-[11px]">
                    {isKo ? '마케터 최종 승인 완료' : 'Marketer Signoff Completed'}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Page 2 Footer */}
          <footer className="pt-3 border-t border-slate-200 text-slate-400 text-[9px] flex items-center justify-between">
            <div>
              <span>Nova Electronics Corp. • Marketing Value Creator (MVC) Multi-Agent System</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Page 2 of 2</span>
              <span> • Confidential Executive Brief</span>
            </div>
          </footer>
        </div>
      </div>
    );
  }
);
