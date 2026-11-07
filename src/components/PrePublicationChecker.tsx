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
  Edit2
} from 'lucide-react';
import { Finding, Role, ContentSubmission } from '../types';
import { api, AnalysisResponse } from '../services/api';

interface PrePublicationCheckerProps {
  currentRole: Role;
  onSubmissionCreated: (sub: ContentSubmission) => void;
  onNavigateToQueue: () => void;
  isDemoMode: boolean;
}

export const PrePublicationChecker: React.FC<PrePublicationCheckerProps> = ({
  currentRole,
  onSubmissionCreated,
  onNavigateToQueue,
  isDemoMode,
}) => {
  const [channel, setChannel] = useState<'social' | 'email' | 'ad_campaign' | 'press_release' | 'blog'>('social');
  const [goal, setGoal] = useState<string>('Boost weekend lunch orders among urban working professionals on Instagram & LinkedIn.');
  const [title, setTitle] = useState<string>('QuickBite Weekend Flash Campaign');
  const [content, setContent] = useState<string>(
    'QuickBite is the #1 fastest delivery app in the country! Our users love our 100% guaranteed 10-minute delivery and get 50% off with code SUMMER2024. Secret launch: Project Cheetah rolling out to 15,000 customers. Order now from the best delivery platform!'
  );
  const [privacyRedaction, setPrivacyRedaction] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [customEditText, setCustomEditText] = useState<string>('');
  const [dismissReasonModalId, setDismissReasonModalId] = useState<string | null>(null);
  const [dismissReasonInput, setDismissReasonInput] = useState<string>('');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // Quick Demo Scenarios
  const loadScenario = (type: 'air_canada' | 'clean_fact' | 'guarantee') => {
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

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setSubmitSuccessMsg(null);
    try {
      const result = await api.analyzeDraft(content, channel, goal, privacyRedaction);
      setAnalysisResult(result);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptFinding = (finding: Finding) => {
    // Replace matchedText in content with suggestedFix
    const updatedContent = content.replace(finding.matchedText, finding.suggestedFix);
    setContent(updatedContent);

    // Update finding status
    if (analysisResult) {
      const updatedFindings = analysisResult.findings.map((f) =>
        f.id === finding.id ? { ...f, status: 'accepted' as const } : f
      );
      setAnalysisResult({ ...analysisResult, findings: updatedFindings });
    }
  };

  const handleEditAndApplyFinding = (finding: Finding) => {
    if (!customEditText) return;
    const updatedContent = content.replace(finding.matchedText, customEditText);
    setContent(updatedContent);

    if (analysisResult) {
      const updatedFindings = analysisResult.findings.map((f) =>
        f.id === finding.id
          ? { ...f, status: 'manual_edit' as const, suggestedFix: customEditText }
          : f
      );
      setAnalysisResult({ ...analysisResult, findings: updatedFindings });
    }
    setEditingFindingId(null);
    setCustomEditText('');
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
  };

  const handleSubmitForReview = async () => {
    if (!analysisResult) return;

    try {
      const newSub = await api.createSubmission({
        title,
        channel,
        goal,
        content,
        findings: analysisResult.findings,
        routeTo: analysisResult.routeTo,
        routingReason: analysisResult.routingReason,
        author: currentRole === 'creator' ? 'Priya Sharma' : 'Reviewer Staff',
        authorRole: currentRole === 'creator' ? 'Marketing Executive' : 'Team Member',
      });

      onSubmissionCreated(newSub);
      setSubmitSuccessMsg(
        `Draft successfully submitted! Routed to ${
          newSub.routeTo === 'legal_reviewer'
            ? 'Legal Counsel (Marcus Vance)'
            : 'Marketing Manager (Alex Rivera)'
        }.`
      );
    } catch (err) {
      console.error('Submission failed:', err);
    }
  };

  const pendingFindings = analysisResult?.findings.filter((f) => f.status === 'pending') || [];
  const highRiskFindings = analysisResult?.findings.filter((f) => f.severity === 'high') || [];

  return (
    <div className="space-y-8">
      {/* Persona & Context Kicker */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
              <span>Persona: Priya Sharma</span>
              <span aria-hidden="true">·</span>
              <span>Marketing Executive</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 font-normal">Writes 3–4 daily posts using AI drafts</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Pre-Publication Brand Check
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Instant grounded verification stopping unsupported claims, outdated facts, and terminology violations before public release.
            </p>
          </div>

          {/* Quick Demo Scenarios Selector */}
          {isDemoMode && (
            <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
              <span className="text-xs font-medium text-slate-500">National Hackathon Scenarios:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => loadScenario('air_canada')}
                  className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                  title="Loads Slide 6 Illustrative Example: Unsupported #1 claim + Expired SUMMER2024 code"
                >
                  Scenario A: Priya&apos;s Draft (High Risk)
                </button>
                <button
                  onClick={() => loadScenario('clean_fact')}
                  className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                  title="Loads fully compliant draft citing approved facts"
                >
                  Scenario B: Approved Facts (Clean)
                </button>
                <button
                  onClick={() => loadScenario('guarantee')}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded hover:bg-slate-200 transition-colors"
                >
                  Scenario C: Absolute Guarantee
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Column Grid: Left Input, Right Grounded Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input & Privacy Shield (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div>
              <label htmlFor="campaign-title-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Campaign / Content Title
              </label>
              <input
                id="campaign-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 focus:bg-white text-slate-900"
                placeholder="e.g. Weekend Flash Delivery Promo"
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
                  <option value="email">Email Newsletter</option>
                  <option value="ad_campaign">Paid Ad Campaign</option>
                  <option value="press_release">Press Release</option>
                  <option value="blog">Blog / Editorial Post</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Synthetic Brand
                </label>
                <div className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg truncate">
                  QuickBite Express (Fictional)
                </div>
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

            <div>
              <div className="flex items-center justify-between mb-1">
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
            </div>

            {/* Stage 3: Protect (Privacy & PII Redaction) - Slide 6 & 8 */}
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
                      Masks codenames (&ldquo;Project Cheetah&rdquo;) &amp; PII before AI processing
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
              disabled={isAnalyzing || !content.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 text-white font-semibold text-sm rounded-lg transition-all shadow-xs cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Checking against Approved Facts...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Run Pre-Publication Check</span>
                </>
              )}
            </button>
          </div>

          {/* Legal Precedent & Evidence Card (Slide 2 & 10) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-teal-700" />
              <span>Grounded Legal & Regulatory Framework</span>
            </div>
            <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
              <li>
                <strong className="text-slate-800">Moffatt v. Air Canada (2024):</strong> Companies are strictly liable for inaccurate public representations made by internal or AI staff.
              </li>
              <li>
                <strong className="text-slate-800">ASCI Annual Report 2025-26:</strong> 9,841 ads scrutinized; 98% required modifications due to unsupported claims.
              </li>
              <li>
                <strong className="text-slate-800">CCPA Guidelines (2022):</strong> Absolute claims (&ldquo;100% guarantee&rdquo;) require audit proof.
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Analysis & Findings (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {!analysisResult && !isAnalyzing && (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">Ready to Inspect Draft</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Click &ldquo;Run Pre-Publication Check&rdquo; to test copy against the QuickBite Approved Fact Library, Claims Policies (3.2 &amp; 1.1), and Terminology rules.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={handleAnalyze}
                  className="px-3.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                >
                  Analyze Current Draft
                </button>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs space-y-3">
              <div className="w-10 h-10 border-3 border-teal-800/20 border-t-teal-800 rounded-full animate-spin mx-auto" />
              <div className="text-sm font-semibold text-slate-800">Stage 4: Analysing Grounded Claims...</div>
              <div className="text-xs text-slate-500 max-w-sm mx-auto">
                Comparing draft assertions against 6 approved facts, active promo expiry dates, and regulatory guidelines.
              </div>
            </div>
          )}

          {analysisResult && !isAnalyzing && (
            <div className="space-y-4">
              {/* Header Banner: Risk & Routing Result (Slide 6 Stage 6) */}
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
                </div>
              </div>

              {/* Masking Transparency Banner (Slide 8: Explainability & Transparency) */}
              {analysisResult.maskedTerms.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-teal-700" />
                    <span>
                      Confidential terms masked prior to evaluation:{' '}
                      <strong className="text-slate-900">
                        {analysisResult.maskedTerms.map((m) => m.term).join(', ')}
                      </strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-800 font-medium">DPDP Compliant</span>
                </div>
              )}

              {/* Findings List (The Explain & Decide Stage - Slide 6 Stage 5) */}
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
                      className={`bg-white border rounded-xl p-4 shadow-xs transition-all ${
                        f.status === 'accepted'
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : f.status === 'dismissed'
                          ? 'border-slate-200 opacity-60 bg-slate-50'
                          : f.severity === 'high'
                          ? 'border-amber-200'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Top line: Rule & Severity */}
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

                      {/* Issue & Matched Text */}
                      <div className="text-xs font-semibold text-rose-900 bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded mb-2 flex items-center justify-between">
                        <div>
                          <span>Flagged snippet: &ldquo;</span>
                          <span className="font-bold underline decoration-rose-400">{f.matchedText}</span>
                          <span>&rdquo;</span>
                        </div>
                        <span className="text-[10px] text-rose-700 font-normal ml-2 shrink-0">{f.issue}</span>
                      </div>

                      {/* Reason & Grounded Legal Precedent */}
                      <p className="text-xs text-slate-700 leading-relaxed mb-3">
                        <strong className="text-slate-900">Reason:</strong> {f.reason}
                      </p>

                      {/* Source Citation (Slide 8: Explainability - Every finding cites rule or source) */}
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

                      {/* Suggestion Box & Actions */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Suggested Fix (Maintains Intent):
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

                        {/* Interactive Buttons (Accept / Edit / Dismiss) */}
                        {f.status === 'pending' && editingFindingId !== f.id && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                            <button
                              onClick={() => handleAcceptFinding(f)}
                              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-md transition-colors shadow-xs"
                              title="Substitutes the fix directly into your draft text"
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
                            <span>Fix Accepted &amp; Applied to Copy</span>
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

              {/* Submit to Approval Workflow Button (Slide 6 Stage 6 & 7) */}
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
                      Submit for {analysisResult.routeTo === 'legal_reviewer' ? 'Legal & Brand Review' : 'Manager Approval'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dismissal Reason Modal (feeds Heatmap dismissalRate metrics) */}
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
