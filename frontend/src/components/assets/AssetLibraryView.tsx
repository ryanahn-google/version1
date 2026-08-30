import { useState } from 'react';
import { FolderOpen, Image as ImageIcon, ExternalLink, Maximize2 } from 'lucide-react';
import type { CampaignSessionResponse } from '../../types/campaign';

interface AssetLibraryViewProps {
  campaigns: CampaignSessionResponse[];
}

export function AssetLibraryView({ campaigns }: AssetLibraryViewProps) {
  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string | null>(null);

  // Extract all creative assets from loaded campaigns
  const assets = campaigns
    .filter((c) => c.deliverables?.creativeContent?.assetUrl)
    .map((c) => ({
      sessionId: c.sessionId,
      productName: c.productName || 'Campaign Asset',
      url: c.deliverables!.creativeContent!.assetUrl!,
      title: c.deliverables?.creativeContent?.visualConceptTitle || 'Generated Visual',
      aspectRatio: c.deliverables?.creativeContent?.aspectRatio || '16:9',
      isApproved: c.status === 'COMPLETED',
    }));

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-600" />
            <span>에셋 라이브러리 (Asset Library)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            GCS(Google Cloud Storage)에 저장된 고해상도 생성 마케팅 비주얼 에셋 목록입니다.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-white border border-[#e2e8f0] rounded-full text-slate-700">
          총 {assets.length}개 에셋
        </span>
      </div>

      {assets.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <ImageIcon className="h-10 w-10 text-slate-300 mb-2" />
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            등록된 마케팅 에셋이 없습니다.
          </h4>
          <p className="text-xs text-slate-400 max-w-sm">
            캠페인 시뮬레이션을 실행하여 Nano Banana 2 Lite 모델이 생성한 에셋을 확인해보세요.
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
                <img
                  src={asset.url}
                  alt={asset.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                  onClick={() => setSelectedAssetUrl(asset.url)}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAssetUrl(asset.url)}
                    className="p-2 rounded-full bg-white text-slate-800 shadow"
                    title="확대"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-full bg-white text-slate-800 shadow"
                    title="새 창에서 열기"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="p-3.5">
                <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider block">
                  {asset.productName}
                </span>
                <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                  {asset.title}
                </h4>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px]">
                  <span className="text-slate-400 font-mono">비율: {asset.aspectRatio}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${
                      asset.isApproved
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {asset.isApproved ? 'GCS 영구 저장' : '임시 보관'}
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
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
