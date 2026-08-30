import { useState } from 'react';
import {
  Image as ImageIcon,
  Plus,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Maximize2,
  ExternalLink,
  Type,
  MoreVertical,
  Check,
} from 'lucide-react';
import type { CampaignSessionResponse } from '../../../types/campaign';
import { RevisionModal } from '../../hitl/RevisionModal';

interface ContentViewProps {
  session: CampaignSessionResponse | null;
  onApproveOrRevise: (action: 'approve' | 'revise', feedback?: string) => void;
  isLoading: boolean;
}

type FilterCategory = 'ALL' | 'IMAGE' | 'VIDEO' | 'COPY' | 'BANNER' | 'SOCIAL' | 'EMAIL';

export function ContentView({
  session,
  onApproveOrRevise,
  isLoading,
}: ContentViewProps) {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  const creativeData = session?.deliverables?.creativeContent;
  const isReviewPending = session?.status === 'PAUSED_FOR_REVIEW';
  const isApproved =
    session?.status === 'COMPLETED' ||
    (session?.currentStage && session.currentStage !== 'CREATIVE_CONTENT');

  const filterTabs: { id: FilterCategory; label: string }[] = [
    { id: 'ALL', label: '전체' },
    { id: 'IMAGE', label: '이미지' },
    { id: 'VIDEO', label: '영상' },
    { id: 'COPY', label: '카피' },
    { id: 'BANNER', label: '배너' },
    { id: 'SOCIAL', label: '소셜' },
    { id: 'EMAIL', label: '이메일' },
  ];

  const hasCreativeDeliverable = Boolean(creativeData);

  return (
    <div className="p-6 space-y-6">
      {/* Top Filter Bar & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFilter === tab.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* New Content CTA */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>새 콘텐츠 생성</span>
          </button>
        </div>
      </div>

      {/* Human-in-the-Loop Review Banner (If Waiting for Approval) */}
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
                  Stage 3 승인 필요
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                생성된 크리에이티브 시각물 및 광고 카피를 검토해주세요. 승인 시 Stage 4(성과 예측)로 진행됩니다.
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
              <span>수정 요청</span>
            </button>
            <button
              type="button"
              onClick={() => onApproveOrRevise('approve')}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>승인 및 다음 단계 진행</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      {!hasCreativeDeliverable ? (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <ImageIcon className="h-10 w-10 text-slate-300 mb-2" />
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            콘텐츠 생성 대기 중
          </h4>
          <p className="text-xs text-slate-400 max-w-sm">
            1단계(기획)에서 시뮬레이션을 실행하면 Nano Banana 2 Lite 모델이 고해상도 마케팅 에셋과 광고 카피를 자동 생성합니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Primary Generated Visual Asset */}
          {(activeFilter === 'ALL' || activeFilter === 'IMAGE') && (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group hover:border-blue-300 transition">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                    이미지 &bull; {creativeData?.aspectRatio || '16:9'}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {creativeData?.visualConceptTitle || 'Galaxy S27 | Black Friday Deal'}
                  </h4>
                </div>
                <button
                  type="button"
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Image Preview Box */}
              <div className="relative bg-slate-900 h-56 flex items-center justify-center overflow-hidden">
                {creativeData?.assetUrl ? (
                  <img
                    src={creativeData.assetUrl}
                    alt="Generated Deliverable"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                    onClick={() => setLightboxOpen(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <ImageIcon className="h-8 w-8 mb-1 text-slate-600" />
                    <span className="text-[11px]">이미지 렌더링 완료</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="p-2 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md"
                    title="크게 보기"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  {creativeData?.assetUrl && (
                    <a
                      href={creativeData.assetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md"
                      title="새 창에서 열기"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Card Footer Status */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isApproved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                  <span className="text-[11px] font-medium text-slate-700">
                    {isApproved ? '승인됨' : '초안 (검토 필요)'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  gemini-3.1-flash-lite-image
                </span>
              </div>
            </div>
          )}

          {/* Card 2: Headline & Advertising Copy */}
          {(activeFilter === 'ALL' || activeFilter === 'COPY') && (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-blue-300 transition">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-xs">
                    <Type className="h-4 w-4" />
                    <span>광고 카피라이팅</span>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    카피 세트
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {creativeData?.headlineCopy && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        메인 헤드라인
                      </span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                        "{creativeData.headlineCopy}"
                      </p>
                    </div>
                  )}

                  {creativeData?.bodyCopy && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        바디 카피
                      </span>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {creativeData.bodyCopy}
                      </p>
                    </div>
                  )}

                  {creativeData?.callToAction && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        행동 유도 버튼 (CTA)
                      </span>
                      <div className="inline-block mt-1 px-3 py-1 bg-[#1a56db] text-white rounded-lg font-semibold text-xs shadow-sm">
                        {creativeData.callToAction}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>A/B 테스트 준비 완료</span>
                </span>
              </div>
            </div>
          )}

          {/* Card 3: Visual Concept Prompt Inspector */}
          {(activeFilter === 'ALL' || activeFilter === 'IMAGE') && (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-blue-300 transition">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-1.5 text-purple-600 font-semibold text-xs">
                    <Sparkles className="h-4 w-4" />
                    <span>합성 프롬프트 인스펙터</span>
                  </div>
                  <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    Nano Banana
                  </span>
                </div>

                <div className="text-xs">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    Imagen / Banana Prompt Used
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 leading-relaxed max-h-44 overflow-y-auto select-text">
                    {creativeData?.visualPromptUsed || 'Prompt details'}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3 flex justify-between text-[11px] text-slate-500">
                <span>Direct VPC Egress GCS Storage</span>
                <span className="text-blue-600 font-medium">Verified</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && creativeData?.assetUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={creativeData.assetUrl}
              alt="Expanded Campaign Mockup"
              className="max-w-full max-h-[80vh] rounded-xl object-contain"
            />
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-slate-800 transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Revision Modal */}
      <RevisionModal
        stage="CREATIVE_CONTENT"
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        onSubmit={(feedback) => onApproveOrRevise('revise', feedback)}
        isLoading={isLoading}
      />
    </div>
  );
}
