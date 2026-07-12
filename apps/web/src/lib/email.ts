import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP email sending. Optional: if the SMTP_* env vars are not set, the app
 * falls back to the copy-link invite flow (the caller checks `isEmailConfigured`).
 *
 * Required env for sending:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * Optional:
 *   SMTP_SECURE ("true" for implicit TLS / port 465; default false → STARTTLS)
 *   EMAIL_FROM  (defaults to SMTP_USER)
 */

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  );
}

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport;

  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedTransport;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface InviteEmailParams {
  to: string;
  inviteUrl: string;
  role: string;
  inviterName: string;
  orgName: string;
}

/**
 * Send a team invitation email. Returns true if sent, false if SMTP is not
 * configured (so the caller can surface the copy-link fallback instead).
 * Throws only on an actual transport/send failure.
 */
export async function sendInviteEmail(params: InviteEmailParams): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const { to, inviteUrl, role, inviterName, orgName } = params;
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;
  const safeOrg = escapeHtml(orgName);
  const safeInviter = escapeHtml(inviterName);
  const safeRole = escapeHtml(role);
  const safeUrl = escapeHtml(inviteUrl);

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
    <h1 style="font-size: 20px; margin: 0 0 16px;">You've been invited to ${safeOrg}</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 16px;">
      ${safeInviter} invited you to join <strong>${safeOrg}</strong> on Thunder CMS as
      <strong>${safeRole}</strong>. Click below to accept your invitation.
    </p>
    <a href="${safeUrl}" style="display: inline-block; background: #6d28d9; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
      Accept invitation
    </a>
    <p style="font-size: 12px; color: #888; margin: 24px 0 0; line-height: 1.6;">
      Or paste this link into your browser:<br/>
      <a href="${safeUrl}" style="color: #6d28d9; word-break: break-all;">${safeUrl}</a>
    </p>
    <p style="font-size: 12px; color: #aaa; margin: 16px 0 0;">
      This invitation expires in 7 days. If you weren't expecting this, you can ignore this email.
    </p>
  </div>`;

  const text = `${inviterName} invited you to join ${orgName} on Thunder CMS as ${role}.\n\nAccept your invitation:\n${inviteUrl}\n\nThis invitation expires in 7 days.`;

  await getTransport().sendMail({
    from,
    to,
    subject: `You've been invited to ${orgName} on Thunder CMS`,
    text,
    html,
  });

  return true;
}
