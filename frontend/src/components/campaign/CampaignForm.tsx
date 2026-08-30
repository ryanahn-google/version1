import { useState } from 'react';
import { Sparkles, DollarSign, Target, Layers, Play, Users } from 'lucide-react';
import type { CreateCampaignRequest } from '../../types/campaign';

const AVAILABLE_CHANNELS = [
  'Social Media',
  'Search Ads',
  'Video Streaming',
  'Display Network',
  'Out-of-Home (OOH)',
  'Influencer Collab',
];

const GOLDEN_SCENARIO: CreateCampaignRequest = {
  brandName: 'Nova Electronics',
  productName: 'Galaxy S27 Ultra',
  campaignObjective: 'Q4 Global Flagship Launch: Maximize holiday pre-orders and establish AI mobile leadership.',
  targetAudience: 'Tech enthusiasts, mobile photographers, and premium upgrade consumers aged 25-45.',
  budgetAmount: 1200000,
  currency: 'USD',
  channels: ['Social Media', 'Search Ads', 'Video Streaming', 'Influencer Collab'],
  stream: false,
};

interface CampaignFormProps {
  onSubmit: (req: CreateCampaignRequest) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function CampaignForm({ onSubmit, isLoading, disabled }: CampaignFormProps) {
  const [brandName, setBrandName] = useState(GOLDEN_SCENARIO.brandName);
  const [productName, setProductName] = useState(GOLDEN_SCENARIO.productName);
  const [objective, setObjective] = useState(GOLDEN_SCENARIO.campaignObjective);
  const [targetAudience, setTargetAudience] = useState(GOLDEN_SCENARIO.targetAudience);
  const [budget, setBudget] = useState(GOLDEN_SCENARIO.budgetAmount);
  const [channels, setChannels] = useState<string[]>(GOLDEN_SCENARIO.channels || []);

  const toggleChannel = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handlePreFill = () => {
    setBrandName(GOLDEN_SCENARIO.brandName);
    setProductName(GOLDEN_SCENARIO.productName);
    setObjective(GOLDEN_SCENARIO.campaignObjective);
    setTargetAudience(GOLDEN_SCENARIO.targetAudience);
    setBudget(GOLDEN_SCENARIO.budgetAmount);
    setChannels(GOLDEN_SCENARIO.channels || []);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName || !productName || !objective || channels.length === 0) return;
    onSubmit({
      brandName,
      productName,
      campaignObjective: objective,
      targetAudience,
      budgetAmount: budget,
      currency: 'USD',
      channels,
      stream: false,
    });
  };

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            Campaign Parameters
          </h2>
          <button
            type="button"
            onClick={handlePreFill}
            disabled={disabled || isLoading}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Golden Scenario
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
          {/* Brand & Product */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Brand Name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                required
                disabled={disabled || isLoading}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
                disabled={disabled || isLoading}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Campaign Objective */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Target className="h-3 w-3 text-cyan-400" />
              Target Campaign Objective
            </label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              required
              rows={2}
              disabled={disabled || isLoading}
              placeholder="E.g., Q4 Flagship holiday pre-orders, brand sentiment enhancement..."
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs resize-none"
            />
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Users className="h-3 w-3 text-purple-400" />
              Target Audience
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              required
              disabled={disabled || isLoading}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-emerald-400" />
              Budget Envelope (USD)
            </label>
            <input
              type="number"
              min={10000}
              step={10000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              required
              disabled={disabled || isLoading}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono"
            />
          </div>

          {/* Channels Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Target Marketing Channels</label>
            <div className="grid grid-cols-2 gap-1.5">
              {AVAILABLE_CHANNELS.map((ch) => {
                const checked = channels.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
                    disabled={disabled || isLoading}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs border transition ${
                      checked
                        ? 'bg-blue-950/60 border-blue-600 text-blue-200'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{ch}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        checked ? 'bg-blue-400' : 'bg-slate-700'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Launch CTA */}
          <button
            type="submit"
            disabled={disabled || isLoading || channels.length === 0}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
          >
            <Play className="h-4 w-4 fill-white" />
            {isLoading ? 'Running Simulation...' : 'Launch Multi-Agent Simulation'}
          </button>
        </form>
      </div>

      {/* Compliance / FinOps Footnote */}
      <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
        <p>&bull; Model Armor prompt inspection active</p>
        <p>&bull; Automated FinOps unit cost: ~$0.0455 / run</p>
        <p>&bull; Orchestrator: Gemini 3.1 Pro (global)</p>
      </div>
    </div>
  );
}
