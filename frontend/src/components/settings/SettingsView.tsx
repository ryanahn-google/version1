import { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Cpu, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { apiClient } from '../../api/client';

export function SettingsView() {
  const { t } = useLanguage();
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    apiClient.getMeta().then((res) => setMeta(res)).catch(() => {});
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 lg:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <span>{t.settings.title}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {t.settings.desc}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: 보안 & 거버넌스 */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.settings.cardSecurityTitle}</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-600">{t.settings.modelArmorTemplate}</span>
              <span className="font-mono font-semibold text-slate-800">version1-guardrails</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-600">{t.settings.piiMasking}</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> {t.settings.piiEnabled}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-600">{t.settings.authMethod}</span>
              <span className="font-mono text-slate-800">Google OAuth 2.0 (OIDC RS256)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-600">{t.settings.storageIsolation}</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Direct VPC Egress
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: AI 모델 & 런타임 */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Cpu className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.settings.cardTopologyTitle}</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-600">{t.settings.orchestratorModel}</span>
              <span className="font-mono font-semibold text-blue-700">gemini-3.1-pro (global)</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-600">{t.settings.subagentsModel}</span>
              <span className="font-mono text-slate-800">gemini-3.5-flash-lite</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-600">{t.settings.creativeVisualModel}</span>
              <span className="font-mono font-semibold text-purple-700">
                gemini-3.1-flash-lite-image (Nano Banana 2 Lite)
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-600">{t.settings.gcpLocation}</span>
              <span className="font-mono text-slate-800">
                {(meta?.region as string) || 'asia-northeast3 (Seoul)'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
