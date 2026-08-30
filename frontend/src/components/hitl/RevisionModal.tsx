import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { StageKey } from '../../types/campaign';

interface RevisionModalProps {
  stage: StageKey;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => void;
  isLoading: boolean;
}

export function RevisionModal({
  stage,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: RevisionModalProps) {
  const { locale, t } = useLanguage();
  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    onSubmit(feedback.trim());
    setFeedback('');
    onClose();
  };

  const getStageDisplay = (s: StageKey) => {
    switch (s) {
      case 'MARKET_SENSING':
      case 'STRATEGY_BRIEF':
        return locale === 'ko' ? '1단계: 마케팅 전략 기획' : 'Stage 1: Planning & Brief';
      case 'CREATIVE_CONTENT':
        return locale === 'ko' ? '2단계: 크리에이티브 콘텐츠' : 'Stage 2: Creative Content';
      case 'PERFORMANCE_INSIGHTS':
        return locale === 'ko' ? '3단계: 미디어 계획 (MMM)' : 'Stage 3: Media Planning (MMM)';
      case 'MEDIA_EXECUTION':
        return locale === 'ko' ? '4단계: 미디어 집행' : 'Stage 4: Media Execution';
      default:
        return s;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#e2e8f0] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 my-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t.planning.requestRevision}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {getStageDisplay(stage)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {locale === 'ko' ? '마케터 수정 가이드라인 (Marketer Instructions)' : 'Marketer Instructions & Revision Feedback'}
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
              rows={4}
              placeholder={
                locale === 'ko'
                  ? '예: 배터리 수명보다는 AI 카메라 야간 촬영 기능을 더 강조해주시고, 블랙 프라이데이 할인율 혜택을 헤드라인에 직관적으로 반영해주세요.'
                  : 'e.g., Emphasize low-light camera capabilities rather than battery specs, and include exclusive seasonal discount in headline.'
              }
              className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-xl p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 resize-none leading-relaxed transition"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            {locale === 'ko'
              ? '* 입력하신 피드백은 해당 서브 에이전트의 컨텍스트에 즉시 주입되어 타겟 재생성을 수행합니다.'
              : '* Feedback will be injected directly into the sub-agent prompt context for targeted re-generation.'}
          </p>

          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isLoading || !feedback.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1a56db] hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{isLoading ? t.common.loading : t.planning.requestRevision}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
