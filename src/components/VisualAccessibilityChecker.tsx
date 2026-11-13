import React, { useState, useEffect } from 'react';
import {
  Palette,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Box,
  Upload,
  Image as ImageIcon,
  FileCheck2,
  Trash2,
  FileText,
  ScanEye,
  Lock,
} from 'lucide-react';
import { api, MultimodalAnalysisResponse } from '../services/api';
import { BrandKitConfig, LogoCheckResult } from '../types';
import { findClosestPaletteMatch } from '../utils/brandEngine';

interface VisualAccessibilityCheckerProps {
  isDemoMode?: boolean;
  brandKit?: BrandKitConfig;
  onPosterAnalyzed?: () => void;
}

export const VisualAccessibilityChecker: React.FC<VisualAccessibilityCheckerProps> = ({
  isDemoMode = false,
  brandKit,
  onPosterAnalyzed,
}) => {
  const [activeTab, setActiveTab] = useState<'poster_audit' | 'contrast' | 'logo_demo'>('poster_audit');

  // Custom User Uploaded Poster / Brand Asset state
  const [brandName, setBrandName] = useState<string>(isDemoMode ? 'QuickBite Express' : '');
  const [customGuidelines, setCustomGuidelines] = useState<string>('');
  const [customPoster, setCustomPoster] = useState<{
    file: File | null;
    base64: string | null;
    name: string;
    mimeType: string;
    isAnalyzing: boolean;
    error: string | null;
    result: MultimodalAnalysisResponse | null;
  }>({
    file: null,
    base64: null,
    name: '',
    mimeType: '',
    isAnalyzing: false,
    error: null,
    result: null,
  });

  // Contrast Calculator states (clean/neutral when demo mode is off)
  const [fgColor, setFgColor] = useState<string>('#0F172A');
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
  const [bannerBrand, setBannerBrand] = useState<string>(isDemoMode ? 'QuickBite Express' : '');
  const [bannerText, setBannerText] = useState<string>(
    isDemoMode ? 'Weekend 25% Off: Fresh Dinners Delivered Fast' : ''
  );
  const [bannerSubtext, setBannerSubtext] = useState<string>(
    isDemoMode ? 'Average delivery time 25 mins · Code FEAST2026' : ''
  );
  const [altText, setAltText] = useState<string>(
    isDemoMode ? 'Promotional banner for QuickBite Express weekend delivery discount' : ''
  );
  const [contrastData, setContrastData] = useState<{
    ratio: number;
    passesAA: boolean;
    passesAAA: boolean;
    passesLargeAA: boolean;
    interpretation: string;
  } | null>(null);

  // Demo-only Logo inspection states
  const [selectedLogoPreset, setSelectedLogoPreset] = useState<
    'official_shield' | 'official_white' | 'deprecated_rabbit' | 'distorted'
  >('official_shield');
  const [clearSpaceRatio, setClearSpaceRatio] = useState<number>(1.0);
  const [displayHeightPx, setDisplayHeightPx] = useState<number>(36);
  const [logoSurfaceBg, setLogoSurfaceBg] = useState<string>('#FFFFFF');
  const [logoCheckResult, setLogoCheckResult] = useState<LogoCheckResult | null>(null);

  // Sync fields when Demo Mode toggles
  useEffect(() => {
    if (isDemoMode) {
      setBrandName('QuickBite Express');
      setBannerBrand('QuickBite Express');
      setBannerText('Weekend 25% Off: Fresh Dinners Delivered Fast');
      setBannerSubtext('Average delivery time 25 mins · Code FEAST2026');
      setAltText('Promotional banner for QuickBite Express weekend delivery discount');
    } else {
      if (activeTab === 'logo_demo') {
        setActiveTab('poster_audit');
      }
      setBrandName('');
      setBannerBrand('');
      setBannerText('');
      setBannerSubtext('');
      setAltText('');
      setLogoCheckResult(null);
    }
  }, [isDemoMode]);

  const runPosterAudit = async (base64: string, mimeType: string, name: string) => {
    setCustomPoster((prev) => ({
      ...prev,
      isAnalyzing: true,
      error: null,
      result: null,
    }));

    try {
      const res = await api.analyzeMultimodal({
        fileBase64: base64,
        mimeType: mimeType || 'image/png',
        fileName: name,
        channel: 'ad_campaign',
        goal: 'Brand poster visual, logo, contrast, and copy compliance audit',
        brandName: brandName.trim() || undefined,
        customGuidelines: customGuidelines.trim() || undefined,
        privacyRedaction: true,
        isDemoMode,
      });
      setCustomPoster((prev) => ({
        ...prev,
        isAnalyzing: false,
        error: null,
        result: res,
      }));
      onPosterAnalyzed?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Poster analysis failed. Please try again.';
      setCustomPoster((prev) => ({
        ...prev,
        isAnalyzing: false,
        error: msg,
        result: null,
      }));
    }
  };

  const handleUploadPoster = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const resolvedType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png');
      setCustomPoster({
        file,
        base64,
        name: file.name,
        mimeType: resolvedType,
        isAnalyzing: true,
        error: null,
        result: null,
      });
      runPosterAudit(base64, resolvedType, file.name);
    };
    reader.readAsDataURL(file);
  };

  const clearPoster = () => {
    setCustomPoster({
      file: null,
      base64: null,
      name: '',
      mimeType: '',
      isAnalyzing: false,
      error: null,
      result: null,
    });
  };

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

  useEffect(() => {
    if (!isDemoMode || activeTab !== 'logo_demo') return;
    async function inspectDemoLogo() {
      try {
        const isLegacy = selectedLogoPreset === 'deprecated_rabbit';
        const logoName = isLegacy ? 'quickbite_legacy_rabbit_2023.svg' : 'quickbite_shield_2026.svg';
        const res = await api.checkLogo({
          logoName,
          isLegacyRabbit: isLegacy,
          clearSpaceRatio,
          displayHeightPx,
          surfaceColor: logoSurfaceBg,
        });
        setLogoCheckResult(res);
      } catch (err) {
        console.error('Logo check failed:', err);
      }
    }
    inspectDemoLogo();
  }, [isDemoMode, activeTab, selectedLogoPreset, clearSpaceRatio, displayHeightPx, logoSurfaceBg]);

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
              <span>Visual Brand Governance</span>
              <span aria-hidden="true">·</span>
              <span>AI Poster Audit &amp; WCAG AA Verification</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Visual &amp; Logo Asset Inspector
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Upload any brand poster, banner, or creative PDF to inspect logo placement, color contrast, typography, and copy claims with live AI Vision.
            </p>
          </div>

          {/* Subtab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('poster_audit')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'poster_audit'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ScanEye className="w-3.5 h-3.5 text-teal-800" />
              <span>Brand Poster Audit</span>
            </button>
            <button
              onClick={() => setActiveTab('contrast')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'contrast'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>WCAG Contrast Calculator</span>
            </button>
            {isDemoMode && (
              <button
                onClick={() => setActiveTab('logo_demo')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'logo_demo'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Demo: Logo Simulator</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'poster_audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Poster Upload & Optional Context (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Upload Brand Poster or Asset</h3>
              {customPoster.base64 && (
                <button
                  type="button"
                  onClick={clearPoster}
                  className="text-xs text-rose-700 hover:text-rose-900 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Optional Context Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Brand / Organization Name (Optional)
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Auto-detected from poster if left blank"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Brand Rules or Colors to Check (Optional)
                </label>
                <textarea
                  rows={2}
                  value={customGuidelines}
                  onChange={(e) => setCustomGuidelines(e.target.value)}
                  placeholder="e.g. Primary color #0F766E, require clear padding around logo, flag unverified #1 claims or typos..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 focus:bg-white"
                />
              </div>
            </div>

            {brandKit?.confidentialMode && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Confidential Mode is ON:</strong> External AI Vision calls for uploaded images are blocked. Switch off Confidential Mode in <strong>Brand Kit</strong> to run live Gemini Vision poster audits.
                </span>
              </div>
            )}

            {/* File Dropzone */}
            <div className="border-2 border-dashed border-teal-300 bg-teal-50/40 rounded-xl p-6 text-center hover:bg-teal-50 transition-colors relative">
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,image/*,application/pdf"
                onChange={handleUploadPoster}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto mb-2.5">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-900">
                {customPoster.name ? customPoster.name : 'Drop your Brand Poster or Creative File here'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports PNG, JPG, WEBP, or PDF · Analyzed directly with AI Vision
              </p>
            </div>

            {/* Image Preview */}
            {customPoster.base64 && customPoster.mimeType.startsWith('image/') && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Uploaded Asset Preview
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center max-h-80">
                  <img
                    src={customPoster.base64}
                    alt={customPoster.name}
                    className="max-h-80 w-auto object-contain"
                  />
                </div>
              </div>
            )}

            {customPoster.base64 && customPoster.mimeType === 'application/pdf' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3 text-xs">
                <FileText className="w-5 h-5 text-teal-800 shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-slate-900 truncate">{customPoster.name}</div>
                  <div className="text-[11px] text-slate-500">PDF Document Ready for Inspection</div>
                </div>
              </div>
            )}

            {customPoster.base64 && (
              <button
                type="button"
                disabled={customPoster.isAnalyzing}
                onClick={() =>
                  runPosterAudit(customPoster.base64!, customPoster.mimeType, customPoster.name)
                }
                className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <ScanEye className="w-4 h-4" />
                <span>
                  {customPoster.isAnalyzing ? 'Analyzing Poster with AI Vision...' : 'Re-Run Poster Inspection'}
                </span>
              </button>
            )}
          </div>

          {/* Right: Live Inspection Results (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {!customPoster.base64 && !customPoster.isAnalyzing && (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-teal-800 mx-auto flex items-center justify-center">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Ready to Inspect Your Brand Poster
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Upload any promotional poster, social media graphic, ad banner, or PDF brochure on the left. Checkpoint extracts the visible copy, inspects logo placement and contrast, and flags real branding or compliance errors.
                </p>
              </div>
            )}

            {customPoster.isAnalyzing && (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs space-y-3">
                <div className="w-10 h-10 border-3 border-teal-800/20 border-t-teal-800 rounded-full animate-spin mx-auto" />
                <div className="text-sm font-semibold text-slate-900">
                  Inspecting &ldquo;{customPoster.name}&rdquo; with Multimodal AI Vision...
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Reading poster text via OCR, checking color contrast, inspecting logo geometry, and verifying claims.
                </p>
              </div>
            )}

            {customPoster.error && !customPoster.isAnalyzing && (
              <div className="p-5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-700" />
                  <span>Inspection Failed</span>
                </div>
                <p>{customPoster.error}</p>
              </div>
            )}

            {customPoster.result && !customPoster.isAnalyzing && (
              <div className="space-y-4">
                {/* Summary Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">
                        Live AI Vision Audit
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        Detected Brand: {customPoster.result.detectedBrand || 'Analyzed Asset'}
                      </h3>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                        customPoster.result.findings.length === 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : customPoster.result.routeTo === 'legal_reviewer'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {customPoster.result.findings.length === 0
                        ? '0 ISSUES · PASSED'
                        : `${customPoster.result.findings.length} ISSUE(S) FLAGGED`}
                    </span>
                  </div>

                  {customPoster.result.visualSummary && (
                    <p className="text-xs text-slate-700 leading-relaxed">
                      <strong className="text-slate-900">Visual Summary:</strong>{' '}
                      {customPoster.result.visualSummary}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {customPoster.result.contrastAssessment && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Contrast &amp; Readability
                        </div>
                        <div className="font-medium text-slate-900">
                          {customPoster.result.contrastAssessment}
                        </div>
                      </div>
                    )}
                    {customPoster.result.logoAssessment && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Logo &amp; Mark Inspection
                        </div>
                        <div className="font-medium text-slate-900">
                          {customPoster.result.logoAssessment}
                        </div>
                      </div>
                    )}
                  </div>

                  {customPoster.result.dominantColors &&
                    customPoster.result.dominantColors.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          Detected Palette {brandKit && brandKit.palette.length > 0 ? `(Checked vs Brand Kit via CIEDE2000 ΔE ≤ ${brandKit.deltaEMax})` : ''}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {customPoster.result.dominantColors.map((col, idx) => {
                            const hexMatch = col.match(/#[0-9a-fA-F]{3,6}/)?.[0];
                            const closest =
                              hexMatch && brandKit?.palette?.length
                                ? findClosestPaletteMatch(hexMatch, brandKit.palette)
                                : null;
                            const passesDeltaE = closest ? closest.deltaE <= (brandKit?.deltaEMax ?? 10) : true;
                            return (
                              <span
                                key={idx}
                                className={`text-[11px] font-mono px-2 py-1 rounded border flex items-center gap-1.5 ${
                                  closest
                                    ? passesDeltaE
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                      : 'bg-rose-50 text-rose-900 border-rose-200'
                                    : 'bg-slate-100 text-slate-800 border-slate-200'
                                }`}
                              >
                                {hexMatch && (
                                  <span
                                    className="w-3 h-3 rounded-xs border border-slate-400/50 shrink-0"
                                    style={{ backgroundColor: hexMatch }}
                                  />
                                )}
                                <span>{col}</span>
                                {closest && (
                                  <span className="text-[10px] font-sans font-semibold">
                                    · ΔE {closest.deltaE} ({passesDeltaE ? `Matches ${closest.swatch.name}` : `Off-palette vs ${closest.swatch.name}`})
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  <div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Extracted Text (OCR)
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {customPoster.result.extractedText}
                    </div>
                  </div>
                </div>

                {/* Findings List */}
                {customPoster.result.findings.length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
                    <div className="text-sm font-bold text-emerald-950">
                      No Branding or Visual Errors Detected
                    </div>
                    <p className="text-xs text-emerald-800 max-w-md mx-auto">
                      Your uploaded poster passed optical contrast, logo integrity, and claim compliance checks.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Detected Branding, Visual &amp; Copy Issues ({customPoster.result.findings.length})
                    </h4>
                    {customPoster.result.findings.map((f) => (
                      <div
                        key={f.id}
                        className={`bg-white border rounded-xl p-4 shadow-xs space-y-2 ${
                          f.severity === 'high' ? 'border-rose-300' : 'border-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                                f.severity === 'high'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : f.severity === 'medium'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {f.severity.toUpperCase()} · {f.category.toUpperCase()}
                            </span>
                            <span className="font-bold text-slate-900">{f.issue}</span>
                          </div>
                          <span className="text-xs font-mono text-slate-500">
                            {f.confidence}% conf.
                          </span>
                        </div>

                        <div className="text-xs bg-rose-50/70 border border-rose-100 text-rose-950 px-2.5 py-1.5 rounded">
                          <span className="font-semibold">Flagged Element:</span> &ldquo;{f.matchedText}&rdquo;
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">
                          <strong className="text-slate-900">Why it was flagged:</strong> {f.reason}
                        </p>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                            Recommended Fix
                          </span>
                          <span className="text-slate-900 font-medium">{f.suggestedFix}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contrast' && (
        /* WCAG Contrast Calculator */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900">Color &amp; Copy Parameters</h3>

            {/* Demo-only palette presets */}
            {isDemoMode && (
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-2">
                  Demo Palette Presets:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setPresetColors('#FFFFFF', '#0F766E')}
                    className="p-2 border rounded-lg flex items-center justify-between text-left hover:border-teal-700 bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span>QuickBite Teal (Passes AA)</span>
                    <div className="flex -space-x-1">
                      <div className="w-4 h-4 rounded-full bg-[#0F766E] border border-white" />
                      <div className="w-4 h-4 rounded-full bg-white border border-slate-300" />
                    </div>
                  </button>

                  <button
                    onClick={() => setPresetColors('#94A3B8', '#FFFFFF')}
                    className="p-2 border border-rose-300 bg-rose-50/50 rounded-lg flex items-center justify-between text-left hover:border-rose-400 transition-colors cursor-pointer"
                  >
                    <span className="text-rose-900">Low Contrast (2.1:1)</span>
                    <div className="flex -space-x-1">
                      <div className="w-4 h-4 rounded-full bg-white border border-slate-300" />
                      <div className="w-4 h-4 rounded-full bg-[#94A3B8] border border-white" />
                    </div>
                  </button>
                </div>
              </div>
            )}

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

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Brand Label
                </label>
                <input
                  type="text"
                  value={bannerBrand}
                  onChange={(e) => setBannerBrand(e.target.value)}
                  placeholder="Enter your brand name..."
                  className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Banner Headline
                </label>
                <input
                  type="text"
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  placeholder="Enter headline text to preview contrast..."
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
                  placeholder="Enter supporting copy..."
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
                        `Promotional banner${bannerBrand ? ` for ${bannerBrand}` : ''}${
                          bannerText ? ` reading: "${bannerText}"` : ''
                        }`
                      )
                    }
                    className="text-[11px] text-teal-800 hover:underline flex items-center gap-1 cursor-pointer"
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

          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Live Contrast Preview Canvas
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {fgColor.toUpperCase()} on {bgColor.toUpperCase()}
                </span>
              </div>

              <div
                className="w-full rounded-xl p-8 transition-colors flex flex-col justify-between min-h-[200px] border border-slate-200 relative overflow-hidden"
                style={{ backgroundColor: bgColor }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-widest opacity-80"
                  style={{ color: fgColor }}
                >
                  {bannerBrand || 'Your Brand Name'}
                </div>

                <div className="space-y-2 max-w-lg my-4">
                  <h2
                    className="text-2xl font-bold tracking-tight leading-tight"
                    style={{ color: fgColor }}
                  >
                    {bannerText || 'Sample Headline Text Preview'}
                  </h2>
                  <p className="text-sm opacity-90" style={{ color: fgColor }}>
                    {bannerSubtext || 'Supporting body text legibility check against selected surface color.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span
                    className="text-xs font-medium px-3 py-1 rounded-full border"
                    style={{ borderColor: fgColor, color: fgColor }}
                  >
                    Call to Action
                  </span>
                </div>
              </div>

              {altText && (
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-800">Alt-Text:</span> &ldquo;{altText}&rdquo;
                </div>
              )}
            </div>

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
      )}

      {activeTab === 'logo_demo' && isDemoMode && (
        /* Demo-Only Logo Asset & Geometry Simulator */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900">Demo Logo Inspection Controls</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Select Sample Logo Mark
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedLogoPreset('official_shield');
                    setLogoSurfaceBg('#0F766E');
                    setClearSpaceRatio(1.2);
                  }}
                  className={`w-full p-3 rounded-lg border text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    selectedLogoPreset === 'official_shield'
                      ? 'border-teal-700 bg-teal-50/50 text-teal-950 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-bold">Official 2026 Primary Shield</div>
                    <div className="text-[11px] text-slate-500">Approved vector mark with clear space</div>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                    APPROVED
                  </span>
                </button>

                <button
                  onClick={() => {
                    setSelectedLogoPreset('deprecated_rabbit');
                    setLogoSurfaceBg('#F1F5F9');
                    setClearSpaceRatio(0.6);
                  }}
                  className={`w-full p-3 rounded-lg border text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    selectedLogoPreset === 'deprecated_rabbit'
                      ? 'border-rose-400 bg-rose-50 text-rose-950 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-bold text-rose-900">Deprecated 2023 Rabbit Mascot</div>
                    <div className="text-[11px] text-slate-500">Discontinued mascot mark (Brand Book 2026)</div>
                  </div>
                  <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                    PROHIBITED
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Clear Space Padding Ratio:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {clearSpaceRatio.toFixed(1)}x Mark Height
                  </span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.0"
                  step="0.1"
                  value={clearSpaceRatio}
                  onChange={(e) => setClearSpaceRatio(parseFloat(e.target.value))}
                  className="w-full accent-teal-800 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Display Height (Min: 32px):</span>
                  <span className="font-mono font-bold text-slate-900">{displayHeightPx}px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="2"
                  value={displayHeightPx}
                  onChange={(e) => setDisplayHeightPx(parseInt(e.target.value))}
                  className="w-full accent-teal-800 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div
                className="w-full rounded-xl p-10 flex items-center justify-center transition-colors min-h-[220px] shadow-inner relative"
                style={{ backgroundColor: logoSurfaceBg }}
              >
                <div
                  className={`border-2 border-dashed p-6 rounded-lg transition-all flex flex-col items-center justify-center relative ${
                    clearSpaceRatio >= 1.0
                      ? 'border-emerald-400/80 bg-emerald-500/10'
                      : 'border-rose-400/90 bg-rose-500/15'
                  }`}
                  style={{ padding: `${clearSpaceRatio * 20}px` }}
                >
                  <span
                    className={`absolute -top-3 left-2 text-[9px] font-mono px-1 rounded uppercase font-bold ${
                      clearSpaceRatio >= 1.0
                        ? 'bg-emerald-800 text-white'
                        : 'bg-rose-800 text-white'
                    }`}
                  >
                    Exclusion Zone ({clearSpaceRatio.toFixed(1)}x)
                  </span>

                  {selectedLogoPreset === 'deprecated_rabbit' ? (
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-xl shadow-md">
                        🐰
                      </div>
                      <span className="font-bold tracking-tight text-xs text-rose-900 bg-white/90 px-2 py-0.5 rounded shadow-xs">
                        QuickBite 2023 Mascot
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div
                        className="rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold shadow-md"
                        style={{ width: `${displayHeightPx}px`, height: `${displayHeightPx}px` }}
                      >
                        <ShieldCheck className="w-3/5 h-3/5" />
                      </div>
                      <div
                        className="font-extrabold tracking-tight text-base"
                        style={{
                          color:
                            logoSurfaceBg === '#FFFFFF' || logoSurfaceBg === '#F1F5F9'
                              ? '#0F766E'
                              : '#FFFFFF',
                        }}
                      >
                        QuickBite Express
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {logoCheckResult && (
              <div
                className={`p-5 rounded-xl border ${
                  logoCheckResult.passed
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {logoCheckResult.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-700" />
                    )}
                    <div>
                      <span className="text-base font-bold block">
                        {logoCheckResult.passed
                          ? 'Logo Geometry & Asset Approved'
                          : 'Brand Asset Violation Flagged'}
                      </span>
                      <span className="text-xs opacity-90">{logoCheckResult.details}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
