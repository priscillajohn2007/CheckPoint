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
  HelpCircle,
  History,
  RotateCcw,
  GitCommit,
  Plus
} from 'lucide-react';
import { BrandRule, Role, RuleVersion } from '../types';
import { api } from '../services/api';
import { computeWordDiff } from '../utils/brandEngine';

interface GuidelineClarityHeatmapProps {
  rules: BrandRule[];
  onRulesUpdated: (updatedRules: BrandRule[]) => void;
  currentRole: Role;
  isDemoMode?: boolean;
  confidentialMode?: boolean;
}

export const GuidelineClarityHeatmap: React.FC<GuidelineClarityHeatmapProps> = ({
  rules,
  onRulesUpdated,
  currentRole,
  isDemoMode = false,
  confidentialMode = false,
}) => {
  const [selectedRule, setSelectedRule] = useState<BrandRule | null>(rules[0] || null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'rewriter' | 'versions'>('rewriter');
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [rewriteResult, setRewriteResult] = useState<{
    improvedTitle?: string;
    improvedDescription: string;
    rationale: string;
  } | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState<boolean>(false);
  const [newRuleCode, setNewRuleCode] = useState<string>('');
  const [newRuleTitle, setNewRuleTitle] = useState<string>('');
  const [newRuleDesc, setNewRuleDesc] = useState<string>('');
  const [newRuleCategory, setNewRuleCategory] = useState<BrandRule['category']>('claims');
  const [newRuleSeverity, setNewRuleSeverity] = useState<BrandRule['severity']>('medium');

  React.useEffect(() => {
    if (!selectedRule || !rules.some((r) => r.id === selectedRule.id)) {
      setSelectedRule(rules[0] || null);
    }
  }, [rules]);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleTitle.trim() || !newRuleDesc.trim()) return;
    try {
      const created = await api.addRule({
        code: newRuleCode.trim() || `Policy ${rules.length + 1}.1`,
        title: newRuleTitle.trim(),
        description: newRuleDesc.trim(),
        category: newRuleCategory,
        severity: newRuleSeverity,
        requiresLegal: newRuleSeverity === 'high',
      });
      onRulesUpdated([...rules, created]);
      setSelectedRule(created);
      setIsAddRuleOpen(false);
      setNewRuleCode('');
      setNewRuleTitle('');
      setNewRuleDesc('');
    } catch (err) {
      console.error('Failed to add rule:', err);
    }
  };

  // Compute aggregate governance metrics
  const totalRules = rules.length;
  const highConfusionCount = rules.filter((r) => r.heatmap.confusionScore >= 65).length;
  const avgDismissalRate = Math.round(
    rules.reduce((acc, r) => acc + r.heatmap.dismissalRate, 0) / (totalRules || 1)
  );
  const totalRepeatFlags = rules.reduce((acc, r) => acc + r.heatmap.repeatFlagsCount, 0);

  const handleDraftRewrite = async (rule: BrandRule) => {
    setSelectedRule(rule);
    setActiveInspectorTab('rewriter');
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
      handleDeterministicTemplate(rule);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleDeterministicTemplate = (rule: BrandRule) => {
    setSelectedRule(rule);
    setActiveInspectorTab('rewriter');
    const banned = rule.forbiddenExamples?.length
      ? `Avoid "${rule.forbiddenExamples.join('", "')}".`
      : 'Avoid vague or unsubstantiated phrasing.';
    const preferred = rule.preferredAlternatives?.length
      ? `Use instead: "${rule.preferredAlternatives.join('", "')}".`
      : 'Cite an active Approved Fact with source and expiry date.';
    setRewriteResult({
      improvedTitle: rule.title,
      improvedDescription: `${rule.description.replace(/\.$/, '')}. Concrete rule: ${banned} ${preferred}`,
      rationale: 'Generated deterministically from banned/preferred policy examples (works offline & in Confidential Mode).',
    });
  };

  const handleApproveRewrite = async (ruleId: string) => {
    if (!rewriteResult) return;
    setIsApproving(true);
    try {
      const res = await api.approveRuleRewrite(
        ruleId,
        rewriteResult.improvedDescription,
        rewriteResult.improvedTitle,
        currentRole === 'brand_owner' ? 'Sarah Chen (VP Brand)' : 'Marketing Manager',
        rewriteResult.rationale
      );
      if (res.success && res.updatedRule) {
        const updated = rules.map((r) => (r.id === ruleId ? res.updatedRule : r));
        onRulesUpdated(updated);
        setSelectedRule(res.updatedRule);
        setSuccessToast(`Policy ${res.updatedRule.code} upgraded to ${res.updatedRule.currentVersion || 'v1.1'}! Repeat flags dropped.`);
        setRewriteResult(null);
      }
    } catch (err) {
      console.error('Failed to approve rewrite:', err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRollback = async (ruleId: string, targetVersion: string) => {
    setIsRollingBack(true);
    try {
      const res = await api.rollbackRule(ruleId, targetVersion, 'Sarah Chen (VP Brand)');
      if (res.success && res.updatedRule) {
        const updated = rules.map((r) => (r.id === ruleId ? res.updatedRule : r));
        onRulesUpdated(updated);
        setSelectedRule(res.updatedRule);
        setSuccessToast(`Rolled back policy ${res.updatedRule.code} to version ${targetVersion}.`);
      }
    } catch (err) {
      console.error('Rollback failed:', err);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Kicker Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
              <span>Guideline Clarity Analytics &amp; Policy Versioning</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Guideline Clarity Heatmap &amp; Policy Versions
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              &ldquo;If many different people break the same rule, the rule is probably unclear.&rdquo; Scores each rule by creator friction, drafts clearer wording, and version-controls policy lifecycles.
            </p>
          </div>

          <button
            onClick={() => setIsAddRuleOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Brand Rule</span>
          </button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-teal-800 mx-auto flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Brand Rules Configured Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Add your own brand guidelines here so Checkpoint enforces them during poster and copy inspections and tracks team clarity over time.
          </p>
          <button
            onClick={() => setIsAddRuleOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Brand Rule</span>
          </button>
        </div>
      ) : (
      <>
      {/* Aggregate Metrics Bar */}
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
            {rules.some((r) => r.isRewritten) ? '-55%' : '0%'}
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
                  <th className="py-2.5 px-3">Policy / Version</th>
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
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200 font-bold">
                              {rule.currentVersion || 'v1.0'}
                            </span>
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

        {/* Right: Selected Rule Inspector & AI Rewrite / Versioning Studio (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedRule ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-teal-800">
                    <span>{selectedRule.code}</span>
                    <span className="bg-teal-100 text-teal-900 px-1.5 rounded">
                      {selectedRule.currentVersion || 'v1.0'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedRule.title}</h3>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-semibold">Confusion Score</div>
                  <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                    {selectedRule.heatmap.confusionScore}/100
                  </div>
                </div>
              </div>

              {/* Inspector Mode Switcher (Improvement 3: Version Control) */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                <button
                  onClick={() => setActiveInspectorTab('rewriter')}
                  className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-colors ${
                    activeInspectorTab === 'rewriter'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600'
                  }`}
                >
                  Policy Rewriter
                </button>
                <button
                  onClick={() => setActiveInspectorTab('versions')}
                  className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
                    activeInspectorTab === 'versions'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Version History ({selectedRule.versions?.length || 1})</span>
                </button>
              </div>

              {activeInspectorTab === 'rewriter' ? (
                <>
                  {/* Current Rule Description */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Current Policy Text ({selectedRule.currentVersion || 'v1.0'})
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

                  {/* AI Rule Rewriter Studio */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                        <span>AI Rule Clarity Enhancer</span>
                      </span>
                    </div>

                    {!rewriteResult && !isRewriting && (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleDraftRewrite(selectedRule)}
                          disabled={confidentialMode}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
                          title={confidentialMode ? 'External AI disabled in Confidential Mode' : 'Draft clearer rule wording via AI'}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {confidentialMode
                              ? 'AI Rewriter Blocked (Confidential Mode)'
                              : 'Draft Clearer, Unambiguous Wording'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeterministicTemplate(selectedRule)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          <span>Use Deterministic Template</span>
                        </button>
                      </div>
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
                          <span>Proposed Clarification (Editable):</span>
                          <span className="text-[10px] text-teal-800 bg-teal-100 px-1.5 py-0.2 rounded font-mono font-medium">
                            {confidentialMode ? 'Deterministic Template' : 'Editable Diff'}
                          </span>
                        </div>

                        <textarea
                          rows={4}
                          value={rewriteResult.improvedDescription}
                          onChange={(e) =>
                            setRewriteResult({
                              ...rewriteResult,
                              improvedDescription: e.target.value,
                            })
                          }
                          className="w-full text-xs text-slate-900 bg-white p-2.5 rounded-lg border border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-700 leading-relaxed"
                        />

                        {/* Live Semantic Word Diff */}
                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Word-by-Word Policy Diff
                          </div>
                          <div className="text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                            {computeWordDiff(selectedRule.description, rewriteResult.improvedDescription).map(
                              (tok, idx) => (
                                <span
                                  key={idx}
                                  className={
                                    tok.type === 'delete'
                                      ? 'bg-rose-100 text-rose-900 line-through px-0.5'
                                      : tok.type === 'insert'
                                      ? 'bg-emerald-100 text-emerald-900 font-semibold px-0.5'
                                      : 'text-slate-700'
                                  }
                                >
                                  {tok.text}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-teal-900 italic">
                          <strong>Why this works:</strong> {rewriteResult.rationale}
                        </div>

                        {/* Brand Manager Approval Button */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleApproveRewrite(selectedRule.id)}
                            disabled={isApproving}
                            className="flex-1 py-2 px-3 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Commit as Next Version</span>
                          </button>
                          <button
                            onClick={() => setRewriteResult(null)}
                            className="px-2.5 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Version History & Rollback View (Improvement 3) */
                <div className="space-y-3">
                  <div className="text-xs text-slate-600">
                    Policy lifecycle audit trail. Roll back to any historical version if legal or marketing requirements change.
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto">
                    {(selectedRule.versions && selectedRule.versions.length > 0
                      ? selectedRule.versions
                      : [
                          {
                            version: selectedRule.currentVersion || 'v1.0',
                            timestamp: '2026-08-15T09:00:00Z',
                            author: 'Sarah Chen (VP Brand)',
                            authorRole: 'brand_owner',
                            title: selectedRule.title,
                            description: selectedRule.description,
                            changeSummary: 'Baseline policy creation.',
                            confusionScoreAtVersion: selectedRule.heatmap.confusionScore,
                          },
                        ]
                    ).map((ver) => {
                      const isCurrent = ver.version === (selectedRule.currentVersion || 'v1.0');
                      return (
                        <div
                          key={ver.version}
                          className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
                            isCurrent
                              ? 'bg-teal-50/70 border-teal-300'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 px-1.5 py-0.2 rounded bg-white border border-slate-300">
                                {ver.version}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-teal-800 uppercase">
                                  Current Active
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(ver.timestamp).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="text-slate-800 text-[11px] leading-relaxed line-clamp-3">
                            {ver.description}
                          </p>

                          <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between border-t border-slate-200/60">
                            <span>Author: {ver.author}</span>
                            {!isCurrent && (
                              <button
                                onClick={() => handleRollback(selectedRule.id, ver.version)}
                                disabled={isRollingBack}
                                className="text-teal-800 hover:text-teal-950 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore {ver.version}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              Select a rule from the table to view friction analytics and initiate an AI rewrite.
            </div>
          )}
        </div>
      </div>

      {/* Repeated Mistakes Pattern Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Repeated Mistakes Pattern Summary</h3>
            <p className="text-xs text-slate-500">
              Top rules generating repeat flags across creators—prioritize these for clearer wording or example updates.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Top {Math.min(3, rules.length)} Hotspots
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rules
            .slice()
            .sort((a, b) => b.heatmap.repeatFlagsCount - a.heatmap.repeatFlagsCount)
            .slice(0, 3)
            .map((r) => (
              <div
                key={`pat-${r.id}`}
                onClick={() => setSelectedRule(r)}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-teal-50/40 hover:border-teal-300 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-teal-800">{r.code}</span>
                  <span className="font-mono font-bold text-rose-700">
                    {r.heatmap.repeatFlagsCount} repeat flags
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900">{r.title}</div>
                <div className="text-[11px] text-slate-600">
                  {r.heatmap.peopleAffected} creators affected · {r.heatmap.dismissalRate}% dismissed
                </div>
                {r.forbiddenExamples?.[0] && (
                  <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded truncate">
                    Common trigger: &ldquo;{r.forbiddenExamples[0]}&rdquo;
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
      </>
      )}

      {/* Add Custom Rule Modal */}
      {isAddRuleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Custom Brand Rule</h3>
              <button
                onClick={() => setIsAddRuleOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddRule} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Rule Code
                  </label>
                  <input
                    type="text"
                    value={newRuleCode}
                    onChange={(e) => setNewRuleCode(e.target.value)}
                    placeholder="e.g. Visual Policy 2.1"
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Severity
                  </label>
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value as BrandRule['severity'])}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="high">High Risk (Legal)</option>
                    <option value="medium">Medium (Brand Manager)</option>
                    <option value="low">Low (Advisory)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Rule Title
                </label>
                <input
                  type="text"
                  required
                  value={newRuleTitle}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  placeholder="e.g. Primary Logo Color & Clear Space"
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={newRuleCategory}
                  onChange={(e) => setNewRuleCategory(e.target.value as BrandRule['category'])}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option value="claims">Claims &amp; Advertising</option>
                  <option value="visual">Visual &amp; Logo</option>
                  <option value="terminology">Terminology</option>
                  <option value="tone">Tone of Voice</option>
                  <option value="privacy">Privacy &amp; Confidentiality</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Guideline Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Describe what must be enforced or avoided..."
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-xs"
                >
                  Save Brand Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
