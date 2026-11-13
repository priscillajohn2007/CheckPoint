# Checkpoint: An Intelligent Brand-Governance Platform

> **National Hackathon Plan Submission · CodeNexus India 2026**  
> **Authored by:** Priscilla John and Najeema  
> **Preventing brand inconsistency, legal liability, and hallucinated claims before content is published.**

---

## 🌟 Executive Overview & Purpose

Organizations today publish marketing and operational copy through distributed human staff, external creative agencies, and generative AI tools. While production speed has scaled by 10x, brand governance and legal review remain manual, creating dangerous liability blindspots.

Recent landmark legal decisions such as ***Moffatt v. Air Canada (2024)*** and regulatory enforcements under the **ASCI Annual Complaints Report (98% of 9,841 scrutinized ads required modification)** and the **CCPA Guidelines (2022)** establish that companies are strictly liable for inaccurate promises made in public materials.

**Checkpoint** solves this crisis by acting as an intelligent pre-publication checkpoint:
1. It validates all draft claims, metrics, and promotions against an audited **Fact Library with live expiry dates**.
2. It strips confidential internal project names and PII before any cloud AI evaluation (**DPDP Act 2023 compliance**).
3. It explains every finding with its source document and suggests intent-preserving fixes.
4.- **Guideline Clarity Heatmap & Autonomous Versioning:** Quantifies policy friction via confusion scores and provides a continuous versioning lifecycle ($v1.0 \rightarrow v1.1$) with one-click historical rollbacks.
- **Bidirectional Collaboration & Slack Relay:** Full Slack Block Kit card generation with instant two-way interactive approval and revision routing.
- **Figma & Google Docs In-Situ Workspace Companion:** Embedded design and document editor simulators with inline brand checking and one-click layer/copy replacements.
- **Automated Logo Asset & Visual Geometry Inspector:** Live optical detection of deprecated legacy logos (2023 rabbit mark vs 2026 shield mark), clear space bounding box ratios ($\ge 1.0\times$), minimum display sizing ($\ge 32\text{px}$), and WCAG 2.1 AA contrast scoring.
- **Enterprise Brand Health Scorecard:** Executive compliance overview featuring cross-departmental pass rates, legal exposure metrics, and velocity tracking ($3.8\text{h}$ down from $4.2\text{d}$).
- **Role-Based Dynamic Access Control (RBAC):** Dynamic role filtering restricting navigation and visible pages strictly to each stakeholder's responsibilities:
  - **Creator:** Pre-Publication Check, Visual & Logo
  - **Manager:** Pre-Publication Check, Review Queue, Visual & Logo, Fact Library
  - **Legal Reviewer:** Review Queue, Fact Library, Pre-Publication Check
  - **Brand Owner:** Clarity Heatmap, Brand Health, Fact Library, Pre-Publication Check
  - **Administrator:** Full Platform Access
- **Dual Data Modes (Clean Custom Input vs. Opt-In Demo Mode):** Clean, empty input mode by default for testing user uploads, with an instant one-click toggle to load the synthetic QuickBite Express hackathon dataset.

---

## 🛠️ Technology Stack & Architecture

- **Frontend:** React 19 SPA, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend:** Node.js v22 ESM + Express server with Vite middleware integration.
- **AI Engine:** Google Gemini 3.8 Flash (`@google/genai`) for grounded analysis, slide parsing, and policy clarity drafting.
- **Privacy Engine:** Client-side and server-side tokenization masking internal codenames (e.g., `Project Cheetah`) and personal data before external AI evaluation (DPDP Act 2023).
- **Standards:** WCAG 2.1 AA color contrast calculation engine ($L_1/L_2$ relative luminance algorithm).

---

## 💻 Local Setup & Development Instructions

### Prerequisites
- Node.js (v20 or v22 recommended)
- npm (v9 or v10+)
- (Optional) Gemini API Key in `.env` (`GEMINI_API_KEY="your-api-key"`). If not set, the platform uses an intelligent deterministic rules engine.

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/example/checkpoint-brand-governance.git
cd checkpoint-brand-governance

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env

# 4. Start Development Server (Runs full-stack Express + Vite on port 3000)
npm run dev

# 5. Build for Production
npm run build

# 6. Run Production Server
npm start
```

Open your browser to `http://localhost:3000` to interact with Checkpoint.

---

## 🧭 Step-by-Step User Journey

1. **Pre-Publication Check:**
   - Click **"Priya's Copy (Text)"** or **"5-Slide Deck.pdf"** under Quick Test Presets.
   - Click **"Run Pre-Publication Check"**.
   - Notice how Checkpoint flags the unverified `#1` claim, catches the expired `SUMMER2024` discount code, and masks the confidential codename `Project Cheetah`.
   - Click **"Accept Fix"** to apply the intent-preserving suggestion cited from the *Q3 Operations Report*.
   - Click **"Submit for Review & Dispatch to Slack"**.

2. **Review Queue & Slack Relay:**
   - Switch role to **Legal Reviewer (Marcus Vance)** via the top role selector.
   - Navigate to **Review Queue** $\rightarrow$ **Slack Relay** subtab.
   - Click **"Approve in Slack"** on the generated card. Observe that the status immediately updates in the audit trail.

3. **Guideline Clarity Heatmap & Versioning:**
   - Switch role to **Brand Owner (Sarah Chen)**.
   - Select **Clarity Heatmap**. Notice that *Claims Policy 3.2* has a high confusion score ($88/100$) due to repeated creator dismissals.
   - Click **"Draft Clearer, Unambiguous Wording"** to generate an AI rewrite.
   - Click **"Commit as Next Version"** to upgrade the policy to $v1.1$.
   - Switch to the **Version History** subtab to review the audit trail and test the 1-click **Restore v1.0** rollback.

4. **In-Situ Companion:**
   - Click the **"Figma & Docs"** button in the top navigation bar.
   - Switch between the **Figma Plugin** canvas and **Google Docs Add-On** simulator to experience 1-click in-situ copy fixes without tab-switching.

5. **Brand Health Scorecard:**
   - Click **Brand Health** in the top navigation bar to inspect cross-departmental compliance rates and risk velocity curves.

---

## 👥 Stakeholder Personas & Roles

| Persona | Role | Main Need |
| :--- | :--- | :--- |
| **Priya Sharma** | Content Creator | Fast, clear pre-publication checks preserving marketing intent |
| **Alex Rivera** | Marketing Manager | Routine draft approvals without reviewing every line word-by-word |
| **Marcus Vance** | Legal Reviewer | High-risk triage (#1 claims, expired promos) with grounded citations |
| **Sarah Chen** | Brand Owner (VP Brand) | Heatmap visibility to identify and rewrite ambiguous guidelines |
| **Jordan Lee** | Administrator | Compliance verification, confidential term masking, and audit logs |

---

## ⚖️ Legal Grounding & Citations
- *Moffatt v. Air Canada*, 2024 BCCRT 149 (strict corporate liability for algorithmic and marketing misrepresentations)
- *Advertising Standards Council of India (ASCI)* Annual Complaints Report 2025-26
- *Central Consumer Protection Authority (CCPA)* Guidelines for Prevention of Misleading Advertisements, 2022
- *Digital Personal Data Protection (DPDP) Act*, 2023 (India)
- *Web Content Accessibility Guidelines (WCAG)* 2.1 Level AA
