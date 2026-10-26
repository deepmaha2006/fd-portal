import nodemailer from "nodemailer";
import { env } from "@/lib/env";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  if (!env.SMTP_HOST || !env.SMTP_USER) {
    // In dev without SMTP config, log to console
    _transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
    });
    return _transporter;
  }

  _transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: env.isProduction(),
    },
  });

  return _transporter;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<string | null> {
  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text ?? stripHtml(payload.html),
  });

  return info.messageId ?? null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export function reminderEmailHtml(params: {
  depositRef: string;
  depositType: string;
  bank: string;
  amount: string;
  maturityDate: string;
  daysRemaining: number;
  appUrl: string;
}): string {
  const urgency =
    params.daysRemaining <= 7
      ? "URGENT: "
      : params.daysRemaining <= 15
        ? "Action Required: "
        : "";
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Deposit Maturity Reminder</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #1e40af; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 20px;">FD Portal — Maturity Reminder</h1>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p><strong>${urgency}Deposit ${params.depositRef} matures in ${params.daysRemaining} day(s)</strong></p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Reference</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${params.depositRef}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Type</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${params.depositType}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Bank</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${params.bank}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Principal</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${params.amount}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Maturity Date</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${params.maturityDate}</td></tr>
    </table>
    <p style="margin: 16px 0;">
      <a href="${params.appUrl}/deposits/${params.depositRef}"
         style="background: #1e40af; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        View Deposit
      </a>
    </p>
    <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
      This is an automated notification from FD Portal. Do not reply to this email.
      To manage notification preferences, visit your profile settings.
    </p>
  </div>
</body>
</html>`;
}
