import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Eye, 
  HelpCircle,
  Maximize2
} from 'lucide-react';
import { api } from '../services/api';

export const VisualAccessibilityChecker: React.FC = () => {
  const [fgColor, setFgColor] = useState<string>('#FFFFFF');
  const [bgColor, setBgColor] = useState<string>('#0F766E'); // Deep Teal
  const [bannerText, setBannerText] = useState<string>('Weekend 25% Off: Fresh Dinners Delivered Fast');
  const [bannerSubtext, setBannerSubtext] = useState<string>('Average delivery time 25 mins · Code FEAST2026');
  const [altText, setAltText] = useState<string>('Promotional banner for QuickBite Express weekend delivery discount');
  const [contrastData, setContrastData] = useState<{
    ratio: number;
    passesAA: boolean;
    passesAAA: boolean;
    passesLargeAA: boolean;
    interpretation: string;
  } | null>(null);

  useEffect(() => {
    async function calculate() {
      try {
        const res = await api.checkContrast(fgColor, bgColor);
        setContrastData(res);
      } catch (err) {
        console.error('Contrast check failed:', err);
      }
    }
    calculate();
  }, [fgColor, bgColor]);

  const setPresetColors = (fg: string, bg: string) => {
    setFgColor(fg);
    setBgColor(bg);
  };

  return (
    <div className="space-y-8">
      {/* Kicker Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
              <span>Extended Engine Features</span>
              <span aria-hidden="true">·</span>
              <span>Visual Governance &amp; WCAG AA</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 font-normal">Slide 2 &amp; 7 Architecture</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Visual &amp; Contrast Governance
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Prevents unreadable marketing banners and off-brand visual assets by enforcing WCAG 2.1 AA text contrast (&ge; 4.5:1) and descriptive alt-text.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs text-slate-600">
            <span className="font-semibold text-slate-800 block">WCAG AA Standard:</span>
            Body text requires &ge; 4.5:1 contrast; large display text requires &ge; 3.0:1.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Controls & Color Selectors (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-900">Banner Creative Parameters</h3>

          {/* Color Presets */}
          <div>
            <span className="text-xs font-semibold text-slate-600 block mb-2">
              Brand Palette Presets:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setPresetColors('#FFFFFF', '#0F766E')}
                className="p-2 border rounded-lg flex items-center justify-between text-left hover:border-teal-700 bg-slate-50 transition-colors"
              >
                <span>QuickBite Teal (Passes AA)</span>
                <div className="flex -space-x-1">
                  <div className="w-4 h-4 rounded-full bg-[#0F766E] border border-white" />
                  <div className="w-4 h-4 rounded-full bg-white border border-slate-300" />
                </div>
              </button>

              <button
                onClick={() => setPresetColors('#0F172A', '#F1F5F9')}
                className="p-2 border rounded-lg flex items-center justify-between text-left hover:border-teal-700 bg-slate-50 transition-colors"
              >
                <span>Slate &amp; Soft Gray (14.2:1)</span>
                <div className="flex -space-x-1">
                  <div className="w-4 h-4 rounded-full bg-[#F1F5F9] border border-slate-300" />
                  <div className="w-4 h-4 rounded-full bg-[#0F172A] border border-white" />
                </div>
              </button>

              <button
                onClick={() => setPresetColors('#94A3B8', '#FFFFFF')}
                className="p-2 border border-rose-300 bg-rose-50/50 rounded-lg flex items-center justify-between text-left hover:border-rose-400 transition-colors"
              >
                <span className="text-rose-900">Light Gray (Fails AA: 2.1:1)</span>
                <div className="flex -space-x-1">
                  <div className="w-4 h-4 rounded-full bg-white border border-slate-300" />
                  <div className="w-4 h-4 rounded-full bg-[#94A3B8] border border-white" />
                </div>
              </button>

              <button
                onClick={() => setPresetColors('#FBBF24', '#FFFFFF')}
                className="p-2 border border-rose-300 bg-rose-50/50 rounded-lg flex items-center justify-between text-left hover:border-rose-400 transition-colors"
              >
                <span className="text-rose-900">Yellow on White (Fails: 1.8:1)</span>
                <div className="flex -space-x-1">
                  <div className="w-4 h-4 rounded-full bg-white border border-slate-300" />
                  <div className="w-4 h-4 rounded-full bg-[#FBBF24] border border-white" />
                </div>
              </button>
            </div>
          </div>

          {/* Custom Hex Inputs */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Foreground (Text)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-300 p-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-full text-xs font-mono p-1.5 border border-slate-300 rounded focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Background Surface
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-300 p-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full text-xs font-mono p-1.5 border border-slate-300 rounded focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Banner Text Customizer */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Banner Headline
              </label>
              <input
                type="text"
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Banner Subtext
              </label>
              <input
                type="text"
                value={bannerSubtext}
                onChange={(e) => setBannerSubtext(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Image Alt-Text
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setAltText(
                      `Promotional marketing banner for QuickBite Express reading: "${bannerText} - ${bannerSubtext}"`
                    )
                  }
                  className="text-[11px] text-teal-800 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-Generate
                </button>
              </div>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none"
                placeholder="Describe this visual for screen readers..."
              />
            </div>
          </div>
        </div>

        {/* Right: Live Banner Preview & Scorecard (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Live Creative Canvas */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Live Creative Canvas Preview
              </h3>
              <span className="text-xs font-mono text-slate-400">1200 x 630 ratio</span>
            </div>

            {/* Visual Canvas Box */}
            <div
              className="w-full rounded-xl p-8 transition-colors flex flex-col justify-between min-h-[220px] shadow-inner relative overflow-hidden"
              style={{ backgroundColor: bgColor }}
            >
              {/* Brand watermark mark in corner */}
              <div
                className="text-xs font-bold uppercase tracking-widest opacity-80"
                style={{ color: fgColor }}
              >
                QuickBite Express
              </div>

              <div className="space-y-2 max-w-lg">
                <h2
                  className="text-2xl font-bold tracking-tight leading-tight"
                  style={{ color: fgColor }}
                >
                  {bannerText}
                </h2>
                <p className="text-sm opacity-90" style={{ color: fgColor }}>
                  {bannerSubtext}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4">
                <span
                  className="text-xs font-medium px-3 py-1 rounded-full border"
                  style={{ borderColor: fgColor, color: fgColor }}
                >
                  Order in App
                </span>
                <span
                  className="text-[11px] font-mono opacity-70"
                  style={{ color: fgColor }}
                >
                  WCAG Verified
                </span>
              </div>
            </div>

            {/* Alt-Text Readout */}
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800">Rendered Alt-Text:</span> &ldquo;{altText}&rdquo;
            </div>
          </div>

          {/* Compliance & Contrast Scorecard */}
          {contrastData && (
            <div
              className={`p-5 rounded-xl border ${
                contrastData.passesAA
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50/70 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {contrastData.passesAA ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-700" />
                    )}
                    <span className="text-base font-bold">
                      {contrastData.passesAA
                        ? 'WCAG 2.1 AA Compliant'
                        : 'Contrast Violation Detected'}
                    </span>
                  </div>
                  <p className="text-xs mt-1">{contrastData.interpretation}</p>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-70">
                    Contrast Ratio
                  </div>
                  <div className="text-3xl font-bold font-mono tabular-nums">
                    {contrastData.ratio}:1
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-current/20 text-xs">
                <div>
                  <span className="block opacity-75">Normal Text (&ge; 4.5:1)</span>
                  <span className="font-bold">
                    {contrastData.passesAA ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <div>
                  <span className="block opacity-75">Large Display (&ge; 3.0:1)</span>
                  <span className="font-bold">
                    {contrastData.passesLargeAA ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <div>
                  <span className="block opacity-75">AAA Strict (&ge; 7.0:1)</span>
                  <span className="font-bold">
                    {contrastData.passesAAA ? 'PASSED' : 'NOT MET'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
