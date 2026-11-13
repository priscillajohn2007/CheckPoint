import type { ApprovedFact, BrandRule, ContentSubmission, AuditLogEntry, SlackNotification, BrandHealthMetrics } from '../types/index.ts';

export const INITIAL_FACTS: ApprovedFact[] = [
  {
    id: 'fact-1',
    statement: 'Our average delivery time is 25 minutes across metropolitan service areas.',
    category: 'operations',
    sourceDoc: 'Q3 Operations Report',
    sourceSection: 'Sec 4.2: Urban Logistics Benchmarks',
    effectiveDate: '2025-10-01',
    expiryDate: '2026-12-31',
    isExpired: false,
    status: 'active',
    verifiedBy: 'Operations Director',
    notes: 'Audited monthly; verified against 1.2M deliveries.'
  },
  {
    id: 'fact-2',
    statement: 'SUMMER2024 coupon code provides 50% discount up to ₹150 on first order.',
    category: 'pricing',
    sourceDoc: 'Summer Growth Campaign Memo',
    sourceSection: 'Appendix B: Discount Matrix',
    effectiveDate: '2024-05-01',
    expiryDate: '2024-08-31',
    isExpired: true,
    status: 'expired',
    verifiedBy: 'Growth Lead',
    notes: 'EXPIRED! Campaign concluded Aug 31, 2024. Active code is FEAST2026.'
  },
  {
    id: 'fact-3',
    statement: 'QuickBite Express operates across 45 certified municipal zones in India.',
    category: 'operations',
    sourceDoc: 'Annual Expansion Disclosure 2025-26',
    sourceSection: 'Geography Breakdown p.14',
    effectiveDate: '2025-06-01',
    expiryDate: '2026-11-30',
    isExpired: false,
    status: 'active',
    verifiedBy: 'VP Operations',
    notes: 'Do not claim 50+ or nationwide coverage until Phase 3 rollout.'
  },
  {
    id: 'fact-4',
    statement: 'All rider partners receive group accident cover up to ₹5,00,000.',
    category: 'compliance',
    sourceDoc: 'Partner Welfare Policy Doc',
    sourceSection: 'Section 8: Insurance Underwriting',
    effectiveDate: '2025-01-01',
    expiryDate: '2026-12-31',
    isExpired: false,
    status: 'active',
    verifiedBy: 'Chief Legal Officer',
    notes: 'Must not describe as "unlimited coverage" or "medical guarantee".'
  },
  {
    id: 'fact-5',
    statement: 'Packaging utilizes 94% biodegradable sugarcane pulp containers decomposing in 90 days.',
    category: 'esg',
    sourceDoc: 'ESG Sustainability Audit 2025',
    sourceSection: 'Table 3: Materials Lifecycle',
    effectiveDate: '2025-03-15',
    expiryDate: '2026-09-30',
    isExpired: false,
    status: 'active',
    verifiedBy: 'Sustainability Head',
    notes: 'Complies with Central Pollution Control Board (CPCB) norms.'
  },
  {
    id: 'fact-6',
    statement: 'FEAST2026 active promo offers 25% off up to ₹100 on orders above ₹299.',
    category: 'pricing',
    sourceDoc: 'Marketing Promo Calendar Q1-Q4',
    sourceSection: 'Promo Code Schedule #91',
    effectiveDate: '2026-01-01',
    expiryDate: '2026-12-31',
    isExpired: false,
    status: 'active',
    verifiedBy: 'Marketing Lead',
    notes: 'Valid until year end. Requires min basket ₹299.'
  }
];

export const INITIAL_RULES: BrandRule[] = [
  {
    id: 'rule-claims-3.2',
    code: 'Claims Policy 3.2',
    title: 'Superlative & Rank Claims ("#1", "Fastest", "Best")',
    category: 'claims',
    severity: 'high',
    description: 'Never use unsubstantiated superlative or comparative ranking claims (e.g., "#1 delivery app", "fastest", "cheapest") without an accredited external industry audit certificate cited by name (ASCI Guidelines 2025-26 & CCPA 2022).',
    forbiddenExamples: ['We are the #1 fastest delivery app', 'The country\'s best food delivery', 'Undisputed leader in speed'],
    preferredAlternatives: ['Our average delivery time is 25 minutes (Source: Q3 Operations Report)', 'Rated 4.7/5 stars by over 80,000 diners on Play Store'],
    requiresLegal: true,
    heatmap: {
      confusionScore: 88,
      peopleAffected: 24,
      dismissalRate: 42,
      reviewerDisagreements: 11,
      repeatFlagsCount: 67,
      trend: 'rising'
    },
    currentVersion: 'v1.0',
    versions: [
      {
        version: 'v1.0',
        timestamp: '2026-08-15T09:00:00Z',
        author: 'Sarah Chen',
        authorRole: 'VP Brand',
        title: 'Superlative & Rank Claims ("#1", "Fastest", "Best")',
        description: 'Never use unsubstantiated superlative or comparative ranking claims (e.g., "#1 delivery app", "fastest", "cheapest") without an accredited external industry audit certificate cited by name (ASCI Guidelines 2025-26 & CCPA 2022).',
        changeSummary: 'Initial policy baseline following legal consultation.',
        confusionScoreAtVersion: 88
      }
    ],
    originalWording: 'Staff should avoid excessive boasting or subjective superlatives unless certified by external marketing board standards.',
    aiSuggestedRewrite: 'Never state "#1", "Fastest", "Best", or "Leading" without citing an official third-party audit report by name in the same sentence. When citing delivery speed, always state the exact audited figure: "Our average delivery time is 25 minutes (Source: Q3 Operations Report)".',
    rewriteReason: 'Original rule used ambiguous terms ("avoid excessive boasting"). Creators frequently dismissed flags believing their phrasing was acceptable.',
    isRewritten: false
  },
  {
    id: 'rule-claims-1.1',
    code: 'Claims Policy 1.1',
    title: 'Absolute Guarantees ("100% Guaranteed", "Never Late")',
    category: 'claims',
    severity: 'high',
    description: 'Absolute performance guarantees ("100% guaranteed on time", "never cold", "zero delays") create strict consumer liability under CCPA (2022) and the Moffatt v. Air Canada (2024) misrepresentation precedent. Strict prohibition.',
    forbiddenExamples: ['100% guaranteed 10-minute delivery', 'Guaranteed hot or your money back', 'Zero chance of cancellation'],
    preferredAlternatives: ['We strive for rapid delivery with real-time tracking', 'Live courier tracking with on-time commitment'],
    requiresLegal: true,
    currentVersion: 'v1.0',
    versions: [
      {
        version: 'v1.0',
        timestamp: '2026-07-20T10:00:00Z',
        author: 'Marcus Vance',
        authorRole: 'Legal Counsel',
        title: 'Absolute Guarantees ("100% Guaranteed", "Never Late")',
        description: 'Absolute performance guarantees ("100% guaranteed on time", "never cold", "zero delays") create strict consumer liability under CCPA (2022) and the Moffatt v. Air Canada (2024) misrepresentation precedent. Strict prohibition.',
        changeSummary: 'Codified after Moffatt v. Air Canada liability case review.',
        confusionScoreAtVersion: 74
      }
    ],
    heatmap: {
      confusionScore: 74,
      peopleAffected: 18,
      dismissalRate: 31,
      reviewerDisagreements: 8,
      repeatFlagsCount: 45,
      trend: 'rising'
    }
  },
  {
    id: 'rule-term-2.1',
    code: 'Terminology Rule 2.1',
    title: 'Customer Nomenclature ("Customers/Diners" vs "Users")',
    category: 'terminology',
    severity: 'medium',
    description: 'Always refer to patrons as "customers" or "diners". The technical software term "users" is strictly deprecated in all outward marketing communications.',
    forbiddenExamples: ['Our users love our app', 'Signed up 10,000 new users this week', 'User ratings show high satisfaction'],
    preferredAlternatives: ['Our customers love our menu selection', 'Welcomed 10,000 new diners this week', 'Customer reviews reflect high delight'],
    requiresLegal: false,
    heatmap: {
      confusionScore: 48,
      peopleAffected: 32,
      dismissalRate: 15,
      reviewerDisagreements: 3,
      repeatFlagsCount: 89,
      trend: 'stable'
    }
  },
  {
    id: 'rule-promo-4.3',
    code: 'Promo Policy 4.3',
    title: 'Expired Promotional References & Codes',
    category: 'claims',
    severity: 'high',
    description: 'Promotional codes, seasonal offers, and cashback percentages must be verified against the active Fact Library. Publishing an expired code (e.g. SUMMER2024) violates ASCI deceptive advertising standards.',
    forbiddenExamples: ['Use code SUMMER2024 for 50% off', 'Get our monsoon mega discount today (expired)'],
    preferredAlternatives: ['Use active code FEAST2026 for 25% off orders over ₹299 (Source: Promo Calendar)'],
    requiresLegal: true,
    heatmap: {
      confusionScore: 62,
      peopleAffected: 14,
      dismissalRate: 18,
      reviewerDisagreements: 4,
      repeatFlagsCount: 29,
      trend: 'declining'
    }
  },
  {
    id: 'rule-visual-1.2',
    code: 'Visual Rule 1.2',
    title: 'WCAG AA Visual Text Contrast (≥ 4.5:1)',
    category: 'visual',
    severity: 'medium',
    description: 'All text overlaying promotional visuals, banners, or badges must maintain a minimum contrast ratio of 4.5:1 against its background color for body text, and 3:1 for large display text (WCAG 2.1 AA).',
    forbiddenExamples: ['Light gray text #94A3B8 on white #FFFFFF (2.1:1 ratio)', 'Pastel yellow text on white background'],
    preferredAlternatives: ['High contrast slate #0F172A on white (16.2:1 ratio)', 'White text #FFFFFF on deep teal #0D5C75 (7.8:1 ratio)'],
    requiresLegal: false,
    heatmap: {
      confusionScore: 55,
      peopleAffected: 12,
      dismissalRate: 22,
      reviewerDisagreements: 6,
      repeatFlagsCount: 38,
      trend: 'stable'
    }
  },
  {
    id: 'rule-privacy-6.1',
    code: 'Privacy Policy 6.1',
    title: 'Pre-AI Confidentiality & PII Masking (DPDP Act 2023)',
    category: 'privacy',
    severity: 'high',
    description: 'Internal project codenames (e.g., "Project Cheetah"), unpublished financial projections, employee phone numbers, and customer PII must be masked prior to external AI processing.',
    forbiddenExamples: ['Launching Project Cheetah with 500 secret ghost kitchens', 'Contact Priya at +91-98765-43210'],
    preferredAlternatives: ['[CONFIDENTIAL_PROJECT] with [RESTRICTED_METRIC] partner facilities', 'Contact customer support via official app channels'],
    requiresLegal: true,
    heatmap: {
      confusionScore: 68,
      peopleAffected: 9,
      dismissalRate: 10,
      reviewerDisagreements: 2,
      repeatFlagsCount: 19,
      trend: 'declining'
    }
  }
];

export const INITIAL_SUBMISSIONS: ContentSubmission[] = [
  {
    id: 'sub-hackathon-demo',
    title: 'QuickBite Weekend Flash Campaign (Priya Draft)',
    channel: 'social',
    goal: 'Boost weekend lunch orders among urban working professionals on Instagram & LinkedIn.',
    originalDraft: 'QuickBite is the #1 fastest delivery app in the country! Our users love our 100% guaranteed 10-minute delivery and get 50% off with code SUMMER2024. Secret launch: Project Cheetah rolling out to 15,000 customers. Order now from the best delivery platform!',
    content: 'QuickBite is the #1 fastest delivery app in the country! Our users love our 100% guaranteed 10-minute delivery and get 50% off with code SUMMER2024. Secret launch: Project Cheetah rolling out to 15,000 customers. Order now from the best delivery platform!',
    author: 'Priya Sharma',
    authorRole: 'Marketing Executive',
    createdAt: '2026-11-07T06:30:00Z',
    updatedAt: '2026-11-07T07:15:00Z',
    status: 'analyzed',
    routeTo: 'legal_reviewer',
    routingReason: 'High-risk superlative claim ("#1 fastest"), absolute guarantee ("100% guaranteed"), and expired discount code detected.',
    redactionApplied: true,
    maskedItemsCount: 1,
    wcagContrast: {
      fgColor: '#FBBF24',
      bgColor: '#FFFFFF',
      ratio: 1.8,
      passesAA: false,
      passesAAA: false
    },
    altText: 'Promotional banner announcing weekend food delivery discounts',
    reviewComments: [
      {
        id: 'c-1',
        author: 'Alex Rivera',
        role: 'manager',
        comment: 'Flagged superlative "#1" and code SUMMER2024 to Legal Reviewer. Please review the Q3 Operations Report reference.',
        timestamp: '2026-11-07T07:18:00Z'
      }
    ],
    findings: [
      {
        id: 'f-1',
        category: 'claim',
        severity: 'high',
        matchedText: '#1 fastest delivery app in the country',
        issue: 'Unsupported Superlative & Comparative Claim',
        reason: 'No approved source supports a "#1" or "fastest in country" claim. Violates Claims Policy 3.2, ASCI 2025-26 advertising guidelines, and Moffatt v. Air Canada misrepresentation precedent.',
        ruleCode: 'Claims Policy 3.2',
        ruleName: 'Superlative & Rank Claims',
        sourceDoc: 'Q3 Operations Report (Sec 4.2)',
        sourceExpiry: '2026-12-31',
        suggestedFix: 'average delivery time of 25 minutes (Source: Q3 Operations Report)',
        confidence: 98,
        status: 'pending',
        requiresLegalApproval: true
      },
      {
        id: 'f-2',
        category: 'claim',
        severity: 'high',
        matchedText: '100% guaranteed 10-minute delivery',
        issue: 'Prohibited Absolute Performance Guarantee',
        reason: 'Absolute guarantees without audited carrier insurance underwrite create strict civil liability under CCPA (2022).',
        ruleCode: 'Claims Policy 1.1',
        ruleName: 'Absolute Guarantees',
        sourceDoc: 'Q3 Operations Report',
        suggestedFix: 'rapid express delivery with live courier tracking',
        confidence: 95,
        status: 'pending',
        requiresLegalApproval: true
      },
      {
        id: 'f-3',
        category: 'outdated_fact',
        severity: 'high',
        matchedText: 'code SUMMER2024',
        issue: 'Expired Promotional Code',
        reason: 'Code SUMMER2024 expired on Aug 31, 2024. Active approved promo code in library is FEAST2026 (valid until Dec 31, 2026).',
        ruleCode: 'Promo Policy 4.3',
        ruleName: 'Expired Promotional References',
        sourceDoc: 'Marketing Promo Calendar Q1-Q4',
        sourceExpiry: '2024-08-31',
        suggestedFix: 'code FEAST2026 for 25% off orders over ₹299',
        confidence: 99,
        status: 'pending',
        requiresLegalApproval: true
      },
      {
        id: 'f-4',
        category: 'terminology',
        severity: 'medium',
        matchedText: 'users',
        issue: 'Deprecated Software Nomenclature',
        reason: 'Brand voice standard requires referring to our audience as "customers" or "diners", never "users".',
        ruleCode: 'Terminology Rule 2.1',
        ruleName: 'Customer Nomenclature',
        suggestedFix: 'customers',
        confidence: 96,
        status: 'pending',
        requiresLegalApproval: false
      },
      {
        id: 'f-5',
        category: 'privacy',
        severity: 'high',
        matchedText: 'Project Cheetah',
        issue: 'Unreleased Internal Confidential Codename',
        reason: 'Internal roadmap project detected. Masked automatically prior to public publication in compliance with DPDP Act 2023.',
        ruleCode: 'Privacy Policy 6.1',
        ruleName: 'Pre-AI Confidentiality & PII Masking',
        suggestedFix: 'our upcoming chef partner kitchen network',
        confidence: 92,
        status: 'pending',
        requiresLegalApproval: true
      }
    ]
  },
  {
    id: 'sub-2',
    title: 'App Store Update Release Notes',
    channel: 'ad_campaign',
    goal: 'Communicate app version v4.2 speed and payment improvements.',
    originalDraft: 'QuickBite Express v4.2: Experience average delivery times of 25 minutes across metropolitan zones (Source: Q3 Operations Report). We now support 100% contactless digital payments across UPI and cards. Order tonight from 45 certified cities!',
    content: 'QuickBite Express v4.2: Experience average delivery times of 25 minutes across metropolitan zones (Source: Q3 Operations Report). We now support 100% contactless digital payments across UPI and cards. Order tonight from 45 certified cities!',
    author: 'Alex Rivera',
    authorRole: 'Marketing Manager',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T11:45:00Z',
    status: 'approved',
    routeTo: 'marketing_manager',
    routingReason: 'All claims verified against active fact library. No superlatives or expired references found.',
    redactionApplied: false,
    maskedItemsCount: 0,
    wcagContrast: {
      fgColor: '#FFFFFF',
      bgColor: '#0F766E',
      ratio: 7.4,
      passesAA: true,
      passesAAA: true
    },
    altText: 'App screenshot showcasing order tracking interface',
    reviewComments: [
      {
        id: 'c-2',
        author: 'Marcus Vance',
        role: 'legal',
        comment: 'Compliant with ASCI guidelines and accurate fact citations. Approved for App Store release.',
        timestamp: '2026-11-06T11:40:00Z'
      }
    ],
    findings: []
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-11-07T06:30:15Z',
    action: 'draft_submitted',
    actorName: 'Priya Sharma',
    actorRole: 'creator',
    details: 'Submitted "QuickBite Weekend Flash Campaign" draft with target channel: social',
    submissionId: 'sub-hackathon-demo'
  },
  {
    id: 'log-2',
    timestamp: '2026-11-07T06:30:18Z',
    action: 'ai_analyzed',
    actorName: 'Checkpoint Analysis Engine',
    actorRole: 'admin',
    details: 'Evaluated against 6 active policies & 6 approved facts. Detected 5 issues (3 High Risk). PII masking applied.',
    submissionId: 'sub-hackathon-demo'
  },
  {
    id: 'log-3',
    timestamp: '2026-11-07T06:30:20Z',
    action: 'routed_to_legal',
    actorName: 'Checkpoint Routing Dispatcher',
    actorRole: 'admin',
    details: 'Auto-routed to Legal & Brand Reviewer (Marcus Vance) due to Claims Policy 3.2 violation and expired promotion.',
    submissionId: 'sub-hackathon-demo'
  },
  {
    id: 'log-4',
    timestamp: '2026-11-06T11:45:00Z',
    action: 'approved',
    actorName: 'Marcus Vance',
    actorRole: 'legal',
    details: 'Approved "App Store Update Release Notes" for external publication.',
    submissionId: 'sub-2'
  }
];

export const INITIAL_SLACK_NOTIFICATIONS: SlackNotification[] = [
  {
    id: 'slack-1',
    submissionId: 'sub-hackathon-demo',
    submissionTitle: 'QuickBite Weekend Flash Campaign (Priya Draft)',
    recipientChannel: '#legal-governance-approvals',
    dispatchedAt: '2026-11-07T06:30:22Z',
    status: 'pending',
    riskLevel: 'high',
    routeTo: 'legal_reviewer',
    findingsCount: 5,
    dispatchedBy: 'Checkpoint Webhook Service'
  },
  {
    id: 'slack-2',
    submissionId: 'sub-2',
    submissionTitle: 'App Store Update Release Notes',
    recipientChannel: '#marketing-approvals',
    dispatchedAt: '2026-11-06T10:05:00Z',
    status: 'approved',
    riskLevel: 'routine',
    routeTo: 'marketing_manager',
    findingsCount: 0,
    dispatchedBy: 'Checkpoint Webhook Service',
    respondedBy: 'Marcus Vance (via Slack Action)',
    respondedAt: '2026-11-06T11:45:00Z'
  }
];

export const INITIAL_BRAND_HEALTH: BrandHealthMetrics = {
  overallHealthScore: 92,
  complianceRate: 88.5,
  activeViolationsCaughtMonth: 142,
  avgVelocityHours: 3.8,
  historicalVelocityReduction: 78,
  repeatFlagReductionRate: 55,
  legalRiskExposureScore: 14,
  departmentBreakdowns: [
    {
      department: 'Brand & Social Marketing',
      submissionsCount: 68,
      complianceScore: 91,
      topFlaggedRule: 'Claims Policy 3.2 (#1 Superlatives)'
    },
    {
      department: 'Growth & Performance Ads',
      submissionsCount: 45,
      complianceScore: 84,
      topFlaggedRule: 'Promo Policy 4.3 (Expired Codes)'
    },
    {
      department: 'Agency Partners & Freelancers',
      submissionsCount: 32,
      complianceScore: 78,
      topFlaggedRule: 'Terminology Rule 2.1 (Users vs Customers)'
    },
    {
      department: 'Product & Release Ops',
      submissionsCount: 22,
      complianceScore: 96,
      topFlaggedRule: 'Visual Rule 1.2 (WCAG AA Contrast)'
    }
  ],
  monthlyTrends: [
    { month: 'Aug 2026', healthScore: 68, violationsIntercepted: 198, avgHoursToApprove: 46.2 },
    { month: 'Sep 2026', healthScore: 75, violationsIntercepted: 174, avgHoursToApprove: 28.5 },
    { month: 'Oct 2026', healthScore: 84, violationsIntercepted: 159, avgHoursToApprove: 12.4 },
    { month: 'Nov 2026', healthScore: 92, violationsIntercepted: 142, avgHoursToApprove: 3.8 }
  ]
};
