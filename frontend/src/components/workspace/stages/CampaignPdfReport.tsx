import React from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Image as ImageIcon,
  Users,
  Target,
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
  ({ session, locale, currencySymbol, sales, conversions, cvrDisplay, avgCpa }, ref) => {
    if (!session) return null;

    const isKo = locale === 'ko';
    const brief = session.deliverables?.campaignBrief;
    const market = session.deliverables?.marketSensing;
    const creative = session.deliverables?.creativeContent;
    const insights = session.deliverables?.performanceInsights;

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
        className="w-[800px] mx-auto bg-white text-slate-900 p-8 space-y-8 font-sans print:w-full print:p-0 print:space-y-6"
        style={{ color: '#0f172a' }}
      >
        {/* Cover / Header Section */}
        <header className="border-b-2 border-blue-600 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                M
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  {isKo ? '통합 캠페인 성과 및 전략 최종 보고서' : 'Integrated Campaign Performance & Strategy Report'}
                </h1>
                <p className="text-xs text-slate-500 font-medium tracking-wide">
                  Nova Electronics — Marketing Value Creator (MVC) Executive Brief
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-bold">
                {isKo ? '최종 승인 완료 (Stage 1~4)' : 'Final Approved (Stage 1~4)'}
              </span>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">{formattedDate}</p>
            </div>
          </div>

          {/* Campaign Key Metadata Bar */}
          <div className="grid grid-cols-4 gap-4 mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                {isKo ? '캠페인 제품' : 'Product / Campaign'}
              </span>
              <span className="font-bold text-slate-900">{session.productName || 'Campaign'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                {isKo ? '브랜드명' : 'Brand Name'}
              </span>
              <span className="font-bold text-slate-900">{session.brandName || 'Nova Electronics'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                {isKo ? '세션 ID' : 'Session ID'}
              </span>
              <span className="font-mono text-slate-700 truncate block">{session.sessionId.slice(0, 16)}...</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                {isKo ? '통화 기준' : 'Currency'}
              </span>
              <span className="font-bold text-blue-600">{session.currency || 'USD'} ({currencySymbol})</span>
            </div>
          </div>
        </header>

        {/* Executive Summary Metrics Grid */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <span>{isKo ? '핵심 성과 지표 요약 (Executive Metrics)' : 'Executive Summary & Key Performance Metrics'}</span>
          </h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
              <span className="text-[10px] text-blue-700 font-bold uppercase block mb-1">
                {isKo ? '총 집행 예산' : 'Total Ad Spend'}
              </span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {currencySymbol} {budget.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
              <span className="text-[10px] text-emerald-700 font-bold uppercase block mb-1">
                {isKo ? '예상 총 매출' : 'Projected Revenue'}
              </span>
              <span className="text-lg font-black text-emerald-700 font-mono">
                {currencySymbol} {sales}
              </span>
            </div>
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
              <span className="text-[10px] text-indigo-700 font-bold uppercase block mb-1">
                {isKo ? '목표 ROAS' : 'Expected ROAS'}
              </span>
              <span className="text-lg font-black text-indigo-700 font-mono">
                {roas}x
              </span>
            </div>
            <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
              <span className="text-[10px] text-purple-700 font-bold uppercase block mb-1">
                {isKo ? '예상 구매전환수' : 'Total Conversions'}
              </span>
              <span className="text-lg font-black text-purple-700 font-mono">
                {conversions}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-[10px] text-slate-500 font-semibold block">{isKo ? '전환율 (CVR)' : 'Conversion Rate (CVR)'}</span>
              <span className="font-bold text-slate-800 font-mono">{cvrDisplay}</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-[10px] text-slate-500 font-semibold block">{isKo ? '평균 전환비용 (CPA)' : 'Average CPA'}</span>
              <span className="font-bold text-slate-800 font-mono">{currencySymbol} {avgCpa.toLocaleString()}</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-[10px] text-slate-500 font-semibold block">{isKo ? '예상 클릭수 (Clicks)' : 'Estimated Clicks'}</span>
              <span className="font-bold text-slate-800 font-mono">{insights?.projectedKpis?.estimatedClicks?.toLocaleString() || '-'}</span>
            </div>
          </div>
        </section>

        {/* Stage 1: Market Sensing & Campaign Brief Decisions */}
        <section className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">Stage 1</span>
            <h2 className="text-sm font-bold text-slate-900">
              {isKo ? '마켓 센싱 및 캠페인 전략 기획 결정사항' : 'Stage 1: Market Sensing & Strategic Brief Decisions'}
            </h2>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
            <div>
              <span className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-blue-600" />
                <span>{isKo ? '캠페인 목표 (Campaign Objective)' : 'Campaign Objective'}</span>
              </span>
              <p className="text-slate-800 leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-slate-200">
                {session.campaignObjective || '-'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-purple-600" />
                  <span>{isKo ? '타겟 고객군' : 'Target Audience'}</span>
                </span>
                <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                  {market?.targetMarket || '-'}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{isKo ? '핵심 가치 제안 (Core Value Proposition)' : 'Core Value Proposition'}</span>
                </span>
                <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                  {brief?.coreValueProposition || '-'}
                </p>
              </div>
            </div>

            {/* Personas & Messaging Pillars */}
            {brief?.targetPersonas && brief.targetPersonas.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                  {isKo ? '확정 타겟 페르소나 (Target Personas)' : 'Target Personas'}
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {brief.targetPersonas.map((p, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                      <span className="font-bold text-blue-700 block mb-0.5">{p.name} ({p.demographics})</span>
                      <p className="text-slate-600"><strong className="text-slate-700">{isKo ? '니즈: ' : 'Needs: '}</strong>{(p.primaryNeeds || []).join(', ')}</p>
                      <p className="text-slate-600"><strong className="text-slate-700">{isKo ? '장벽: ' : 'Barriers: '}</strong>{(p.barriers || []).join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {brief?.messagingPillars && brief.messagingPillars.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                  {isKo ? '핵심 메시지 전략 (Messaging Pillars)' : 'Messaging Pillars'}
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {brief.messagingPillars.map((m, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                      <span className="font-bold text-slate-900 block mb-0.5">{m.pillar}</span>
                      <p className="text-slate-600 leading-relaxed">{m.keyMessage}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {market?.consumerTrends && market.consumerTrends.length > 0 && (
              <div className="text-[11px]">
                <span className="font-bold text-slate-700 block mb-1">
                  {isKo ? '감지된 시장 및 소비자 트렌드' : 'Observed Consumer Trends & Opportunities'}
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                  {market.consumerTrends.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Stage 2: Creative Content Deliverable (With Visual Image!) */}
        <section className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-bold">Stage 2</span>
            <h2 className="text-sm font-bold text-slate-900">
              {isKo ? '크리에이티브 콘텐츠 및 비주얼 산출물' : 'Stage 2: Creative Content Deliverables & Asset Mockup'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            {/* Visual Image Deliverable */}
            <div>
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-purple-600" />
                <span>{isKo ? '생성된 비주얼 에셋 (Imagen 3 / GCS)' : 'Generated Visual Asset Deliverable'}</span>
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center min-h-[220px]">
                {creative?.assetUrl ? (
                  <img
                    src={creative.assetUrl}
                    alt="Campaign Asset Deliverable"
                    crossOrigin="anonymous"
                    className="w-full h-auto max-h-[260px] object-contain"
                  />
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <ImageIcon className="h-8 w-8 mx-auto text-slate-500 mb-1" />
                    <span>{isKo ? '에셋 이미지가 로드되지 않았습니다' : 'No visual asset preview'}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 px-1 font-mono">
                <span>{creative?.visualConceptTitle || 'Creative Concept'}</span>
                <span>{creative?.aspectRatio || '16:9'}</span>
              </div>
            </div>

            {/* Copywriting & Prompts */}
            <div className="space-y-2.5 text-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                  {isKo ? '메인 헤드라인' : 'Primary Headline'}
                </span>
                <p className="font-bold text-sm text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200">
                  {creative?.headlineCopy || '-'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                  {isKo ? '광고 바디 카피' : 'Advertising Body Copy'}
                </span>
                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                  {creative?.bodyCopy || '-'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                    {isKo ? '행동 유도 버튼 (CTA)' : 'Call To Action (CTA)'}
                  </span>
                  <span className="inline-block font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md text-xs">
                    {creative?.callToAction || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                    {isKo ? '보안 및 저장 위치' : 'Storage / Security'}
                  </span>
                  <span className="inline-block text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md text-[10px] font-semibold">
                    Direct VPC Egress GCS
                  </span>
                </div>
              </div>

              {creative?.visualPromptUsed && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                    {isKo ? '사용된 합성 프롬프트' : 'Visual Generation Prompt'}
                  </span>
                  <p className="text-[10px] font-mono text-slate-600 bg-white p-2 rounded-lg border border-slate-200 truncate">
                    {creative.visualPromptUsed}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stage 3: Media Planning & MMM Budget Allocation Decisions */}
        <section className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">Stage 3</span>
            <h2 className="text-sm font-bold text-slate-900">
              {isKo ? '미디어 계획 및 MMM 채널별 예산 배분' : 'Stage 3: Media Planning & MMM Budget Allocations'}
            </h2>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="pb-2 font-semibold">{isKo ? '채널명' : 'Channel'}</th>
                  <th className="pb-2 font-semibold text-right">{isKo ? '배분 예산' : 'Allocation'}</th>
                  <th className="pb-2 font-semibold text-right">{isKo ? '비중 (%)' : 'Share (%)'}</th>
                  <th className="pb-2 font-semibold pl-4">{isKo ? '전략적 근거 (Rationale)' : 'Strategic Rationale'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allocations.map((item, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="py-2.5 px-2 font-semibold text-slate-900">{item.channel}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-medium text-slate-800">
                      {currencySymbol} {item.allocationAmount ? item.allocationAmount.toLocaleString() : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-blue-600">
                      {item.percentage}%
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                      {item.rationale || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {insights?.recommendations && insights.recommendations.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-700 block mb-1">
                  {isKo ? 'AI 마케팅 최적화 권고 사항' : 'Strategic Optimization Recommendations'}
                </span>
                <div className="space-y-1">
                  {insights.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-slate-700 text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Stage 4: Media Execution & Readiness Verification */}
        <section className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white text-[10px] font-bold">Stage 4</span>
            <h2 className="text-sm font-bold text-slate-900">
              {isKo ? '미디어 집행 검증 및 거버넌스 승인' : 'Stage 4: Media Execution Readiness & Governance Signoff'}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">
                {isKo ? '채널 준비 상태' : 'Channel Readiness'}
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>{allocations.length}{isKo ? '개 채널 세팅 완료' : ' Channels Verified'}</span>
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">
                {isKo ? '거버넌스 & 가드레일' : 'Governance & Safety'}
              </span>
              <span className="inline-flex items-center gap-1 text-blue-700 font-bold text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Model Armor / OIDC Passed</span>
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">
                {isKo ? '의사결정 승인 주체' : 'Human Approval'}
              </span>
              <span className="font-bold text-slate-800 text-xs">
                {isKo ? '마케터 최종 승인 완료' : 'Marketer Signoff Completed'}
              </span>
            </div>
          </div>
        </section>

        {/* Footer / Sign-off */}
        <footer className="pt-6 border-t-2 border-slate-200 text-slate-400 text-[10px] flex items-center justify-between">
          <div>
            <span>Nova Electronics Corp. • Marketing Value Creator (MVC) Autonomous Multi-Agent System</span>
          </div>
          <div>
            <span>Page 1 of 1 • Confidential Marketing Document</span>
          </div>
        </footer>
      </div>
    );
  }
);
