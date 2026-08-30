import { useState, useRef } from 'react';
import {
  BarChart3,
  Calendar,
  Filter,
  Printer,
  FileDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useLanguage } from '../../../context/LanguageContext';
import type { CampaignSessionResponse } from '../../../types/campaign';
import { CampaignPdfReport } from './CampaignPdfReport';

interface PerformanceAnalyticsViewProps {
  session: CampaignSessionResponse | null;
}

export function PerformanceAnalyticsView({
  session,
}: PerformanceAnalyticsViewProps) {
  const { locale, t } = useLanguage();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const insights = session?.deliverables?.performanceInsights;
  const budget = session?.budgetAmount || 0;
  const currency =
    insights?.currency ||
    session?.currency ||
    'USD';
  const currencySymbol = currency === 'KRW' ? '₩' : '$';
  const roas = insights?.expectedRoas || 0;
  const sales = Math.round(budget * roas).toLocaleString();

  // Dynamic session timestamp formatting
  const startDateStr = session?.createdAt
    ? new Date(session.createdAt).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : new Date().toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
  const endDateStr = session?.updatedAt
    ? new Date(session.updatedAt).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
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
  const cvrDisplay = estimatedClicksNum > 0
    ? `${((totalConversionsNum / estimatedClicksNum) * 100).toFixed(2)}%`
    : '0.00%';
  const avgCpa = totalConversionsNum > 0 ? Math.round(budget / totalConversionsNum) : 0;
  const conversions = totalConversionsNum.toLocaleString();

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    try {
      setIsGeneratingPdf(true);
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const safeName = session?.productName?.replace(/[^a-zA-Z0-9가-힣_-]/g, '_') || 'campaign';
      const dateTag = new Date().toISOString().slice(0, 10);
      pdf.save(`MVC_Report_${safeName}_${dateTag}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert(
        locale === 'ko'
          ? 'PDF 리포트 생성 중 오류가 발생했습니다. 브라우저 인쇄 기능을 활용하실 수도 있습니다.'
          : 'Failed to generate PDF report. You may also use browser print.'
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Date Range Selector & Report Download Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
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
            onClick={handlePrint}
            title={locale === 'ko' ? '인쇄하기' : 'Print Report'}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span className="hidden sm:inline">{locale === 'ko' ? '인쇄' : 'Print'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            <span>
              {isGeneratingPdf ? t.analytics.generatingPdf : t.analytics.downloadPdfBtn}
            </span>
          </button>
        </div>
      </div>

      {/* Top 6 KPI Performance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
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

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
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

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
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

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
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

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
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

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
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

      {/* 2-Column Grid: 채널별 배분 기여도 & 전환 퍼널 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 채널별 기여도 (Channel Allocations Table) - 2 cols on lg */}
        <section className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
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
                  <th className="pb-3 font-semibold text-right">{t.mmm.tableAllocation}</th>
                  <th className="pb-3 font-semibold text-right">{t.mmm.tablePercentage}</th>
                  <th className="pb-3 font-semibold pl-4">{t.mmm.tableRationale}</th>
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

        {/* 전환 퍼널 성과 (Conversion Funnel) - 1 col on lg */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span>{t.analytics.funnelTitle}</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            {/* Step 1: 노출 */}
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-blue-900">{t.analytics.funnelStep1}</span>
                <span className="font-mono text-[10px] text-blue-700 font-bold">
                  100%
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-900">
                {estimatedImpressionsNum.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">{t.analytics.funnelStep1Sub}</span>
            </div>

            {/* Step 2: 클릭 */}
            <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-100">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-cyan-900">{t.analytics.funnelStep2}</span>
                <span className="font-mono text-[10px] text-cyan-700 font-bold">
                  CTR {projectedCtrNum}%
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-900">
                {estimatedClicksNum.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">{t.analytics.funnelStep2Sub}</span>
            </div>

            {/* Step 3: 구매 전환 */}
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-emerald-900">{t.analytics.funnelStep3}</span>
                <span className="font-mono text-[10px] text-emerald-700 font-bold">
                  CVR {cvrDisplay}
                </span>
              </div>
              <div className="text-base font-bold font-mono text-emerald-700">
                {totalConversionsNum.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">{t.analytics.funnelStep3Sub}</span>
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
