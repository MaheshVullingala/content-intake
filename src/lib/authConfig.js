// Centralizes login-method config so Okta SSO can be turned on — once
// self-hosted GoTrue/SAML is configured on the RHEL 9 VM — as an env var
// change, not a code change. Okta and email/password run side by side
// (not either/or): the Login screen shows the Okta button whenever it's
// configured, and the password form whenever an admin hasn't turned it
// off (AdminPanel → Settings, backed by settings.password_login_enabled,
// read via the get_password_login_enabled() RPC since Login.js runs
// before any session exists). See CONTEXT.md "Okta SSO: dual login".
//
// OKTA_ENABLED  — flip once Supabase Auth has Okta configured as a SAML
//   identity provider. Before that, leave unset/false: the button simply
//   doesn't render, password login keeps working exactly as it does now.
// OKTA_SSO_DOMAIN — the verified email domain used for Supabase's
//   domain-based SSO lookup (supabase.auth.signInWithSSO({ domain })).
//   Must match the domain registered against the Okta SAML connection.
export const OKTA_ENABLED = process.env.NEXT_PUBLIC_OKTA_ENABLED === "true";
export const OKTA_SSO_DOMAIN = process.env.NEXT_PUBLIC_OKTA_SSO_DOMAIN || "cadence.com";
