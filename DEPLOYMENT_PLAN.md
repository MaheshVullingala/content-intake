# Content Intake Portal — Internal Deployment Plan
Last updated: 2026-07-29

## Executive Summary

**Recommendation: self-host Supabase's open-source stack on the RHEL 9 VM, and use its native SAML 2.0 SSO support to authenticate through Okta.**

This satisfies "everything hosted within the VM" exactly — self-hosting Supabase does not mean the app talks to Supabase's cloud. It means the same open-source software Supabase's cloud runs on (Postgres, PostgREST, an auth service, a storage service) runs as Docker containers **on your VM**, with zero outbound calls to supabase.com. The app is already built entirely around Supabase's client libraries and Postgres row-level security (RLS) for authorization — nearly every screen in this codebase calls `supabase.from(...)` directly from the browser, and access control is enforced by ~15 RLS policies keyed off `auth.uid()`. Self-hosting preserves that architecture wholesale. A full decouple (custom backend API + vanilla Postgres + hand-reimplemented authorization) would mean rewriting the data-access layer of every major component and translating 11 SQL policy files into application code — weeks of additional, high-risk work for no functional benefit, since the self-hosted stack meets every constraint you've described (on-VM, VPN-independent, real Okta SSO).

Confirmed while researching this (Supabase's own docs, checked today):
- Self-hosted Supabase officially supports RHEL/CentOS/Fedora directly in its install script, runs via Docker Compose, and **does not phone home or collect telemetry** — fully isolated operation is a supported, intended use case.
- Supabase's Auth service (GoTrue) has **native SAML 2.0 SSO** with an Okta-specific setup section in its own documentation. This means no custom "translate Okta into a Supabase session" bridge needs to be built — it's a supported integration path, not a workaround.

## Target Architecture

```
RHEL 9 VM
├── Next.js app (this repo)
│   ├── Runs via `next start` under systemd (or PM2)
│   └── Reverse-proxied by Nginx/Caddy — TLS termination, routes / to Next.js
│
├── Self-hosted Supabase stack (Docker Compose, ~12 containers)
│   ├── Postgres          — same schema, same RLS policies as today
│   ├── PostgREST         — same REST API the app already calls (supabase-js)
│   ├── Auth (GoTrue)     — SAML SSO enabled, Okta registered as IdP
│   ├── Storage           — same bucket API ImageField.js/task uploads already use
│   ├── Kong               — API gateway, fronts all of the above
│   ├── Studio             — admin dashboard (HTTP basic auth), optional to expose
│   └── Realtime, imgproxy, postgres-meta, Supavisor, Edge Runtime — included, mostly unused by this app; can be trimmed from docker-compose.yml if you want a smaller footprint
│
└── Nginx/Caddy reverse proxy
    ├── https://portal.yourorg.com          → Next.js app (port 3000)
    └── https://portal.yourorg.com/supabase → Kong gateway (port 8000), or a separate subdomain
```

Okta talks to the Auth container's SAML endpoints (`/auth/v1/sso/saml/acs`, `/auth/v1/sso/saml/metadata`) — these need to be reachable from wherever Okta's SAML redirect lands the user's browser (i.e., through the same reverse proxy, not directly exposed).

## Infrastructure Requirements

**VM sizing** (Supabase's published minimums/recommendations, plus the Next.js app itself):

| Resource | Minimum | Recommended |
|---|---|---|
| RAM | 4 GB (Supabase alone) | 8 GB+ total |
| CPU | 2 cores | 4 cores+ |
| Disk | 40 GB SSD | 80 GB+ SSD (grows with uploaded images/attachments) |

**Software prerequisites:**
- Docker Engine + Docker Compose v2 (RHEL 9: via Docker's official RPM repo, or Podman in docker-compatible mode if Docker CE isn't approved for RHEL in your org)
- Node.js (LTS matching what the app was built/tested against) + npm, for building/running the Next.js app outside Docker (or containerize it too — see Phase 4)
- git, openssl, jq (used by Supabase's setup scripts)
- Nginx or Caddy for TLS termination

**Network / firewall:**
- Inbound: 443 (HTTPS) from your internal network to the VM. Nothing needs to be reachable from the public internet.
- Okta needs to reach the VM's SAML ACS endpoint over HTTPS from wherever your users' browsers redirect from (i.e., normal internal HTTPS access is enough — Okta itself doesn't call your server directly for SAML, the browser does the round-trip).
- Outbound: only needed for the Anthropic API (`/api/ai` route, AI Assist feature) and optionally SMTP if you keep any Supabase Auth email flows (see Open Decisions). Confirm your org's egress policy allows `api.anthropic.com` if you want to keep AI Assist working; if not, that feature needs to be disabled or pointed at an internal LLM endpoint.

**DNS / TLS:**
- An internal DNS name for the app (e.g., `content-intake.yourorg.internal`)
- A TLS certificate — internal CA-issued is fine; SAML and Storage uploads both expect HTTPS in production

## Migration Phases

### Phase 0 — Code readiness (can start now, doesn't depend on the VM existing)

1. **Fix the Content-Security-Policy in `next.config.js`.** It currently hardcodes `https://*.supabase.co` / `https://*.supabase.in` in `img-src` and `connect-src` — pointed at the self-hosted instance's internal URL instead, every API call and image load would be silently blocked by the browser. This needs to become your new domain (ideally read from an env var so it's not hardcoded twice).
2. **Consolidate the SQL migrations.** The schema currently lives across `supabase-schema.sql`, `tasks-migration.sql`, `rls-migration.sql`, `image-refs-migration.sql`, `settings-migration.sql`, and `sql/01` through `sql/11` — applied in an order that's only really documented in `CONTEXT.md`'s prose, with at least one file (`rls-migration.sql`) not tracked there at all. For a clean bootstrap of a brand-new Postgres instance, this should become one ordered, idempotent schema file (or a numbered sequence meant to run start-to-finish) rather than requiring someone to reconstruct the right order from session notes.
3. **Swap the login flow.** `LoginAnimated.js` currently calls `supabase.auth.signInWithPassword({ email, password })`. This becomes a "Sign in with Okta" action calling `supabase.auth.signInWithSSO({ domain: 'yourorg.com' })` (or `providerId` once Okta's registered — see Phase 3), which redirects to Okta and back. The email/password form, Register.js, ForgotPassword.js, and ResetPassword.js become dead code once Okta is the only login path — worth an explicit decision on whether to delete them or leave them disabled (see Open Decisions).
4. **Confirm the `auth_id`-linking fallback in `getUserProfile()` (`src/lib/supabase.js`) still does what you want.** It already falls back to matching by email and silently linking `auth_id` if a user exists in `public.users` but the Supabase auth id doesn't match — this is exactly the behavior you want for migration: an existing user's first Okta login will auto-link to their existing role/permissions row by email match, no manual re-provisioning needed. Worth verifying this explicitly during testing rather than assuming.
5. Audit for any other hardcoded `supabase.co` references (I found the CSP one; worth a repo-wide grep before cutover).

### Phase 1 — Provision self-hosted Supabase on the VM

1. Install Docker Engine + Compose on the RHEL 9 VM.
2. Run Supabase's install script (`curl -fsSL https://supabase.link/setup.sh | sh` — officially supports RHEL/CentOS/Fedora) or clone the `docker/` directory manually if that curl-pipe pattern isn't allowed by your org's security policy.
3. Generate real secrets (`generate-keys.sh`) — never start with the example/placeholder keys.
4. Set `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL` to your internal domain.
5. Start the stack (`sh run.sh start`), confirm all containers report healthy.
6. Put Nginx/Caddy in front for HTTPS (Supabase's own guide has a dedicated "Add Reverse Proxy with HTTPS" walkthrough).

### Phase 2 — Migrate schema + data

1. Apply the consolidated schema (Phase 0.2) to the new Postgres instance.
2. Export data from the current Supabase cloud project (`pg_dump`, or Supabase's own project-restore tooling — they document a "Restore Project from Platform" path for exactly this self-host migration scenario) and import it.
3. Recreate the Storage buckets (`attachments`, `assets`) and re-upload/copy existing files — Supabase documents a "Copy Storage from Platform" guide for this too.
4. Point `.env.local`'s `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` at the new instance. No other code changes needed here — every Supabase call in the app is already env-var-driven.

### Phase 3 — Configure Okta SAML SSO

1. In the self-hosted Auth service, enable SAML (`GOTRUE_SAML_ENABLED`, a generated signing key).
2. In Okta: create a SAML 2.0 application, set the Single Sign-On URL and Audience URI to your Auth service's ACS/metadata endpoints, NameID format `Persistent`.
3. Register Okta as an identity provider against the Auth admin API (metadata URL or metadata XML, plus an email-domain mapping so `signInWithSSO({ domain })` resolves to the right provider).
4. Wire up the login button from Phase 0.3 and test end-to-end: click "Sign in with Okta" → Okta login → redirected back with a session → `getUserProfile()` resolves to the right `public.users` row.

### Phase 4 — Deploy the Next.js app

1. `npm run build` on the VM (or in a CI step that deploys to the VM).
2. Run under a process manager — systemd unit calling `next start`, or PM2 — rather than a bare foreground process, so it survives reboots and crashes.
3. Reverse proxy (same Nginx/Caddy instance as Supabase, or a separate one) terminates TLS and routes the app's domain to port 3000.
4. Decide on a repeatable deploy process now rather than improvising it at cutover time — even a simple `git pull && npm install && npm run build && systemctl restart content-intake` script is far better than manual steps done once and forgotten.

### Phase 5 — Cutover & rollback

1. Do a full dry run against the self-hosted instance with production-like data before switching real users over — every role's flow (submit, admin task setup, all 5 team roles, publish) end-to-end, per the "browser testing" item that's already been sitting in `CONTEXT.md`'s "What's Next" list.
2. Keep the Vercel + Supabase-cloud deployment live and untouched during the transition — it costs nothing to leave it as a rollback target until the internal deployment has been running clean for a while.
3. Cut DNS / send users the new internal URL once confident.

## Ongoing Operations

- **Backups**: Supabase-managed backups go away — you're now responsible for `pg_dump` on a schedule (cron) plus Storage volume backups. Not automatic; needs to be set up explicitly.
- **Updates**: self-hosted Supabase ships ~monthly Docker image updates; applying them is a manual `docker compose pull` + restart, not automatic.
- **Secrets management**: Supabase's own docs recommend a real secrets manager (Vault, Doppler, cloud KMS, etc.) rather than a plaintext `.env` for production — worth deciding what your org already uses rather than defaulting to a bare file, especially since the current `.env.local` in this repo has live keys sitting in it in plaintext today.
- **Monitoring**: no Supabase dashboard/advisors in self-hosted mode by default. Logs & Analytics (Logflare + Vector) are available as an optional add-on if you want log aggregation; otherwise it's `docker compose logs` / `journalctl`.
- **Email**: if any Supabase Auth email flows are kept (see Open Decisions below), you'll need to point them at a real SMTP relay — self-hosted Auth doesn't send email on its own.

## Open Decisions (yours to make, not something I should assume)

1. **Do password-based login, registration, and password-reset stay as a fallback, or does Okta become the only way in?** If Okta-only, `Register.js`, `ForgotPassword.js`, `ResetPassword.js`, and the password fields in `LoginAnimated.js` become dead code worth removing rather than leaving as an unused/untested path.
2. **AI Assist feature** (`/api/ai`, calls Anthropic's API): does your VM's network policy allow that egress? If not, it needs to be disabled or repointed at an internal/enterprise LLM endpoint before cutover, not discovered broken after.
3. **Which optional Supabase services do you actually want running?** Realtime, imgproxy, and Edge Functions aren't used by this app (confirmed against `CONTEXT.md` — NotificationBell polls every 60s rather than using Realtime). Trimming them from `docker-compose.yml` reduces the VM's resource footprint.
4. **Secrets manager** — does your org already have one (Vault, CyberArk, etc.), or should this default to a locked-down `.env` file with restricted OS permissions?
5. **Backup/retention policy and who owns it operationally** — this instance won't have Supabase's managed backups once self-hosted.

## What I can start on now, before the VM exists

Everything in Phase 0 is pure code work and doesn't require the VM, Okta app registration, or any org-specific values to begin — the CSP fix, the SQL consolidation, and stubbing in the Okta SSO login call (with a placeholder domain/provider ID to fill in once Okta's actually registered) can all be done against this repo today. Let me know if you want me to start there.
