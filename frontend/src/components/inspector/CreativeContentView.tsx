import { useState } from 'react';
import { Image as ImageIcon, Sparkles, Maximize2, ExternalLink, Type } from 'lucide-react';
import type { CreativeContentDeliverable } from '../../types/campaign';

export function CreativeContentView({ data }: { data?: CreativeContentDeliverable | null }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!data) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
        <ImageIcon className="h-8 w-8 mb-2 stroke-1 text-slate-600" />
        <p className="text-sm">Stage 3: Creative Content visual deliverable has not been generated yet.</p>
      </div>
    );
  }

  const hasImage = Boolean(data.assetUrl);

  return (
    <div className="space-y-5 text-sm">
      {/* Generated Visual Mockup */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-purple-400" />
            {data.visualConceptTitle || 'Synthesized Campaign Visual (Imagen 3)'}
          </h3>
          {data.aspectRatio && (
            <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Aspect: {data.aspectRatio}
            </span>
          )}
        </div>

        {hasImage ? (
          <div className="relative group rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center max-h-[380px]">
            <img
              src={data.assetUrl}
              alt={data.visualConceptTitle || 'Generated Campaign Visual'}
              className="w-full h-auto max-h-[380px] object-contain transition duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="bg-slate-900/90 hover:bg-slate-900 text-white p-2 rounded-full shadow-lg border border-slate-700"
                title="Expand view"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              {data.assetUrl && (
                <a
                  href={data.assetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-900/90 hover:bg-slate-900 text-white p-2 rounded-full shadow-lg border border-slate-700"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="h-56 rounded-lg bg-slate-950/80 border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 p-4 text-center">
            <ImageIcon className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-xs">Imagen 3 visual synthesis placeholder (GCS storage bucket link configured).</p>
          </div>
        )}
      </div>

      {/* Copywriting & Messaging */}
      {(data.headlineCopy || data.bodyCopy || data.callToAction) && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
            <Type className="h-4 w-4" />
            Generated Advertising Copy
          </h3>
          <div className="space-y-3 bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs">
            {data.headlineCopy && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">Headline</span>
                <p className="text-sm font-bold text-slate-100">{data.headlineCopy}</p>
              </div>
            )}
            {data.bodyCopy && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">Body Copy</span>
                <p className="text-xs text-slate-300 leading-relaxed">{data.bodyCopy}</p>
              </div>
            )}
            {data.callToAction && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">Call to Action (CTA)</span>
                <span className="inline-block bg-blue-600/90 text-white font-semibold text-xs px-3 py-1 rounded">
                  {data.callToAction}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Generation Prompt Inspector */}
      {data.visualPromptUsed && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Imagen 3 Prompt Inspector
          </h3>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-purple-300/90 leading-relaxed select-text">
            {data.visualPromptUsed}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && hasImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={data.assetUrl}
              alt="Expanded Campaign Mockup"
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
            />
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
