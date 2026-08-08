# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js, port 3000)
npm run build    # Production build
npm run start    # Start production server
```

No test runner or linter is configured.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-only; used by /api/audit and /api/notifications/send-pending
```

Optional — email notifications (`src/lib/email.js`). Safe to leave unset; sending
just no-ops until `SMTP_HOST`/`SMTP_FROM` are both present, and the
`settings.email_notifications_enabled` flag (AdminPanel → Settings) is
also off by default. Org uses Outlook/Microsoft 365, so this is built
against generic SMTP — works with `smtp.office365.com` + mailbox
credentials, or an internal Exchange Online relay connector that
allowlists the app's IP and needs no auth at all:
```
SMTP_HOST=                       # e.g. smtp.office365.com, or an internal relay host
SMTP_PORT=587                    # 587 (STARTTLS) is typical for Office 365; 465 = implicit TLS
SMTP_SECURE=false                # "true" only for port 465
SMTP_USER=                       # omit along with SMTP_PASSWORD for an anonymous/IP-allowlisted relay
SMTP_PASSWORD=
SMTP_FROM=                       # e.g. "Content Intake Portal <noreply@cadence.com>"
CRON_SECRET=                     # shared secret checked by /api/notifications/send-pending; set before it's reachable from outside your own scheduler
NEXT_PUBLIC_APP_URL=             # e.g. https://content-intake-delta.vercel.app — used to build links in emails
```
On Vercel, `vercel.json` already schedules the sweep every 5 minutes
(note: Vercel's Hobby plan limits cron to once/day — Pro or self-hosted
needed for 5-minute granularity). On the self-hosted VM, wire an
equivalent system cron / systemd timer hitting the same URL with
`curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/notifications/send-pending`.

Optional — Okta SSO (`src/lib/authConfig.js`). Login and password login
run side by side; Okta is additive, not a replacement, until an admin
explicitly turns password login off (AdminPanel → Settings, backed by
`settings.password_login_enabled`). Requires self-hosted Supabase Auth
(GoTrue) to have Okta configured as a SAML identity provider first —
SSO is not available on the Supabase Cloud Free plan, and the paid-plan
SSO add-on is unnecessary once self-hosted (GoTrue's SAML support is
free/built-in). Setting these before that configuration exists just
shows a broken "Sign in with Okta" button:
```
NEXT_PUBLIC_OKTA_ENABLED=       # "true" to show the Okta button on the login screen
NEXT_PUBLIC_OKTA_SSO_DOMAIN=    # domain used for supabase.auth.signInWithSSO({ domain }) — must match the domain registered against the Okta SAML connection, e.g. cadence.com
```

## Architecture

Single-page Next.js 14 app (App Router). The entire UI lives in `src/app/page.js`, which manages auth state and renders one of four views (`dashboard`, `new`, `edit`, `detail`, `admin`) based on a `view` state variable — there is no client-side routing. Navigation is done by calling `go(viewName, optionalId)`.

**Auth flow** (`src/lib/supabase.js`, `src/app/page.js`): Uses Supabase Auth. The `onAuthStateChange` listener is the single source of truth — it fires `INITIAL_SESSION` on load. After sign-in, `getUserProfile()` fetches the user's row from the `public.users` table (joined to Supabase auth via `auth_id`). A new user starts with `role = "pending"` and sees a waiting screen until an admin assigns a role.

**Roles and workflow** (`src/lib/constants.js`): Five roles (`stakeholder`, `editorial_qa`, `design_qa`, `web_team`, `admin`). Requests move through a linear status flow:

```
draft → editorial_qa → design_qa → pending_approval → web_team → published
```

`canAct(role, status)` determines if the current user can advance/return a request. `FLOW` array drives status transitions in `ReqDetail.js`.

**Content request form** (`src/components/NewRequest.js`): Three-step wizard:
1. Select page type (`Product`, `Solutions`, `Glossary`, `On-demand Webinar`)
2. Fill sections — left/right split with form on left and live preview on right
3. Preview & Submit

Each section has an independent state slice (e.g. `kbData`, `faData`). `buildPayload()` merges all slices into a flat object for Supabase. Sections can be marked N/A via `naMap`. The `draftId` prop switches the component into edit mode, loading from Supabase on mount.

**Section components** (`src/components/sections/`): Each section has two files — `SectionName.js` (form) and `SectionNamePreview.js` (preview pane). The form receives `data` + `onChange` callback. Preview receives the same data and renders a mockup.

**Page preview** (`src/components/PagePreview.js`): Renders all active sections together. Used in `NewRequest` (live preview per section) and `ReqDetail` (read-only overview).

**Request detail** (`src/components/ReqDetail.js`): Shows a request with tabs for Preview, Edit (role-gated), and Attachments (Design QA only). Editorial QA can edit banner/overview fields inline. Design QA can update image URLs and upload files to Supabase Storage (`attachments` bucket). Advancing/returning a request writes to `status_history`.

**AI assist** (`src/components/AIAssist.js`, `src/app/api/ai/route.js`): Button appears next to supported fields. Calls the internal Next.js API route at `/api/ai`, which proxies to Claude (`claude-sonnet-4-20250514`) with field-specific system prompts.

**Admin panel** (`src/components/AdminPanel.js`): Manage users and assign roles.

## Database (Supabase)

Schema is in `supabase-schema.sql`. Key tables:
- `users` — extends Supabase auth with `role`, `department`, `can_assign`. Linked via `auth_id`.
- `requests` — flat denormalized table with all section fields as columns (e.g. `kb_cards` as JSONB)
- `comments`, `attachments`, `status_history` — all cascade-delete with request

The `users` table has an `auth_id` column not shown in the SQL file that links to `auth.users.id`. When adding new schema columns, add them to both the Supabase table and the relevant `buildPayload()` in `NewRequest.js`.

## Styling

Global styles in `src/app/globals.css` and `src/styles/components.css`. Inline styles are used extensively alongside CSS classes. The design uses a monochrome palette (`#181313`, `#3C3C3C`, `#646464`, `#B5B5B5`, `#E0E0E0`, `#F3F3F3`) with teal (`#14b8a6`) as the brand accent. Font is Rubik (loaded via CSS `@import`).

## Adding a New Section

1. Create `src/components/sections/NewSection.js` (form) and `src/components/sections/NewSectionPreview.js`
2. Add the section key to `SECTIONS` in `src/lib/constants.js` with `pageTypes` configuration
3. Add state slice and handlers in `NewRequest.js`, spread into `previewData` and `buildPayload()`
4. Add a conditional render block for the section in `NewRequest.js` step 2
5. Add the preview component to `PagePreview.js`
