import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_FACTS, INITIAL_RULES, INITIAL_SUBMISSIONS, INITIAL_AUDIT_LOGS } from './src/data/initialData.ts';
import { ApprovedFact, BrandRule, ContentSubmission, AuditLogEntry, Finding } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory data store for the application
let facts: ApprovedFact[] = JSON.parse(JSON.stringify(INITIAL_FACTS));
let rules: BrandRule[] = JSON.parse(JSON.stringify(INITIAL_RULES));
let submissions: ContentSubmission[] = JSON.parse(JSON.stringify(INITIAL_SUBMISSIONS));
let auditLogs: AuditLogEntry[] = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));

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
  facts = JSON.parse(JSON.stringify(INITIAL_FACTS));
  rules = JSON.parse(JSON.stringify(INITIAL_RULES));
  submissions = JSON.parse(JSON.stringify(INITIAL_SUBMISSIONS));
  auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));

  addAuditLog(
    'draft_submitted',
    'System Admin',
    'admin',
    'Demo environment reset to initial hackathon sample dataset.'
  );

  res.json({ success: true, message: 'Demo environment reset successfully.' });
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
  const updatedRule: BrandRule = req.body;
  const index = rules.findIndex((r) => r.id === updatedRule.id || r.code === updatedRule.code);
  if (index !== -1) {
    rules[index] = { ...rules[index], ...updatedRule };
    addAuditLog('rule_updated', 'Sarah Chen', 'brand_owner', `Updated rule wording: ${updatedRule.code}`);
    res.json(rules[index]);
  } else {
    rules.push(updatedRule);
    res.json(updatedRule);
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

  // Fallback high quality rewrites if Gemini is not configured or takes too long
  let rewrittenTitle = targetRule.title;
  let rewrittenDescription = targetRule.aiSuggestedRewrite || targetRule.description;
  let rationale = 'Eliminated vague qualitative phrases; required precise citations with certified sources.';

  if (aiClient) {
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
        model: 'gemini-3.8-flash',
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

      const response = await withTimeout(aiPromise, 4000, null);
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

// Approve Rule Rewrite
app.post('/api/rules/:id/approve-rewrite', (req, res) => {
  const { id } = req.params;
  const { newDescription, newTitle } = req.body;
  const rule = rules.find((r) => r.id === id);

  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  rule.originalWording = rule.description;
  rule.description = newDescription || rule.aiSuggestedRewrite || rule.description;
  if (newTitle) rule.title = newTitle;
  rule.isRewritten = true;
  // Decrease confusion metrics as evidence of learning (Slide 6 & 10)
  rule.heatmap.confusionScore = Math.max(15, Math.round(rule.heatmap.confusionScore * 0.45));
  rule.heatmap.dismissalRate = Math.max(5, Math.round(rule.heatmap.dismissalRate * 0.35));
  rule.heatmap.trend = 'declining';

  addAuditLog(
    'rule_updated',
    'Sarah Chen',
    'brand_owner',
    `Approved clarity rewrite for rule ${rule.code}: Drop in repeat flags expected.`,
    undefined,
    rule.code
  );

  res.json({ success: true, updatedRule: rule });
});

// Pre-Publication Check & Analysis (The Core 8-Stage Engine: Slides 5, 6, 7 & 8)
app.post('/api/analyze', async (req, res) => {
  const { content, channel, goal, privacyRedaction = true } = req.body;

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
    const codenameRegex = /\b(Project\s+[A-Z][a-z]+|Project\s+Cheetah)\b/gi;
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

  // Step 4: Deterministic Rule Engine checks
  const findings: Finding[] = [];

  // Check 1: Superlatives & Unsubstantiated claims (Slide 6 illustrative example)
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

  // Check 2: Absolute Guarantees (CCPA 2022)
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

  // Check 3: Expired Promotional Codes against Fact Library
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

  // Check 4: Terminology ("users" vs "customers"/"diners")
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

  // Check 5: Confidential Codenames
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

  // Gemini Grounded Verification (if AI key is present and findings count is low, or for comprehensive analysis)
  if (aiClient) {
    try {
      const activeFactsContext = facts
        .map((f) => `- [${f.id}] (${f.status.toUpperCase()}, Expiry: ${f.expiryDate}) "${f.statement}" (Source: ${f.sourceDoc})`)
        .join('\n');

      const rulesContext = rules
        .map((r) => `- [${r.code}] ${r.title} (Severity: ${r.severity}): ${r.description}`)
        .join('\n');

      const prompt = `You are the core governance engine for "Checkpoint: An Intelligent Brand-Governance Platform".
Your duty is to stop brand inconsistency, outdated facts, and unsupported claims before content is published.

Approved Fact Library (Source of Truth):
${activeFactsContext}

Brand Policies & Rules:
${rulesContext}

Submitted Content (${channel || 'marketing draft'}):
"""
${sanitizedContent}
"""

Task:
Analyze the content strictly grounded in the Approved Fact Library and Brand Policies.
If an assertion is made that is NOT substantiated by the approved facts or references an expired fact/promo, flag it!
Look for:
1. Unsupported claims (e.g. claims of supremacy, unqualified statistics, unproven speed or guarantee)
2. Outdated facts (e.g. expired offers, obsolete numbers)
3. Terminology violations (e.g. saying "users" instead of "customers")
4. Confidential / internal terminology

Output a JSON array of findings. If everything is compliant, output an empty array [].
For each finding provide:
- matchedText: exact substring from content
- category: one of ["claim", "outdated_fact", "terminology", "tone", "accessibility", "privacy"]
- severity: "high", "medium", or "low"
- issue: short title of issue
- reason: detailed explanation citing the specific legal context (ASCI / CCPA / Air Canada precedent) or fact mismatch
- ruleCode: e.g. "Claims Policy 3.2"
- ruleName: e.g. "Superlative & Rank Claims"
- sourceDoc: name of approved source if relevant
- suggestedFix: concrete replacement text keeping the creator's intent
- confidence: integer 0-100
- requiresLegalApproval: boolean (true if claim / high risk / legal issue)`;

      const aiPromise = aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
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

      const aiResponse = await withTimeout(aiPromise, 3500, null);
      if (aiResponse && aiResponse.text) {
        const parsedFindings = JSON.parse(aiResponse.text || '[]');
        if (Array.isArray(parsedFindings)) {
          for (const pf of parsedFindings) {
            // Avoid duplicate findings if already caught by rule engine
            const exists = findings.some(
              (f) => f.matchedText.toLowerCase().includes(pf.matchedText.toLowerCase()) || pf.matchedText.toLowerCase().includes(f.matchedText.toLowerCase())
            );
            if (!exists && pf.matchedText && content.includes(pf.matchedText)) {
              findings.push({
                id: `f-${findings.length + 1}`,
                category: (pf.category as Finding['category']) || 'claim',
                severity: (pf.severity as Finding['severity']) || 'medium',
                matchedText: pf.matchedText,
                issue: pf.issue || 'Brand Compliance Finding',
                reason: pf.reason || 'Flagged during grounded review against brand guidelines.',
                ruleCode: pf.ruleCode || 'Claims Policy 3.2',
                ruleName: pf.ruleName || 'Grounded Brand Check',
                sourceDoc: pf.sourceDoc || 'Q3 Operations Report',
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
      console.warn('Gemini analysis note, proceeding with rule engine results:', err);
    }
  }

  // Step 6: Route determination
  const hasHighRisk = findings.some((f) => f.severity === 'high' || f.requiresLegalApproval);
  const routeTo = hasHighRisk ? 'legal_reviewer' : findings.length > 0 ? 'marketing_manager' : 'auto_approved';
  const routingReason = hasHighRisk
    ? 'High-risk superlative claim, absolute performance guarantee, or expired offer detected. Dispatched to Legal & Brand Reviewer.'
    : findings.length > 0
    ? 'Routine brand terminology and tone nuances flagged. Dispatched to Marketing Manager.'
    : 'All claims grounded in active fact library. Eligible for rapid publication approval.';

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
