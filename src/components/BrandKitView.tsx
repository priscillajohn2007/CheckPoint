import React, { useState, useEffect } from 'react';
import {
  Palette,
  BookOpen,
  Lock,
  Download,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Check,
  X,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  BrandKitConfig,
  BrandRule,
  ImportedRuleDraft,
  PaletteColor,
  Role,
} from '../types';
import { api } from '../services/api';
import { deltaE2000, findClosestPaletteMatch } from '../utils/brandEngine';

interface BrandKitViewProps {
  brandKit: BrandKitConfig;
  onBrandKitUpdated: (next: BrandKitConfig) => void;
  onRulesUpdated: (rules: BrandRule[]) => void;
  onWorkspaceImported: () => Promise<void>;
  currentRole: Role;
  isDemoMode?: boolean;
}

export const BrandKitView: React.FC<BrandKitViewProps> = ({
  brandKit,
  onBrandKitUpdated,
  onRulesUpdated,
  onWorkspaceImported,
  currentRole,
  isDemoMode = false,
}) => {
  const [subTab, setSubTab] = useState<'palette' | 'channels' | 'importer' | 'backup'>('palette');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#0F766E');
  const [newColorRole, setNewColorRole] = useState('Primary accent');
  const [testHex, setTestHex] = useState('#EC4899');
  const [statusMsg, setStatusMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  // Brand Book Importer state
  const [bookFileName, setBookFileName] = useState('Brand_Guidelines.txt');
  const [bookText, setBookText] = useState('');
  const [importedDrafts, setImportedDrafts] = useState<ImportedRuleDraft[]>([]);
  const [isImportingBook, setIsImportingBook] = useState(false);

  const canAdminEdit = currentRole === 'admin' || currentRole === 'brand_owner';

  useEffect(() => {
    api.getImportedRules().then(setImportedDrafts).catch(() => {});
  }, [isDemoMode]);

  const saveKit = async (patch: Partial<BrandKitConfig>, successText?: string) => {
    setStatusMsg(null);
    try {
      const updated = await api.updateBrandKit(patch);
      onBrandKitUpdated(updated);
      if (successText) setStatusMsg({ tone: 'ok', text: successText });
    } catch (err) {
      setStatusMsg({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Failed to update Brand Kit.',
      });
    }
  };

  const handleAddSwatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColorName.trim() || !/^#[0-9a-fA-F]{3,6}$/.test(newColorHex.trim())) {
      setStatusMsg({ tone: 'err', text: 'Enter a swatch name and a valid hex code (e.g. #0F766E).' });
      return;
    }
    const swatch: PaletteColor = {
      id: `pal-${Date.now()}`,
      name: newColorName.trim(),
      hex: newColorHex.trim().toUpperCase(),
      role: newColorRole.trim() || 'Brand accent',
    };
    await saveKit({ palette: [...brandKit.palette, swatch] }, `Added "${swatch.name}" to brand palette.`);
    setNewColorName('');
  };

  const handleRemoveSwatch = async (id: string) => {
    await saveKit(
      { palette: brandKit.palette.filter((p) => p.id !== id) },
      'Removed palette swatch.'
    );
  };

  const handleChannelLimitChange = (
    idx: number,
    field: 'maxEmoji' | 'maxExclamation' | 'maxCapsWords' | 'readabilityMin',
    val: number
  ) => {
    const next = brandKit.channelLimits.map((c, i) =>
      i === idx ? { ...c, [field]: Math.max(0, Number.isNaN(val) ? 0 : val) } : c
    );
    onBrandKitUpdated({ ...brandKit, channelLimits: next });
  };

  const handleUploadBrandBookFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBookFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setBookText(text);
    };
    reader.readAsText(file);
  };

  const handleParseBrandBook = async () => {
    if (!bookText.trim()) {
      setStatusMsg({ tone: 'err', text: 'Upload a .txt/.md brand book or paste guidelines text first.' });
      return;
    }
    setIsImportingBook(true);
    setStatusMsg(null);
    try {
      const drafts = await api.importBrandBook(bookText, bookFileName || 'Brand_Book.txt');
      setImportedDrafts((prev) => [...drafts, ...prev]);
      setStatusMsg({
        tone: 'ok',
        text: `Extracted ${drafts.length} draft rule(s) into the staging approval queue below.`,
      });
    } catch (err) {
      setStatusMsg({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Failed to parse brand book.',
      });
    } finally {
      setIsImportingBook(false);
    }
  };

  const handleDecideImported = async (id: string, decision: 'approve' | 'reject') => {
    try {
      const res = await api.decideImportedRule(id, decision);
      setImportedDrafts((prev) => prev.map((d) => (d.id === id ? res.item : d)));
      if (decision === 'approve') {
        const freshRules = await api.getRules();
        onRulesUpdated(freshRules);
        setStatusMsg({ tone: 'ok', text: `Approved ${res.item.code} into active Rulebook.` });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerJsonDownload = (data: unknown, fileName: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportWorkspace = async () => {
    try {
      const data = await api.exportWorkspace();
      triggerJsonDownload(data, `checkpoint-workspace-${new Date().toISOString().slice(0, 10)}.json`);
      setStatusMsg({ tone: 'ok', text: 'Workspace exported as JSON.' });
    } catch (err) {
      setStatusMsg({ tone: 'err', text: 'Could not export workspace.' });
    }
  };

  const handleImportWorkspaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        // Auto-backup current workspace before replacing
        const currentBackup = await api.exportWorkspace();
        triggerJsonDownload(
          currentBackup,
          `checkpoint-backup-before-import-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`
        );
        const res = await api.importWorkspace(parsed);
        await onWorkspaceImported();
        setStatusMsg({
          tone: 'ok',
          text: `Imported workspace (${res.counts.facts} facts, ${res.counts.rules} rules, ${res.counts.submissions} drafts, ${res.counts.hallmarks} hallmarks). A pre-import backup was saved.`,
        });
      } catch (err) {
        setStatusMsg({
          tone: 'err',
          text: err instanceof Error ? err.message : 'Invalid workspace JSON file.',
        });
      }
    };
    reader.readAsText(file);
  };

  const closestTestMatch = findClosestPaletteMatch(testHex, brandKit.palette);
  const pendingImports = importedDrafts.filter((d) => d.status === 'pending');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
              <span>Brand Identity, Palette &amp; Governance Settings</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Brand Kit &amp; Rulebook Controls
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Configure your approved color palette (checked via ΔE2000), per-channel limits, brand book rule imports, strict Confidential Mode, and workspace backups.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs self-start lg:self-auto">
            {[
              { id: 'palette', label: 'Palette & Logo', icon: Palette },
              { id: 'channels', label: 'Channel Limits', icon: Sliders },
              { id: 'importer', label: `Import Book (${pendingImports.length})`, icon: BookOpen },
              { id: 'backup', label: 'Privacy & Backup', icon: Lock },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id as typeof subTab)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    subTab === t.id ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-teal-800" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            statusMsg.tone === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {statusMsg.tone === 'ok' ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <AlertTriangle className="w-4 h-4 text-rose-700" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="font-bold px-1">&times;</button>
        </div>
      )}

      {/* Subtab 1: Palette & Logo Specs */}
      {subTab === 'palette' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Palette Editor (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Approved Brand Palette</h3>
                <p className="text-xs text-slate-500">
                  Uploaded posters are measured against these swatches using CIEDE2000 (limit ΔE &le; {brandKit.deltaEMax}).
                </p>
              </div>
              <span className="font-mono text-xs text-slate-500">{brandKit.palette.length} swatches</span>
            </div>

            {brandKit.palette.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-500">
                No palette colors configured yet. Add your primary and accent hex colors below so Checkpoint flags off-palette creative colors automatically.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {brandKit.palette.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3 bg-slate-50/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-9 h-9 rounded-lg border border-slate-300 shrink-0 shadow-xs"
                        style={{ backgroundColor: c.hex }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{c.name}</div>
                        <div className="text-[11px] font-mono text-slate-600">{c.hex}</div>
                        {c.role && <div className="text-[10px] text-slate-400 truncate">{c.role}</div>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveSwatch(c.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-700 cursor-pointer"
                      title={`Remove ${c.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddSwatch} className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Color Name</label>
                <input
                  type="text"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  placeholder="e.g. Brand Teal"
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hex Code</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(newColorHex) ? newColorHex : '#0F766E'}
                    onChange={(e) => setNewColorHex(e.target.value.toUpperCase())}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Role</label>
                <input
                  type="text"
                  value={newColorRole}
                  onChange={(e) => setNewColorRole(e.target.value)}
                  placeholder="Primary CTA"
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 px-3 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live ΔE2000 Tester & Logo/Font Config (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Live ΔE2000 Palette Distance Tester</h3>
              <p className="text-xs text-slate-500">
                Test any hex color from an incoming poster against your approved palette using the CIEDE2000 perceptual formula.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(testHex) ? testHex : '#EC4899'}
                  onChange={(e) => setTestHex(e.target.value.toUpperCase())}
                  className="w-9 h-9 rounded border border-slate-300 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={testHex}
                  onChange={(e) => setTestHex(e.target.value)}
                  className="flex-1 p-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              {closestTestMatch ? (
                <div
                  className={`p-3 rounded-lg border text-xs space-y-1 ${
                    closestTestMatch.deltaE <= brandKit.deltaEMax
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Closest: {closestTestMatch.swatch.name} ({closestTestMatch.swatch.hex})</span>
                    <span className="font-mono">ΔE {closestTestMatch.deltaE}</span>
                  </div>
                  <div className="text-[11px]">
                    {closestTestMatch.deltaE <= brandKit.deltaEMax
                      ? `Passes VIS-01 (within ΔE ≤ ${brandKit.deltaEMax} tolerance).`
                      : `Off-palette (ΔE ${closestTestMatch.deltaE} exceeds ${brandKit.deltaEMax} threshold).`}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Add at least one swatch on the left to test ΔE2000 distances.
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Typography &amp; Logo Thresholds</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Heading Font</label>
                  <input
                    type="text"
                    value={brandKit.fonts.heading}
                    onChange={(e) =>
                      onBrandKitUpdated({
                        ...brandKit,
                        fonts: { ...brandKit.fonts, heading: e.target.value },
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Body Font</label>
                  <input
                    type="text"
                    value={brandKit.fonts.body}
                    onChange={(e) =>
                      onBrandKitUpdated({
                        ...brandKit,
                        fonts: { ...brandKit.fonts, body: e.target.value },
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Min Logo Width (px)</label>
                  <input
                    type="number"
                    value={brandKit.logoMinWidthPx}
                    onChange={(e) =>
                      onBrandKitUpdated({ ...brandKit, logoMinWidthPx: Number(e.target.value) || 32 })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Max ΔE2000 Distance</label>
                  <input
                    type="number"
                    value={brandKit.deltaEMax}
                    onChange={(e) =>
                      onBrandKitUpdated({ ...brandKit, deltaEMax: Number(e.target.value) || 10 })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
              <button
                onClick={() =>
                  saveKit(
                    {
                      fonts: brandKit.fonts,
                      logoMinWidthPx: brandKit.logoMinWidthPx,
                      deltaEMax: brandKit.deltaEMax,
                    },
                    'Saved typography & logo visual thresholds.'
                  )
                }
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Save Visual Thresholds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Channel Limits */}
      {subTab === 'channels' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Deterministic Channel Guardrails</h3>
              <p className="text-xs text-slate-500">
                Checked automatically in code on every draft: max emoji, exclamation marks, ALL-CAPS words, and minimum Flesch Reading Ease.
              </p>
            </div>
            <button
              onClick={() =>
                saveKit({ channelLimits: brandKit.channelLimits }, 'Saved channel limits to Brand Kit.')
              }
              className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Save Channel Limits
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Channel</th>
                  <th className="py-2.5 px-4">Max Emoji</th>
                  <th className="py-2.5 px-4">Max Exclamation Marks</th>
                  <th className="py-2.5 px-4">Max ALL-CAPS Words</th>
                  <th className="py-2.5 px-4">Min Flesch Reading Ease</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brandKit.channelLimits.map((cl, idx) => (
                  <tr key={cl.channel}>
                    <td className="py-3 px-4 font-semibold text-slate-900">{cl.label}</td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        value={cl.maxEmoji}
                        onChange={(e) => handleChannelLimitChange(idx, 'maxEmoji', Number(e.target.value))}
                        className="w-20 p-1.5 border border-slate-300 rounded font-mono bg-slate-50"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        value={cl.maxExclamation}
                        onChange={(e) => handleChannelLimitChange(idx, 'maxExclamation', Number(e.target.value))}
                        className="w-20 p-1.5 border border-slate-300 rounded font-mono bg-slate-50"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        value={cl.maxCapsWords}
                        onChange={(e) => handleChannelLimitChange(idx, 'maxCapsWords', Number(e.target.value))}
                        className="w-20 p-1.5 border border-slate-300 rounded font-mono bg-slate-50"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={cl.readabilityMin}
                        onChange={(e) => handleChannelLimitChange(idx, 'readabilityMin', Number(e.target.value))}
                        className="w-20 p-1.5 border border-slate-300 rounded font-mono bg-slate-50"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: Brand Book Importer */}
      {subTab === 'importer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Import a Brand Book</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload a `.txt` or `.md` brand manual or paste policy paragraphs. Checkpoint extracts rules into a staging queue for approval before enforcing them.
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl p-4 text-center relative hover:bg-slate-100 transition-colors">
              <input
                type="file"
                accept=".txt,.md,.csv"
                onChange={handleUploadBrandBookFile}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-5 h-5 text-teal-800 mx-auto mb-1" />
              <div className="text-xs font-semibold text-slate-800">{bookFileName}</div>
              <div className="text-[11px] text-slate-500">Click to load a `.txt` or `.md` file</div>
            </div>

            <textarea
              rows={6}
              value={bookText}
              onChange={(e) => setBookText(e.target.value)}
              placeholder="Or paste guidelines from your brand book, e.g.:&#10;- Never use superlatives like #1 or guaranteed without an external lab source.&#10;- Maintain at least 4.5:1 WCAG contrast on all banner copy.&#10;- Always say 'customers' instead of 'users'."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            />

            <button
              onClick={handleParseBrandBook}
              disabled={isImportingBook || !bookText.trim()}
              className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isImportingBook ? 'Extracting Guidelines...' : 'Extract Rules to Staging Queue'}</span>
            </button>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Waiting for Approval ({pendingImports.length})</h3>
                <p className="text-xs text-slate-500">
                  Review extracted guidelines before publishing them into the active Rulebook.
                </p>
              </div>
              {!canAdminEdit && (
                <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Switch to Brand Owner or Admin to approve
                </span>
              )}
            </div>

            {importedDrafts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No imported rules are waiting. Upload or paste a brand book excerpt on the left to extract rules.
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto">
                {importedDrafts.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                          {d.code}
                        </span>
                        <span className="uppercase text-[10px] font-semibold text-slate-500">
                          {d.category} · {d.severity}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{d.status.toUpperCase()}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{d.title}</div>
                    <p className="text-xs text-slate-600">{d.description}</p>
                    {d.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/70">
                        <button
                          onClick={() => handleDecideImported(d.id, 'approve')}
                          disabled={!canAdminEdit}
                          className="px-3 py-1 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 text-white text-xs font-semibold rounded flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve into Rulebook</span>
                        </button>
                        <button
                          onClick={() => handleDecideImported(d.id, 'reject')}
                          disabled={!canAdminEdit}
                          className="px-3 py-1 bg-white border border-slate-300 hover:bg-rose-50 text-slate-700 hover:text-rose-800 text-xs font-medium rounded flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>Discard</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 4: Confidential Mode & Workspace Export/Import */}
      {subTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Confidential Mode Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Zero-External-AI Guarantee</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">Confidential Mode</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  When on, <strong>nothing</strong> from drafts, posters, or brand books is sent to external AI services. Checks run strictly locally using deterministic rule matching, readability, accessibility, and Fact Library validation.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {brandKit.confidentialMode ? 'Confidential Mode: ON (Local Rule Checks Only)' : 'Confidential Mode: OFF (Hybrid Deterministic + Gemini AI)'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {brandKit.confidentialMode ? 'External AI endpoints are blocked.' : 'DPDP Act 2023 PII masking remains active before AI calls.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  saveKit(
                    { confidentialMode: !brandKit.confidentialMode },
                    !brandKit.confidentialMode
                      ? 'Confidential Mode enabled: all external AI calls are now blocked.'
                      : 'Confidential Mode turned off: hybrid AI + rule checks restored.'
                  )
                }
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  brandKit.confidentialMode
                    ? 'bg-amber-700 hover:bg-amber-800 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {brandKit.confidentialMode ? 'Disable' : 'Enable Confidential Mode'}
              </button>
            </div>
          </div>

          {/* Workspace Export / Import Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                <span>Portability &amp; Snapshot Recovery</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">Export or Import Workspace</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Download your entire Brand Kit, Rulebook, Fact Library, Submissions, and cryptographic Hallmarks as a JSON file, or restore a workspace (auto-saving a backup first).
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleExportWorkspace}
                className="px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Workspace (.json)</span>
              </button>

              <label className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 text-teal-800" />
                <span>Import Workspace (.json)</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportWorkspaceFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
