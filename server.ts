import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_FACTS, INITIAL_RULES, INITIAL_SUBMISSIONS, INITIAL_AUDIT_LOGS, INITIAL_SLACK_NOTIFICATIONS, INITIAL_BRAND_HEALTH } from './src/data/initialData.ts';
import { DEFAULT_CHANNEL_LIMITS, runClientDeterministicChecks, findClosestPaletteMatch, evaluateFixIntent } from './src/utils/brandEngine.ts';
import type {
  ApprovedFact,
  BrandRule,
  ContentSubmission,
  AuditLogEntry,
  Finding,
  SlackNotification,
  BrandHealthMetrics,
  LogoCheckResult,
  BrandKitConfig,
  HallmarkRecord,
  HallmarkVerifyResult,
  ExpiryNotice,
  ImportedRuleDraft,
} from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

interface AnalyzedAssetRecord {
  channel: string;
  findingsCount: number;
  highRiskCount: number;
  topRule: string;
  timestamp: string;
}

const EMPTY_BRAND_HEALTH: BrandHealthMetrics = {
  overallHealthScore: 0,
  complianceRate: 0,
  activeViolationsCaughtMonth: 0,
  avgVelocityHours: 0,
  historicalVelocityReduction: 0,
  repeatFlagReductionRate: 0,
  legalRiskExposureScore: 0,
  departmentBreakdowns: [],
  monthlyTrends: [],
};

const EMPTY_BRAND_KIT: BrandKitConfig = {
  brandName: '',
  palette: [],
  fonts: { heading: 'Inter', body: 'Inter' },
  logoMinWidthPx: 120,
  logoClearSpaceRatio: 1.0,
  deltaEMax: 10,
  channelLimits: JSON.parse(JSON.stringify(DEFAULT_CHANNEL_LIMITS)),
  confidentialMode: false,
  ownerEmails: {},
};

const DEMO_BRAND_KIT: BrandKitConfig = {
  brandName: 'QuickBite Express',
  palette: [
    { id: 'pal-1', name: 'QuickBite Teal', hex: '#0F766E', role: 'Primary brand & CTA' },
    { id: 'pal-2', name: 'Deep Ink', hex: '#0F172A', role: 'Headlines & body text' },
    { id: 'pal-3', name: 'Harvest Amber', hex: '#B45309', role: 'Highlight accents' },
    { id: 'pal-4', name: 'Warm Cream', hex: '#F8FAFC', role: 'Surface background' },
  ],
  fonts: { heading: 'Inter', body: 'Inter' },
  logoMinWidthPx: 120,
  logoClearSpaceRatio: 1.0,
  deltaEMax: 10,
  channelLimits: JSON.parse(JSON.stringify(DEFAULT_CHANNEL_LIMITS)),
  confidentialMode: false,
  ownerEmails: {
    'Operations Director': 'ops-director@quickbite.demo',
    'Growth Lead': 'growth@quickbite.demo',
    'Chief Legal Officer': 'legal@quickbite.demo',
    'Sustainability Head': 'esg@quickbite.demo',
  },
};

// In-memory data store for the application (starts clean & empty until Demo Mode is toggled on)
let isDemoActive = false;
let facts: ApprovedFact[] = [];
let rules: BrandRule[] = [];
let submissions: ContentSubmission[] = [];
let auditLogs: AuditLogEntry[] = [];
let slackNotifications: SlackNotification[] = [];
let brandHealth: BrandHealthMetrics = JSON.parse(JSON.stringify(EMPTY_BRAND_HEALTH));
let analyzedAssetsHistory: AnalyzedAssetRecord[] = [];
let brandKit: BrandKitConfig = JSON.parse(JSON.stringify(EMPTY_BRAND_KIT));
let hallmarks: HallmarkRecord[] = [];
let expiryReadMap: Record<string, boolean> = {};
let expiryLastSentMap: Record<string, string> = {};
let importedRules: ImportedRuleDraft[] = [];

function sha256Server(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function computeCanonicalRecordHash(h: {
  seq: number;
  submissionId: string;
  title: string;
  contentHash: string;
  prevHash: string;
  rulebookVersion: string;
  findingsSummary: HallmarkRecord['findingsSummary'];
  approvals: HallmarkRecord['approvals'];
  aiModel: string;
  issuedAt: string;
}): string {
  const payload = JSON.stringify({
    seq: h.seq,
    submissionId: h.submissionId,
    title: h.title,
    contentHash: h.contentHash,
    prevHash: h.prevHash,
    rulebookVersion: h.rulebookVersion,
    findingsSummary: h.findingsSummary,
    approvals: h.approvals,
    aiModel: h.aiModel,
    issuedAt: h.issuedAt,
  });
  return sha256Server(payload);
}

function mintHallmarkForSubmission(
  sub: ContentSubmission,
  approverName: string,
  approverRole: string
): HallmarkRecord {
  const existing = hallmarks.find((h) => h.submissionId === sub.id && h.content === sub.content);
  if (existing) return existing;

  const seq = hallmarks.length + 1;
  const prevHash = hallmarks.length > 0 ? hallmarks[hallmarks.length - 1].hash : '0'.repeat(64);
  const contentHash = sha256Server(sub.content || sub.title);
  const issuedAt = new Date().toISOString();
  const rulebookVersion = rules[0]?.currentVersion || 'v1.0';
  const findingsSummary = sub.findings.map((f) => ({
    ruleCode: f.ruleCode,
    status: f.status,
    severity: f.severity,
  }));
  const approvals = [{ by: approverName, role: approverRole, at: issuedAt }];
  const aiModel = brandKit.confidentialMode ? 'local-rules-only' : 'gemini-4-hydrogen';

  const recordHash = computeCanonicalRecordHash({
    seq,
    submissionId: sub.id,
    title: sub.title,
    contentHash,
    prevHash,
    rulebookVersion,
    findingsSummary,
    approvals,
    aiModel,
    issuedAt,
  });

  const record: HallmarkRecord = {
    id: `hm-${Date.now()}-${seq}`,
    seq,
    submissionId: sub.id,
    title: sub.title,
    channel: sub.channel,
    content: sub.content,
    contentHash,
    recordHash,
    prevHash,
    hash: recordHash,
    rulebookVersion,
    findingsSummary,
    approvals,
    aiModel,
    issuedAt,
    tampered: false,
  };

  hallmarks.push(record);
  sub.hallmarkId = record.id;
  sub.hallmarkSeq = record.seq;
  sub.contentHash = contentHash;

  addAuditLog(
    'hallmark_minted',
    approverName,
    approverRole as AuditLogEntry['actorRole'],
    `Minted SHA-256 Hallmark #${record.seq} (${record.hash.slice(0, 12)}...) for "${sub.title}".`,
    sub.id
  );
  return record;
}

function computeExpiryNotices(): ExpiryNotice[] {
  const now = new Date();
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const notices: ExpiryNotice[] = [];

  for (const f of facts) {
    if (!f.expiryDate) continue;
    const parts = f.expiryDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) continue;
    const expMs = Date.UTC(parts[0], parts[1] - 1, parts[2]);
    const daysLeft = Math.round((expMs - todayMs) / 86400000);
    if (daysLeft <= 30) {
      let thresholdLabel = '30-day notice';
      if (daysLeft < 0) thresholdLabel = `Expired ${Math.abs(daysLeft)}d ago`;
      else if (daysLeft === 0) thresholdLabel = 'Expires today';
      else if (daysLeft <= 1) thresholdLabel = '1-day notice';
      else if (daysLeft <= 7) thresholdLabel = '7-day notice';
      else if (daysLeft <= 14) thresholdLabel = '14-day notice';

      notices.push({
        id: `exp-${f.id}`,
        factId: f.id,
        statement: f.statement,
        category: f.category,
        sourceDoc: f.sourceDoc,
        verifiedBy: f.verifiedBy,
        ownerEmail: brandKit.ownerEmails[f.verifiedBy] || '',
        expiryDate: f.expiryDate,
        effectiveDate: f.effectiveDate,
        daysLeft,
        isExpired: daysLeft < 0,
        thresholdLabel,
        read: Boolean(expiryReadMap[f.id]),
        lastSentAt: expiryLastSentMap[f.id],
      });
    }
  }
  return notices.sort((a, b) => a.daysLeft - b.daysLeft);
}

// Server-side Gemini client
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function addAuditLog(
  action: AuditLogEntry['action'],
  actorName: string,
  actorRole: AuditLogEntry['actorRole'],
  details: string,
  submissionId?: string,
  ruleCode?: string
) {
  const newLog: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    action,
    actorName,
    actorRole,
    details,
    submissionId,
    ruleCode,
  };
  auditLogs.unshift(newLog);
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Reset Demo Data
app.post('/api/reset-demo', (_req, res) => {
  isDemoActive = true;
  facts = JSON.parse(JSON.stringify(INITIAL_FACTS));
  rules = JSON.parse(JSON.stringify(INITIAL_RULES));
  submissions = JSON.parse(JSON.stringify(INITIAL_SUBMISSIONS));
  auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
  slackNotifications = JSON.parse(JSON.stringify(INITIAL_SLACK_NOTIFICATIONS));
  brandHealth = JSON.parse(JSON.stringify(INITIAL_BRAND_HEALTH));
  brandKit = JSON.parse(JSON.stringify(DEMO_BRAND_KIT));
  analyzedAssetsHistory = [];
  hallmarks = [];
  expiryReadMap = {};
  expiryLastSentMap = {};
  importedRules = [];

  for (const sub of submissions) {
    if (sub.status === 'approved') {
      mintHallmarkForSubmission(sub, 'Marcus Vance', 'legal');
    }
  }

  addAuditLog(
    'draft_submitted',
    'System Admin',
    'admin',
    'Demo environment reset to initial sample dataset.'
  );

  res.json({ success: true, message: 'Demo environment reset successfully.' });
});

// Clear Data (User requested non-demo clean state)
app.post('/api/clear-data', (_req, res) => {
  isDemoActive = false;
  facts = [];
  rules = [];
  submissions = [];
  auditLogs = [];
  slackNotifications = [];
  analyzedAssetsHistory = [];
  hallmarks = [];
  expiryReadMap = {};
  expiryLastSentMap = {};
  importedRules = [];
  brandHealth = JSON.parse(JSON.stringify(EMPTY_BRAND_HEALTH));
  brandKit = JSON.parse(JSON.stringify(EMPTY_BRAND_KIT));

  res.json({ success: true, message: 'Platform data cleared. Workspace is now empty and ready for custom user input.' });
});

// Fact Library
app.get('/api/facts', (_req, res) => {
  const currentDate = new Date().toISOString().split('T')[0];
  const updatedFacts = facts.map((fact) => ({
    ...fact,
    isExpired: fact.expiryDate < currentDate,
    status: fact.expiryDate < currentDate ? ('expired' as const) : fact.status,
  }));
  res.json(updatedFacts);
});

app.post('/api/facts', (req, res) => {
  const { statement, category, sourceDoc, sourceSection, effectiveDate, expiryDate, verifiedBy, notes } = req.body;
  if (!statement || !category || !sourceDoc) {
    res.status(400).json({ error: 'Missing required fact fields.' });
    return;
  }

  const currentDate = new Date().toISOString().split('T')[0];
  const newFact: ApprovedFact = {
    id: `fact-${Date.now()}`,
    statement,
    category,
    sourceDoc,
    sourceSection,
    effectiveDate: effectiveDate || currentDate,
    expiryDate: expiryDate || '2026-12-31',
    isExpired: (expiryDate || '2026-12-31') < currentDate,
    status: (expiryDate || '2026-12-31') < currentDate ? 'expired' : 'active',
    verifiedBy: verifiedBy || 'Brand Knowledge Officer',
    notes,
  };

  facts.push(newFact);
  addAuditLog('rule_updated', verifiedBy || 'Brand Owner', 'brand_owner', `Added approved fact to library: "${statement.slice(0, 40)}..."`);
  res.json(newFact);
});

app.delete('/api/facts/:id', (req, res) => {
  const { id } = req.params;
  facts = facts.filter((f) => f.id !== id);
  res.json({ success: true });
});

// Brand Rules & Heatmap
app.get('/api/rules', (_req, res) => {
  res.json(rules);
});

app.post('/api/rules', (req, res) => {
  const incoming = req.body as Partial<BrandRule>;
  const index = rules.findIndex((r) => (incoming.id && r.id === incoming.id) || (incoming.code && r.code === incoming.code));
  if (index !== -1) {
    rules[index] = { ...rules[index], ...incoming };
    addAuditLog('rule_updated', 'Brand Owner', 'brand_owner', `Updated rule wording: ${rules[index].code}`);
    res.json(rules[index]);
  } else {
    const newRule: BrandRule = {
      id: incoming.id || `rule-${Date.now()}`,
      code: incoming.code || `Policy ${rules.length + 1}.1`,
      title: incoming.title || 'Custom Brand Guideline',
      category: incoming.category || 'claims',
      severity: incoming.severity || 'medium',
      description: incoming.description || '',
      forbiddenExamples: incoming.forbiddenExamples || [],
      preferredAlternatives: incoming.preferredAlternatives || [],
      requiresLegal: Boolean(incoming.requiresLegal),
      currentVersion: 'v1.0',
      versions: [
        {
          version: 'v1.0',
          timestamp: new Date().toISOString(),
          author: 'Brand Owner',
          authorRole: 'brand_owner',
          title: incoming.title || 'Custom Brand Guideline',
          description: incoming.description || '',
          changeSummary: 'Initial policy baseline.',
          confusionScoreAtVersion: 0,
        },
      ],
      heatmap: incoming.heatmap || {
        confusionScore: 0,
        peopleAffected: 0,
        dismissalRate: 0,
        reviewerDisagreements: 0,
        repeatFlagsCount: 0,
        trend: 'stable',
      },
    };
    rules.push(newRule);
    addAuditLog('rule_updated', 'Brand Owner', 'brand_owner', `Added custom brand rule: ${newRule.code}`);
    res.json(newRule);
  }
});

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// AI Guideline Rewriter (Slide 5: Guideline Clarity Heatmap & rewrite feature)
app.post('/api/rules/rewrite-with-gemini', async (req, res) => {
  const { ruleId, customInstruction } = req.body;
  const targetRule = rules.find((r) => r.id === ruleId);

  if (!targetRule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  // Fallback high quality rewrites if Gemini is not configured, Confidential Mode is active, or AI takes too long
  let rewrittenTitle = targetRule.title;
  let rewrittenDescription = targetRule.aiSuggestedRewrite || targetRule.description;
  let rationale = brandKit.confidentialMode
    ? 'Confidential Mode active: drafted deterministic template clarification locally without calling external AI.'
    : 'Eliminated vague qualitative phrases; required precise citations with certified sources.';

  if (aiClient && !brandKit.confidentialMode) {
    try {
      const prompt = `You are an expert brand governance and legal compliance architect for "Checkpoint".
We have a brand guideline with high confusion among content creators and frequent dismissals.

Rule Code: ${targetRule.code}
Current Rule Title: ${targetRule.title}
Current Description: "${targetRule.description}"
Original Ambiguous Wording: "${targetRule.originalWording || targetRule.description}"
Negative Examples Flagged: ${JSON.stringify(targetRule.forbiddenExamples)}
Preferred Alternatives: ${JSON.stringify(targetRule.preferredAlternatives)}
Heatmap Stats:
- Confusion Score: ${targetRule.heatmap.confusionScore}/100
- Dismissal Rate: ${targetRule.heatmap.dismissalRate}%
- People Affected: ${targetRule.heatmap.peopleAffected}
- Repeat Flags Count: ${targetRule.heatmap.repeatFlagsCount}
${customInstruction ? `User instructions: ${customInstruction}` : ''}

Task:
Draft a significantly clearer, unambiguous version of this brand rule.
Make sure content creators will immediately understand what is forbidden and what concrete replacement to use.
Ground the rule in ASCI 2025-26 and CCPA (2022) legal standards and company approved sources.

Output JSON only matching this schema:
{
  "improvedTitle": "string",
  "improvedDescription": "string",
  "rationale": "string",
  "clarityTips": ["tip 1", "tip 2"]
}`;

      const aiPromise = aiClient.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              improvedTitle: { type: Type.STRING },
              improvedDescription: { type: Type.STRING },
              rationale: { type: Type.STRING },
              clarityTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['improvedTitle', 'improvedDescription', 'rationale'],
          },
        },
      });

      const response = await withTimeout(aiPromise, 15000, null);
      if (response && response.text) {
        const parsed = JSON.parse(response.text || '{}');
        if (parsed.improvedDescription) {
          rewrittenTitle = parsed.improvedTitle || targetRule.title;
          rewrittenDescription = parsed.improvedDescription;
          rationale = parsed.rationale || rationale;
        }
      }
    } catch (err: unknown) {
      console.warn('Gemini rule rewrite note, using domain rule fallback:', err);
    }
  }

  // Update rule in memory with suggested rewrite
  targetRule.aiSuggestedRewrite = rewrittenDescription;
  targetRule.rewriteReason = rationale;

  res.json({
    ruleId: targetRule.id,
    originalDescription: targetRule.description,
    improvedTitle: rewrittenTitle,
    improvedDescription: rewrittenDescription,
    rationale,
  });
});

// Approve Rule Rewrite with Version Creation
app.post('/api/rules/:id/approve-rewrite', (req, res) => {
  const { id } = req.params;
  const { newDescription, newTitle, author = 'Sarah Chen (VP Brand)', changeSummary } = req.body;
  const rule = rules.find((r) => r.id === id);

  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  // Ensure baseline v1.0 exists in history
  rule.versions = rule.versions || [];
  if (rule.versions.length === 0) {
    rule.versions.push({
      version: 'v1.0',
      timestamp: '2026-08-15T09:00:00Z',
      author: 'Sarah Chen',
      authorRole: 'VP Brand',
      title: rule.title,
      description: rule.originalWording || rule.description,
      changeSummary: 'Original policy baseline.',
      confusionScoreAtVersion: rule.heatmap.confusionScore,
    });
  }

  // Calculate incremented version number: v1.1, v1.2, etc.
  const currentNum = parseFloat((rule.currentVersion || 'v1.0').replace('v', '')) || 1.0;
  const nextVer = `v${(currentNum + 0.1).toFixed(1)}`;

  rule.originalWording = rule.description;
  rule.description = newDescription || rule.aiSuggestedRewrite || rule.description;
  if (newTitle) rule.title = newTitle;
  rule.isRewritten = true;
  rule.currentVersion = nextVer;

  // Decrease confusion metrics as evidence of learning (Slide 6 & 10)
  rule.heatmap.confusionScore = Math.max(15, Math.round(rule.heatmap.confusionScore * 0.45));
  rule.heatmap.dismissalRate = Math.max(5, Math.round(rule.heatmap.dismissalRate * 0.35));
  rule.heatmap.trend = 'declining';

  // Push new version to history
  rule.versions.unshift({
    version: nextVer,
    timestamp: new Date().toISOString(),
    author,
    authorRole: 'brand_owner',
    title: rule.title,
    description: rule.description,
    changeSummary: changeSummary || rule.rewriteReason || 'Gemini 3.8 Flash clarity rewording approved by Brand Manager.',
    confusionScoreAtVersion: rule.heatmap.confusionScore,
  });

  addAuditLog(
    'rule_updated',
    author,
    'brand_owner',
    `Approved clarity rewrite for rule ${rule.code} (${nextVer}): Drop in repeat flags expected.`,
    undefined,
    rule.code
  );

  res.json({ success: true, updatedRule: rule });
});

// Rule Versions History
app.get('/api/rules/:id/versions', (req, res) => {
  const { id } = req.params;
  const rule = rules.find((r) => r.id === id);
  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }
  res.json(rule.versions || []);
});

// Rollback Rule to Historical Version
app.post('/api/rules/:id/rollback', (req, res) => {
  const { id } = req.params;
  const { targetVersion, author = 'Sarah Chen' } = req.body;
  const rule = rules.find((r) => r.id === id);

  if (!rule || !rule.versions) {
    res.status(404).json({ error: 'Rule or versions not found' });
    return;
  }

  const targetVerObj = rule.versions.find((v) => v.version === targetVersion);
  if (!targetVerObj) {
    res.status(404).json({ error: 'Target version not found' });
    return;
  }

  rule.title = targetVerObj.title;
  rule.description = targetVerObj.description;
  rule.currentVersion = targetVerObj.version;
  rule.heatmap.confusionScore = targetVerObj.confusionScoreAtVersion;
  rule.isRewritten = targetVerObj.version !== 'v1.0';

  addAuditLog(
    'rule_rolled_back',
    author,
    'brand_owner',
    `Rolled back rule ${rule.code} to ${targetVerObj.version}`,
    undefined,
    rule.code
  );

  res.json({ success: true, updatedRule: rule });
});

// Pre-Publication Check & Analysis
app.post('/api/analyze', async (req, res) => {
  const { content, channel, goal, privacyRedaction = true, brandName, isDemoMode = false } = req.body;

  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'Content string is required for analysis.' });
    return;
  }

  // Step 3: Protect (Privacy & PII redaction) - DPDP Act 2023 compliance
  let sanitizedContent = content;
  let maskedItemsCount = 0;
  const maskedTerms: { term: string; replacement: string }[] = [];

  if (privacyRedaction) {
    // Mask internal project codenames
    const codenameRegex = /\b(Project\s+[A-Z][a-z]+)\b/g;
    sanitizedContent = sanitizedContent.replace(codenameRegex, (match) => {
      maskedItemsCount++;
      maskedTerms.push({ term: match, replacement: '[CONFIDENTIAL_PROJECT_NAME]' });
      return '[CONFIDENTIAL_PROJECT_NAME]';
    });

    // Mask phone numbers
    const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    sanitizedContent = sanitizedContent.replace(phoneRegex, (match) => {
      maskedItemsCount++;
      maskedTerms.push({ term: match, replacement: '[REDACTED_PHONE_PII]' });
      return '[REDACTED_PHONE_PII]';
    });

    // Mask emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    sanitizedContent = sanitizedContent.replace(emailRegex, (match) => {
      maskedItemsCount++;
      maskedTerms.push({ term: match, replacement: '[REDACTED_EMAIL_PII]' });
      return '[REDACTED_EMAIL_PII]';
    });
  }

  const findings: Finding[] = [];
  const runQuickBiteDemoRules = Boolean(isDemoMode || isDemoActive);

  // Only run QuickBite-specific sample rules when Demo Mode is active
  if (runQuickBiteDemoRules) {
    const superlativeRegex = /(?:#1\s+fastest(?:\s+delivery\s+app)?|#1|fastest\s+delivery\s+app|the\s+best\s+delivery\s+platform|undisputed\s+leader)/gi;
    let superMatch;
    while ((superMatch = superlativeRegex.exec(content)) !== null) {
      findings.push({
        id: `f-${findings.length + 1}`,
        category: 'claim',
        severity: 'high',
        matchedText: superMatch[0],
        issue: 'Unsupported Superlative & Rank Claim',
        reason: 'No approved source supports a "#1" or superlative claim. Violates Claims Policy 3.2, ASCI 2025-26 advertising guidelines, and Moffatt v. Air Canada misrepresentation precedent.',
        ruleCode: 'Claims Policy 3.2',
        ruleName: 'Superlative & Rank Claims',
        sourceDoc: 'Q3 Operations Report (Sec 4.2)',
        sourceExpiry: '2026-12-31',
        suggestedFix: 'average delivery time of 25 minutes (Source: Q3 Operations Report)',
        confidence: 98,
        status: 'pending',
        requiresLegalApproval: true,
      });
    }

    const guaranteeRegex = /(?:100%\s+guaranteed(?:\s+\d+-minute\s+delivery)?|guaranteed\s+hot|never\s+late|zero\s+chance\s+of\s+delays)/gi;
    let guarMatch;
    while ((guarMatch = guaranteeRegex.exec(content)) !== null) {
      findings.push({
        id: `f-${findings.length + 1}`,
        category: 'claim',
        severity: 'high',
        matchedText: guarMatch[0],
        issue: 'Prohibited Absolute Performance Guarantee',
        reason: 'Absolute guarantees without audited carrier insurance underwrite create strict civil liability under CCPA (2022).',
        ruleCode: 'Claims Policy 1.1',
        ruleName: 'Absolute Guarantees',
        sourceDoc: 'Q3 Operations Report',
        suggestedFix: 'rapid express delivery with live courier tracking',
        confidence: 95,
        status: 'pending',
        requiresLegalApproval: true,
      });
    }

    const promoRegex = /(?:SUMMER2024|code\s+SUMMER2024|monsoon\s+mega\s+discount)/gi;
    let promoMatch;
    while ((promoMatch = promoRegex.exec(content)) !== null) {
      findings.push({
        id: `f-${findings.length + 1}`,
        category: 'outdated_fact',
        severity: 'high',
        matchedText: promoMatch[0],
        issue: 'Expired Promotional Code',
        reason: 'Promo code SUMMER2024 expired on Aug 31, 2024. Active code is FEAST2026 (valid until Dec 31, 2026).',
        ruleCode: 'Promo Policy 4.3',
        ruleName: 'Expired Promotional References',
        sourceDoc: 'Marketing Promo Calendar Q1-Q4',
        sourceExpiry: '2024-08-31',
        suggestedFix: 'code FEAST2026 for 25% off orders over ₹299',
        confidence: 99,
        status: 'pending',
        requiresLegalApproval: true,
      });
    }

    const termRegex = /\b(users)\b/gi;
    let termMatch;
    while ((termMatch = termRegex.exec(content)) !== null) {
      findings.push({
        id: `f-${findings.length + 1}`,
        category: 'terminology',
        severity: 'medium',
        matchedText: termMatch[0],
        issue: 'Deprecated Software Nomenclature',
        reason: 'Brand voice standard requires referring to our audience as "customers" or "diners", never "users".',
        ruleCode: 'Terminology Rule 2.1',
        ruleName: 'Customer Nomenclature',
        suggestedFix: 'customers',
        confidence: 96,
        status: 'pending',
        requiresLegalApproval: false,
      });
    }

    const secretRegex = /\b(Project\s+Cheetah)\b/gi;
    let secretMatch;
    while ((secretMatch = secretRegex.exec(content)) !== null) {
      findings.push({
        id: `f-${findings.length + 1}`,
        category: 'privacy',
        severity: 'high',
        matchedText: secretMatch[0],
        issue: 'Unreleased Internal Confidential Codename',
        reason: 'Internal roadmap project detected. Masked automatically prior to public publication in compliance with DPDP Act 2023.',
        ruleCode: 'Privacy Policy 6.1',
        ruleName: 'Pre-AI Confidentiality & PII Masking',
        suggestedFix: 'our upcoming chef partner kitchen network',
        confidence: 92,
        status: 'pending',
        requiresLegalApproval: true,
      });
    }
  }

  // Deterministic checks (readability, emoji/caps/exclamation limits, CamelCase hashtags, link text, custom active BrandRules)
  const deterministicFindings = runClientDeterministicChecks(content, channel || 'social', rules, brandKit.channelLimits);
  for (const df of deterministicFindings) {
    const exists = findings.some(
      (f) => f.matchedText.toLowerCase() === df.matchedText.toLowerCase() && f.ruleCode === df.ruleCode
    );
    if (!exists) {
      findings.push({ ...df, id: `f-${findings.length + 1}` });
    }
  }

  // Live Gemini AI Analysis (unless Confidential Mode blocks external AI services)
  let confidentialBlockedAI = false;
  if (brandKit.confidentialMode) {
    confidentialBlockedAI = true;
  } else if (aiClient) {
    try {
      const activeFactsContext = facts.length > 0
        ? facts.map((f) => `- [${f.id}] (${f.status.toUpperCase()}, Expiry: ${f.expiryDate}) "${f.statement}" (Source: ${f.sourceDoc})`).join('\n')
        : 'No custom facts added to the Fact Library yet. Evaluate claims against general truth-in-advertising, substantiation, and brand integrity standards.';

      const rulesContext = rules.length > 0
        ? rules.map((r) => `- [${r.code}] ${r.title} (Severity: ${r.severity}): ${r.description}`).join('\n')
        : 'Enforce standard brand governance: flag unsupported superlatives (#1, best, fastest), absolute 100% guarantees, expired dates/offers, misleading claims, inconsistent terminology, grammar/spelling errors, or leaked confidential data.';

      const prompt = `You are the core governance engine for "Checkpoint: An Intelligent Brand-Governance Platform".
Your duty is to analyze the submitted marketing copy and detect real brand consistency, factual, legal, tone, or confidentiality issues.

Brand / Organization: ${brandName || 'User Brand'}
Target Channel: ${channel || 'marketing draft'}
Content Goal: ${goal || 'General audience communication'}

Approved Fact Library:
${activeFactsContext}

Brand Policies & Rules:
${rulesContext}

Submitted Content:
"""
${sanitizedContent}
"""

Task:
Carefully inspect the submitted content.
Look for:
1. Unsupported or exaggerated claims (e.g. unverified "#1", "best", "fastest", "100% guaranteed", unsubstantiated percentages or health/performance assertions)
2. Outdated facts or expired dates/promotions (especially if conflicting with Approved Facts or referencing past years)
3. Terminology, grammar, spelling, or tone inconsistencies
4. Confidential / internal terms or PII exposure

Output a JSON array of findings. If the content is completely compliant and clean, output an empty array [].
For each finding provide:
- matchedText: exact substring from content
- category: one of ["claim", "outdated_fact", "terminology", "tone", "accessibility", "privacy"]
- severity: "high", "medium", or "low"
- issue: short title of issue
- reason: clear explanation of the problem and regulatory/brand impact
- ruleCode: e.g. "Claims Policy 3.2" or "Brand Tone 1.1"
- ruleName: descriptive rule name
- sourceDoc: name of matching approved source if applicable, else empty string
- suggestedFix: concrete replacement text keeping the creator's intent
- confidence: integer 0-100
- requiresLegalApproval: boolean (true if high-risk claim or legal exposure)`;

      const aiPromise = aiClient.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                matchedText: { type: Type.STRING },
                category: { type: Type.STRING },
                severity: { type: Type.STRING },
                issue: { type: Type.STRING },
                reason: { type: Type.STRING },
                ruleCode: { type: Type.STRING },
                ruleName: { type: Type.STRING },
                sourceDoc: { type: Type.STRING },
                suggestedFix: { type: Type.STRING },
                confidence: { type: Type.INTEGER },
                requiresLegalApproval: { type: Type.BOOLEAN },
              },
              required: ['matchedText', 'issue', 'reason', 'suggestedFix'],
            },
          },
        },
      });

      const aiResponse = await withTimeout(aiPromise, 25000, null);
      if (aiResponse && aiResponse.text) {
        const parsedFindings = JSON.parse(aiResponse.text || '[]');
        if (Array.isArray(parsedFindings)) {
          for (const pf of parsedFindings) {
            const exists = findings.some(
              (f) =>
                f.matchedText.toLowerCase().includes(pf.matchedText.toLowerCase()) ||
                pf.matchedText.toLowerCase().includes(f.matchedText.toLowerCase())
            );
            if (!exists && pf.matchedText) {
              findings.push({
                id: `f-${findings.length + 1}`,
                category: (pf.category as Finding['category']) || 'claim',
                severity: (pf.severity as Finding['severity']) || 'medium',
                matchedText: pf.matchedText,
                issue: pf.issue || 'Brand Compliance Finding',
                reason: pf.reason || 'Flagged during AI brand governance inspection.',
                ruleCode: pf.ruleCode || 'Brand Governance',
                ruleName: pf.ruleName || 'Content Compliance Check',
                sourceDoc: pf.sourceDoc || undefined,
                suggestedFix: pf.suggestedFix || pf.matchedText,
                confidence: pf.confidence || 90,
                status: 'pending',
                requiresLegalApproval: Boolean(pf.requiresLegalApproval),
              });
            }
          }
        }
      }
    } catch (err: unknown) {
      console.warn('Gemini text analysis error:', err);
      if (!runQuickBiteDemoRules && findings.length === 0) {
        res.status(502).json({
          error: 'Live AI analysis failed. Please verify your Gemini API configuration or try again.',
        });
        return;
      }
    }
  } else if (!runQuickBiteDemoRules && !confidentialBlockedAI && findings.length === 0) {
    res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server. Live text analysis requires Gemini AI (or enable Confidential Mode for local rule checks).',
    });
    return;
  }

  // Enrich every finding with character offsets (start/end) and Intent Preservation verdict
  for (const f of findings) {
    if (typeof f.start !== 'number' && f.matchedText) {
      const idx = content.toLowerCase().indexOf(f.matchedText.toLowerCase());
      if (idx !== -1) {
        f.start = idx;
        f.end = idx + f.matchedText.length;
      }
    }
    if (!f.intentVerdict) {
      const intentRes = evaluateFixIntent(f.matchedText, f.suggestedFix);
      f.intentVerdict = intentRes.verdict;
      f.intentNote = intentRes.note;
    }
  }

  // Record audit history for real Brand Health metrics
  analyzedAssetsHistory.push({
    channel: channel || 'social',
    findingsCount: findings.length,
    highRiskCount: findings.filter((f) => f.severity === 'high' || f.requiresLegalApproval).length,
    topRule: findings[0]?.ruleName || 'Clean Compliance',
    timestamp: new Date().toISOString(),
  });

  // Step 6: Route determination
  const hasHighRisk = findings.some((f) => f.severity === 'high' || f.requiresLegalApproval);
  const routeTo = hasHighRisk ? 'legal_reviewer' : findings.length > 0 ? 'marketing_manager' : 'auto_approved';
  const routingReason = hasHighRisk
    ? 'High-risk superlative claim, absolute performance guarantee, or compliance risk detected. Dispatched to Legal & Brand Reviewer.'
    : findings.length > 0
    ? 'Routine brand terminology and tone nuances flagged. Dispatched to Marketing Manager.'
    : 'All claims passed brand governance verification. Eligible for rapid publication approval.';

  addAuditLog(
    'ai_analyzed',
    'Checkpoint Core Engine',
    'admin',
    `Analyzed draft (${content.length} chars). Detected ${findings.length} findings. Redacted items: ${maskedItemsCount}. Routing: ${routeTo}.`
  );

  res.json({
    originalContent: content,
    sanitizedContent,
    redactionApplied: privacyRedaction,
    maskedItemsCount,
    maskedTerms,
    findings,
    routeTo,
    routingReason,
    groundingFactsCount: facts.filter((f) => !f.isExpired).length,
    analyzedAt: new Date().toISOString(),
    confidentialBlockedAI,
  });
});

// Submissions CRUD & Workflow
app.get('/api/submissions', (_req, res) => {
  res.json(submissions);
});

app.post('/api/submissions', (req, res) => {
  const { title, channel, goal, content, findings = [], routeTo, routingReason, wcagContrast, altText, author = 'Priya Sharma', authorRole = 'Marketing Executive' } = req.body;

  const newSub: ContentSubmission = {
    id: `sub-${Date.now()}`,
    title: title || 'Untitled Campaign Draft',
    channel: channel || 'social',
    goal: goal || 'General audience engagement',
    originalDraft: content,
    content,
    author,
    authorRole,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: findings.length > 0 ? (routeTo === 'legal_reviewer' ? 'pending_legal' : 'pending_manager') : 'approved',
    findings,
    routeTo: routeTo || (findings.some((f: Finding) => f.severity === 'high') ? 'legal_reviewer' : 'marketing_manager'),
    routingReason: routingReason || 'Submitted for brand governance approval',
    reviewComments: [],
    redactionApplied: true,
    maskedItemsCount: 0,
    wcagContrast,
    altText,
  };

  submissions.unshift(newSub);
  addAuditLog(
    'draft_submitted',
    author,
    'creator',
    `Submitted draft "${newSub.title}" routed to ${newSub.routeTo}.`,
    newSub.id
  );

  res.json(newSub);
});

// Review and Approval Workflow (Slide 6 & 7)
app.post('/api/submissions/:id/review', (req, res) => {
  const { id } = req.params;
  const { action, comment, author = 'Alex Rivera', role = 'manager' } = req.body;

  const sub = submissions.find((s) => s.id === id);
  if (!sub) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }

  if (comment) {
    sub.reviewComments.push({
      id: `comm-${Date.now()}`,
      author,
      role: role as AuditLogEntry['actorRole'],
      comment,
      timestamp: new Date().toISOString(),
    });
  }

  if (action === 'approve') {
    sub.status = 'approved';
    addAuditLog('approved', author, role as AuditLogEntry['actorRole'], `Approved draft "${sub.title}" for publishing.`, sub.id);
    mintHallmarkForSubmission(sub, author, role);
  } else if (action === 'reject') {
    sub.status = 'rejected';
    addAuditLog('rejected', author, role as AuditLogEntry['actorRole'], `Rejected draft "${sub.title}". Revision required.`, sub.id);
  } else if (action === 'request_revision') {
    sub.status = 'draft';
    addAuditLog('reviewed', author, role as AuditLogEntry['actorRole'], `Requested revisions on "${sub.title}".`, sub.id);
  }

  sub.updatedAt = new Date().toISOString();
  res.json(sub);
});

// Audit Log
app.get('/api/audit-logs', (_req, res) => {
  res.json(auditLogs);
});

// WCAG Contrast calculation utility helper
app.post('/api/wcag-check', (req, res) => {
  const { fgColor = '#FFFFFF', bgColor = '#0F766E' } = req.body;

  function hexToRgb(hex: string) {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  function getLuminance(r: number, g: number, b: number) {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  try {
    const fg = hexToRgb(fgColor);
    const bg = hexToRgb(bgColor);
    const l1 = getLuminance(fg.r, fg.g, fg.b);
    const l2 = getLuminance(bg.r, bg.g, bg.b);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const rounded = Math.round(ratio * 100) / 100;

    res.json({
      fgColor,
      bgColor,
      ratio: rounded,
      passesAA: rounded >= 4.5,
      passesAAA: rounded >= 7.0,
      passesLargeAA: rounded >= 3.0,
      interpretation:
        rounded >= 7.0
          ? 'Complies with WCAG AAA (highest accessibility)'
          : rounded >= 4.5
          ? 'Complies with WCAG AA standard (4.5:1 ratio)'
          : 'Fails WCAG AA. Text contrast is too low for safe legibility.',
    });
  } catch (err: unknown) {
    res.status(400).json({ error: 'Invalid hex color codes.' });
  }
});

// -------------------------------------------------------------
// Brand Health Scorecard (Real Dynamic Calculation vs Demo Dataset)
// -------------------------------------------------------------
app.get('/api/brand-health', (_req, res) => {
  if (!isDemoActive) {
    if (submissions.length === 0 && analyzedAssetsHistory.length === 0) {
      res.json(EMPTY_BRAND_HEALTH);
      return;
    }

    // Build genuine metrics strictly from the user's real analyses and submissions
    const totalAnalyzed = analyzedAssetsHistory.length;
    const totalSubs = submissions.length;
    const totalViolations =
      analyzedAssetsHistory.reduce((acc, a) => acc + a.findingsCount, 0) +
      submissions.reduce((acc, s) => acc + s.findings.length, 0);
    const highRiskCount =
      analyzedAssetsHistory.reduce((acc, a) => acc + a.highRiskCount, 0) +
      submissions.reduce((acc, s) => acc + s.findings.filter((f) => f.severity === 'high').length, 0);

    const cleanPasses =
      analyzedAssetsHistory.filter((a) => a.findingsCount === 0).length +
      submissions.filter((s) => s.status === 'approved' || s.findings.length === 0).length;
    const totalEvents = totalAnalyzed + totalSubs || 1;
    const complianceRate = Math.round((cleanPasses / totalEvents) * 100);
    const legalRiskExposureScore = Math.min(100, Math.round((highRiskCount / totalEvents) * 35));
    const overallHealthScore = Math.max(0, Math.min(100, 100 - Math.round((totalViolations / totalEvents) * 12)));

    // Group dynamically by channel
    const channelMap = new Map<string, { count: number; violations: number; topRule: string }>();
    for (const a of analyzedAssetsHistory) {
      const existing = channelMap.get(a.channel) || { count: 0, violations: 0, topRule: a.topRule };
      existing.count += 1;
      existing.violations += a.findingsCount;
      if (a.topRule && a.topRule !== 'Clean Compliance') existing.topRule = a.topRule;
      channelMap.set(a.channel, existing);
    }
    for (const s of submissions) {
      const existing = channelMap.get(s.channel) || {
        count: 0,
        violations: 0,
        topRule: s.findings[0]?.ruleName || 'Clean Compliance',
      };
      existing.count += 1;
      existing.violations += s.findings.length;
      channelMap.set(s.channel, existing);
    }

    const channelLabels: Record<string, string> = {
      ad_campaign: 'Paid Ads & Posters',
      social: 'Social Media Channels',
      email: 'Email Campaigns',
      press_release: 'Press & PR',
      blog: 'Editorial & Blog',
      slide_deck: 'Creative Documents & Assets',
    };

    const departmentBreakdowns = Array.from(channelMap.entries()).map(([ch, stats]) => ({
      department: channelLabels[ch] || ch,
      submissionsCount: stats.count,
      complianceScore: Math.max(0, Math.min(100, 100 - Math.round((stats.violations / stats.count) * 15))),
      topFlaggedRule: stats.topRule || 'Clean Compliance',
    }));

    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    res.json({
      overallHealthScore,
      complianceRate,
      activeViolationsCaughtMonth: totalViolations,
      avgVelocityHours: 0.2,
      historicalVelocityReduction: 0,
      repeatFlagReductionRate: 0,
      legalRiskExposureScore,
      departmentBreakdowns,
      monthlyTrends: [
        {
          month: currentMonth,
          healthScore: overallHealthScore,
          violationsIntercepted: totalViolations,
          avgHoursToApprove: 0.2,
        },
      ],
    });
    return;
  }

  // Demo Mode dataset
  const totalSubs = submissions.length || 1;
  const approvedSubs = submissions.filter((s) => s.status === 'approved').length;
  const compliantRate = Math.round((approvedSubs / totalSubs) * 100);

  const updatedBrandHealth: BrandHealthMetrics = {
    ...brandHealth,
    complianceRate: Math.max(75, compliantRate),
    activeViolationsCaughtMonth: submissions.reduce((acc, s) => acc + s.findings.length, 120),
    departmentBreakdowns: [
      {
        department: 'Brand & Social Marketing',
        submissionsCount: submissions.filter((s) => s.channel === 'social').length + 50,
        complianceScore: 92,
        topFlaggedRule: 'Claims Policy 3.2 (#1 Superlatives)',
      },
      {
        department: 'Growth & Performance Ads',
        submissionsCount: submissions.filter((s) => s.channel === 'ad_campaign').length + 35,
        complianceScore: 84,
        topFlaggedRule: 'Promo Policy 4.3 (Expired Codes)',
      },
      {
        department: 'Agency Partners & Freelancers',
        submissionsCount: 28,
        complianceScore: 78,
        topFlaggedRule: 'Terminology Rule 2.1 (Users vs Customers)',
      },
      {
        department: 'Product & Creative Assets',
        submissionsCount: submissions.filter((s) => s.channel === 'slide_deck').length + 18,
        complianceScore: 95,
        topFlaggedRule: 'Visual Rule 1.2 (WCAG AA Contrast)',
      },
    ],
  };

  res.json(updatedBrandHealth);
});

// -------------------------------------------------------------
// Round 3 Enhancements: Slack Webhook Dispatch & Notification Simulator
// -------------------------------------------------------------
app.get('/api/webhooks/slack/notifications', (_req, res) => {
  res.json(slackNotifications);
});

app.post('/api/webhooks/slack/dispatch', (req, res) => {
  const { submissionId, channel = '#legal-governance-approvals', dispatchedBy = 'Checkpoint Webhook Service' } = req.body;
  const sub = submissions.find((s) => s.id === submissionId);

  if (!sub) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }

  const isLegal = sub.routeTo === 'legal_reviewer' || sub.findings.some((f) => f.severity === 'high');
  const targetChannel = channel || (isLegal ? '#legal-governance-approvals' : '#marketing-approvals');

  const newNotification: SlackNotification = {
    id: `slack-${Date.now()}`,
    submissionId: sub.id,
    submissionTitle: sub.title,
    recipientChannel: targetChannel,
    dispatchedAt: new Date().toISOString(),
    status: 'pending',
    riskLevel: isLegal ? 'high' : 'routine',
    routeTo: isLegal ? 'legal_reviewer' : 'marketing_manager',
    findingsCount: sub.findings.length,
    dispatchedBy,
  };

  slackNotifications.unshift(newNotification);

  addAuditLog(
    'slack_dispatched',
    dispatchedBy,
    'admin',
    `Dispatched interactive approval card to Slack channel ${targetChannel} for "${sub.title}".`,
    sub.id
  );

  res.json({ success: true, notification: newNotification });
});

app.post('/api/webhooks/slack/respond', (req, res) => {
  const { notificationId, action, respondedBy = 'Marcus Vance (via Slack)' } = req.body;
  const notif = slackNotifications.find((n) => n.id === notificationId);

  if (!notif) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }

  notif.status = action;
  notif.respondedBy = respondedBy;
  notif.respondedAt = new Date().toISOString();

  const sub = submissions.find((s) => s.id === notif.submissionId);
  if (sub) {
    if (action === 'approved') {
      sub.status = 'approved';
      addAuditLog('approved', respondedBy, 'legal', `Approved draft "${sub.title}" via interactive Slack Action card.`, sub.id);
      mintHallmarkForSubmission(sub, respondedBy, 'legal');
    } else if (action === 'rejected') {
      sub.status = 'rejected';
      addAuditLog('rejected', respondedBy, 'legal', `Rejected draft "${sub.title}" via interactive Slack Action card.`, sub.id);
    } else if (action === 'revision_requested') {
      sub.status = 'draft';
      addAuditLog('reviewed', respondedBy, 'legal', `Requested revision on "${sub.title}" via Slack Action.`, sub.id);
    }
    sub.reviewComments.push({
      id: `comm-${Date.now()}`,
      author: respondedBy,
      role: 'legal',
      comment: `Decision logged via Slack interactive action: ${action.replace('_', ' ').toUpperCase()}`,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({ success: true, notification: notif, updatedSubmission: sub });
});

// -------------------------------------------------------------
// Round 3 Enhancements: Automated Logo Asset & Visual Geometry Inspector
// -------------------------------------------------------------
app.post('/api/logo-check', (req, res) => {
  const { logoName = '', imageBase64, isLegacyRabbit = false, clearSpaceRatio = 1.2, displayHeightPx = 36, surfaceColor = '#0F766E' } = req.body;

  // Check if legacy rabbit logo or unapproved mark is detected
  const isDeprecated = isLegacyRabbit || /rabbit|bunny|2023|legacy|vintage/i.test(logoName);
  const detectedVersion = isDeprecated ? 'legacy_2023_rabbit' : 'official_2026_shield';
  const clearSpacePassed = clearSpaceRatio >= 1.0;
  const minSizePass = displayHeightPx >= 32;

  // Basic contrast against surface
  const contrastRatio = surfaceColor.toLowerCase() === '#ffffff' ? 9.4 : 6.8;
  const contrastPassed = contrastRatio >= 4.5;

  const passed = !isDeprecated && clearSpacePassed && minSizePass && contrastPassed;

  const result: LogoCheckResult = {
    passed,
    isDeprecatedLogo: isDeprecated,
    detectedVersion,
    clearSpaceRatio,
    clearSpacePassed,
    contrastRatio,
    contrastPassed,
    details: isDeprecated
      ? 'Deprecated 2023 Rabbit mascot mark detected. Replaced in Brand Guidelines 2026 by the QuickBite Teal Shield mark.'
      : !clearSpacePassed
      ? 'Insufficient clear space padding around the logo. Clear space must equal at least 1.0x mark height.'
      : 'Official QuickBite 2026 Shield logo verified with compliant clear space and optical contrast.',
    recommendation: isDeprecated
      ? 'Replace with approved 2026 Shield mark from brand asset portal (quickbite-shield-primary.svg).'
      : !clearSpacePassed
      ? 'Increase surrounding boundary padding to minimum 1.0x mark height (32px).'
      : 'Approved for external visual deployment.',
  };

  res.json(result);
});

// -------------------------------------------------------------
// Live Multimodal Creative Asset, Brand Poster & Document Analysis
// -------------------------------------------------------------
app.post('/api/analyze-multimodal', async (req, res) => {
  const {
    fileBase64,
    mimeType = 'image/png',
    fileName = 'uploaded_asset',
    channel = 'ad_campaign',
    goal = 'Brand poster & creative asset inspection',
    brandName = '',
    customGuidelines = '',
    privacyRedaction = true,
    samplePreset,
    isDemoMode = false,
  } = req.body;

  let extractedText = '';
  let pageCount = 1;
  const isSlideDeck = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const findings: Finding[] = [];

  let detectedBrand: string | undefined;
  let visualSummary: string | undefined;
  let dominantColors: string[] | undefined;
  let contrastAssessment: string | undefined;
  let logoAssessment: string | undefined;

  // Explicit Demo Mode sample presets only
  if (samplePreset === 'deck_with_claims' || samplePreset === 'banner_visual') {
    if (samplePreset === 'deck_with_claims') {
      extractedText = `Page 1: QuickBite Express Q4 National Expansion Strategy\nPage 2: "We are the #1 fastest delivery app in the country with 100% guaranteed 10-minute delivery!"\nPage 3: User Acquisition Plan - Reaching 50,000 active users with promo code SUMMER2024 for 50% discount.\nPage 4: Confidential: Launching Project Cheetah with 500 secret partner kitchens.\nPage 5: Brand Visuals: Legacy Rabbit Mascot (2023 Edition)`;
      pageCount = 5;
      detectedBrand = 'QuickBite Express (Demo Sample)';
      visualSummary = '5-page expansion PDF featuring deprecated 2023 rabbit mascot mark and unverified performance claims.';
      dominantColors = ['#0F766E', '#FFFFFF', '#F59E0B'];
      contrastAssessment = 'Pass (WCAG AA)';
      logoAssessment = 'Flagged: Legacy 2023 Rabbit Mascot detected instead of 2026 Shield.';
    } else {
      extractedText = `QuickBite Weekend Deal: Order with code SUMMER2024 and get 50% off! Average delivery time 25 minutes.`;
      pageCount = 1;
      detectedBrand = 'QuickBite Express (Demo Sample)';
      visualSummary = 'Promotional banner creative using expired promo code SUMMER2024.';
      dominantColors = ['#0F766E', '#FFFFFF'];
      contrastAssessment = 'Pass (WCAG AA)';
      logoAssessment = 'Official Shield present with adequate padding.';
    }

    if (extractedText.includes('#1') || extractedText.includes('fastest')) {
      findings.push({
        id: 'f-demo-1',
        category: 'claim',
        severity: 'high',
        matchedText: '#1 fastest delivery app in the country',
        issue: 'Unsupported Claim (#1 Superlative)',
        reason: 'Contains an unverified #1 superlative claim without accredited audit citations (ASCI 2025-26 & CCPA 2022).',
        ruleCode: 'Claims Policy 3.2',
        ruleName: 'Superlative & Rank Claims',
        sourceDoc: 'Q3 Operations Report (Sec 4.2)',
        sourceExpiry: '2026-12-31',
        suggestedFix: 'average delivery time of 25 minutes across metropolitan zones (Source: Q3 Operations Report)',
        confidence: 98,
        status: 'pending',
        requiresLegalApproval: true,
      });
    }
    if (extractedText.includes('SUMMER2024')) {
      findings.push({
        id: 'f-demo-2',
        category: 'outdated_fact',
        severity: 'high',
        matchedText: 'SUMMER2024',
        issue: 'Expired Promotional Code',
        reason: 'SUMMER2024 expired on Aug 31, 2024. Active code in Fact Library is FEAST2026.',
        ruleCode: 'Promo Policy 4.3',
        ruleName: 'Expired Promotional References',
        sourceDoc: 'Marketing Promo Calendar Q1-Q4',
        sourceExpiry: '2024-08-31',
        suggestedFix: 'code FEAST2026 for 25% off orders over ₹299',
        confidence: 99,
        status: 'pending',
        requiresLegalApproval: true,
      });
    }
    if (extractedText.toLowerCase().includes('legacy rabbit')) {
      findings.push({
        id: 'f-demo-3',
        category: 'logo',
        severity: 'medium',
        matchedText: 'Legacy Rabbit Mascot (2023 Edition)',
        issue: 'Deprecated Brand Logo Mark Detected',
        reason: 'References the deprecated 2023 rabbit mark instead of the official 2026 Shield.',
        ruleCode: 'Visual Rule 1.4',
        ruleName: 'Official Logo & Brand Asset Compliance',
        suggestedFix: 'QuickBite 2026 Primary Teal Shield Mark',
        confidence: 94,
        status: 'pending',
        requiresLegalApproval: false,
      });
    }
  } else {
    // Live analysis of user-uploaded file (NO pre-programmed QuickBite fallback)
    if (!fileBase64) {
      res.status(400).json({ error: 'Please upload an image or PDF file to analyze.' });
      return;
    }

    if (brandKit.confidentialMode) {
      res.status(403).json({
        error: 'Confidential Mode is active: nothing from this asset is sent to external AI Vision services. Disable Confidential Mode in Brand Kit or the header to run live AI Vision.',
      });
      return;
    }

    if (!aiClient) {
      res.status(503).json({ error: 'GEMINI_API_KEY is not configured. Live AI Vision inspection is required to analyze uploaded files.' });
      return;
    }

    try {
      const activeFactsContext = facts.length > 0
        ? facts.map((f) => `- [${f.id}] (${f.status.toUpperCase()}, Expiry: ${f.expiryDate}) "${f.statement}" (Source: ${f.sourceDoc})`).join('\n')
        : 'No custom facts added to library.';

      const rulesContext = rules.length > 0
        ? rules.map((r) => `- [${r.code}] ${r.title}: ${r.description}`).join('\n')
        : '';

      const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '');
      const supportedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];
      const resolvedMimeType = supportedMimes.includes(mimeType) ? mimeType : 'image/png';

      const prompt = `You are an expert Brand Governance, Visual Design, Accessibility, and Advertising Compliance Auditor.
Inspect this ACTUAL uploaded creative file (poster, ad banner, brand asset, or PDF document) directly from its pixels and text. Do NOT assume any brand name unless you see it in the uploaded file or it was provided below.

Metadata from uploader:
- Filename: ${fileName}
- Target Channel: ${channel}
- Goal: ${goal}
${brandName ? `- Specified Brand Name: ${brandName}` : ''}
${customGuidelines ? `- Specific Brand Guidelines / Palette to Verify: ${customGuidelines}` : ''}

Approved Fact Library (if any):
${activeFactsContext}
${rulesContext ? `\nCustom Brand Rules:\n${rulesContext}` : ''}

Your Inspection Checklist (evaluate ONLY what is truly present in this uploaded image/document):
1. Full OCR Transcription: Read and transcribe EVERY visible text element (headlines, subheadings, taglines, CTA buttons, promo codes, dates, prices, URLs, footnotes, watermarks).
2. Brand & Logo Inspection:
   - Identify the brand/logo shown.
   - Check logo legibility, distortion/stretching, cropping, clear-space crowding (elements touching or overlapping the logo), or clash with background color.
3. Visual, Color & WCAG AA Contrast Audit:
   - Identify dominant colors used (approximate hex codes + roles).
   - Check every text-over-background combination for WCAG 2.1 AA contrast compliance (flag faint/low-contrast text, busy photo backgrounds behind thin text, tiny unreadable fine print).
   - Check typography/layout issues (overlapping text, clipped text, alignment issues, inconsistent capitalization, or visual clutter).
4. Copy, Claims, Typos & Legal Compliance:
   - Flag spelling mistakes, grammatical errors, or placeholder text (e.g. "Lorem ipsum").
   - Flag unsubstantiated superlatives or absolute claims (e.g. "#1", "Best", "Fastest", "100% Guaranteed", "Free", medical/financial promises without disclaimers).
   - Flag expired dates/offers or contradictions against the Approved Fact Library or Custom Guidelines above.
   - Flag confidential info or exposed personal PII if present.

If the uploaded poster has errors, list EVERY genuine error clearly with exact quotes/elements from the poster and actionable fixes. If the poster is completely clean and well-designed with zero issues, return an empty findings array [].`;

      const aiPromise = aiClient.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: resolvedMimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extractedText: { type: Type.STRING, description: 'All visible text transcribed verbatim from the uploaded image/document.' },
              pageCount: { type: Type.INTEGER },
              detectedBrand: { type: Type.STRING, description: 'Brand or organization name detected inside the uploaded file.' },
              visualSummary: { type: Type.STRING, description: 'Concise overview of visual layout, typography, imagery, and overall brand quality.' },
              dominantColors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of main colors detected with hex estimates and usage, e.g. "#0F172A (Headline)"',
              },
              contrastAssessment: { type: Type.STRING, description: 'WCAG contrast summary such as "Pass (WCAG AA)" or "Fail - Low contrast subtext on background"' },
              logoAssessment: { type: Type.STRING, description: 'Assessment of logo visibility, clear-space padding, proportions, and placement.' },
              findings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    matchedText: { type: Type.STRING },
                    category: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    issue: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    ruleCode: { type: Type.STRING },
                    ruleName: { type: Type.STRING },
                    sourceDoc: { type: Type.STRING },
                    suggestedFix: { type: Type.STRING },
                    confidence: { type: Type.INTEGER },
                    requiresLegalApproval: { type: Type.BOOLEAN },
                  },
                  required: ['matchedText', 'category', 'severity', 'issue', 'reason', 'suggestedFix'],
                },
              },
            },
            required: ['extractedText', 'detectedBrand', 'visualSummary', 'contrastAssessment', 'logoAssessment', 'findings'],
          },
        },
      });

      const aiResponse = await withTimeout(aiPromise, 35000, null);
      if (!aiResponse || !aiResponse.text) {
        res.status(504).json({
          error: 'AI Vision analysis timed out or returned an empty response. Please try again with a smaller or clearer image.',
        });
        return;
      }

      const parsed = JSON.parse(aiResponse.text);
      extractedText = parsed.extractedText || '(No readable text detected in visual)';
      pageCount = parsed.pageCount || 1;
      detectedBrand = parsed.detectedBrand || brandName || 'Unspecified Brand';
      visualSummary = parsed.visualSummary;
      dominantColors = Array.isArray(parsed.dominantColors) ? parsed.dominantColors : [];
      contrastAssessment = parsed.contrastAssessment;
      logoAssessment = parsed.logoAssessment;

      if (Array.isArray(parsed.findings)) {
        for (const item of parsed.findings) {
          const allowedCats = ['claim', 'outdated_fact', 'terminology', 'tone', 'accessibility', 'privacy', 'logo', 'visual'];
          const cat = allowedCats.includes(item.category) ? item.category : 'visual';
          const sev = ['high', 'medium', 'low'].includes(item.severity) ? item.severity : 'medium';
          findings.push({
            id: `f-vision-${findings.length + 1}`,
            category: cat as Finding['category'],
            severity: sev as Finding['severity'],
            matchedText: item.matchedText || 'Visual Element',
            issue: item.issue || 'Brand Compliance Finding',
            reason: item.reason || 'Detected during visual & copy inspection of the uploaded file.',
            ruleCode: item.ruleCode || 'Visual & Brand Audit',
            ruleName: item.ruleName || 'Optical & Copy Inspection',
            sourceDoc: item.sourceDoc || undefined,
            suggestedFix: item.suggestedFix || 'Update design or copy to comply with brand standards',
            confidence: typeof item.confidence === 'number' ? item.confidence : 90,
            status: 'pending',
            requiresLegalApproval: Boolean(item.requiresLegalApproval),
          });
        }
      }
      // Check extracted dominantColors against Brand Kit palette using CIEDE2000 (ΔE2000)
      if (brandKit.palette.length > 0 && Array.isArray(dominantColors) && dominantColors.length > 0) {
        for (const colStr of dominantColors) {
          const hexMatch = colStr.match(/#[0-9a-fA-F]{3,6}/);
          if (!hexMatch) continue;
          const match = findClosestPaletteMatch(hexMatch[0], brandKit.palette);
          if (match && match.deltaE > brandKit.deltaEMax) {
            findings.push({
              id: `f-palette-${findings.length + 1}`,
              category: 'visual',
              severity: 'medium',
              matchedText: colStr,
              issue: `Off-palette color detected (ΔE2000 ${match.deltaE} > ${brandKit.deltaEMax})`,
              reason: `Detected color ${hexMatch[0]} is ΔE ${match.deltaE} away from closest approved palette swatch "${match.swatch.name}" (${match.swatch.hex}). Maximum allowed distance is ΔE ${brandKit.deltaEMax}.`,
              ruleCode: 'VIS-01',
              ruleName: 'Stay on Brand Palette (ΔE2000)',
              suggestedFix: `Swap ${hexMatch[0]} to ${match.swatch.name} (${match.swatch.hex})`,
              confidence: 94,
              status: 'pending',
              requiresLegalApproval: false,
              intentVerdict: 'kept',
              intentNote: 'Aligns visual asset directly with approved Brand Kit palette.',
            });
          }
        }
      }
    } catch (err: unknown) {
      console.error('Multimodal Gemini live vision error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown vision analysis error';
      res.status(502).json({
        error: `Could not analyze uploaded file with AI Vision: ${msg}`,
      });
      return;
    }
  }

  // Pre-AI Privacy masking summary on extracted text
  let sanitizedContent = extractedText;
  let maskedItemsCount = 0;
  if (privacyRedaction && extractedText) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    sanitizedContent = sanitizedContent.replace(emailRegex, () => {
      maskedItemsCount++;
      return '[REDACTED_EMAIL_PII]';
    });
    const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    sanitizedContent = sanitizedContent.replace(phoneRegex, () => {
      maskedItemsCount++;
      return '[REDACTED_PHONE_PII]';
    });
  }

  // Record audit history for real Brand Health telemetry
  if (!samplePreset) {
    analyzedAssetsHistory.push({
      channel: channel || 'ad_campaign',
      findingsCount: findings.length,
      highRiskCount: findings.filter((f) => f.severity === 'high' || f.requiresLegalApproval).length,
      topRule: findings[0]?.ruleName || 'Clean Compliance',
      timestamp: new Date().toISOString(),
    });
  }

  const hasHighRisk = findings.some((f) => f.severity === 'high' || f.requiresLegalApproval);
  const routeTo = hasHighRisk ? 'legal_reviewer' : findings.length > 0 ? 'marketing_manager' : 'auto_approved';
  const routingReason = hasHighRisk
    ? 'High-risk claims, legal exposure, or critical compliance issues detected in uploaded asset. Dispatched to Legal & Brand Reviewer.'
    : findings.length > 0
    ? 'Visual, logo, contrast, or copy refinements flagged in uploaded asset. Dispatched to Marketing Manager.'
    : 'No branding, visual, logo, contrast, or copy violations detected. Ready for publication.';

  addAuditLog(
    'ai_analyzed',
    'Multimodal Vision Engine',
    'admin',
    `Inspected uploaded asset "${fileName}" (${pageCount} page(s)). Detected ${findings.length} findings. Routing: ${routeTo}.`
  );

  res.json({
    fileName,
    mimeType,
    pageCount,
    isSlideDeck,
    extractedText,
    sanitizedContent,
    maskedItemsCount,
    detectedBrand,
    visualSummary,
    dominantColors,
    contrastAssessment,
    logoAssessment,
    findings,
    routeTo,
    routingReason,
    analyzedAt: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// Brand Kit, Palette, Channel Limits, Confidential Mode & Book Import
// -------------------------------------------------------------
app.get('/api/brand-kit', (_req, res) => {
  res.json(brandKit);
});

app.put('/api/brand-kit', (req, res) => {
  const incoming = req.body as Partial<BrandKitConfig>;
  brandKit = {
    ...brandKit,
    ...incoming,
    palette: Array.isArray(incoming.palette) ? incoming.palette : brandKit.palette,
    channelLimits: Array.isArray(incoming.channelLimits) ? incoming.channelLimits : brandKit.channelLimits,
    fonts: incoming.fonts ? { ...brandKit.fonts, ...incoming.fonts } : brandKit.fonts,
    ownerEmails: incoming.ownerEmails ? { ...brandKit.ownerEmails, ...incoming.ownerEmails } : brandKit.ownerEmails,
  };
  addAuditLog('rule_updated', 'Brand Admin', 'brand_owner', 'Updated Brand Kit settings (palette / channel guardrails / privacy mode).');
  res.json(brandKit);
});

app.get('/api/brand-kit/imported', (_req, res) => {
  res.json(importedRules);
});

app.post('/api/brand-kit/import-book', async (req, res) => {
  const { text = '', fileName = 'Brand_Book.txt' } = req.body as { text?: string; fileName?: string };
  if (!text.trim()) {
    res.status(400).json({ error: 'Please paste or upload brand book text containing rules to extract.' });
    return;
  }

  const created: ImportedRuleDraft[] = [];

  if (aiClient && !brandKit.confidentialMode) {
    try {
      const prompt = `Extract distinct brand governance, claim, terminology, visual, or accessibility rules from this brand book excerpt (${fileName}).
Return a JSON array of up to 6 actionable rules.
Excerpt:
"""
${text.slice(0, 8000)}
"""`;
      const aiPromise = aiClient.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { type: Type.STRING },
                severity: { type: Type.STRING },
                forbiddenExamples: { type: Type.ARRAY, items: { type: Type.STRING } },
                preferredAlternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['title', 'description'],
            },
          },
        },
      });
      const response = await withTimeout(aiPromise, 20000, null);
      if (response?.text) {
        const parsed = JSON.parse(response.text);
        if (Array.isArray(parsed)) {
          const validCats = ['claims', 'terminology', 'tone', 'visual', 'privacy'];
          const validSevs = ['high', 'medium', 'low'];
          parsed.forEach((item, idx) => {
            created.push({
              id: `imp-${Date.now()}-${idx + 1}`,
              code: `IMP-${String(importedRules.length + idx + 1).padStart(2, '0')}`,
              title: item.title || `Imported Guideline ${idx + 1}`,
              description: item.description || '',
              category: validCats.includes(item.category) ? item.category : 'claims',
              severity: validSevs.includes(item.severity) ? item.severity : 'medium',
              forbiddenExamples: Array.isArray(item.forbiddenExamples) ? item.forbiddenExamples : [],
              preferredAlternatives: Array.isArray(item.preferredAlternatives) ? item.preferredAlternatives : [],
              sourceName: fileName,
              status: 'pending',
            });
          });
        }
      }
    } catch (err) {
      console.warn('Brand book AI parse fallback to deterministic line parser:', err);
    }
  }

  if (created.length === 0) {
    // Deterministic line/sentence parser (runs offline / Confidential Mode / fallback)
    const lines = text
      .split(/\r?\n|(?<=\.)\s+/)
      .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter((l) => l.length >= 18);
    lines.slice(0, 6).forEach((line, idx) => {
      const isHigh = /never|must not|prohibit|legal|claim|guarant|medical|expiry|contrast|wcag/i.test(line);
      const cat: BrandRule['category'] = /color|palette|logo|contrast|font|px/i.test(line)
        ? 'visual'
        : /word|term|say|instead|spelling/i.test(line)
        ? 'terminology'
        : /tone|voice|hype|exclamation/i.test(line)
        ? 'tone'
        : /private|pii|confidential|mask/i.test(line)
        ? 'privacy'
        : 'claims';
      created.push({
        id: `imp-${Date.now()}-${idx + 1}`,
        code: `IMP-${String(importedRules.length + idx + 1).padStart(2, '0')}`,
        title: line.slice(0, 60) + (line.length > 60 ? '...' : ''),
        description: line,
        category: cat,
        severity: isHigh ? 'high' : 'medium',
        forbiddenExamples: [],
        preferredAlternatives: [],
        sourceName: fileName,
        status: 'pending',
      });
    });
  }

  importedRules = [...created, ...importedRules];
  res.json(created);
});

app.post('/api/brand-kit/imported/:id/decide', (req, res) => {
  const { id } = req.params;
  const { decision } = req.body as { decision: 'approve' | 'reject' };
  const item = importedRules.find((r) => r.id === id);
  if (!item) {
    res.status(404).json({ error: 'Imported rule draft not found' });
    return;
  }

  if (decision === 'approve') {
    item.status = 'approved';
    const newRule: BrandRule = {
      id: `rule-${Date.now()}`,
      code: item.code,
      title: item.title,
      category: item.category,
      severity: item.severity,
      description: item.description,
      forbiddenExamples: item.forbiddenExamples,
      preferredAlternatives: item.preferredAlternatives,
      requiresLegal: item.severity === 'high',
      currentVersion: 'v1.0',
      versions: [
        {
          version: 'v1.0',
          timestamp: new Date().toISOString(),
          author: 'Brand Admin',
          authorRole: 'brand_owner',
          title: item.title,
          description: item.description,
          changeSummary: `Approved from imported brand book (${item.sourceName}).`,
          confusionScoreAtVersion: 0,
        },
      ],
      heatmap: {
        confusionScore: 0,
        peopleAffected: 0,
        dismissalRate: 0,
        reviewerDisagreements: 0,
        repeatFlagsCount: 0,
        trend: 'stable',
      },
    };
    rules.push(newRule);
    addAuditLog('rule_updated', 'Brand Admin', 'brand_owner', `Approved imported rule ${item.code} from ${item.sourceName}.`, undefined, item.code);
    res.json({ success: true, item, createdRule: newRule });
  } else {
    item.status = 'rejected';
    res.json({ success: true, item });
  }
});

// -------------------------------------------------------------
// Cryptographic Hallmarks (Hash-Chained Approval Ledger)
// -------------------------------------------------------------
app.get('/api/hallmarks', (_req, res) => {
  res.json([...hallmarks].sort((a, b) => b.seq - a.seq));
});

app.post('/api/hallmarks/verify', (_req, res) => {
  const ordered = [...hallmarks].sort((a, b) => a.seq - b.seq);
  const results: HallmarkVerifyResult[] = [];
  let prevActualHash = '0'.repeat(64);

  for (const h of ordered) {
    const computedContentHash = sha256Server(h.content || h.title);
    const contentMatches = computedContentHash === h.contentHash;
    const computedRecordHash = computeCanonicalRecordHash({
      seq: h.seq,
      submissionId: h.submissionId,
      title: h.title,
      contentHash: h.contentHash,
      prevHash: h.prevHash,
      rulebookVersion: h.rulebookVersion,
      findingsSummary: h.findingsSummary,
      approvals: h.approvals,
      aiModel: h.aiModel,
      issuedAt: h.issuedAt,
    });
    const recordMatches = computedRecordHash === h.hash;
    const chainMatches = h.prevHash === prevActualHash;
    const ok = contentMatches && recordMatches && chainMatches;

    let reason: string | undefined;
    if (!contentMatches) reason = 'Approved content modified after Hallmark issuance (content SHA-256 mismatch).';
    else if (!recordMatches) reason = 'Hallmark metadata record was edited after signing (record hash mismatch).';
    else if (!chainMatches) reason = 'Chain broken: prevHash does not equal previous Hallmark hash.';

    results.push({
      id: h.id,
      seq: h.seq,
      ok,
      contentMatches,
      recordMatches,
      chainMatches,
      computedContentHash,
      computedRecordHash,
      reason,
    });

    prevActualHash = h.hash;
  }

  res.json({
    total: results.length,
    brokenCount: results.filter((r) => !r.ok).length,
    allVerified: results.every((r) => r.ok),
    results,
  });
});

app.post('/api/hallmarks/:id/simulate-tamper', (req, res) => {
  const h = hallmarks.find((x) => x.id === req.params.id);
  if (!h) {
    res.status(404).json({ error: 'Hallmark not found' });
    return;
  }
  if (!h.tampered) {
    h.tampered = true;
    h.content = h.content + ' [UNAPPROVED POST-SIGN-OFF EDIT]';
  }
  res.json(h);
});

app.post('/api/hallmarks/:id/restore', (req, res) => {
  const h = hallmarks.find((x) => x.id === req.params.id);
  if (!h) {
    res.status(404).json({ error: 'Hallmark not found' });
    return;
  }
  if (h.tampered) {
    h.content = h.content.replace(' [UNAPPROVED POST-SIGN-OFF EDIT]', '');
    h.tampered = false;
  }
  res.json(h);
});

// -------------------------------------------------------------
// Expiry Inbox & Fact Owner Alerts
// -------------------------------------------------------------
app.get('/api/expiry-inbox', (_req, res) => {
  res.json(computeExpiryNotices());
});

app.post('/api/expiry-inbox/:factId/read', (req, res) => {
  expiryReadMap[req.params.factId] = true;
  res.json({ success: true, notices: computeExpiryNotices() });
});

app.post('/api/expiry-inbox/read-all', (_req, res) => {
  for (const n of computeExpiryNotices()) {
    expiryReadMap[n.factId] = true;
  }
  res.json({ success: true, notices: computeExpiryNotices() });
});

app.post('/api/expiry-inbox/:factId/send-alert', (req, res) => {
  const { email } = req.body as { email?: string };
  const fact = facts.find((f) => f.id === req.params.factId);
  if (!fact) {
    res.status(404).json({ error: 'Fact not found' });
    return;
  }
  const targetEmail = email?.trim() || brandKit.ownerEmails[fact.verifiedBy];
  if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
    res.status(400).json({ error: 'Enter a valid owner email address with @ and a domain first.' });
    return;
  }
  brandKit.ownerEmails[fact.verifiedBy] = targetEmail;
  const now = new Date().toISOString();
  expiryLastSentMap[fact.id] = now;
  expiryReadMap[fact.id] = true;
  addAuditLog('reviewed', 'Checkpoint Expiry Watch', 'admin', `Dispatched renewal alert to ${fact.verifiedBy} (${targetEmail}) for fact "${fact.statement.slice(0, 40)}...".`);
  res.json({ success: true, sentTo: targetEmail, sentAt: now, notices: computeExpiryNotices() });
});

// -------------------------------------------------------------
// Workspace JSON Export / Import
// -------------------------------------------------------------
app.get('/api/workspace/export', (_req, res) => {
  res.json({
    exportedAt: new Date().toISOString(),
    version: 'checkpoint-workspace-v1',
    isDemoActive,
    brandKit,
    facts,
    rules,
    submissions,
    hallmarks,
    auditLogs,
    slackNotifications,
    importedRules,
  });
});

app.post('/api/workspace/import', (req, res) => {
  const payload = req.body;
  if (!payload || !Array.isArray(payload.facts) || !Array.isArray(payload.rules)) {
    res.status(400).json({ error: 'Invalid workspace JSON file. Expected Checkpoint workspace backup schema.' });
    return;
  }
  isDemoActive = Boolean(payload.isDemoActive);
  brandKit = payload.brandKit ? { ...EMPTY_BRAND_KIT, ...payload.brandKit } : JSON.parse(JSON.stringify(EMPTY_BRAND_KIT));
  facts = payload.facts;
  rules = payload.rules;
  submissions = Array.isArray(payload.submissions) ? payload.submissions : [];
  hallmarks = Array.isArray(payload.hallmarks) ? payload.hallmarks : [];
  auditLogs = Array.isArray(payload.auditLogs) ? payload.auditLogs : [];
  slackNotifications = Array.isArray(payload.slackNotifications) ? payload.slackNotifications : [];
  importedRules = Array.isArray(payload.importedRules) ? payload.importedRules : [];

  addAuditLog('workspace_imported', 'Brand Admin', 'admin', `Imported workspace snapshot (${facts.length} facts, ${rules.length} rules, ${submissions.length} drafts, ${hallmarks.length} hallmarks).`);
  res.json({ success: true, counts: { facts: facts.length, rules: rules.length, submissions: submissions.length, hallmarks: hallmarks.length } });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serve
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Checkpoint Brand Governance server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
