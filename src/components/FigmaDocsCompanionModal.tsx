import React, { useState } from 'react';
import { 
  Layers, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink,
  X,
  Maximize2,
  RefreshCw,
  Check,
  Palette
} from 'lucide-react';

interface FigmaDocsCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FigmaDocsCompanionModal: React.FC<FigmaDocsCompanionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeHost, setActiveHost] = useState<'figma' | 'gdocs'>('figma');
  const [figmaText, setFigmaText] = useState<string>(
    'QuickBite is the #1 fastest delivery app in the country! 100% guaranteed delivery.'
  );
  const [gdocsText, setGdocsText] = useState<string>(
    'Our marketing strategy for Q4: Deliver fresh hot meals to our users with code SUMMER2024 for 50% discount. Secret launch: Project Cheetah rolling out to 15,000 customers.'
  );
  const [figmaFixed, setFigmaFixed] = useState<boolean>(false);
  const [gdocsFixed, setGdocsFixed] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFixFigma = () => {
    setFigmaText('Our average delivery time is 25 minutes across metropolitan zones (Source: Q3 Operations Report).');
    setFigmaFixed(true);
  };

  const handleFixGdocs = () => {
    setGdocsText('Our marketing strategy for Q4: Deliver fresh hot meals to our customers with code FEAST2026 for 25% discount. Launching our expanded partner kitchen network to 15,000 customers.');
    setGdocsFixed(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase tracking-wider">
              <span>Improvement 2: In-Situ Creator Plugins</span>
              <span aria-hidden="true">·</span>
              <span>Figma &amp; Google Docs Companion</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Zero-Tab Switching Brand Governance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Experience how Checkpoint embeds directly inside your creative and writing workspaces with real-time inline telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Host switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              <button
                onClick={() => setActiveHost('figma')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeHost === 'figma' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                Figma Plugin
              </button>
              <button
                onClick={() => setActiveHost('gdocs')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeHost === 'gdocs' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                Google Docs Add-On
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-2xl font-light leading-none p-1"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Workspace Simulation Viewport */}
        {activeHost === 'figma' ? (
          /* Simulated Figma Interface */
          <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-900 shadow-inner">
            {/* Figma simulated top toolbar */}
            <div className="h-9 bg-slate-800 border-b border-slate-700 px-3 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  QuickBite-Campaign-Artboard-2026.fig
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-[11px] text-slate-400">Frame: Instagram Post (1080x1080)</span>
              </div>
              <div className="text-[11px] text-teal-400 font-mono font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Checkpoint Plugin: Active
              </div>
            </div>

            {/* Figma canvas + floating Checkpoint plugin inspector */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start bg-slate-950/70">
              {/* Artboard Canvas (7 cols) */}
              <div className="md:col-span-7 bg-[#0F766E] border-2 border-slate-700 rounded-xl p-8 text-white min-h-[300px] flex flex-col justify-between shadow-2xl relative">
                <div className="flex justify-between items-start">
                  <div className="text-xs font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded backdrop-blur-xs">
                    QuickBite Express
                  </div>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded font-mono">
                    {figmaFixed ? 'Layer Safe: 100%' : '1 Critical Finding'}
                  </span>
                </div>

                <div className="my-6 space-y-2">
                  <h3 className="text-xl font-black leading-snug">
                    {figmaText}
                  </h3>
                  <p className="text-xs text-teal-100">
                    Order fresh dinner meals across 45 certified cities tonight.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/20 text-xs">
                  <span className="px-3 py-1 bg-white text-teal-900 font-bold rounded-lg">
                    Order in App
                  </span>
                  <span className="text-[10px] opacity-75 font-mono">
                    WCAG AA 6.8:1
                  </span>
                </div>
              </div>

              {/* Floating Checkpoint Figma Plugin Panel (5 cols) */}
              <div className="md:col-span-5 bg-white rounded-xl border border-slate-300 shadow-xl p-4 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-teal-800 text-white flex items-center justify-center font-bold text-[10px]">
                      C
                    </div>
                    <span className="font-bold text-slate-900">Checkpoint Canvas Inspector</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">v3.0.4</span>
                </div>

                {!figmaFixed ? (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg space-y-1.5">
                      <div className="flex items-center gap-1.5 text-rose-900 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Claims Policy 3.2 Violation</span>
                      </div>
                      <p className="text-[11px] text-rose-800 leading-normal">
                        Layer contains unverified &ldquo;#1 fastest&rdquo; claim. ASCI guidelines require citing accredited audit data.
                      </p>
                      <div className="text-[10px] text-slate-600 bg-white p-1.5 rounded border border-rose-100">
                        <strong>Source:</strong> Q3 Operations Report
                      </div>
                    </div>

                    <button
                      onClick={handleFixFigma}
                      className="w-full py-2 px-3 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Verified Copy to Layer</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <div className="font-bold text-emerald-950">Layer Approved to Publish</div>
                    <p className="text-[11px] text-emerald-800">
                      Grounded in Q3 Operations Report (25 min benchmark). Zero legal exposure.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Simulated Google Docs Interface */
          <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner">
            {/* Google Docs simulated menu bar */}
            <div className="h-10 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Q4_Launch_Brief_Final.docx
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-[11px] text-slate-500">File Edit View Insert Format Tools Extensions</span>
              </div>
              <div className="text-[11px] text-teal-800 font-mono font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Checkpoint for Docs: Connected
              </div>
            </div>

            {/* Document layout + sidebar */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start bg-slate-100/60">
              {/* Document Canvas (7 cols) */}
              <div className="md:col-span-7 bg-white border border-slate-300 rounded-lg p-6 shadow-sm min-h-[300px] space-y-4">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Executive Marketing Brief - Weekend Push
                </h2>
                <div className="text-xs text-slate-800 leading-relaxed font-serif space-y-3">
                  <p className="p-3 bg-slate-50 border rounded text-slate-900 font-sans">
                    {gdocsText}
                  </p>
                  <p className="text-slate-600">
                    Our field teams have completed onboarding of 45 certified zones. All customer support lines remain open 24/7 with contactless digital payments.
                  </p>
                </div>
              </div>

              {/* Checkpoint Docs Sidebar Panel (5 cols) */}
              <div className="md:col-span-5 bg-white rounded-xl border border-slate-300 shadow-md p-4 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900">Document Governance Assistant</span>
                  <span className="text-[10px] bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-mono">
                    Real-time
                  </span>
                </div>

                {!gdocsFixed ? (
                  <div className="space-y-2.5">
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-950 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-700" />
                        <span>2 Policy Violations Found</span>
                      </div>
                      <div>· Deprecated term &ldquo;users&rdquo; (Use &ldquo;customers&rdquo;)</div>
                      <div>· Expired promo code &ldquo;SUMMER2024&rdquo; (Active: &ldquo;FEAST2026&rdquo;)</div>
                      <div>· Unmasked codename &ldquo;Project Cheetah&rdquo;</div>
                    </div>

                    <button
                      onClick={handleFixGdocs}
                      className="w-full py-2 px-3 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>One-Click Replace in Document</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <div className="font-bold text-emerald-950">Document Compliant</div>
                    <p className="text-[11px] text-emerald-800">
                      Terminology updated to &ldquo;customers&rdquo;, active promo code FEAST2026 substituted, and confidential project masked.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Built with Checkpoint Webhooks &amp; REST API Architecture
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close Workspace Companion
          </button>
        </div>
      </div>
    </div>
  );
};
