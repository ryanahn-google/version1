import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Download,
  Calendar,
  Smartphone,
  MapPin,
  Filter,
} from 'lucide-react';
import type { CampaignSessionResponse } from '../../../types/campaign';

interface PerformanceAnalyticsViewProps {
  session: CampaignSessionResponse | null;
}

export function PerformanceAnalyticsView({
  session,
}: PerformanceAnalyticsViewProps) {
  const insights = session?.deliverables?.performanceInsights;
  const budget = session?.budgetAmount || 2000000;
  const roas = insights?.expectedRoas || 4.92;
  const sales = (budget * roas).toLocaleString();
  const conversions = insights?.projectedKpis?.estimatedConversions
    ? insights.projectedKpis.estimatedConversions.toLocaleString()
    : '48,600';

  const dateRange = '2025.11.01 ~ 2025.11.30 (30일)';

  const handleDownloadReport = () => {
    const reportData = {
      campaign: session?.productName || 'Black Friday Galaxy S27',
      totalRevenue: `$ ${(budget * roas).toLocaleString()}`,
      adSpend: `$ ${budget.toLocaleString()}`,
      roas: `${roas}x`,
      conversions: conversions,
      cvr: '2.31%',
      cpa: '$ 37.45',
      channelBreakdown: insights?.channelAllocations || [],
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance_report_${session?.sessionId || 'mvc'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Date Range Selector Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span>분석 기간:</span>
          <span className="font-mono text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
            {dateRange}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDownloadReport}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
        >
          <Download className="h-4 w-4" />
          <span>성과 리포트 다운로드</span>
        </button>
      </div>

      {/* Top 6 KPI Performance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            총 매출
          </span>
          <div className="text-base font-bold text-slate-900 font-mono mt-1">
            ${sales}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" />
            <span>▲ 28.6% vs 목표</span>
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            ROAS
          </span>
          <div className="text-base font-bold text-emerald-600 font-mono mt-1">
            {roas}x
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" />
            <span>▲ 16.4% vs 4.23x</span>
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            구매 전환수
          </span>
          <div className="text-base font-bold text-purple-600 font-mono mt-1">
            {conversions}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" />
            <span>▲ 19.1%</span>
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            전환율 (CVR)
          </span>
          <div className="text-base font-bold text-blue-600 font-mono mt-1">
            2.31%
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" />
            <span>▲ 13.2%</span>
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            평균 CPA
          </span>
          <div className="text-base font-bold text-slate-800 font-mono mt-1">
            $ 37.45
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowDownRight className="h-3 w-3" />
            <span>▼ 12.3% 절감</span>
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            광고 지출
          </span>
          <div className="text-base font-bold text-slate-900 font-mono mt-1">
            ${budget.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            100% 소진
          </span>
        </div>
      </div>

      {/* 성과 추이 & 채널별 성과 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 성과 추이 (Trend Chart) */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span>성과 추이</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                일별 주요 성과 추이 (매출, ROAS, 구매 전환수)
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                매출 ($)
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                ROAS
              </span>
            </div>
          </div>

          {/* SVG Trend Line Chart */}
          <div className="h-56 w-full pt-4">
            <svg viewBox="0 0 500 200" className="w-full h-full">
              {/* Grid Lines */}
              <line x1="40" y1="30" x2="480" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="80" x2="480" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="130" x2="480" y2="130" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="180" x2="480" y2="180" stroke="#e2e8f0" strokeWidth="1" />

              {/* Y Axis Labels */}
              <text x="35" y="35" fill="#94a3b8" fontSize="10" textAnchor="end">1.0M</text>
              <text x="35" y="85" fill="#94a3b8" fontSize="10" textAnchor="end">800K</text>
              <text x="35" y="135" fill="#94a3b8" fontSize="10" textAnchor="end">400K</text>
              <text x="35" y="185" fill="#94a3b8" fontSize="10" textAnchor="end">0</text>

              {/* Path 1: Sales Line (Blue) */}
              <path
                d="M 60 160 Q 120 140, 180 120 T 300 80 T 420 50 L 460 40"
                fill="none"
                stroke="#1a56db"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Data points for Sales */}
              <circle cx="60" cy="160" r="4" fill="#1a56db" />
              <circle cx="180" cy="120" r="4" fill="#1a56db" />
              <circle cx="300" cy="80" r="4" fill="#1a56db" />
              <circle cx="420" cy="50" r="4" fill="#1a56db" />
              <circle cx="460" cy="40" r="4" fill="#1a56db" />

              {/* Path 2: ROAS Line (Emerald) */}
              <path
                d="M 60 140 Q 120 130, 180 100 T 300 90 T 420 70 L 460 65"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                strokeLinecap="round"
              />

              {/* X Axis Dates */}
              <text x="60" y="195" fill="#94a3b8" fontSize="10" textAnchor="middle">11/1</text>
              <text x="140" y="195" fill="#94a3b8" fontSize="10" textAnchor="middle">11/8</text>
              <text x="220" y="195" fill="#94a3b8" fontSize="10" textAnchor="middle">11/15</text>
              <text x="300" y="195" fill="#94a3b8" fontSize="10" textAnchor="middle">11/22</text>
              <text x="380" y="195" fill="#94a3b8" fontSize="10" textAnchor="middle">11/26</text>
              <text x="460" y="195" fill="#94a3b8" fontSize="10" textAnchor="middle">11/30</text>
            </svg>
          </div>
        </section>

        {/* 채널별 성과 (Channel Performance Table) */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span>채널별 성과</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              각 채널의 광고 지출 대비 기여 매출 및 최종 ROAS
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="pb-3 font-semibold">채널</th>
                  <th className="pb-3 font-semibold text-right">광고 지출</th>
                  <th className="pb-3 font-semibold text-right">매출</th>
                  <th className="pb-3 font-semibold text-right">ROAS</th>
                  <th className="pb-3 font-semibold text-right">구매전환수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    channel: 'Digital Video',
                    spend: '$ 801,000',
                    sales: '$ 4,164,000',
                    roas: '5.20',
                    conversions: '20,300',
                  },
                  {
                    channel: 'Paid Search',
                    spend: '$ 500,000',
                    sales: '$ 2,395,000',
                    roas: '4.79',
                    conversions: '14,200',
                  },
                  {
                    channel: 'Social (Meta)',
                    spend: '$ 400,000',
                    sales: '$ 1,696,000',
                    roas: '4.24',
                    conversions: '9,700',
                  },
                  {
                    channel: 'Display Network',
                    spend: '$ 200,000',
                    sales: '$ 826,000',
                    roas: '4.13',
                    conversions: '3,900',
                  },
                  {
                    channel: 'Samsung.com 리마케팅',
                    spend: '$ 70,000',
                    sales: '$ 472,000',
                    roas: '6.74',
                    conversions: '930',
                  },
                  {
                    channel: 'Affiliate',
                    spend: '$ 29,000',
                    sales: '$ 287,000',
                    roas: '9.90',
                    conversions: '320',
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 font-semibold text-slate-800">
                      {row.channel}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-600">
                      {row.spend}
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold text-slate-900">
                      {row.sales}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-emerald-600">
                      {row.roas}x
                    </td>
                    <td className="py-2.5 text-right font-mono text-purple-600">
                      {row.conversions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* 3-Column Breakdown: 디바이스별 성과, 지역별 성과, 전환 퍼널 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 디바이스별 성과 */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-blue-600" />
            <span>디바이스별 성과</span>
          </h3>

          <div className="flex flex-col items-center justify-center p-3">
            <div className="w-32 h-32 relative flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {/* Mobile 68% */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke="#1a56db"
                  strokeWidth="5"
                  strokeDasharray="68 32"
                  strokeDashoffset="0"
                />
                {/* Desktop 20% */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke="#06b6d4"
                  strokeWidth="5"
                  strokeDasharray="20 80"
                  strokeDashoffset="-68"
                />
                {/* Tablet 8% */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke="#8b5cf6"
                  strokeWidth="5"
                  strokeDasharray="8 92"
                  strokeDashoffset="-88"
                />
                {/* Other 4% */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke="#cbd5e1"
                  strokeWidth="5"
                  strokeDasharray="4 96"
                  strokeDashoffset="-96"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-[10px] text-slate-400 block">총 매출</span>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  $9.84M
                </span>
              </div>
            </div>

            <div className="w-full space-y-1.5 mt-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-[#1a56db]" />
                  Mobile
                </span>
                <span className="font-mono font-bold text-slate-900">
                  68% ($6.69M)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-[#06b6d4]" />
                  Desktop
                </span>
                <span className="font-mono font-bold text-slate-900">
                  20% ($1.97M)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-[#8b5cf6]" />
                  Tablet
                </span>
                <span className="font-mono font-bold text-slate-900">
                  8% ($0.79M)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-[#cbd5e1]" />
                  Other
                </span>
                <span className="font-mono font-bold text-slate-900">
                  4% ($0.39M)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 지역별 성과 */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span>지역별 성과 (상위 5개 지역)</span>
          </h3>

          <div className="space-y-3 pt-2 text-xs">
            {[
              { region: 'California', sales: '$ 1.77M', roas: '5.21' },
              { region: 'New York', sales: '$ 1.16M', roas: '4.83' },
              { region: 'Texas', sales: '$ 0.98M', roas: '4.31' },
              { region: 'Florida', sales: '$ 0.78M', roas: '4.75' },
              { region: 'Illinois', sales: '$ 0.59M', roas: '4.22' },
            ].map((r, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{r.region}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-slate-900 block">{r.sales}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    ROAS {r.roas}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 전환 퍼널 성과 */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span>전환 퍼널 성과</span>
          </h3>

          <div className="space-y-3 pt-2 text-xs">
            {/* Step 1: 노출 */}
            <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-blue-900">1. 노출</span>
                <span className="font-mono text-[10px] text-blue-700 font-bold">
                  100%
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-slate-900">
                102,300,000
              </div>
            </div>

            {/* Step 2: 클릭 */}
            <div className="p-2.5 rounded-xl bg-cyan-50/60 border border-cyan-100">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-cyan-900">2. 클릭 (CTR 2.4%)</span>
                <span className="font-mono text-[10px] text-cyan-700 font-bold">
                  2.40%
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-slate-900">
                2,450,000
              </div>
            </div>

            {/* Step 3: 장바구니 담기 */}
            <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-purple-900">3. 장바구니 담기</span>
                <span className="font-mono text-[10px] text-purple-700 font-bold">
                  21.2%
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-slate-900">
                520,000
              </div>
            </div>

            {/* Step 4: 구매 전환 */}
            <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-emerald-900">4. 최종 구매 전환</span>
                <span className="font-mono text-[10px] text-emerald-700 font-bold">
                  9.3%
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-emerald-700">
                {conversions}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
