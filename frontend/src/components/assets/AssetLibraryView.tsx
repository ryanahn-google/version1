import { useState } from 'react';
import { FolderOpen, Image as ImageIcon, ExternalLink, Maximize2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { CampaignSessionResponse } from '../../types/campaign';

interface AssetLibraryViewProps {
  campaigns: CampaignSessionResponse[];
}

export function AssetLibraryView({ campaigns }: AssetLibraryViewProps) {
  const { t } = useLanguage();
  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  // Extract all creative assets from loaded campaigns
  const assets = campaigns
    .filter((c) => c.deliverables?.creativeContent?.assetUrl)
    .map((c) => ({
      sessionId: c.sessionId,
      productName: c.productName || 'Campaign Asset',
      url: c.deliverables!.creativeContent!.assetUrl!,
      title: c.deliverables?.creativeContent?.visualConceptTitle || 'Generated Visual',
      aspectRatio: c.deliverables?.creativeContent?.aspectRatio || '16:9',
      isApproved: Boolean(c.deliverables?.creativeContent?.storageUri) || c.status === 'COMPLETED',
    }));

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-600" />
            <span>{t.assets.title}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t.assets.desc}
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-white border border-[#e2e8f0] rounded-full text-slate-700">
          {t.assets.totalCount.replace('{count}', String(assets.length))}
        </span>
      </div>

      {assets.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <ImageIcon className="h-10 w-10 text-slate-300 mb-2" />
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            {t.assets.noAssets}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm">
            {t.assets.noAssetsDesc}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {assets.map((asset, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm group hover:border-blue-300 transition flex flex-col justify-between"
            >
              <div className="relative h-48 bg-slate-900 overflow-hidden flex items-center justify-center">
                {!failedUrls[asset.url] ? (
                  <>
                    <img
                      src={asset.url}
                      alt={asset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                      onClick={() => setSelectedAssetUrl(asset.url)}
                      onError={() =>
                        setFailedUrls((prev) => ({ ...prev, [asset.url]: true }))
                      }
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedAssetUrl(asset.url)}
                        className="p-2 rounded-full bg-white text-slate-800 shadow"
                        title={t.assets.zoom}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-full bg-white text-slate-800 shadow"
                        title={t.assets.openNewTab}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <ImageIcon className="h-8 w-8 mb-1.5 text-slate-600" />
                    <span className="text-[11px] font-medium text-slate-400">
                      {t.assets.imageUnavailable}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3.5">
                <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider block">
                  {asset.productName}
                </span>
                <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                  {asset.title}
                </h4>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px]">
                  <span className="text-slate-400 font-mono">{t.assets.ratio}: {asset.aspectRatio}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${
                      failedUrls[asset.url]
                        ? 'bg-slate-100 text-slate-500'
                        : asset.isApproved
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {failedUrls[asset.url]
                      ? t.assets.imageUnavailable
                      : asset.isApproved
                        ? t.assets.savedGcs
                        : t.assets.tempDraft}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedAssetUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm"
          onClick={() => setSelectedAssetUrl(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedAssetUrl}
              alt="Asset Preview"
              className="max-w-full max-h-[80vh] rounded-xl object-contain"
            />
            <button
              onClick={() => setSelectedAssetUrl(null)}
              className="absolute top-4 right-4 bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-slate-800 transition"
            >
              {t.assets.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
