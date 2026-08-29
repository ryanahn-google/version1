import { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, Activity, RefreshCw } from 'lucide-react';
import { apiClient } from '../../api/client';

export function Navbar() {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [meta, setMeta] = useState<{ region?: string; models?: Record<string, string> } | null>(null);

  useEffect(() => {
    apiClient
      .getHealth()
      .then((res) => setHealthy(res.status === 'healthy'))
      .catch(() => setHealthy(false));

    apiClient
      .getMeta()
      .then((res) => setMeta(res as { region?: string; models?: Record<string, string> }))
      .catch(() => {});
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            N
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white tracking-tight">Nova Electronics Corp</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50 font-mono">
                MVC v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Marketing Value Creator &bull; Multi-Agent Campaign Simulator</p>
          </div>
        </div>

        {/* Metadata & Status */}
        <div className="flex items-center space-x-4">
          {/* Model Armor Guardrail Badge */}
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Model Armor Guardrails</span>
          </div>

          {/* Location & AI Models */}
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-700">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span>{meta?.region || 'asia-northeast3'} (Gemini 3.1 + Flash Lite)</span>
          </div>

          {/* Backend Liveness Badge */}
          <div className="flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-md border bg-slate-900 border-slate-700">
            <Activity
              className={`h-4 w-4 ${
                healthy === true
                  ? 'text-emerald-400 animate-pulse'
                  : healthy === false
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            />
            <span className={healthy ? 'text-slate-200' : 'text-slate-400'}>
              {healthy === true ? 'Orchestrator Online' : healthy === false ? 'Offline' : 'Connecting...'}
            </span>
          </div>

          <button
            onClick={() => window.location.reload()}
            title="Reset Console"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
