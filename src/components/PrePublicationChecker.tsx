import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  Eye, 
  EyeOff, 
  FileText, 
  Send, 
  ExternalLink, 
  Info,
  Check,
  X,
  Edit2,
  Upload,
  FileCode,
  Layers,
  Image as ImageIcon,
  Download,
  RefreshCw,
  Circle,
  Compass
} from 'lucide-react';
import { Finding, Role, ContentSubmission, BrandKitConfig, JudgeChecklistState } from '../types';
import { api, AnalysisResponse, MultimodalAnalysisResponse } from '../services/api';
import { AppTab } from './Header';
import {
  DEFAULT_CHANNEL_LIMITS,
  computeFleschReadingEase,
  computeWordDiff,
  evaluateFixIntent,
} from '../utils/brandEngine';

interface PrePublicationCheckerProps {
  currentRole: Role;
  onSubmissionCreated: (sub: ContentSubmission) => void;
  onNavigateToQueue: () => void;
  onNavigateTab?: (tab: AppTab) => void;
  onEnableDemo?: () => void;
  onAnalysisCompleted?: () => void;
  onFindingResolved?: () => void;
  judgeProgress?: JudgeChecklistState;
  brandKit?: BrandKitConfig;
  isDemoMode: boolean;
}

export const PrePublicationChecker: React.FC<PrePublicationCheckerProps> = ({
  currentRole,
  onSubmissionCreated,
  onNavigateToQueue,
  onNavigateTab,
  onEnableDemo,
  onAnalysisCompleted,
  onFindingResolved,
  judgeProgress,
  brandKit,
  isDemoMode,
}) => {
  const [activeMode, setActiveMode] = useState<'text' | 'multimodal'>('text');
  const [channel, setChannel] = useState<'social' | 'email' | 'ad_campaign' | 'press_release' | 'blog' | 'slide_deck'>('social');
  const [brandName, setBrandName] = useState<string>(isDemoMode ? 'QuickBite Express' : '');
  const [goal, setGoal] = useState<string>(isDemoMode ? 'Boost weekend lunch orders among urban working professionals on Instagram & LinkedIn.' : '');
  const [title, setTitle] = useState<string>(isDemoMode ? 'QuickBite Weekend Flash Campaign' : '');
  const [content, setContent] = useState<string>(
    isDemoMode
      ? 'QuickBite is the #1 fastest delivery app in the country! Our users love our 100% guaranteed 10-minute delivery and get 50% off with code SUMMER2024. Secret launch: Project Cheetah rolling out to 15,000 customers. Order now from the best delivery platform!'
      : ''
  );
  const [privacyRedaction, setPrivacyRedaction] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [initialAnalyzedContent, setInitialAnalyzedContent] = useState<string>('');
  const [focusedFindingId, setFocusedFindingId] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [showWordDiff, setShowWordDiff] = useState<boolean>(false);
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [customEditText, setCustomEditText] = useState<string>('');
  const [dismissReasonModalId, setDismissReasonModalId] = useState<string | null>(null);
  const [dismissReasonInput, setDismissReasonInput] = useState<string>('');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // Sync fields when demo mode toggles on or off
  React.useEffect(() => {
    setAnalysisResult(null);
    setMultimodalResult(null);
    setAnalysisError(null);
    setSubmitSuccessMsg(null);
    setConflictWarning(null);
    setFocusedFindingId(null);
    setShowWordDiff(false);
    if (isDemoMode) {
      setBrandName('QuickBite Express');
      setTitle('QuickBite Weekend Flash Campaign');
      setGoal('Boost weekend lunch orders among urban working professionals on Instagram & LinkedIn.');
      setContent(
        'QuickBite is the #1 fastest delivery app in the country! Our users love our 100% guaranteed 10-minute delivery and get 50% off with code SUMMER2024. Secret launch: Project Cheetah rolling out to 15,000 customers. Order now from the best delivery platform!'
      );
    } else {
      setBrandName('');
      setTitle('');
      setGoal('');
      setContent('');
      setUploadedFile(null);
    }
  }, [isDemoMode]);

  // Multimodal File State
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    type: string;
    size: number;
    base64?: string;
    preset?: string;
  } | null>(null);
  const [multimodalResult, setMultimodalResult] = useState<MultimodalAnalysisResponse | null>(null);

  // Quick Demo Scenarios
  const loadScenario = (type: 'air_canada' | 'clean_fact' | 'guarantee') => {
    setActiveMode('text');
    if (type === 'air_canada') {
      setTitle('QuickBite Weekend Flash Campaign (Priya Draft)');
      setChannel('social');
      setGoal('Drive lunch orders across Bangalore and Delhi with urgent weekend discounts.');
      setContent(
        'QuickBite is the #1 fastest delivery app in the country! Our users love our 100% guaranteed 10-minute delivery and get 50% off with code SUMMER2024. Secret launch: Project Cheetah rolling out to 15,000 customers. Order now from the best delivery platform!'
      );
    } else if (type === 'clean_fact') {
      setTitle('Metropolitan Delivery Speed Update');
      setChannel('social');
      setGoal('Transparent brand trust update for daily diners.');
      setContent(
        'QuickBite Express delivers fresh meals with an average delivery time of 25 minutes across metropolitan zones (Source: Q3 Operations Report). Our customers can use active code FEAST2026 for 25% off orders above ₹299 today!'
      );
    } else if (type === 'guarantee') {
      setTitle('Late Night Flash Delivery Offer');
      setChannel('ad_campaign');
      setGoal('Midnight food delivery promotional ad.');
      setContent(
        'Hungry at midnight? QuickBite offers 100% guaranteed 10-minute delivery or your meal is completely free! We are the best food delivery app with zero delays guaranteed.'
      );
    }
    setAnalysisResult(null);
    setSubmitSuccessMsg(null);
  };

  const loadMultimodalPreset = async (preset: 'deck' | 'banner') => {
    setActiveMode('multimodal');
    setSubmitSuccessMsg(null);
    if (preset === 'deck') {
      setTitle('Q4 Expansion Strategy Document');
      setChannel('slide_deck');
      setGoal('Investor & franchise expansion presentation review.');
      setUploadedFile({
        name: 'QuickBite_Q4_Expansion_Deck.pdf',
        type: 'application/pdf',
        size: 1024 * 340,
        preset: 'deck_with_claims'
      });
    } else {
      setTitle('Weekend Flash Banner Creative');
      setChannel('ad_campaign');
      setGoal('Performance ad banner visual check.');
      setUploadedFile({
        name: 'Weekend_Flash_Banner_1200x628.png',
        type: 'image/png',
        size: 1024 * 180,
        preset: 'banner_visual'
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const resolvedType =
        file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png');
      setUploadedFile({
        name: file.name,
        type: resolvedType,
        size: file.size,
        base64,
      });
      setTitle(`Audit: ${file.name}`);
      if (file.name.toLowerCase().endsWith('.pdf')) setChannel('slide_deck');
      else setChannel('ad_campaign');
      setAnalysisError(null);
      setAnalysisResult(null);
      setMultimodalResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setSubmitSuccessMsg(null);
    setConflictWarning(null);
    setFocusedFindingId(null);
    try {
      if (activeMode === 'text') {
        const result = await api.analyzeDraft(
          content,
          channel,
          goal,
          privacyRedaction,
          brandName.trim() || undefined,
          isDemoMode
        );
        setInitialAnalyzedContent(content);
        setAnalysisResult(result);
        setMultimodalResult(null);
        onAnalysisCompleted?.();
      } else {
        const result = await api.analyzeMultimodal({
          fileName: uploadedFile?.name || 'uploaded_asset',
          mimeType: uploadedFile?.type || 'image/png',
          fileBase64: uploadedFile?.base64,
          samplePreset: uploadedFile?.preset,
          channel,
          goal,
          brandName: brandName.trim() || undefined,
          privacyRedaction,
          isDemoMode,
        });
        setInitialAnalyzedContent(result.extractedText);
        setMultimodalResult(result);
        setAnalysisResult({
          originalContent: result.extractedText,
          sanitizedContent: result.sanitizedContent,
          redactionApplied: privacyRedaction,
          maskedItemsCount: result.maskedItemsCount,
          maskedTerms: [],
          findings: result.findings,
          routeTo: result.routeTo,
          routingReason: result.routingReason,
          groundingFactsCount: 0,
          analyzedAt: result.analyzedAt,
        });
        onAnalysisCompleted?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
      console.error('Analysis failed:', err);
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkOverlapConflict = (target: Finding, allFindings: Finding[]) => {
    if (typeof target.start !== 'number' || typeof target.end !== 'number') return false;
    return allFindings.some(
      (other) =>
        other.id !== target.id &&
        other.status === 'pending' &&
        typeof other.start === 'number' &&
        typeof other.end === 'number' &&
        Math.max(target.start!, other.start) < Math.min(target.end!, other.end)
    );
  };

  const handleAcceptFinding = (finding: Finding) => {
    const updatedContent = content.replace(finding.matchedText, finding.suggestedFix);
    setContent(updatedContent);

    if (analysisResult) {
      if (checkOverlapConflict(finding, analysisResult.findings)) {
        setConflictWarning(
          `Applied fix for "${finding.matchedText}" overlaps another pending finding's span. Click "Re-check Draft" to refresh findings on the updated text.`
        );
      }
      const updatedFindings = analysisResult.findings.map((f) =>
        f.id === finding.id ? { ...f, status: 'accepted' as const } : f
      );
      setAnalysisResult({ ...analysisResult, findings: updatedFindings });
    }
    onFindingResolved?.();
  };

  const handleEditAndApplyFinding = (finding: Finding) => {
    if (!customEditText) return;
    const updatedContent = content.replace(finding.matchedText, customEditText);
    setContent(updatedContent);

    if (analysisResult) {
      if (checkOverlapConflict(finding, analysisResult.findings)) {
        setConflictWarning(
          `Custom fix for "${finding.matchedText}" overlaps another pending finding. Click "Re-check Draft" to re-evaluate.`
        );
      }
      const intentRes = evaluateFixIntent(finding.matchedText, customEditText);
      const updatedFindings = analysisResult.findings.map((f) =>
        f.id === finding.id
          ? {
              ...f,
              status: 'manual_edit' as const,
              suggestedFix: customEditText,
              intentVerdict: intentRes.verdict,
              intentNote: intentRes.note,
            }
          : f
      );
      setAnalysisResult({ ...analysisResult, findings: updatedFindings });
    }
    setEditingFindingId(null);
    setCustomEditText('');
    onFindingResolved?.();
  };

  const handleDismissFinding = (findingId: string) => {
    if (analysisResult) {
      const updatedFindings = analysisResult.findings.map((f) =>
        f.id === findingId
          ? { ...f, status: 'dismissed' as const, dismissReason: dismissReasonInput || 'Creator override' }
          : f
      );
      setAnalysisResult({ ...analysisResult, findings: updatedFindings });
    }
    setDismissReasonModalId(null);
    setDismissReasonInput('');
    onFindingResolved?.();
  };

  const handleDownloadGovernanceReport = () => {
    if (!analysisResult) return;
    const lines = [
      `# Pre-Publication Governance Report: ${title || 'Untitled Draft'}`,
      `- **Generated At:** ${new Date().toISOString()}`,
      `- **Channel:** ${channel}`,
      `- **Routing:** ${analysisResult.routeTo} (${analysisResult.routingReason})`,
      `- **Confidential Mode:** ${analysisResult.confidentialBlockedAI ? 'Active (Local Rules Only)' : 'Off (Hybrid AI + Rules)'}`,
      `- **DPDP Redactions Masked:** ${analysisResult.maskedItemsCount}`,
      ``,
      `## Draft Content`,
      '```',
      activeMode === 'text' ? content : (multimodalResult?.extractedText || content),
      '```',
      ``,
      `## Findings (${analysisResult.findings.length})`,
      ...analysisResult.findings.map(
        (f, i) =>
          `${i + 1}. **[${f.severity.toUpperCase()}] ${f.ruleCode} (${f.ruleName})** — Status: \`${f.status}\`\n   - Matched: \`${f.matchedText}\`\n   - Reason: ${f.reason}\n   - Suggested Fix: \`${f.suggestedFix}\` (Intent: ${f.intentVerdict || 'kept'})`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkpoint-report-${(title || 'draft').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSubmitForReview = async () => {
    if (!analysisResult) return;

    try {
      const newSub = await api.createSubmission({
        title,
        channel,
        goal,
        content: activeMode === 'text' ? content : (multimodalResult?.extractedText || content),
        findings: analysisResult.findings,
        routeTo: analysisResult.routeTo,
        routingReason: analysisResult.routingReason,
        author: currentRole === 'creator' ? 'Priya Sharma' : 'Reviewer Staff',
        authorRole: currentRole === 'creator' ? 'Marketing Executive' : 'Team Member',
        attachedFile: uploadedFile ? {
          name: uploadedFile.name,
          type: uploadedFile.type,
          size: uploadedFile.size,
          extractedTextPreview: multimodalResult?.extractedText?.slice(0, 200),
          isSlideDeck: multimodalResult?.isSlideDeck,
          pageCount: multimodalResult?.pageCount,
        } : undefined,
      });

      // Automatically dispatch a Slack notification card (Improvement 2)
      try {
        await api.dispatchSlackNotification(newSub.id);
      } catch (e) {
        console.warn('Slack auto-dispatch note:', e);
      }

      onSubmissionCreated(newSub);
      setSubmitSuccessMsg(
        `Draft successfully submitted! Routed to ${
          newSub.routeTo === 'legal_reviewer'
            ? 'Legal Counsel (Marcus Vance)'
            : 'Marketing Manager (Alex Rivera)'
        }. Interactive card dispatched to Slack.`
      );
    } catch (err) {
      console.error('Submission failed:', err);
    }
  };

  const pendingFindings = analysisResult?.findings.filter((f) => f.status === 'pending') || [];

  // Live deterministic channel & readability telemetry
  const activeChannelLimit =
    (brandKit?.channelLimits || DEFAULT_CHANNEL_LIMITS).find((c) => c.channel === channel) ||
    DEFAULT_CHANNEL_LIMITS[0];
  const liveFlesch = computeFleschReadingEase(content);
  const liveEmojis = (content.match(/\p{Extended_Pictographic}/gu) || []).length;
  const liveExcl = (content.match(/!/g) || []).length;
  const liveCapsWords = (content.match(/\b[A-Z]{4,}\b/g) || []).filter(
    (w) => !['WCAG', 'ASCI', 'CCPA', 'DPDP', 'HTML', 'JSON'].includes(w)
  ).length;
  const hasDraftEdits = Boolean(
    analysisResult && initialAnalyzedContent && activeMode === 'text' && content !== initialAnalyzedContent
  );

  // Build clickable inline highlight segments matching findings onto current draft text
  const renderHighlightedDraft = () => {
    const sourceText = activeMode === 'text' ? content : multimodalResult?.extractedText || '';
    if (!sourceText || !analysisResult) return null;
    const spans: { start: number; end: number; finding: Finding }[] = [];
    for (const f of analysisResult.findings) {
      if (f.status !== 'pending' || !f.matchedText) continue;
      let s = typeof f.start === 'number' ? f.start : -1;
      let e = typeof f.end === 'number' ? f.end : -1;
      if (s < 0 || e <= s || sourceText.slice(s, e).toLowerCase() !== f.matchedText.toLowerCase()) {
        const idx = sourceText.toLowerCase().indexOf(f.matchedText.toLowerCase());
        if (idx >= 0) {
          s = idx;
          e = idx + f.matchedText.length;
        }
      }
      if (s >= 0 && e > s) {
        const overlaps = spans.some((sp) => Math.max(sp.start, s) < Math.min(sp.end, e));
        if (!overlaps) spans.push({ start: s, end: e, finding: f });
      }
    }
    spans.sort((a, b) => a.start - b.start);

    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    for (const sp of spans) {
      if (sp.start > cursor) {
        nodes.push(<span key={`t-${cursor}`}>{sourceText.slice(cursor, sp.start)}</span>);
      }
      const sevClass =
        sp.finding.severity === 'high'
          ? 'bg-rose-100 text-rose-950 border-b-2 border-rose-500'
          : sp.finding.severity === 'medium'
          ? 'bg-amber-100 text-amber-950 border-b-2 border-amber-500'
          : 'bg-sky-100 text-sky-950 border-b-2 border-sky-500';
      nodes.push(
        <button
          type="button"
          key={`h-${sp.finding.id}`}
          onClick={() => {
            setFocusedFindingId(sp.finding.id);
            document.getElementById(`finding-card-${sp.finding.id}`)?.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            });
          }}
          className={`px-0.5 rounded-xs font-medium cursor-pointer transition-all ${sevClass} ${
            focusedFindingId === sp.finding.id ? 'ring-2 ring-teal-700' : ''
          }`}
          title={`${sp.finding.ruleCode}: ${sp.finding.issue} (Click to jump to finding)`}
        >
          {sourceText.slice(sp.start, sp.end)}
        </button>
      );
      cursor = sp.end;
    }
    if (cursor < sourceText.length) {
      nodes.push(<span key={`t-end`}>{sourceText.slice(cursor)}</span>);
    }
    return nodes;
  };

  return (
    <div className="space-y-8">
      {/* Context Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
              {isDemoMode ? (
                <>
                  <span>Demo Persona: Priya Sharma</span>
                  <span aria-hidden="true">·</span>
                  <span>Marketing Executive</span>
                </>
              ) : (
                <>
                  <span>Pre-Publication Governance</span>
                  <span aria-hidden="true">·</span>
                  <span>Copy &amp; Multimodal Poster Inspection</span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Pre-Publication Brand Check
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Inspect marketing copy, brand posters, creative banners, or PDF documents against brand consistency, visual contrast, and advertising compliance standards.
            </p>
          </div>

          {/* Quick Demo Scenarios Selector (Only visible when Demo Mode is active) */}
          {isDemoMode && (
            <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
              <span className="text-xs font-medium text-slate-500">Quick Demo Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => loadScenario('air_canada')}
                  className={`px-2.5 py-1 text-xs font-medium border rounded transition-colors cursor-pointer ${
                    activeMode === 'text' ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Sample Copy (Text)
                </button>
                <button
                  onClick={() => loadMultimodalPreset('deck')}
                  className={`px-2.5 py-1 text-xs font-medium border rounded transition-colors flex items-center gap-1 cursor-pointer ${
                    activeMode === 'multimodal' && uploadedFile?.preset === 'deck_with_claims' ? 'bg-teal-700 text-white border-teal-800' : 'bg-teal-50 text-teal-900 border-teal-200'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Sample PDF</span>
                </button>
                <button
                  onClick={() => loadMultimodalPreset('banner')}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Ad Banner.png</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mode Selector Segmented Control */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl max-w-md">
        <button
          onClick={() => {
            setActiveMode('text');
            setSubmitSuccessMsg(null);
            setAnalysisError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeMode === 'text'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-teal-800" />
          <span>Copy &amp; Text Draft</span>
        </button>

        <button
          onClick={() => {
            setActiveMode('multimodal');
            if (isDemoMode && !uploadedFile) loadMultimodalPreset('deck');
            setSubmitSuccessMsg(null);
            setAnalysisError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeMode === 'multimodal'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-teal-800" />
          <span>Poster &amp; File Upload</span>
        </button>
      </div>

      {/* Main 2-Column Grid: Left Input, Right Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input & Privacy Shield (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div>
              <label htmlFor="campaign-title-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Asset Title
              </label>
              <input
                id="campaign-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 focus:bg-white text-slate-900"
                placeholder="e.g. Summer Launch Poster"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="channel-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Channel
                </label>
                <select
                  id="channel-select"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 text-slate-800"
                >
                  <option value="social">Social Media (Instagram/X)</option>
                  <option value="ad_campaign">Paid Ad / Brand Poster</option>
                  <option value="slide_deck">Creative Document (PDF)</option>
                  <option value="email">Email Newsletter</option>
                  <option value="press_release">Press Release</option>
                  <option value="blog">Blog / Editorial Post</option>
                </select>
              </div>

              <div>
                <label htmlFor="brand-name-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Brand Name
                </label>
                <input
                  id="brand-name-input"
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Auto-detect or enter..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 focus:bg-white text-slate-800"
                />
              </div>
            </div>

            <div>
              <label htmlFor="campaign-goal-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Content Goal
              </label>
              <input
                id="campaign-goal-input"
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 text-slate-800"
                placeholder="What is this piece intended to achieve?"
              />
            </div>

            {/* Input Body: Text vs Multimodal Dropzone */}
            {activeMode === 'text' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="draft-copy-textarea" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Draft Copy
                  </label>
                  <span className="text-xs font-mono text-slate-500">
                    {content.length} characters
                  </span>
                </div>
                <textarea
                  id="draft-copy-textarea"
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3 text-sm font-sans bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 focus:bg-white text-slate-900 leading-relaxed"
                  placeholder="Paste or write your copy here..."
                />
                {/* Live Readability & Channel Limits Status Strip */}
                <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <div className={liveFlesch < activeChannelLimit.readabilityMin && content.trim().split(/\s+/).length >= 12 ? 'text-amber-800 font-bold' : 'text-slate-700'}>
                    Readability: {liveFlesch}/{activeChannelLimit.readabilityMin}+
                  </div>
                  <div className={liveEmojis > activeChannelLimit.maxEmoji ? 'text-amber-800 font-bold' : 'text-slate-700'}>
                    Emoji: {liveEmojis}/{activeChannelLimit.maxEmoji}
                  </div>
                  <div className={liveExcl > activeChannelLimit.maxExclamation ? 'text-amber-800 font-bold' : 'text-slate-700'}>
                    Excl (!): {liveExcl}/{activeChannelLimit.maxExclamation}
                  </div>
                  <div className={liveCapsWords > activeChannelLimit.maxCapsWords ? 'text-amber-800 font-bold' : 'text-slate-700'}>
                    CAPS: {liveCapsWords}/{activeChannelLimit.maxCapsWords}
                  </div>
                </div>
              </div>
            ) : (
              /* Multimodal Ingestion Dropzone */
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Upload Brand Poster, Ad Banner, or Document (PNG, JPG, WEBP, PDF)
                </label>
                
                <div className="border-2 border-dashed border-teal-300 bg-teal-50/40 rounded-xl p-5 text-center hover:bg-teal-50 transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    {uploadedFile ? uploadedFile.name : 'Upload Brand Poster, Banner, or PDF'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {uploadedFile
                      ? `${(uploadedFile.size / 1024).toFixed(1)} KB · Ready for live AI Vision inspection`
                      : 'Drag and drop files here, or click to browse'}
                  </p>
                </div>

                {uploadedFile?.base64 && uploadedFile.type.startsWith('image/') && (
                  <div className="rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center max-h-56">
                    <img
                      src={uploadedFile.base64}
                      alt={uploadedFile.name}
                      className="max-h-56 w-auto object-contain"
                    />
                  </div>
                )}

                {uploadedFile && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span className="truncate mr-2">Attached: {uploadedFile.name}</span>
                      <span className="font-mono text-[10px] bg-teal-100 text-teal-900 px-1.5 py-0.2 rounded shrink-0">
                        {uploadedFile.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Checkpoint will extract all text via OCR, inspect logo placement &amp; color contrast, and verify branding compliance.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Stage 3: Protect (Privacy & PII Redaction) */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-md ${privacyRedaction ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'}`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>Pre-AI Data Minimisation</span>
                      <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-1 rounded">
                        DPDP Act 2023
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Masks internal codenames &amp; personal PII before processing
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPrivacyRedaction(!privacyRedaction)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    privacyRedaction ? 'bg-teal-700' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle Pre-AI Data Minimisation"
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      privacyRedaction ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (activeMode === 'text' ? !content.trim() : !uploadedFile)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 text-white font-semibold text-sm rounded-lg transition-all shadow-xs cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {activeMode === 'multimodal'
                      ? 'Analyzing Uploaded File with AI Vision...'
                      : 'Analyzing Draft Content...'}
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {activeMode === 'multimodal'
                      ? 'Run Live File & Poster Inspection'
                      : 'Run Pre-Publication Check'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Analysis & Findings (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {analysisError && !isAnalyzing && (
            <div className="p-5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-700" />
                <span>Inspection Error</span>
              </div>
              <p>{analysisError}</p>
            </div>
          )}

          {!analysisResult && !isAnalyzing && !analysisError && (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                {activeMode === 'multimodal' ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                {activeMode === 'multimodal' ? 'Ready to Inspect Poster or Document' : 'Ready to Inspect Draft'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {activeMode === 'multimodal'
                  ? 'Upload a brand poster, banner, or PDF on the left and click "Run Live File & Poster Inspection" to check for visual, logo, contrast, and copy errors.'
                  : 'Enter or paste your marketing draft on the left and click "Run Pre-Publication Check" to inspect claims, facts, terminology, and compliance.'}
              </p>
              {((activeMode === 'text' && content.trim()) || (activeMode === 'multimodal' && uploadedFile)) && (
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    onClick={handleAnalyze}
                    className="px-3.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
                  >
                    Run Inspection Now
                  </button>
                </div>
              )}
            </div>
          )}

          {isAnalyzing && (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs space-y-3">
              <div className="w-10 h-10 border-3 border-teal-800/20 border-t-teal-800 rounded-full animate-spin mx-auto" />
              <div className="text-sm font-semibold text-slate-800">
                {activeMode === 'multimodal' ? 'Multimodal AI Vision & OCR Inspection...' : 'Analysing Claims & Brand Compliance...'}
              </div>
              <div className="text-xs text-slate-500 max-w-sm mx-auto">
                Inspecting uploaded content against brand governance, optical contrast, logo integrity, and regulatory guidelines.
              </div>
            </div>
          )}

          {analysisResult && !isAnalyzing && (
            <div className="space-y-4">
              {/* Multimodal Extracted Overview */}
              {multimodalResult && (
                <div className="p-4 bg-teal-50/70 border border-teal-300 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs text-teal-950 font-bold">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-teal-800" />
                      <span>
                        Inspected Asset: {multimodalResult.fileName}
                        {multimodalResult.detectedBrand ? ` (${multimodalResult.detectedBrand})` : ''}
                      </span>
                    </span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-teal-300">
                      {multimodalResult.pageCount} Page(s)
                    </span>
                  </div>

                  {multimodalResult.visualSummary && (
                    <p className="text-xs text-teal-950 leading-relaxed">
                      <strong>Visual Audit:</strong> {multimodalResult.visualSummary}
                    </p>
                  )}

                  {(multimodalResult.contrastAssessment || multimodalResult.logoAssessment) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {multimodalResult.contrastAssessment && (
                        <div className="bg-white p-2 rounded border border-teal-200">
                          <span className="font-bold text-slate-700 block">Contrast:</span>
                          <span className="text-slate-900">{multimodalResult.contrastAssessment}</span>
                        </div>
                      )}
                      {multimodalResult.logoAssessment && (
                        <div className="bg-white p-2 rounded border border-teal-200">
                          <span className="font-bold text-slate-700 block">Logo Check:</span>
                          <span className="text-slate-900">{multimodalResult.logoAssessment}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-3 bg-white text-slate-800 font-mono text-[11px] rounded-lg border border-teal-200 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {multimodalResult.extractedText}
                  </div>
                </div>
              )}

              {/* Header Banner: Risk & Routing Result */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  analysisResult.routeTo === 'legal_reviewer'
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                    : analysisResult.findings.length > 0
                    ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    {analysisResult.routeTo === 'legal_reviewer' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                    ) : analysisResult.findings.length > 0 ? (
                      <Info className="w-4 h-4 text-blue-700" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    )}
                    <span>
                      {analysisResult.routeTo === 'legal_reviewer'
                        ? 'High-Risk Routing: Brand & Legal Reviewer'
                        : analysisResult.findings.length > 0
                        ? 'Routine Routing: Marketing Manager'
                        : 'Pre-Publication Green Light: Clean'}
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-normal">
                    {analysisResult.routingReason}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 bg-white/80 rounded border border-current">
                    {analysisResult.findings.length} Flagged
                  </span>
                  {analysisResult.maskedItemsCount > 0 && (
                    <span className="px-2 py-0.5 bg-white/80 rounded border border-current text-slate-700">
                      {analysisResult.maskedItemsCount} Masked
                    </span>
                  )}
                  <button
                    onClick={handleDownloadGovernanceReport}
                    className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-800 rounded border border-slate-300 font-sans font-semibold flex items-center gap-1 cursor-pointer"
                    title="Export Pre-Publication Governance Report (.md)"
                  >
                    <Download className="w-3 h-3" />
                    <span>.md</span>
                  </button>
                </div>
              </div>

              {/* Confidential Mode Local-Only Indicator */}
              {analysisResult.confidentialBlockedAI && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Confidential Mode Active:</strong> External AI calls were blocked. Findings above were evaluated strictly locally using deterministic rules, readability, and your Fact Library.
                  </span>
                </div>
              )}

              {/* Overlapping Span Conflict Alert */}
              {conflictWarning && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center justify-between gap-2">
                  <span>{conflictWarning}</span>
                  <button
                    onClick={handleAnalyze}
                    className="px-2.5 py-1 bg-amber-800 text-white rounded font-semibold shrink-0 cursor-pointer"
                  >
                    Re-check Draft
                  </button>
                </div>
              )}

              {/* Clickable Highlighted Draft Preview & Word Diff Toggle */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Interactive Inline Highlights (Click any highlight to jump to finding)
                  </span>
                  <div className="flex items-center gap-2">
                    {hasDraftEdits && (
                      <>
                        <button
                          onClick={() => setShowWordDiff((v) => !v)}
                          className="text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded cursor-pointer"
                        >
                          {showWordDiff ? 'Show Highlights' : 'View Before / After Diff'}
                        </button>
                        <button
                          onClick={handleAnalyze}
                          className="text-[11px] font-semibold text-white bg-teal-800 hover:bg-teal-900 px-2.5 py-0.5 rounded flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Re-check Draft</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {showWordDiff && hasDraftEdits ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed">
                    {computeWordDiff(initialAnalyzedContent, content).map((tok, i) => (
                      <span
                        key={i}
                        className={
                          tok.type === 'delete'
                            ? 'bg-rose-100 text-rose-900 line-through px-0.5'
                            : tok.type === 'insert'
                            ? 'bg-emerald-100 text-emerald-900 font-semibold px-0.5'
                            : 'text-slate-800'
                        }
                      >
                        {tok.text}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                    {renderHighlightedDraft()}
                  </div>
                )}
              </div>

              {/* Findings List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Findings &amp; Grounded Explanations ({analysisResult.findings.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    {pendingFindings.length} pending resolution
                  </span>
                </div>

                {analysisResult.findings.length === 0 ? (
                  <div className="bg-white border border-emerald-200 rounded-xl p-6 text-center shadow-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <div className="text-sm font-bold text-slate-900">No Inconsistencies Found</div>
                    <p className="text-xs text-slate-600 mt-1">
                      Every claim matches the active Approved Fact Library and complies with brand policies.
                    </p>
                  </div>
                ) : (
                  analysisResult.findings.map((f) => (
                    <div
                      key={f.id}
                      id={`finding-card-${f.id}`}
                      className={`bg-white border rounded-xl p-4 shadow-xs transition-all ${
                        focusedFindingId === f.id
                          ? 'ring-2 ring-teal-700 border-teal-700'
                          : f.status === 'accepted'
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : f.status === 'dismissed'
                          ? 'border-slate-200 opacity-60 bg-slate-50'
                          : f.severity === 'high'
                          ? 'border-amber-200'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              f.severity === 'high'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {f.severity.toUpperCase()} RISK
                          </span>
                          <span className="font-semibold text-slate-900">{f.ruleCode}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-600">{f.ruleName}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {f.confidence}% confidence
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-rose-900 bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded mb-2 flex items-center justify-between">
                        <div>
                          <span>Flagged snippet: &ldquo;</span>
                          <span className="font-bold underline decoration-rose-400">{f.matchedText}</span>
                          <span>&rdquo;</span>
                        </div>
                        <span className="text-[10px] text-rose-700 font-normal ml-2 shrink-0">{f.issue}</span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed mb-3">
                        <strong className="text-slate-900">Reason:</strong> {f.reason}
                      </p>

                      {f.sourceDoc && (
                        <div className="flex items-center gap-1.5 text-xs text-teal-800 bg-teal-50/70 border border-teal-200/60 px-2.5 py-1 rounded mb-3">
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span>
                            Approved Source: <strong>{f.sourceDoc}</strong>
                            {f.sourceExpiry && (
                              <span className="ml-1 text-slate-600">
                                (Expiry: {f.sourceExpiry})
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Suggested Fix (Maintains Intent):
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              f.intentVerdict === 'lost'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : f.intentVerdict === 'review'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                            title={f.intentNote || 'Intent preservation verification'}
                          >
                            {f.intentVerdict === 'lost'
                              ? 'Intent lost'
                              : f.intentVerdict === 'review'
                              ? 'Needs review'
                              : 'Intent kept'}
                          </span>
                        </div>

                        {editingFindingId === f.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={customEditText}
                              onChange={(e) => setCustomEditText(e.target.value)}
                              className="w-full text-xs p-2 bg-white border border-teal-700 rounded focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditAndApplyFinding(f)}
                                className="px-2.5 py-1 bg-teal-800 text-white text-xs font-medium rounded hover:bg-teal-900"
                              >
                                Apply Custom Fix
                              </button>
                              <button
                                onClick={() => setEditingFindingId(null)}
                                className="px-2.5 py-1 text-slate-600 text-xs rounded hover:bg-slate-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-slate-900 mb-2.5 bg-white p-2 rounded border border-slate-200">
                            &ldquo;{f.suggestedFix}&rdquo;
                          </div>
                        )}

                        {f.status === 'pending' && editingFindingId !== f.id && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                            <button
                              onClick={() => handleAcceptFinding(f)}
                              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-md transition-colors shadow-xs"
                              title="Substitutes the fix directly into draft text"
                            >
                              <Check className="w-3 h-3" />
                              <span>Accept Fix</span>
                            </button>

                            <button
                              onClick={() => {
                                setEditingFindingId(f.id);
                                setCustomEditText(f.suggestedFix);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => setDismissReasonModalId(f.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                              title="Provide reason for dismissing; feeds the Clarity Heatmap"
                            >
                              <X className="w-3 h-3" />
                              <span>Dismiss</span>
                            </button>
                          </div>
                        )}

                        {f.status === 'accepted' && (
                          <div className="text-xs font-medium text-emerald-800 flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Fix Accepted &amp; Applied</span>
                          </div>
                        )}

                        {f.status === 'manual_edit' && (
                          <div className="text-xs font-medium text-teal-800 flex items-center gap-1 mt-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Custom Edit Applied</span>
                          </div>
                        )}

                        {f.status === 'dismissed' && (
                          <div className="text-xs text-slate-500 mt-1">
                            Dismissed by creator: &ldquo;{f.dismissReason}&rdquo; (Recorded in Clarity Heatmap)
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Submit to Approval Workflow */}
              <div className="pt-2">
                {submitSuccessMsg ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span className="font-semibold">{submitSuccessMsg}</span>
                    </div>
                    <button
                      onClick={onNavigateToQueue}
                      className="px-3 py-1.5 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 transition-colors shrink-0"
                    >
                      View in Review Queue
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmitForReview}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      Submit for {analysisResult.routeTo === 'legal_reviewer' ? 'Legal & Brand Review' : 'Manager Approval'} &amp; Dispatch to Slack
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* End-to-End Governance Workflow (7 Points) */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Governance Walkthrough: 7 Steps from Draft to Verified Hallmark
              </h2>
              <p className="text-xs text-slate-500">
                Follow each checkpoint step across roles—progress updates automatically as you interact.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {judgeProgress && (
              <span className="font-mono text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-200 px-2.5 py-1 rounded-lg">
                {Object.values(judgeProgress).filter(Boolean).length} / 7 completed
              </span>
            )}
            {!isDemoMode && onEnableDemo && (
              <button
                type="button"
                onClick={onEnableDemo}
                className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Load Demo Data
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              {
                key: 'checkedDraftOrPoster',
                label: '1. Inspect a Draft or Brand Poster',
                detail: 'Run a check in Pre-Publication Check or Visual & Logo.',
                tab: 'checker',
              },
              {
                key: 'resolvedFindingWithIntent',
                label: '2. Accept / Edit / Dismiss a Finding',
                detail: 'Apply a fix with Intent Check or record a dismissal reason.',
                tab: 'checker',
              },
              {
                key: 'submittedToQueue',
                label: '3. Submit Draft to Review Queue',
                detail: 'Route findings to Manager or Legal Reviewer.',
                tab: 'queue',
              },
              {
                key: 'approvedAndMintedHallmark',
                label: '4. Approve Draft & Mint Hallmark',
                detail: 'Approve in Review Queue or Slack Relay to write a SHA-256 Hallmark.',
                tab: 'queue',
              },
              {
                key: 'verifiedHallmarkChain',
                label: '5. Verify the Hallmark Chain',
                detail: 'Open Hallmarks and click Verify the Chain (or test tamper detection).',
                tab: 'hallmarks',
              },
              {
                key: 'inspectedClarityHeatmap',
                label: '6. Inspect Guideline Clarity Heatmap',
                detail: 'Review high-friction rules and draft/version a clarification.',
                tab: 'heatmap',
              },
              {
                key: 'checkedExpiryOrBrandKit',
                label: '7. Check Brand Kit or Expiry Inbox',
                detail: 'Configure palette ΔE2000 swatches or manage expiring facts.',
                tab: 'kit',
              },
            ] as const
          ).map((step) => {
            const done = Boolean(judgeProgress?.[step.key]);
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => onNavigateTab?.(step.tab)}
                className={`text-left p-3.5 rounded-xl border transition-colors flex flex-col justify-between gap-2 cursor-pointer ${
                  done
                    ? 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-50'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div className={`text-xs font-semibold leading-snug ${done ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>
                    {step.label}
                  </div>
                </div>
                <div className="flex items-end justify-between gap-2 pl-6">
                  <span className="text-[11px] text-slate-500 leading-relaxed">{step.detail}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Dismissal Reason Modal */}
      {dismissReasonModalId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-md w-full shadow-lg space-y-3">
            <h4 className="text-sm font-bold text-slate-900">
              Why are you dismissing this finding?
            </h4>
            <p className="text-xs text-slate-500">
              Your feedback is anonymous and directly trains the{' '}
              <strong className="text-slate-700">Guideline Clarity Heatmap</strong> to flag confusing brand rules for rewriting.
            </p>
            <div className="space-y-1.5">
              {[
                'The brand rule is unclear or contradicts recent verbal guidelines',
                'We have special executive exception / exemption',
                'The suggested alternative sounds robotic or loses marketing urgency',
                'Fact was recently audited but not yet logged in fact library',
              ].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDismissReasonInput(preset)}
                  className="w-full text-left p-2 text-xs text-slate-700 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 rounded border border-slate-200 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={dismissReasonInput}
              onChange={(e) => setDismissReasonInput(e.target.value)}
              placeholder="Or enter custom reason..."
              className="w-full p-2 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDismissReasonModalId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDismissFinding(dismissReasonModalId)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
              >
                Confirm Dismissal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
