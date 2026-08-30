import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X } from 'lucide-react';
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
        return '1단계: 마켓 센싱';
      case 'STRATEGY_BRIEF':
        return '1단계: 캠페인 브리프';
      case 'CREATIVE_CONTENT':
        return '2단계: 크리에이티브 콘텐츠';
      case 'PERFORMANCE_INSIGHTS':
        return '3단계: 미디어 계획 / 성과 분석';
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
                수정 요청 (Revision Request)
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
              마케터 수정 가이드라인 (Marketer Instructions)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
              rows={4}
              placeholder="예: 배터리 수명보다는 AI 카메라 야간 촬영 기능을 더 강조해주시고, 블랙 프라이데이 할인율 혜택을 헤드라인에 직관적으로 반영해주세요."
              className="w-full bg-[#f8fafc] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 rounded-xl p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 resize-none leading-relaxed transition"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            * 입력하신 피드백은 해당 서브 에이전트의 컨텍스트에 즉시 주입되어 타겟 재생성을 수행합니다.
          </p>

          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || !feedback.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1a56db] hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{isLoading ? '제출 중...' : '수정 요청 제출'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
