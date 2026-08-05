# Content Intake Portal — Code Review (2026-07-29)

Full pass over `src/` (66 files, ~14,500 lines), `next.config.js`, `package.json`, and the live database schema. Findings are grouped by priority. Nothing here is a known gap already tracked in CONTEXT.md's "Known Gaps" section — those are all either resolved or already flagged, so this review focuses on what hadn't surfaced yet.

## Security — worth fixing before the RHEL 9 / production move

**`/api/ai/route.js` has no auth check and no rate limiting.** The route reads `ANTHROPIC_API_KEY` server-side (correctly kept out of the client bundle) and proxies straight to Anthropic, but it never verifies the caller has a valid Supabase session, and it never caps how much a single caller can send. Anyone who can reach the Next.js server — not just logged-in users — can POST arbitrary `prompt`/`systemPrompt` values and get billed generations back, completely bypassing the app's UI and role gating. A `rateLimit()` helper already exists in `src/lib/security.js` but is never imported anywhere in the codebase — it's dead code sitting right next to the route that needs it. I'd wire it in (keyed on the caller's IP or Supabase user id) and add a session check before this goes anywhere near the internal VPN, where "anyone with network access" becomes a much bigger set of people than it is today.

**`/api/audit/route.js` trusts the client completely.** It takes `user_id`, `user_role`, `user_email`, `user_department`, `action`, and `impersonating_role` directly from the request body and writes them to `audit_log` using the service-role key (which bypasses RLS by design, since there's no client-facing INSERT policy on that table). There's no check anywhere that the caller's actual session matches the `user_id` they're claiming. Since `audit_log` is admin/super_admin-read-only, an outside party can't read the fabricated entries — but they can inject them, and the entire point of an audit log is that it's not something a caller can forge. I'd add a server-side check that resolves the real user from the request's Supabase JWT and ignores (or cross-checks) whatever identity fields the client sends.

**Next.js is pinned to a version with a critical advisory.** `npm audit` against the installed `next@14.2.3` reports 1 critical, 1 high, and roughly 20 lower-severity advisories (DoS via image optimizer, SSRF in Server Actions/rewrites, middleware authorization bypass, cache poisoning, and others), plus a high-severity transitive `postcss` vulnerability. `npm audit fix --force` resolves it by moving to `next@14.2.35` — still inside the 14.x line, so this shouldn't be a breaking upgrade. Given you're about to stand this app up freshly on an internal VM, this is the cheapest possible time to take the patch.

**File-upload validation is inconsistent.** `src/components/ImageField.js` calls `validateFile()` (MIME allowlist + size cap, defined in `lib/security.js`) before every upload. `src/components/TaskPanel.js`'s two upload paths — `uploadFile` (brand team) and `uploadMappedImage` (design team) — only check `file.size`, with no MIME or extension allowlist, before pushing into the public `attachments` bucket. Practically, that means a brand or design team member could upload any file type — including an HTML file — to a bucket anyone can fetch a public URL from. Worth routing both through `validateFile()` for consistency.

## Data integrity

The registration domain restriction we just added (client-side check in `Register.js` + the `enforce_email_domain_before_insert` trigger on `auth.users`) is solid: I unit-tested the matching logic against lookalike domains (`cadence.com.evil.io`, `notcadence.com`) before applying it, and confirmed it only gates new signups — no effect on existing sessions.

`.single()` is used in 7 places across the codebase (`page.js`, `NewRequest.js`, `ReqDetail.js`, `WebTeamView.js`, `lib/supabase.js` ×2, `lib/taskUtils.js`). Supabase's `.single()` returns an error object (not just `null`) when a query matches zero or more-than-one rows, so every caller needs to actually check the `error`/handle the reject rather than only destructuring `data`. `getUserProfile()` in `lib/supabase.js` does this correctly (falls through to the email lookup). Worth a quick pass over the other five call sites to confirm they degrade gracefully rather than throwing an unhandled rejection when a row is unexpectedly missing.

## Dead code — safe to delete, ~2,500+ lines

Eleven files in `src/` are never imported by anything else in the tree (verified by grepping every possible import path, not just filenames):

- `src/components/LoginPage.js`
- `src/components/BannerPreview.js`
- `src/components/OverviewPreview.js`
- `src/components/ProposeChangePanel.js` (superseded by `ProposeChangeWizard.js`, per the "Suggest a Change" rebuild)
- `src/components/AIAssist.js` (superseded by `SectionAIAssist.js` / `AIAssistant.js`)
- `src/components/CustomerStories.js`, `FeaturesApps.js`, `KeyBenefits.js`, `PromoSection.js`, `RelatedContent.js`, `TrainingSupport.js` — six top-level duplicates of the real, live components in `src/components/sections/`

That last group is the one I'd prioritize clearing out even though it's harmless today: having two files with the same name and different content (one dead, one live) is exactly the kind of thing that costs someone twenty confused minutes later when they edit the wrong one and can't figure out why nothing changes.

There's also a stray `New Text Document.txt` at the repo root — untracked, looks like an accidental Windows artifact rather than anything intentional.

## Minor / lower priority

`@supabase/supabase-js` is pinned to `^2.43.4`, which is old relative to current releases. Not an active vulnerability I found, but worth bumping before the self-hosted cutover so you're not migrating infrastructure and jumping several SDK minors at the same time.

13 `console.log`/`console.error`/`console.warn` calls remain in component code (mostly in `AdminPanel.js`, `Dashboard.js`, `NewRequest.js`, `TaskPanel.js`). I checked each one — none log tokens, keys, or session data — but they're worth stripping or gating behind a dev-only flag before a real production launch.

No test runner or linter is configured (confirmed in `CLAUDE.md` too). Not blocking, but even a bare ESLint config would catch a chunk of what this review had to find by hand — the two upload-validation inconsistency and the unused `rateLimit()` helper, for instance, are exactly the kind of thing `eslint-plugin-unused-imports` or a basic security-focused lint rule would flag automatically going forward.

## What I'd tackle first

If you want to fix a short list before anything else: add auth + rate limiting to `/api/ai`, add a real identity check to `/api/audit`, bump Next.js to `14.2.35`, and route `TaskPanel.js`'s uploads through `validateFile()`. Everything else here is cleanup that can happen whenever it's convenient — none of it is actively broken today.
