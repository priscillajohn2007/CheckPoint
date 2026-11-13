import React from 'react';
import { ShieldCheck, Lock, Eye, Cpu, FileCheck2 } from 'lucide-react';

interface AboutTrustModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutTrustModal: React.FC<AboutTrustModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="text-xs font-bold text-teal-800 uppercase tracking-wider">
              Trust, Privacy &amp; Verifiable Architecture
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
              Built to Be Trusted Before Anything Ships
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              How Checkpoint combines deterministic code checks, DPDP redaction, Gemini Vision, and SHA-256 Hallmarks.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl font-light leading-none p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-teal-800" />
              <span>1. Deterministic Code First</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              WCAG 2.1 AA contrast ratios, CIEDE2000 (ΔE2000) brand palette distance, Flesch Reading Ease, emoji/ALL-CAPS channel limits, CamelCase hashtags, and descriptive link checks run deterministically in code with zero AI guesswork.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-teal-800" />
              <span>2. DPDP Masking &amp; Confidential Mode</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Emails, phone numbers, and internal project codenames are masked before any external AI call. Enabling <strong>Confidential Mode</strong> inside Brand Kit guarantees zero data ever leaves the local server.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-teal-800" />
              <span>3. Human Decisions &amp; Intent Checks</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              AI never publishes or overwrites copy silently. Every finding explains its rule/source, checks whether the suggested rewrite keeps your message intent, and logs creator dismissals to improve confusing rules.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-teal-800" />
              <span>4. SHA-256 Hash-Chained Hallmarks</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Every approval mints an immutable Hallmark record storing the content SHA-256 hash, rulebook version, findings resolution, approver identity, and previous Hallmark hash so post-sign-off edits are immediately detectable.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/70 text-xs text-teal-950 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-800" />
            <span>Open Standards &amp; Runtime Stack</span>
          </div>
          <p className="text-teal-900">
            React 19, TypeScript, Tailwind CSS v4, Express ESM backend, Google Gemini Vision &amp; Text (`gemini-4-hydrogen`), Node Web Crypto SHA-256, CIEDE2000 perceptual color math, and WCAG 2.1 AA relative luminance checks.
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
