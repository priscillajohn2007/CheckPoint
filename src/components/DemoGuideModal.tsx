import React from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  Layers, 
  ExternalLink, 
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface DemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadScenario: (scenario: 'air_canada' | 'clean_fact' | 'guarantee') => void;
}

export const DemoGuideModal: React.FC<DemoGuideModalProps> = ({
  isOpen,
  onClose,
  onLoadScenario,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase tracking-wider">
              <span>CodeNexus India 2026</span>
              <span aria-hidden="true">·</span>
              <span>National Hackathon Plan Submission</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
              Checkpoint: An Intelligent Brand-Governance Platform
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Authored by <strong className="text-slate-800">Priscilla John and Najeema</strong> · Preventing brand inconsistency before content is published.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl font-light leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* 4-Step Core Flow */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-xs mx-auto mb-1">
              1
            </div>
            <div className="font-bold text-teal-950">Draft Submitted</div>
            <div className="text-[10px] text-teal-800 mt-0.5">By creator (Priya)</div>
          </div>
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-xs mx-auto mb-1">
              2
            </div>
            <div className="font-bold text-teal-950">Checked Sources</div>
            <div className="text-[10px] text-teal-800 mt-0.5">Active Fact Library</div>
          </div>
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-xs mx-auto mb-1">
              3
            </div>
            <div className="font-bold text-teal-950">Human Review</div>
            <div className="text-[10px] text-teal-800 mt-0.5">Manager or Legal</div>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs mx-auto mb-1">
              4
            </div>
            <div className="font-bold text-emerald-950">Approved to Publish</div>
            <div className="text-[10px] text-emerald-800 mt-0.5">Zero liability risk</div>
          </div>
        </div>

        {/* The 8-Stage Engine Architecture */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            8-Stage Engine Architecture
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-teal-800 block">1. Setup</span>
              <span className="text-[11px] text-slate-600">Fact library with expiry dates &amp; terms.</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-teal-800 block">2. Create</span>
              <span className="text-[11px] text-slate-600">Creator submits draft &amp; target goal.</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-teal-800 block">3. Protect</span>
              <span className="text-[11px] text-slate-600">Confidential terms masked pre-AI.</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-teal-800 block">4. Analyse</span>
              <span className="text-[11px] text-slate-600">Rule engine + grounded Gemini LLM.</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-teal-800 block">5. Explain</span>
              <span className="text-[11px] text-slate-600">Issue, reason, source. Accept/edit/dismiss.</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-teal-800 block">6. Route</span>
              <span className="text-[11px] text-slate-600">Routine to manager, risky to legal.</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-teal-800 block">7. Approve</span>
              <span className="text-[11px] text-slate-600">Comments, sign-off &amp; revision history.</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-teal-800 block">8. Learn</span>
              <span className="text-[11px] text-slate-600">Feeds Clarity Heatmap &amp; rewrites.</span>
            </div>
          </div>
        </div>

        {/* Quick Demo Scenarios to Test */}
        <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-950 uppercase tracking-wider">
              Try Interactive Hackathon Scenarios:
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => {
                onLoadScenario('air_canada');
                onClose();
              }}
              className="p-3 bg-white border border-teal-300 rounded-lg text-left hover:bg-teal-100/50 transition-colors cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-900">1. Priya&apos;s Flash Draft</div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Tests sample campaign violations: #1 claim, expired SUMMER2024 code, &ldquo;users&rdquo; term.
              </p>
            </button>

            <button
              onClick={() => {
                onLoadScenario('clean_fact');
                onClose();
              }}
              className="p-3 bg-white border border-teal-300 rounded-lg text-left hover:bg-teal-100/50 transition-colors cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-900">2. Approved Facts Draft</div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Tests clean pass citing Q3 Operations Report with active FEAST2026 promo.
              </p>
            </button>

            <button
              onClick={() => {
                onLoadScenario('guarantee');
                onClose();
              }}
              className="p-3 bg-white border border-teal-300 rounded-lg text-left hover:bg-teal-100/50 transition-colors cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-900">3. Absolute Guarantee</div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Tests 100% guarantee violation under CCPA 2022 and Air Canada precedent.
              </p>
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Synthetic Brand: <strong className="text-slate-800">QuickBite Express</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Explore Platform
          </button>
        </div>
      </div>
    </div>
  );
};
