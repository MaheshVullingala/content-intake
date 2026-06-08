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
