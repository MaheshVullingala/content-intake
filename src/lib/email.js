// ── Email sending (SMTP) ────────────────────────────────────────────────
// Server-only. Built generically against any SMTP endpoint — works with
// Microsoft 365/Outlook (smtp.office365.com with a mailbox's credentials,
// or an internal Exchange Online "Direct Send"/relay connector that
// allowlists this app's IP and needs no auth at all) as well as any other
// provider (Resend, SendGrid, a plain internal relay, etc.), since they
// all speak SMTP. No provider-specific code — just host/port/credentials
// from env vars.
//
// Required env vars (all unset today — this module safely no-ops until
// they're configured, so it's safe to deploy ahead of having real values):
//   SMTP_HOST        e.g. smtp.office365.com, or an internal relay host
//   SMTP_PORT        587 (STARTTLS, typical for Office 365) or 25/465
//   SMTP_SECURE      "true" for implicit TLS (port 465), otherwise unset/"false"
//   SMTP_USER        mailbox/account username — omit entirely for an
//                     anonymous internal relay connector (IP-allowlisted)
//   SMTP_PASSWORD    mailbox/account password — omit alongside SMTP_USER
//   SMTP_FROM        e.g. "Content Intake Portal <noreply@cadence.com>"
//
// Sending is additionally gated by settings.email_notifications_enabled
// (see sql/14-email-notifications-toggle.sql + AdminPanel.js's Settings
// tab) so this can be flipped on/off at runtime without a redeploy, once
// SMTP is actually configured.

import nodemailer from "nodemailer";

let cachedTransporter = null;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  const hasAuth = Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD);

  cachedTransporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true = implicit TLS (465); false = STARTTLS (587/25)
    auth:   hasAuth ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return cachedTransporter;
}

/**
 * Sends one email. Returns { sent: boolean, error?: string } rather than
 * throwing — callers (the notification sweep route) need to keep going
 * through a batch even if SMTP is unreachable or unconfigured.
 */
export async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false, error: "SMTP not configured (SMTP_HOST/SMTP_FROM unset)" };
  }
  if (!to) {
    return { sent: false, error: "No recipient email" };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e.message || "Send failed" };
  }
}

/**
 * Standard notification email template — deliberately generic (title +
 * message + a link back into the app) rather than per-notification-type
 * markup, since every notifications row already carries human-readable
 * title/message text set at insert time by whichever feature created it.
 * That means this template works for all ~14 notification types today
 * and any new one added later with zero changes here.
 */
/**
 * Invite email — sent when an admin pre-provisions a user via the
 * Invite User flow (AdminPanel → Users → Invite User). Distinct from
 * notificationEmailHtml() because the recipient has no account yet, so
 * "View in Portal" doesn't apply — the message needs to tell them how to
 * actually get in (Okta if it's live, otherwise self-register with this
 * same email address so the role already assigned to them takes effect
 * automatically on first login, per handle_new_user()'s email-linking).
 */
export function inviteEmailHtml({ name, roleLabel, appUrl, oktaEnabled }) {
  const instructions = oktaEnabled
    ? `Sign in at the link below with <strong>Sign in with Okta</strong> using your Cadence account.`
    : `Go to the link below and select <strong>Create an account</strong>, using this same email address. Your role will be applied automatically — no separate approval needed.`;
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#181313;">
      <div style="background:#0f172a;padding:16px 20px;border-radius:8px 8px 0 0;">
        <span style="color:#5eead4;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
          Content Intake Portal
        </span>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:20px;">
        <h2 style="font-size:16px;margin:0 0 10px;">You've been added to the Content Intake Portal</h2>
        <p style="font-size:14px;line-height:1.6;color:#3C3C3C;margin:0 0 12px;">
          Hi ${name || "there"}, an admin has added you with the role of <strong>${roleLabel}</strong>.
        </p>
        <p style="font-size:14px;line-height:1.6;color:#3C3C3C;margin:0 0 16px;">
          ${instructions}
        </p>
        ${appUrl ? `<a href="${appUrl}" style="display:inline-block;background:#14b8a6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:13px;font-weight:600;">Go to the Portal</a>` : ""}
      </div>
    </div>
  `;
}

export function notificationEmailHtml({ title, message, actionUrl, appUrl }) {
  const link = actionUrl ? `${appUrl || ""}${actionUrl}` : appUrl;
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#181313;">
      <div style="background:#0f172a;padding:16px 20px;border-radius:8px 8px 0 0;">
        <span style="color:#5eead4;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
          Content Intake Portal
        </span>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:20px;">
        <h2 style="font-size:16px;margin:0 0 10px;">${title || "Notification"}</h2>
        ${message ? `<p style="font-size:14px;line-height:1.6;color:#3C3C3C;margin:0 0 16px;">${message}</p>` : ""}
        ${link ? `<a href="${link}" style="display:inline-block;background:#14b8a6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:13px;font-weight:600;">View in Portal</a>` : ""}
      </div>
    </div>
  `;
}
