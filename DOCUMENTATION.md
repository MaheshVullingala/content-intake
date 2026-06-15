# Content Intake Portal — Product Documentation
**Cadence Design Systems | Internal Tool**
**Version:** v129 | **Last Updated:** June 2026
**Stack:** Next.js 14 · Supabase (PostgreSQL + Auth + Storage) · Vercel
**Repo:** github.com/MaheshVullingala/content-intake | **Branch:** main
**Live URL:** content-intake-delta.vercel.app

---

## Table of Contents
1. [Overview](#1-overview)
2. [User Roles](#2-user-roles)
3. [Workflow](#3-workflow)
4. [Page Types & Sections](#4-page-types--sections)
5. [Features Built — Phase 1](#5-features-built--phase-1)
6. [AI Functionality](#6-ai-functionality)
7. [Architecture](#7-architecture)
8. [Database Schema](#8-database-schema)
9. [Environment Variables](#9-environment-variables)
10. [Phase 2 Scope](#10-phase-2-scope)

---

## 1. Overview

The Content Intake Portal is an internal web application that manages the end-to-end lifecycle of web page content requests for Cadence Design Systems. It replaces ad-hoc email and document-based workflows with a structured, multi-stage editorial process — from a stakeholder filling in page content, through editorial and design review, to final web team publishing.

**Core value:**
- Stakeholders fill structured section forms with live preview
- Content flows through a defined approval chain with comments and revision tracking
- Design QA maps images to sections
- Web team receives publication-ready content packages

---

## 2. User Roles

| Role | Description | Actions |
|---|---|---|
| **Stakeholder** | Product/solutions owners who submit content requests | Create requests, fill sections, approve final content before web team |
| **Editorial QA** | Content editors who review and refine submissions | Review, edit fields, approve to Design QA or return for revision |
| **Design QA** | Design team who map images to sections | Upload and map images, query stakeholders, approve to Pending Approval |
| **Web Team** | Web publishers who implement the final page | Mark as Published |
| **Admin** | Portal administrators | Manage users, assign roles, configure settings |
| **Pending** | New users awaiting role assignment | Read-only waiting screen |

---

## 3. Workflow

```
Stakeholder fills form
        ↓
    [DRAFT]
        ↓  Submit
  [EDITORIAL QA]  ←── Return for Revision
        ↓  Approve
   [DESIGN QA]  ←── Query Stakeholder
        ↓  Approve
[PENDING APPROVAL]  ←── Stakeholder reviews
        ↓  Approve
   [WEB TEAM]
        ↓  Publish
   [PUBLISHED]
```

**Return logic:**
- Editorial QA → returns to Draft (stakeholder revises)
- Design QA → queries stakeholder (returns to Draft with comment)
- Stakeholder → can resubmit to whichever stage returned it

**Comments:** Every stage transition can include a comment. Comments are threaded per request and visible to all roles.

---

## 4. Page Types & Sections

### Page Types
| Type | Use Case |
|---|---|
| **Product** | Individual product pages (e.g. Xcelium, Virtuoso) |
| **Solutions** | Solution/platform pages |
| **Glossary** | Technical term definition pages |
| **On-demand Webinar** | Recorded webinar landing pages |

### Sections per Page Type

| Section | Product | Solutions | Glossary | Webinar |
|---|---|---|---|---|
| SEO Meta Data | Required | Required | Required | Required |
| Banner | Required | Required | Required | Required |
| Overview | Required | Required | Optional | — |
| Key Benefits | Optional | Optional | — | — |
| Features / Applications | Optional | Optional | — | — |
| Customer Stories | Optional | Optional | — | — |
| Promo Section | Optional | Optional | — | — |
| Related Content | Optional | Optional | — | — |
| Resources | Optional | Optional | — | — |
| Related Products | Optional | Optional | — | — |
| Training & Support | Optional | Optional | Optional | Optional |

**Section states:** Required · Optional · N/A (marked by stakeholder) · Marked as Not Applicable

---

## 5. Features Built — Phase 1

### 5.1 Authentication
- Supabase Auth with email/password
- Role-based access — all views and actions are gated by role
- Auto-logout with configurable idle timeout (stored in Supabase settings table)
- Idle warning toast with countdown before logout
- Auto-save before logout to prevent data loss
- Forgot password / Reset password flow
- New user pending screen until admin assigns role

### 5.2 Dashboard
- Lists all requests visible to the current user's role
- Status badges with colour coding
- Filter by status, page type, search by title
- Quick-action buttons based on role and request status

### 5.3 New Content Request — 3-Step Wizard
**Step 1 — Select Page Type**
- Choose from Product, Solutions, Glossary, On-demand Webinar
- Section list dynamically adjusts based on page type

**Step 2 — Fill Sections**
- Horizontal sticky tab bar for section navigation
- Required/Optional/N/A indicators per tab
- Live preview pane alongside the form (right column)
- Save as Draft at any point
- Mark as N/A per section (skips section from workflow)

**Step 3 — Preview & Submit**
- Full page preview before submission
- Submit sends to Editorial QA queue

### 5.4 Section Forms

**SEO Meta Data**
- Page location (URL path)
- Meta title, meta description, meta keywords
- Character limit guidance per field

**Banner**
- Page title, subtitle
- CTA 1 and CTA 2 (label + link)
- Image reference field (📝 description / 🔗 link / 📎 attachment)

**Overview**
- Label, impact statement, description
- Media type selector (image/video/none)
- Media reference field

**Key Benefits**
- Section label, impact statement, description
- Up to 6 benefit cards (title, description, image reference, icon description)
- Card reordering (↑↓)
- Auto layout label (1/2/3 per row)

**Features / Applications**
- Section label, impact statement, description
- 4 view types: List · Horizontal Tabs · Vertical Tabs · Table
- List: up to 10 items with title, description, icon
- Tabs: up to 10 tabs with title, description, image reference, CTA
- Table: up to 6 columns × 20 rows with editable headers and cells
- Image reference per item

**Customer Stories**
- Section label, impact statement
- Up to 10 customer quotes (quote text, customer details, logo reference)
- Carousel display in preview

**Promo Section**
- Label, title, description, CTA button
- Background image reference

**Related Content**
- Section label, impact statement
- Up to 3 content cards (image reference, label, title, description, link)

**Resources**
- Video carousel, mixed media, resource cards, news and blogs
- Multiple resource sub-types

**Related Products**
- Section label, impact statement, description
- Up to 12 product cards (title, description, CTA, image reference)

**Training & Support**
- Pre-filled with Cadence standard training/support content
- Label, impact statement
- 3 support cards (Cadence Training, Online Support, Community Forums)

### 5.5 Image Reference Field (ImageField)
Every image slot across all sections has a 3-mode reference toolbar:

| Icon | Mode | Description |
|---|---|---|
| 📝 | Description | Stakeholder describes the image for Design QA |
| 🔗 | Link | Paste an external image URL |
| 📎 | Attachment | Upload a local reference image (JPG/PNG/WebP/SVG, max 5MB) |

- Uploaded files go to Supabase Storage (`attachments` bucket)
- File naming convention: `section-name_card-N_image.ext`
- Only one mode active at a time — switching prompts confirmation
- Filled indicator (teal dot on icon)
- Design QA can see references in Image Mapping tab; after uploading their own image the stakeholder reference collapses/archives

### 5.6 Request Detail View (ReqDetail)
Tabs visible based on role and status:

- **Preview** — full page preview of all sections
- **Content** — section-by-section content summary
- **Edit** — inline editing (Editorial QA and returned stakeholder drafts)
- **Image Mapping** — Design QA only; maps images to all section slots
- **Comments** — threaded comments with role badges
- **History** — status transition timeline

**Image Mapping tab (Design QA):**
- All image slots auto-detected from sections
- Stakeholder reference shown per slot (collapses after design uploads)
- URL input + file upload per slot
- Live thumbnail preview
- Progress bar (X / Y slots filled)

### 5.7 Editorial QA Features
- Inline field editing on any request
- Approve to Design QA or Return for Revision
- Add revision notes with return
- Flag sections for Design QA attention

### 5.8 Admin Panel
- User list with role badges
- Assign/change roles
- Auto-logout timeout configuration (stored in `settings` table)
- Department management

### 5.9 UI & Design System
- **Colour palette:** Ocean Deep — Primary `#1b5793`, Accent `#3ec5cb`
- **Font:** Rubik (all weights)
- **Login page:** Two-column split with PCB circuit background (left) + frosted form (right)
- **Mark as N/A button:** `btn-na` class — white bg, `#1557a0` border, hover inverts — matches Create Account button style
- **AI Assist button:** Gradient pill (`#1b5793` → `#3ec5cb`) inside card-header of each section

---

## 6. AI Functionality

### 6.1 Architecture
- Next.js API route: `/api/ai` (proxies to Anthropic API)
- Model: `claude-haiku-4-5`
- Two AI components: `SectionAIAssist.js` and `AIAssistant.js`

### 6.2 SectionAIAssist — Per-Section Button
Located inside the card-header of every content section.

**Mode 1 — Improve (has existing content)**
- Shows current draft as preview
- AI rewrites in Cadence brand voice while preserving intent

**Mode 2 — Start Fresh with Direction**
- Stakeholder types what they want the section to say
- AI generates from scratch based on direction

**Mode 3 — Generate from Empty**
- No existing content — AI asks for direction first
- Generates professional content from the brief

**Result panel:**
- Shows all generated fields with labels
- Apply to Section — fills the form fields
- Redo — regenerates
- Cancel

### 6.3 AIAssistant — Floating Panel
Floating button (bottom-right) opens a full product brief panel.

**Step 1 — Product Brief** (8 fields):
- Product Name, Category, What it does
- Key Features (one per line)
- Target Audience, Unique Selling Point
- Page Goal (optional), Key Message (optional)

**Step 2 — Generate**
- Generate All Sections button — runs all in sequence
- Per-section generate buttons
- Progress indicators per section (Pending → ✓ Done)
- Generated content auto-populates all form fields

### 6.4 Cadence Brand Voice System Prompt
Trained on real cadence.com content with:
- Banned words list (cutting-edge, revolutionary, game-changing, etc.)
- Preferred vocabulary (verification closure, time-to-market, tapeout confidence, etc.)
- Real cadence.com headline patterns as examples
- Audience definition (SoC architects, verification engineers, PCB designers)
- Output rules (JSON only, character limits, sentence case, no buzzwords)

---

## 7. Architecture

```
src/
├── app/
│   ├── page.js              # Root — auth state, view router
│   ├── globals.css          # Global resets
│   └── api/ai/route.js      # Anthropic API proxy
├── components/
│   ├── NewRequest.js        # 3-step content form wizard
│   ├── ReqDetail.js         # Request detail + workflow actions
│   ├── Dashboard.js         # Request list
│   ├── AdminPanel.js        # User/role management
│   ├── PagePreview.js       # Full page preview renderer
│   ├── ImageField.js        # 3-mode image reference component
│   ├── SectionAIAssist.js   # Per-section AI button + modal
│   ├── AIAssistant.js       # Floating AI panel
│   ├── auth/                # Login, Register, ForgotPassword, ResetPassword
│   └── sections/            # 11 section form + preview component pairs
├── styles/
│   ├── components.css       # Shared component classes
│   ├── auth.css             # Login/register page styles
│   ├── dashboard.css        # Dashboard layout
│   ├── forms.css            # Form field styles
│   ├── tokens.css           # CSS variables (colours, spacing, typography)
│   └── typography.css       # Type scale
└── lib/
    ├── supabase.js          # Supabase client + getUserProfile()
    └── constants.js         # Roles, workflow, sections config
```

---

## 8. Database Schema

### Key Tables

**`users`**
- `id`, `email`, `name`, `role`, `department`, `auth_id`, `can_assign`, `created_at`

**`requests`** (flat denormalised — all section fields as columns)
- Core: `id`, `page_type`, `status`, `owner_id`, `created_at`, `updated_at`
- SEO: `seo_page_location`, `seo_meta_title`, `seo_meta_description`, `seo_meta_keywords`
- Banner: `page_title`, `sub_title`, `cta1_label`, `cta1_link`, `cta2_label`, `cta2_link`, `banner_image_ref` (JSONB)
- Overview: `overview_label`, `overview_impact`, `overview_description`, `overview_media_url`, `overview_media_type`, `overview_media_ref` (JSONB)
- Key Benefits: `kb_label`, `kb_impact`, `kb_description`, `kb_cards` (JSONB array)
- Features/Apps: `fa_label`, `fa_impact`, `fa_description`, `fa_view_type`, `fa_items`, `fa_columns`, `fa_rows` (JSONB)
- Customer Stories: `cs_label`, `cs_impact`, `cs_items` (JSONB array)
- Promo: `promo_label`, `promo_title`, `promo_description`, `promo_btn_label`, `promo_btn_link`, `promo_bg_image_ref` (JSONB)
- Related Content: `rc_label`, `rc_impact`, `rc_cards` (JSONB array)
- Related Products: `rp_label`, `rp_impact`, `rp_description`, `rp_cards` (JSONB array)
- Training & Support: `ts_label`, `ts_impact`, `ts_cards` (JSONB array)
- N/A flags: `na_key_benefits`, `na_features_apps`, etc.
- Design flags: `design_flag_banner`, `design_flag_overview`, etc.

**`comments`**
- `id`, `request_id`, `user_id`, `user_role`, `content`, `is_return`, `created_at`

**`attachments`**
- `id`, `request_id`, `section_key`, `file_name`, `storage_path`, `public_url`, `uploaded_by`, `created_at`

**`design_images`**
- `id`, `request_id`, `section_key`, `file_name`, `storage_path`, `public_url`, `uploaded_by`, `created_at`

**`settings`**
- `key`, `value` — stores `auto_logout_minutes` and other admin-configurable settings

**`status_history`**
- `id`, `request_id`, `from_status`, `to_status`, `changed_by`, `comment`, `created_at`

### Storage Buckets
- `attachments` — stakeholder uploaded reference images (public)

---

## 9. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-xxx...
```

Set in `.env.local` for local development.
Set in Vercel → Project Settings → Environment Variables for production.

---

## 10. Phase 2 Scope

### 10.1 AI Enhancements
- [ ] **AI-powered SEO suggestions** — auto-suggest page location slug, meta keywords from product brief
- [ ] **Competitor-aware generation** — brief field for competitor context, AI avoids overlap
- [ ] **Tone score** — rate generated content against Cadence brand voice (0–100 score)
- [ ] **Bulk generation** — generate all sections from product brief in one click from within the form (currently only available from floating panel)
- [ ] **AI revision history** — track what AI generated vs what stakeholder changed
- [ ] **Google Gemini integration** — switch to Vertex AI / Gemini once GCP account verified (already scaffolded)

### 10.2 Workflow Enhancements
- [ ] **Email notifications** — notify stakeholders and reviewers on status changes (Supabase Edge Functions + SendGrid/Resend)
- [ ] **Due dates & SLA tracking** — set deadlines per request, flag overdue items on dashboard
- [ ] **Bulk actions** — approve/return multiple requests at once from dashboard
- [ ] **Request cloning** — duplicate an existing request as a starting point for a new page
- [ ] **Version history** — full field-level change history, ability to restore previous version
- [ ] **Stakeholder approval reminders** — auto-remind if pending approval is untouched for N days

### 10.3 Content & Sections
- [ ] **Character limit enforcement** — apply per-field character limits from a configurable Excel/table (currently limits are guidance only)
- [ ] **Character limit Excel import** — upload Excel to configure limits per section/field
- [ ] **Rich text fields** — allow basic formatting (bold, bullets, links) in description fields
- [ ] **Section templates** — pre-filled section templates per product category (EDA, IP, PCB)
- [ ] **Content scoring** — completeness score per request (% of optional sections filled)
- [ ] **Glossary lookup** — inline terminology checker against Cadence approved glossary

### 10.4 Image & Asset Management
- [ ] **Design team image ZIP download** — one-click ZIP of all reference images per request (named with section prefix)
- [ ] **Image library** — reusable approved image library for Design QA to pick from
- [ ] **Image approval workflow** — design uploads image → stakeholder approves before publishing
- [ ] **Asset versioning** — track image revisions per section slot

### 10.5 Analytics & Reporting
- [ ] **Dashboard analytics** — requests by status, average time per stage, bottleneck identification
- [ ] **SLA reports** — which requests exceeded target turnaround times
- [ ] **User activity reports** — submissions, approvals per user over time
- [ ] **Export to CSV/Excel** — export request data for offline reporting

### 10.6 Integrations
- [ ] **Okta SSO** — replace email/password with Cadence Okta authentication (Azure infrastructure)
- [ ] **CMS integration** — push published content directly to Cadence CMS (Drupal/AEM)
- [ ] **Slack notifications** — notify teams in relevant Slack channels on workflow transitions
- [ ] **Google Analytics integration** — track portal usage metrics
- [ ] **Jira/ServiceNow integration** — auto-create tickets for web team on publish-ready requests

### 10.7 UI & UX
- [ ] **Login page redesign** — animated circuit concept (Concept A) already designed, pending build
- [ ] **Mobile responsive** — current layout is desktop-only; mobile optimisation for stakeholders
- [ ] **Dark mode** — system-preference aware dark theme
- [ ] **Keyboard navigation** — full keyboard accessibility for form sections
- [ ] **Onboarding tour** — first-time user walkthrough of the portal

### 10.8 Admin & Configuration
- [ ] **Page type configuration** — admin can add/remove page types and configure which sections apply
- [ ] **Role permissions editor** — admin can configure which roles can edit which fields
- [ ] **Audit log** — full audit trail of all actions (who did what and when)
- [ ] **Multi-language support** — content entry in multiple languages for global Cadence teams
- [ ] **Bulk user import** — CSV import of users with role assignment

