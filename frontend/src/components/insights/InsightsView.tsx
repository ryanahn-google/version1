import { BarChart2, TrendingUp, Users, Target, ArrowUpRight } from 'lucide-react';
import type { CampaignSessionResponse } from '../../types/campaign';

interface InsightsViewProps {
  campaigns: CampaignSessionResponse[];
}

export function InsightsView({ campaigns }: InsightsViewProps) {
  const completedCampaigns = campaigns.filter(
    (c) => c.deliverables?.performanceInsights?.expectedRoas
  );
  const avgRoas =
    completedCampaigns.length > 0
      ? (
          completedCampaigns.reduce(
            (acc, c) =>
              acc +
              (c.deliverables!.performanceInsights!.expectedRoas || 0),
            0
          ) / completedCampaigns.length
        ).toFixed(2)
      : '4.48';

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 lg:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-blue-600" />
          <span>마케팅 인텔리전스 & 인사이트</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          멀티 에이전트가 분석한 글로벌 마켓 센싱 트렌드 및 성과 지표 종합입니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900">평균 캠페인 ROAS</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">{avgRoas}x</div>
          <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>산업 평균 대비 +22% 상회</span>
          </p>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900">최다 전환 타겟군</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-slate-800">25-34세 테크 얼리어답터</div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            전체 구매 전환의 44% 점유
          </p>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900">최고 효율 채널</span>
            <Target className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-blue-600">Digital Video & Search</div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            평균 ROAS 5.12x 달성
          </p>
        </div>
      </div>

      {/* Cross-campaign market sensing summary */}
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3">최근 감지된 소비자 신호 (Market Signals)</h3>
        <div className="space-y-3">
          {[
            {
              category: '소비자 트렌드',
              content: 'AI 기능(실시간 통역, 사진 생성 편집)에 대한 글로벌 관심도가 전년 대비 42% 급증',
              badge: '기회 요인',
              badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            },
            {
              category: '경쟁사 동향',
              content: '북미 프리미엄 스마트폰 시장에서 보상 판매(Trade-in) 프로모션 강도 심화',
              badge: '주의 요인',
              badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
            },
            {
              category: '미디어 채널',
              content: '숏폼 비디오(Reels, Shorts) 소재의 노출 대비 장바구니 전환율 1.8배 우수',
              badge: '권장 전략',
              badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  {item.category}
                </span>
                <p className="text-xs font-medium text-slate-800 mt-0.5">
                  {item.content}
                </p>
              </div>
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${item.badgeColor}`}
              >
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
