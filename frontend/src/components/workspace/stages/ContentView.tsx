import { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Maximize2,
  ExternalLink,
  Type,
  Check,
  Edit3,
} from 'lucide-react';
import type { CampaignSessionResponse } from '../../../types/campaign';
import { RevisionModal } from '../../hitl/RevisionModal';

interface ContentViewProps {
  session: CampaignSessionResponse | null;
  onApproveOrRevise: (
    action: 'approve' | 'revise',
    feedback?: string,
    deliverableUpdates?: Record<string, unknown>
  ) => void;
  onRollbackStage?: () => void;
  isLoading: boolean;
}

export function ContentView({
  session,
  onApproveOrRevise,
  onRollbackStage,
  isLoading,
}: ContentViewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  const creativeData = session?.deliverables?.creativeContent;
  const isReviewPending = session?.status === 'PAUSED_FOR_REVIEW';
  const isApproved =
    session?.status === 'COMPLETED' ||
    (session?.currentStage &&
      session.currentStage !== 'CREATIVE_CONTENT' &&
      session.currentStage !== 'STRATEGY_BRIEF' &&
      session.currentStage !== 'MARKET_SENSING');

  // Editable deliverable state
  const [headlineCopy, setHeadlineCopy] = useState(
    creativeData?.headlineCopy || 'Next Level AI, Galaxy S27'
  );
  const [bodyCopy, setBodyCopy] = useState(
    creativeData?.bodyCopy ||
      '혁신적인 AI 카메라와 압도적인 성능. 오직 블랙프라이데이 한정 최대 혜택으로 지금 Galaxy S27을 만나보세요.'
  );
  const [callToAction, setCallToAction] = useState(
    creativeData?.callToAction || '사전예약 바로가기'
  );
  const [visualConceptTitle, setVisualConceptTitle] = useState(
    creativeData?.visualConceptTitle || 'Galaxy S27 | Black Friday Deal'
  );
  const [visualPromptUsed, setVisualPromptUsed] = useState(
    creativeData?.visualPromptUsed || ''
  );
  const [aspectRatio, setAspectRatio] = useState(
    creativeData?.aspectRatio || '16:9'
  );

  useEffect(() => {
    if (creativeData) {
      if (creativeData.headlineCopy) setHeadlineCopy(creativeData.headlineCopy);
      if (creativeData.bodyCopy) setBodyCopy(creativeData.bodyCopy);
      if (creativeData.callToAction) setCallToAction(creativeData.callToAction);
      if (creativeData.visualConceptTitle) setVisualConceptTitle(creativeData.visualConceptTitle);
      if (creativeData.visualPromptUsed) setVisualPromptUsed(creativeData.visualPromptUsed);
      if (creativeData.aspectRatio) setAspectRatio(creativeData.aspectRatio);
    }
  }, [creativeData]);

  const getDeliverableUpdates = () => ({
    creativeContent: {
      ...(creativeData || {}),
      headlineCopy,
      bodyCopy,
      callToAction,
      visualConceptTitle,
      visualPromptUsed,
      aspectRatio,
    },
  });

  const handleApprove = () => {
    onApproveOrRevise('approve', undefined, getDeliverableUpdates());
  };

  const hasCreativeDeliverable = Boolean(creativeData);

  return (
    <div className="p-6 space-y-6">
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
                  Stage 2 승인 필요
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                생성된 시각물 및 광고 카피를 검토하고 필요 시 직접 수정한 후 승인해주세요. 승인 시 3단계(미디어 계획 MMM)로 진행됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onRollbackStage && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('1단계(기획)로 돌아가서 수정하시겠습니까? (이전 단계 산출물 재작성/수정 모드로 전환됩니다)')) {
                    onRollbackStage();
                  }
                }}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <span>← 1단계(기획)로 복귀</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setRevisionModalOpen(true)}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>수정 요청 (AI 재생성)</span>
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>승인 및 3단계 진행</span>
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
          <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group hover:border-blue-300 transition">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    화면 비율:
                  </span>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="9:16">9:16 (Vertical Story)</option>
                    <option value="4:3">4:3 (Standard)</option>
                  </select>
                </div>
                <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                  <Edit3 className="h-3 w-3" />
                  직접 수정 가능
                </span>
              </div>
              <input
                type="text"
                value={visualConceptTitle}
                onChange={(e) => setVisualConceptTitle(e.target.value)}
                className="w-full text-xs font-bold text-slate-900 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-lg px-1.5 py-1 focus:bg-white focus:outline-none transition"
                placeholder="비주얼 콘셉트 제목 입력"
              />
            </div>

            {/* Image Preview Box */}
            <div className="relative bg-slate-900 h-64 flex items-center justify-center overflow-hidden">
              {creativeData?.assetUrl ? (
                <img
                  src={`${creativeData.assetUrl}${creativeData.assetUrl.includes('?') ? '&' : '?'}v=${session?.revisionCount || 0}`}
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
                  {isApproved ? '승인됨 (GCS 저장)' : '초안 (검토 및 수정 가능)'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                gemini-3.1-flash-lite-image
              </span>
            </div>
          </div>

          {/* Card 2: Headline & Advertising Copy (Editable) */}
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-blue-300 transition">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-xs">
                  <Type className="h-4 w-4" />
                  <span>광고 카피라이팅 (직접 수정)</span>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  편집 가능
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* 메인 헤드라인 */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    메인 헤드라인
                  </label>
                  <input
                    type="text"
                    value={headlineCopy}
                    onChange={(e) => setHeadlineCopy(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none transition"
                    placeholder="메인 헤드라인 입력"
                  />
                </div>

                {/* 바디 카피 */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    바디 카피
                  </label>
                  <textarea
                    value={bodyCopy}
                    onChange={(e) => setBodyCopy(e.target.value)}
                    rows={4}
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-700 leading-relaxed focus:outline-none resize-none transition"
                    placeholder="광고 바디 카피 입력"
                  />
                </div>

                {/* 행동 유도 버튼 (CTA) */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    행동 유도 버튼 (CTA 문구)
                  </label>
                  <input
                    type="text"
                    value={callToAction}
                    onChange={(e) => setCallToAction(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl p-2 text-xs font-semibold text-blue-700 focus:outline-none transition"
                    placeholder="버튼 문구 입력"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                <span>승인 시 수정 내용이 저장됩니다</span>
              </span>
            </div>
          </div>

          {/* Card 3: Visual Concept Prompt Inspector & Editor */}
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-blue-300 transition">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-1.5 text-purple-600 font-semibold text-xs">
                  <Sparkles className="h-4 w-4" />
                  <span>합성 프롬프트 인스펙터 (직접 수정)</span>
                </div>
                <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  편집 가능
                </span>
              </div>

              <div className="text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    시각 프롬프트 (Visual Prompt for Nano Banana)
                  </span>
                  <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
                    <Edit3 className="h-3 w-3" />
                    프롬프트 수정 가능
                  </span>
                </div>
                <textarea
                  value={visualPromptUsed}
                  onChange={(e) => setVisualPromptUsed(e.target.value)}
                  rows={6}
                  className="w-full bg-[#f8fafc] border border-slate-200 focus:bg-white focus:border-purple-500 rounded-xl p-3 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none resize-none transition"
                  placeholder="이미지 생성에 사용할 시각 프롬프트를 직접 입력하세요"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex justify-between text-[11px] text-slate-500">
              <span>Direct VPC Egress GCS Storage</span>
              <span className="text-blue-600 font-medium">Verified</span>
            </div>
          </div>
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
        onSubmit={(feedback) => onApproveOrRevise('revise', feedback, getDeliverableUpdates())}
        isLoading={isLoading}
      />
    </div>
  );
}
