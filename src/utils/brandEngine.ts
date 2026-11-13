import { BrandRule, ChannelLimit, Finding, PaletteColor } from '../types';

export const DEFAULT_CHANNEL_LIMITS: ChannelLimit[] = [
  { channel: 'social', label: 'Social Post', maxEmoji: 3, maxExclamation: 1, maxCapsWords: 2, readabilityMin: 60 },
  { channel: 'email', label: 'Marketing Email', maxEmoji: 1, maxExclamation: 1, maxCapsWords: 1, readabilityMin: 55 },
  { channel: 'ad_campaign', label: 'Paid Ad / Banner', maxEmoji: 2, maxExclamation: 1, maxCapsWords: 2, readabilityMin: 55 },
  { channel: 'press_release', label: 'Press Release', maxEmoji: 0, maxExclamation: 0, maxCapsWords: 1, readabilityMin: 40 },
  { channel: 'blog', label: 'Editorial / Website', maxEmoji: 0, maxExclamation: 0, maxCapsWords: 1, readabilityMin: 50 },
  { channel: 'slide_deck', label: 'Creative Document (PDF)', maxEmoji: 0, maxExclamation: 0, maxCapsWords: 1, readabilityMin: 50 },
];

// ---------- Color Conversions & CIEDE2000 (ΔE2000) ----------

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  return [
    (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) * 100,
    (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750) * 100,
    (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) * 100,
  ];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / 95.047);
  const fy = f(y / 100.0);
  const fz = f(z / 108.883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function hexToLab(hex: string): [number, number, number] | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [x, y, z] = rgbToXyz(rgb[0], rgb[1], rgb[2]);
  return xyzToLab(x, y, z);
}

/**
 * Exact CIEDE2000 perceptual color difference (Sharma et al., 2005)
 */
export function deltaE2000(hex1: string, hex2: string): number | null {
  const lab1 = hexToLab(hex1);
  const lab2 = hexToLab(hex2);
  if (!lab1 || !lab2) return null;

  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const deg = (r: number) => (r * 180) / Math.PI;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const hp = (bp: number, ap: number) => {
    if (bp === 0 && ap === 0) return 0;
    const h = deg(Math.atan2(bp, ap));
    return h >= 0 ? h : h + 360;
  };
  const h1p = hp(b1, a1p);
  const h2p = hp(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
    else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
    else dhp = h2p - h1p + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));

  const Lpbar = (L1 + L2) / 2;
  const Cpbar = (C1p + C2p) / 2;
  let hpbar = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hpbar = (h1p + h2p) / 2;
    else if (h1p + h2p < 360) hpbar = (h1p + h2p + 360) / 2;
    else hpbar = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(rad(hpbar - 30)) +
    0.24 * Math.cos(rad(2 * hpbar)) +
    0.32 * Math.cos(rad(3 * hpbar + 6)) -
    0.2 * Math.cos(rad(4 * hpbar - 63));

  const dTheta = 30 * Math.exp(-Math.pow((hpbar - 275) / 25, 2));
  const Cpbar7 = Math.pow(Cpbar, 7);
  const Rc = 2 * Math.sqrt(Cpbar7 / (Cpbar7 + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lpbar - 50, 2)) / Math.sqrt(20 + Math.pow(Lpbar - 50, 2));
  const Sc = 1 + 0.045 * Cpbar;
  const Sh = 1 + 0.015 * Cpbar * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;

  const dE = Math.sqrt(
    Math.pow(dLp / Sl, 2) +
      Math.pow(dCp / Sc, 2) +
      Math.pow(dHp / Sh, 2) +
      Rt * (dCp / Sc) * (dHp / Sh)
  );
  return Math.round(dE * 10) / 10;
}

export function findClosestPaletteMatch(
  hex: string,
  palette: PaletteColor[]
): { swatch: PaletteColor; deltaE: number } | null {
  if (!palette.length) return null;
  let best: { swatch: PaletteColor; deltaE: number } | null = null;
  for (const swatch of palette) {
    const d = deltaE2000(hex, swatch.hex);
    if (d !== null && (!best || d < best.deltaE)) {
      best = { swatch, deltaE: d };
    }
  }
  return best;
}

// ---------- Readability & Deterministic Checks ----------

function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  if (clean.length <= 3) return 1;
  const trimmed = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function computeFleschReadingEase(text: string): number {
  const words = text.trim().split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
  if (words.length === 0) return 100;
  const sentences = Math.max(1, text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const score = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function runClientDeterministicChecks(
  text: string,
  channel: string,
  rules: BrandRule[] = [],
  channelLimits: ChannelLimit[] = DEFAULT_CHANNEL_LIMITS
): Finding[] {
  if (!text.trim()) return [];
  const findings: Finding[] = [];
  const limits = channelLimits.find((c) => c.channel === channel) || DEFAULT_CHANNEL_LIMITS[0];

  // 1. Exclamation mark runs & channel limits
  const exclRuns = [...text.matchAll(/!{2,}/g)];
  for (const m of exclRuns) {
    findings.push({
      id: `det-excl-run-${m.index}`,
      category: 'tone',
      severity: 'low',
      matchedText: m[0],
      issue: 'Run of exclamation marks',
      reason: `Avoid repeated exclamation marks ("${m[0]}") so brand voice stays measured and credible.`,
      ruleCode: 'VOICE-02',
      ruleName: 'Measured Punctuation & Tone',
      suggestedFix: '.',
      confidence: 96,
      status: 'pending',
      requiresLegalApproval: false,
      start: m.index,
      end: (m.index ?? 0) + m[0].length,
      intentVerdict: 'kept',
      intentNote: 'Preserves statement meaning without shouting.',
    });
  }

  // 2. Emoji count against channel limit
  const emojis: string[] = text.match(/\p{Extended_Pictographic}/gu) || [];
  if (emojis.length > limits.maxEmoji && emojis.length > 0) {
    const firstEmoji = emojis[limits.maxEmoji] ?? emojis[0] ?? '';
    const idx = firstEmoji ? text.indexOf(firstEmoji) : -1;
    if (firstEmoji) {
      findings.push({
        id: `det-emoji-${idx}`,
        category: 'accessibility',
        severity: 'low',
        matchedText: firstEmoji,
        issue: `Too many emoji (${emojis.length}/${limits.maxEmoji} allowed)`,
        reason: `${limits.label} allows up to ${limits.maxEmoji} emoji; screen readers announce each emoji aloud.`,
        ruleCode: 'A11Y-04',
        ruleName: 'Channel Emoji & Screen Reader Limit',
        suggestedFix: '',
        confidence: 95,
        status: 'pending',
        requiresLegalApproval: false,
        start: idx >= 0 ? idx : undefined,
        end: idx >= 0 ? idx + firstEmoji.length : undefined,
        intentVerdict: 'kept',
        intentNote: 'Keeps full verbal message accessible.',
      });
    }
  }

  // 3. ALL-CAPS words against channel limit
  const capsMatches = [...text.matchAll(/\b[A-Z]{4,}\b/g)].filter(
    (m) => !['WCAG', 'ASCI', 'CCPA', 'DPDP', 'HTML', 'JSON', 'SPF', 'PA', 'UVB', 'UVA'].includes(m[0])
  );
  if (capsMatches.length > limits.maxCapsWords) {
    const m = capsMatches[limits.maxCapsWords] || capsMatches[0];
    findings.push({
      id: `det-caps-${m.index}`,
      category: 'accessibility',
      severity: 'low',
      matchedText: m[0],
      issue: `Excessive ALL-CAPS word (${capsMatches.length}/${limits.maxCapsWords} allowed)`,
      reason: `${limits.label} limits ALL-CAPS words to ${limits.maxCapsWords}; screen readers may spell capitals letter-by-letter.`,
      ruleCode: 'A11Y-04',
      ruleName: 'Readable Capitalisation',
      suggestedFix: m[0].charAt(0) + m[0].slice(1).toLowerCase(),
      confidence: 92,
      status: 'pending',
      requiresLegalApproval: false,
      start: m.index,
      end: (m.index ?? 0) + m[0].length,
      intentVerdict: 'kept',
      intentNote: 'Preserves exact word in readable case.',
    });
  }

  // 4. Non-CamelCase multi-word hashtags
  for (const m of text.matchAll(/#[a-z]{9,}\b/g)) {
    const raw = m[0].slice(1);
    const camel = '#' + raw.charAt(0).toUpperCase() + raw.slice(1);
    findings.push({
      id: `det-hash-${m.index}`,
      category: 'accessibility',
      severity: 'low',
      matchedText: m[0],
      issue: 'Hashtag is not CamelCase',
      reason: `Screen readers read "${m[0]}" as one unbroken word. Capitalise each word in hashtags (e.g. #BrandLaunch).`,
      ruleCode: 'A11Y-04',
      ruleName: 'CamelCase Hashtags for Screen Readers',
      suggestedFix: camel,
      confidence: 88,
      status: 'pending',
      requiresLegalApproval: false,
      start: m.index,
      end: (m.index ?? 0) + m[0].length,
      intentVerdict: 'kept',
      intentNote: 'Preserves hashtag tag while improving accessibility.',
    });
  }

  // 5. Generic non-descriptive link text
  for (const m of text.matchAll(/\b(click here|read more|tap here|learn more)\b/gi)) {
    findings.push({
      id: `det-link-${m.index}`,
      category: 'accessibility',
      severity: 'medium',
      matchedText: m[0],
      issue: 'Non-descriptive link text',
      reason: `Link labels must tell readers where they lead (WCAG 2.4.4). Avoid generic phrases like "${m[0]}".`,
      ruleCode: 'A11Y-02',
      ruleName: 'Descriptive Link Text',
      suggestedFix: 'view full product details and terms',
      confidence: 93,
      status: 'pending',
      requiresLegalApproval: false,
      start: m.index,
      end: (m.index ?? 0) + m[0].length,
      intentVerdict: 'kept',
      intentNote: 'Retains call-to-action with accessible destination context.',
    });
  }

  // 6. Readability (Flesch Reading Ease)
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount >= 12) {
    const flesch = computeFleschReadingEase(text);
    if (flesch < limits.readabilityMin) {
      const longestSentence = text
        .split(/(?<=[.!?])\s+/)
        .sort((a, b) => b.length - a.length)[0] || text.slice(0, 80);
      const idx = text.indexOf(longestSentence);
      findings.push({
        id: `det-read-${idx}`,
        category: 'accessibility',
        severity: 'low',
        matchedText: longestSentence.slice(0, 120),
        issue: `Readability below ${limits.label} target (${flesch} < ${limits.readabilityMin})`,
        reason: `Flesch reading ease is ${flesch}; ${limits.label} copy targets ${limits.readabilityMin}+ for fast comprehension.`,
        ruleCode: 'A11Y-03',
        ruleName: 'Channel Readability Target',
        suggestedFix: 'Split long clauses into shorter, plain-language sentences.',
        confidence: 86,
        status: 'pending',
        requiresLegalApproval: false,
        start: idx >= 0 ? idx : undefined,
        end: idx >= 0 ? idx + Math.min(longestSentence.length, 120) : undefined,
        intentVerdict: 'review',
        intentNote: 'Advisory rewrite: shorten sentence manually to preserve nuance.',
      });
    }
  }

  // 7. User-configured active BrandRules forbidden phrases
  for (const rule of rules) {
    for (let i = 0; i < (rule.forbiddenExamples || []).length; i++) {
      const forbidden = rule.forbiddenExamples[i]?.trim();
      if (!forbidden || forbidden.length < 3) continue;
      const escaped = forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const match = regex.exec(text);
      if (match) {
        const replacement = rule.preferredAlternatives?.[i] || rule.preferredAlternatives?.[0] || 'Remove or substantiate claim';
        findings.push({
          id: `det-rule-${rule.id}-${match.index}`,
          category: rule.category === 'claims' ? 'claim' : rule.category,
          severity: rule.severity,
          matchedText: match[0],
          issue: `${rule.title}: "${match[0]}"`,
          reason: rule.description,
          ruleCode: rule.code,
          ruleName: rule.title,
          suggestedFix: replacement,
          confidence: 94,
          status: 'pending',
          requiresLegalApproval: rule.requiresLegal,
          start: match.index,
          end: match.index + match[0].length,
          intentVerdict: 'kept',
          intentNote: 'Applies approved brand alternative from Rulebook.',
        });
      }
    }
  }

  return findings;
}

// ---------- Intent Preservation Evaluator ----------

export function evaluateFixIntent(
  original: string,
  suggestedFix: string
): { verdict: 'kept' | 'review' | 'lost'; note: string } {
  const orig = original.trim().toLowerCase();
  const fix = suggestedFix.trim().toLowerCase();
  if (!fix || fix.startsWith('remove ')) {
    return { verdict: 'lost', note: 'Removes phrase completely — review to ensure key message remains.' };
  }
  if (fix.includes('reapply') || fix.includes('source:') || fix.includes('in our') || fix.length >= orig.length * 0.65) {
    return { verdict: 'kept', note: 'Intent kept: core marketing message preserved with compliance.' };
  }
  return { verdict: 'review', note: 'Shortened phrasing — verify emphasis matches campaign goal.' };
}

// ---------- Semantic Word Diff ----------

export interface DiffToken {
  type: 'equal' | 'delete' | 'insert';
  text: string;
}

export function computeWordDiff(before: string, after: string): DiffToken[] {
  const a = before.split(/(\s+)/);
  const b = after.split(/(\s+)/);
  const m = a.length;
  const n = b.length;

  // Guard size for performance
  if (m * n > 250000) {
    return [
      { type: 'delete', text: before },
      { type: 'insert', text: after },
    ];
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = 1 + dp[i + 1][j + 1];
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const raw: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      raw.push({ type: 'equal', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ type: 'delete', text: a[i] });
      i++;
    } else {
      raw.push({ type: 'insert', text: b[j] });
      j++;
    }
  }
  while (i < m) raw.push({ type: 'delete', text: a[i++] });
  while (j < n) raw.push({ type: 'insert', text: b[j++] });

  // Coalesce adjacent identical ops
  const merged: DiffToken[] = [];
  for (const tok of raw) {
    const last = merged[merged.length - 1];
    if (last && last.type === tok.type) last.text += tok.text;
    else merged.push({ ...tok });
  }
  return merged;
}

// ---------- SHA-256 Helper (Browser Web Crypto) ----------

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
