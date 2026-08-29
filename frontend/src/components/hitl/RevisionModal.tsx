import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareWarning, X, Send } from 'lucide-react';
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

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 my-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-amber-400">
            <MessageSquareWarning className="h-5 w-5" />
            <h3 className="text-sm font-semibold text-white">
              Request Stage Revision &bull; <span className="capitalize">{stage.toLowerCase().replace('_', ' ')}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Marketer Instructions for Agent Refinement:
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
              rows={4}
              placeholder="E.g., Emphasize AI nightography camera over battery life; shift budget from Search to Video Streaming..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none leading-relaxed"
            />
          </div>

          <p className="text-[11px] text-slate-400">
            &bull; Your feedback will be injected into the agent's context for a targeted re-synthesis pass.
          </p>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !feedback.trim()}
              className="px-4 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {isLoading ? 'Submitting...' : 'Submit Revision Request'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
