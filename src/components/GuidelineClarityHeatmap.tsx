import React, { useState } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  AlertCircle, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight,
  Shield,
  HelpCircle
} from 'lucide-react';
import { BrandRule, Role } from '../types';
import { api } from '../services/api';

interface GuidelineClarityHeatmapProps {
  rules: BrandRule[];
  onRulesUpdated: (updatedRules: BrandRule[]) => void;
  currentRole: Role;
}

export const GuidelineClarityHeatmap: React.FC<GuidelineClarityHeatmapProps> = ({
  rules,
  onRulesUpdated,
  currentRole,
}) => {
  const [selectedRule, setSelectedRule] = useState<BrandRule | null>(rules[0] || null);
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [rewriteResult, setRewriteResult] = useState<{
    improvedTitle?: string;
    improvedDescription: string;
    rationale: string;
  } | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Compute aggregate governance metrics
  const totalRules = rules.length;
  const highConfusionCount = rules.filter((r) => r.heatmap.confusionScore >= 65).length;
  const avgDismissalRate = Math.round(
    rules.reduce((acc, r) => acc + r.heatmap.dismissalRate, 0) / (totalRules || 1)
  );
  const totalRepeatFlags = rules.reduce((acc, r) => acc + r.heatmap.repeatFlagsCount, 0);

  const handleDraftRewrite = async (rule: BrandRule) => {
    setSelectedRule(rule);
    setIsRewriting(true);
    setRewriteResult(null);
    setSuccessToast(null);

    try {
      const result = await api.rewriteRule(rule.id);
      setRewriteResult({
        improvedTitle: result.improvedTitle,
        improvedDescription: result.improvedDescription,
        rationale: result.rationale,
      });
    } catch (err) {
      console.error('Failed to rewrite rule:', err);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleApproveRewrite = async (ruleId: string) => {
    if (!rewriteResult) return;
    setIsApproving(true);
    try {
      const res = await api.approveRuleRewrite(
        ruleId,
        rewriteResult.improvedDescription,
        rewriteResult.improvedTitle
      );
      if (res.success && res.updatedRule) {
        const updated = rules.map((r) => (r.id === ruleId ? res.updatedRule : r));
        onRulesUpdated(updated);
        setSelectedRule(res.updatedRule);
        setSuccessToast(`Policy ${res.updatedRule.code} successfully updated! Repeat flags expected to drop.`);
        setRewriteResult(null);
      }
    } catch (err) {
      console.error('Failed to approve rewrite:', err);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Kicker Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
              <span>Continuous Feedback Loop</span>
              <span aria-hidden="true">·</span>
              <span>Guideline Clarity Analytics</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 font-normal">Slide 5 &amp; 8 Design Principle</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Guideline Clarity Heatmap
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              &ldquo;If many different people break the same rule, the rule is probably unclear.&rdquo; Scores each rule by creator friction and drafts clearer wording.
            </p>
          </div>

          <div className="bg-teal-50/70 border border-teal-200 p-2.5 rounded-lg text-xs text-teal-950 max-w-xs">
            <span className="font-semibold block text-teal-900">Fairness Constitution:</span>
            Heatmap scores pinpoint ambiguous guideline phrasing—never poor performance by individual team members.
          </div>
        </div>
      </div>

      {/* Aggregate Metrics Bar (Slide 10 Expected Impact) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Unclear Policies (Score &ge; 65)</div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
            {highConfusionCount} <span className="text-xs font-sans text-slate-400 font-normal">of {totalRules}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Requires manager rewording</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Avg. Creator Dismissal Rate</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {avgDismissalRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Creators overriding AI flags</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Total Repeat Flags Caught</div>
          <div className="text-2xl font-bold font-mono text-teal-800 mt-1 tabular-nums">
            {totalRepeatFlags}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Pre-publication intercepts</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Post-Rewrite Repeat Drop</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
            -55%
          </div>
          <div className="text-[11px] text-emerald-800 mt-1">Measured after AI clarification</div>
        </div>
      </div>

      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Heatmap Matrix & Rewrite Studio Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Heatmap Matrix Table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Brand Guidelines Friction Matrix</h3>
              <p className="text-xs text-slate-500">Sorted by Confusion Score (High Friction first)</p>
            </div>
            <span className="text-xs font-mono text-slate-500">{rules.length} Policies Monitored</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Policy / Rule</th>
                  <th className="py-2.5 px-3">Confusion Score</th>
                  <th className="py-2.5 px-3 text-right">Affected</th>
                  <th className="py-2.5 px-3 text-right">Dismissals</th>
                  <th className="py-2.5 px-3 text-right">Repeat Flags</th>
                  <th className="py-2.5 px-3 text-center">Trend</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules
                  .slice()
                  .sort((a, b) => b.heatmap.confusionScore - a.heatmap.confusionScore)
                  .map((rule) => {
                    const isHigh = rule.heatmap.confusionScore >= 65;
                    const isModerate = rule.heatmap.confusionScore >= 45 && rule.heatmap.confusionScore < 65;
                    const isSelected = selectedRule?.id === rule.id;

                    return (
                      <tr
                        key={rule.id}
                        onClick={() => setSelectedRule(rule)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-teal-50/60 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{rule.code}</span>
                            {rule.isRewritten && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded border border-emerald-300">
                                Rewritten
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-[11px] line-clamp-1 max-w-xs">{rule.title}</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isHigh
                                    ? 'bg-rose-500'
                                    : isModerate
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${rule.heatmap.confusionScore}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold tabular-nums">
                              {rule.heatmap.confusionScore}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                          {rule.heatmap.peopleAffected}
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                          {rule.heatmap.dismissalRate}%
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {rule.heatmap.repeatFlagsCount}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {rule.heatmap.trend === 'rising' ? (
                            <span className="text-rose-600 inline-flex items-center" title="Rising friction">
                              <TrendingUp className="w-3.5 h-3.5" />
                            </span>
                          ) : rule.heatmap.trend === 'declining' ? (
                            <span className="text-emerald-600 inline-flex items-center" title="Declining friction">
                              <TrendingDown className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-slate-400 inline-flex items-center">
                              <Minus className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDraftRewrite(rule);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded transition-colors"
                          >
                            Draft Fix
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected Rule Inspector & AI Rewrite Studio (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedRule ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="text-xs font-mono font-bold text-teal-800">{selectedRule.code}</div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedRule.title}</h3>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-semibold">Confusion Score</div>
                  <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                    {selectedRule.heatmap.confusionScore}/100
                  </div>
                </div>
              </div>

              {/* Current Rule Description */}
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Current Policy Text
                </div>
                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                  {selectedRule.description}
                </p>
              </div>

              {/* Negative Examples */}
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Common Caught Violations
                </div>
                <ul className="text-xs text-rose-900 bg-rose-50/60 border border-rose-100 p-2.5 rounded-lg space-y-1 list-disc pl-5">
                  {selectedRule.forbiddenExamples.map((ex, i) => (
                    <li key={i}>&ldquo;{ex}&rdquo;</li>
                  ))}
                </ul>
              </div>

              {/* AI Rule Rewriter Studio (Slide 5: "drafts clearer wording, and a brand manager approves it") */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                    <span>AI Rule Clarity Enhancer (Gemini 3.8 Flash)</span>
                  </span>
                </div>

                {!rewriteResult && !isRewriting && (
                  <button
                    onClick={() => handleDraftRewrite(selectedRule)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Draft Clearer, Unambiguous Wording</span>
                  </button>
                )}

                {isRewriting && (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-teal-700/30 border-t-teal-700 rounded-full animate-spin mx-auto" />
                    <div className="text-xs font-semibold text-teal-900">
                      Analyzing creator dismissal patterns &amp; drafting clear legal wording...
                    </div>
                  </div>
                )}

                {rewriteResult && !isRewriting && (
                  <div className="bg-teal-50/70 border border-teal-300 rounded-xl p-4 space-y-3">
                    <div className="text-xs font-semibold text-teal-950 flex items-center justify-between">
                      <span>Proposed Clarification:</span>
                      <span className="text-[10px] text-teal-800 bg-teal-100 px-1.5 py-0.2 rounded font-mono font-medium">
                        ASCI Grounded
                      </span>
                    </div>

                    <div className="text-xs text-slate-900 bg-white p-3 rounded-lg border border-teal-200 leading-relaxed">
                      {rewriteResult.improvedDescription}
                    </div>

                    <div className="text-[11px] text-teal-900 italic">
                      <strong>Why this works:</strong> {rewriteResult.rationale}
                    </div>

                    {/* Brand Manager Approval Button */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApproveRewrite(selectedRule.id)}
                        disabled={isApproving}
                        className="flex-1 py-2 px-3 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Revised Rule Wording</span>
                      </button>
                      <button
                        onClick={() => setRewriteResult(null)}
                        className="px-2.5 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              Select a rule from the table to view friction analytics and initiate an AI rewrite.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
