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
import { useLanguage } from '../../../context/LanguageContext';
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
  const { t } = useLanguage();
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
    creativeData?.headlineCopy || ''
  );
  const [bodyCopy, setBodyCopy] = useState(
    creativeData?.bodyCopy || ''
  );
  const [callToAction, setCallToAction] = useState(
    creativeData?.callToAction || ''
  );
  const [visualConceptTitle, setVisualConceptTitle] = useState(
    creativeData?.visualConceptTitle || ''
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
                  {t.planning.hitlReviewPending}
                </span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-medium">
                  {t.content.hitlPending}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {t.content.hitlDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onRollbackStage && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t.content.rollbackBtn)) {
                    onRollbackStage();
                  }
                }}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <span>{t.content.rollbackBtn}</span>
              </button>
            )}
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
              className="px-5 py-2 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{t.content.approveBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      {!hasCreativeDeliverable ? (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <ImageIcon className="h-10 w-10 text-slate-300 mb-2" />
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            {t.content.waitingTitle}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm">
            {t.content.waitingDesc}
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
                    {t.content.aspectRatio}
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
                  {t.common.directEditable}
                </span>
              </div>
              <input
                type="text"
                value={visualConceptTitle}
                onChange={(e) => setVisualConceptTitle(e.target.value)}
                className="w-full text-xs font-bold text-slate-900 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-lg px-1.5 py-1 focus:bg-white focus:outline-none transition"
                placeholder={t.content.visualTitlePlaceholder}
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
                  {isApproved ? t.common.approvedGcs : t.common.draftReviewable}
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
                  <span>{t.content.copywritingTitle}</span>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {t.content.editableBadge}
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* 메인 헤드라인 */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    {t.content.headline}
                  </label>
                  <input
                    type="text"
                    value={headlineCopy}
                    onChange={(e) => setHeadlineCopy(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none transition"
                    placeholder={t.content.headlinePlaceholder}
                  />
                </div>

                {/* 바디 카피 */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    {t.content.body}
                  </label>
                  <textarea
                    value={bodyCopy}
                    onChange={(e) => setBodyCopy(e.target.value)}
                    rows={4}
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-700 leading-relaxed focus:outline-none resize-none transition"
                    placeholder={t.content.bodyPlaceholder}
                  />
                </div>

                {/* 행동 유도 버튼 (CTA) */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    {t.content.cta}
                  </label>
                  <input
                    type="text"
                    value={callToAction}
                    onChange={(e) => setCallToAction(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl p-2 text-xs font-semibold text-blue-700 focus:outline-none transition"
                    placeholder={t.content.ctaPlaceholder}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                <span>{t.common.autoSavedNotice}</span>
              </span>
            </div>
          </div>

          {/* Card 3: Visual Concept Prompt Inspector & Editor */}
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-blue-300 transition">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-1.5 text-purple-600 font-semibold text-xs">
                  <Sparkles className="h-4 w-4" />
                  <span>{t.content.promptInspectorTitle}</span>
                </div>
                <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  {t.content.editableBadge}
                </span>
              </div>

              <div className="text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    {t.content.visualPromptLabel}
                  </span>
                  <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
                    <Edit3 className="h-3 w-3" />
                    {t.common.directEditable}
                  </span>
                </div>
                <textarea
                  value={visualPromptUsed}
                  onChange={(e) => setVisualPromptUsed(e.target.value)}
                  rows={6}
                  className="w-full bg-[#f8fafc] border border-slate-200 focus:bg-white focus:border-purple-500 rounded-xl p-3 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none resize-none transition"
                  placeholder={t.content.visualPromptPlaceholder}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex justify-between text-[11px] text-slate-500">
              <span>{t.content.vpcEgressNotice}</span>
              <span className="text-blue-600 font-medium">{t.common.verified}</span>
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
              {t.common.close}
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
