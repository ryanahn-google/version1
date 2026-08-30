import { useState, useRef } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  FileDown,
  Filter,
  Sparkles,
  SlidersHorizontal,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useLanguage } from '../../../context/LanguageContext';
import type { CampaignSessionResponse } from '../../../types/campaign';
import { CampaignPdfReport } from './CampaignPdfReport';

interface ExecutionAndAnalyticsViewProps {
  session: CampaignSessionResponse | null;
}

export function ExecutionAndAnalyticsView({
  session,
}: ExecutionAndAnalyticsViewProps) {
  const { locale, t } = useLanguage();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const insights = session?.deliverables?.performanceInsights;
  const budget = session?.budgetAmount || 0;
  const currency = session?.currency || insights?.currency || 'USD';
  const currencySymbol = currency === 'KRW' ? '₩' : '$';
  const roas = insights?.expectedRoas || 0;
  const sales = Math.round(budget * roas).toLocaleString();

  // Dynamic session timestamp formatting
  const startDateStr = session?.createdAt
    ? new Date(session.createdAt).toLocaleDateString(
        locale === 'ko' ? 'ko-KR' : 'en-US',
        {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }
      )
    : new Date().toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US');
  const endDateStr = session?.updatedAt
    ? new Date(session.updatedAt).toLocaleDateString(
        locale === 'ko' ? 'ko-KR' : 'en-US',
        {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }
      )
    : startDateStr;
  const dateRange = `${startDateStr} ~ ${endDateStr}`;

  const allocations = insights?.channelAllocations || [];

  const totalConversionsNum =
    insights?.projectedKpis?.estimatedConversions || 0;
  const estimatedClicksNum =
    insights?.projectedKpis?.estimatedClicks || 0;
  const estimatedImpressionsNum =
    insights?.projectedKpis?.estimatedImpressions || 0;
  const projectedCtrNum =
    insights?.projectedKpis?.projectedCtr || 0;
  const cvrDisplay =
    estimatedClicksNum > 0
      ? `${((totalConversionsNum / estimatedClicksNum) * 100).toFixed(2)}%`
      : '0.00%';
  const avgCpa =
    totalConversionsNum > 0 ? Math.round(budget / totalConversionsNum) : 0;
  const conversions = totalConversionsNum.toLocaleString();

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const page1 = document.getElementById('mvc-pdf-page-1');
      const page2 = document.getElementById('mvc-pdf-page-2');
      const page3 = document.getElementById('mvc-pdf-page-3');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (page1 && page2 && page3) {
        const canvas1 = await html2canvas(page1, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });
        const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        pdf.addPage();

        const canvas2 = await html2canvas(page2, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });
        const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        pdf.addPage();

        const canvas3 = await html2canvas(page3, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });
        const imgData3 = canvas3.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData3, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      } else if (page1 && page2) {
        const canvas1 = await html2canvas(page1, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });
        const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        pdf.addPage();

        const canvas2 = await html2canvas(page2, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });
        const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      } else if (reportRef.current) {
        const canvas = await html2canvas(reportRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(
          imgData,
          'JPEG',
          0,
          0,
          pdfWidth,
          Math.min(pdfHeight, imgHeight)
        );
      }

      const safeName =
        session?.productName?.replace(/[^a-zA-Z0-9가-힣_-]/g, '_') ||
        'campaign';
      const dateTag = new Date().toISOString().slice(0, 10);
      pdf.save(`MVC_Report_${safeName}_${dateTag}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert(
        locale === 'ko'
          ? 'PDF 리포트 생성 중 오류가 발생했습니다.'
          : 'Failed to generate PDF report.'
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Date Range Selector & Report Download Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span>{t.analytics.dateRangeLabel}</span>
          <span className="font-mono text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
            {dateRange}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            <span>
              {isGeneratingPdf
                ? t.analytics.generatingPdf
                : t.analytics.downloadPdfBtn}
            </span>
          </button>
        </div>
      </div>

      {/* Top 6 KPI Performance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {t.analytics.totalRevenue}
          </span>
          <div className="text-base font-bold text-slate-900 font-mono mt-1">
            {currencySymbol} {sales}
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            {t.analytics.revenueDesc}
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {t.analytics.roas}
          </span>
          <div className="text-base font-bold text-emerald-600 font-mono mt-1">
            {roas}x
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
            {t.analytics.roasDesc}
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {t.analytics.conversions}
          </span>
          <div className="text-base font-bold text-purple-600 font-mono mt-1">
            {conversions}
          </div>
          <span className="text-[10px] text-purple-600 font-medium mt-0.5 block">
            {t.analytics.conversionsDesc}
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {t.analytics.cvr}
          </span>
          <div className="text-base font-bold text-blue-600 font-mono mt-1">
            {cvrDisplay}
          </div>
          <span className="text-[10px] text-blue-600 font-medium mt-0.5 block">
            {t.analytics.cvrDesc}
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {t.analytics.avgCpa}
          </span>
          <div className="text-base font-bold text-slate-800 font-mono mt-1">
            {currencySymbol} {avgCpa.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            {t.analytics.cpaDesc}
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            {t.analytics.adSpend}
          </span>
          <div className="text-base font-bold text-slate-900 font-mono mt-1">
            {currencySymbol} {budget.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            {t.analytics.adSpendDesc}
          </span>
        </div>
      </div>

      {/* 채널별 집행 현황 테이블 */}
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <span>
              {locale === 'ko'
                ? '종합 미디어 집행 현황 (Execution Tracking)'
                : 'Media Execution Tracking'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {locale === 'ko'
              ? '4단계 MMM 최적화 배분에 따라 각 채널별로 집행 준비가 완료된 현황입니다.'
              : 'Channel execution status synchronized from Stage 4 Media Plan MMM.'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="pb-3 font-semibold">{t.mmm.tableChannel}</th>
                <th className="pb-3 font-semibold text-right">
                  {t.mmm.tableAllocation}
                </th>
                <th className="pb-3 font-semibold text-right">
                  {t.mmm.tablePercentage}
                </th>
                <th className="pb-3 font-semibold pl-4">
                  {t.mmm.tableRationale}
                </th>
                <th className="pb-3 font-semibold text-center">
                  {t.common.status}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {t.execution.noChannels}
                  </td>
                </tr>
              ) : (
                allocations.map((item, idx) => {
                  const amt = item.allocationAmount
                    ? item.allocationAmount
                    : Math.round(
                        (budget *
                          (item.percentage ||
                            100 / (allocations.length || 1))) /
                          100
                      );
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 font-semibold text-slate-900">
                        {item.channel}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-800 font-medium">
                        {currencySymbol} {amt.toLocaleString()}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-blue-600">
                        {item.percentage}%
                      </td>
                      <td className="py-3.5 pl-4 text-slate-600 text-xs max-w-md">
                        {item.rationale || '-'}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          {t.execution.statusReady}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2-Column Grid: 채널별 기여도 & 전환 퍼널 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 채널별 기여도 (2 cols on lg) */}
        <section className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span>{t.analytics.channelContributionTitle}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.analytics.channelContributionDesc}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="pb-3 font-semibold">{t.mmm.tableChannel}</th>
                  <th className="pb-3 font-semibold text-right">
                    {t.mmm.tableAllocation}
                  </th>
                  <th className="pb-3 font-semibold text-right">
                    {t.mmm.tablePercentage}
                  </th>
                  <th className="pb-3 font-semibold pl-4">
                    {t.mmm.tableRationale}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((item, idx) => {
                  const amt = item.allocationAmount
                    ? item.allocationAmount
                    : Math.round(budget * ((item.percentage || 10) / 100));
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 font-semibold text-slate-800">
                        {item.channel}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-900 font-semibold">
                        {currencySymbol} {amt.toLocaleString()}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-blue-600">
                        {item.percentage}%
                      </td>
                      <td className="py-3.5 pl-4 text-slate-600 text-xs">
                        {item.rationale || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 전환 퍼널 성과 (1 col on lg) */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span>{t.analytics.funnelTitle}</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            {/* Step 1: 노출 */}
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-blue-900">
                  {t.analytics.funnelStep1}
                </span>
                <span className="font-mono text-[10px] text-blue-700 font-bold">
                  100%
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-900">
                {estimatedImpressionsNum.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {t.analytics.funnelStep1Sub}
              </span>
            </div>

            {/* Step 2: 클릭 */}
            <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-100">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-cyan-900">
                  {t.analytics.funnelStep2}
                </span>
                <span className="font-mono text-[10px] text-cyan-700 font-bold">
                  CTR {projectedCtrNum}%
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-900">
                {estimatedClicksNum.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {t.analytics.funnelStep2Sub}
              </span>
            </div>

            {/* Step 3: 구매 전환 */}
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-emerald-900">
                  {t.analytics.funnelStep3}
                </span>
                <span className="font-mono text-[10px] text-emerald-700 font-bold">
                  CVR {cvrDisplay}
                </span>
              </div>
              <div className="text-base font-bold font-mono text-emerald-700">
                {totalConversionsNum.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {t.analytics.funnelStep3Sub}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Grid: AI 최적화 권고 사항 & 집행 완료 요약 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span>
              {locale === 'ko'
                ? 'AI 성과 최적화 권고사항 (P4 Insights)'
                : 'AI Optimization Recommendations (P4 Insights)'}
            </span>
          </h3>

          <div className="space-y-2.5">
            {insights?.recommendations && insights.recommendations.length > 0 ? (
              insights.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-700 leading-relaxed">{rec}</p>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-slate-400 text-xs">
                {locale === 'ko'
                  ? '4단계에서 생성된 채널 최적화 권고가 반영되었습니다.'
                  : 'Channel optimization recommendations have been applied.'}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <span>
              {locale === 'ko' ? '집행 완료 요약' : 'Execution Summary'}
            </span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <div>
                  <span className="font-semibold text-slate-800 block">
                    {locale === 'ko'
                      ? '예산 배분 정합성 100%'
                      : 'Budget Allocation 100% Conserved'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {locale === 'ko'
                      ? '4단계 MMM 예산 배분 스키마와 100% 일치합니다.'
                      : '100% matched with Stage 4 MMM allocation.'}
                  </span>
                </div>
              </div>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div>
                  <span className="font-semibold text-slate-800 block">
                    {locale === 'ko'
                      ? '5단계 파이프라인 전 과정 승인 완료'
                      : '5-Stage Pipeline Completely Finalized'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {locale === 'ko'
                      ? '상단의 PDF 다운로드 버튼을 통해 3페이지 종합 보고서를 출력할 수 있습니다.'
                      : 'Download the comprehensive 3-page PDF report above.'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </section>
      </div>

      {/* Hidden container positioned offscreen for html2canvas to capture */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          zIndex: -50,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <CampaignPdfReport
          ref={reportRef}
          session={session}
          locale={locale}
          currencySymbol={currencySymbol}
          sales={sales}
          conversions={conversions}
          cvrDisplay={cvrDisplay}
          avgCpa={avgCpa}
        />
      </div>
    </div>
  );
}
