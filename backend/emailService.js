/**
 * ============================================================================
 * FINSIGHT RESEND EMAIL SERVICE
 * ============================================================================
 * Production-ready email delivery engine using Resend SDK.
 * Handles transactional password recovery emails with secure 15-minute
 * expiring links and high-contrast responsive HTML templates.
 * ============================================================================
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'FinSight <onboarding@resend.dev>';

let resendClient = null;

export function getResendClient() {
  if (!resendClient && RESEND_API_KEY) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

export function isPasswordRecoveryEnabled() {
  // Active when Resend API Key is configured
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_'));
}

/**
 * Sends a password recovery email via Resend
 */
export async function sendPasswordRecoveryEmail({ toEmail, recoveryLink, recipientName = 'FinSight User' }) {
  if (!isPasswordRecoveryEnabled()) {
    console.warn('[Resend Mailer] Password recovery is not configured. RESEND_API_KEY is missing.');
    return {
      success: false,
      disabled: true,
      reason: 'Password recovery email delivery is not configured.'
    };
  }

  const resend = getResendClient();
  if (!resend) {
    return {
      success: false,
      reason: 'Could not initialize Resend client.'
    };
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your FinSight Password</title>
</head>
<body style="margin:0;padding:0;background-color:#0B1220;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed;background-color:#0B1220;padding:40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px;background-color:#0F172A;border-radius:14px;border:1px solid rgba(16,185,129,0.3);overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(180deg,rgba(16,185,129,0.12) 0%,transparent 100%);border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:22px;font-weight:800;color:#10B981;letter-spacing:-0.5px;">
                Fin<span style="color:#F8FAFC;">Sight</span>
              </div>
              <div style="font-size:12px;color:#94A3B8;margin-top:4px;font-weight:500;">
                Uncertain Income & Cash Flow Intelligence
              </div>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding:32px;">
              <h1 style="font-size:20px;font-weight:700;color:#FFFFFF;margin:0 0 16px 0;">
                Reset Your Password
              </h1>
              <p style="font-size:14.5px;line-height:1.6;color:#CBD5E1;margin:0 0 18px 0;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="font-size:14px;line-height:1.6;color:#94A3B8;margin:0 0 28px 0;">
                We received a request to reset the password for your FinSight account. Click the button below to choose a new password:
              </p>
              <!-- CTA Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${recoveryLink}" style="display:inline-block;background-color:#10B981;background:linear-gradient(135deg,#10B981 0%,#059669 100%);color:#FFFFFF;font-weight:700;font-size:14.5px;text-decoration:none;padding:14px 34px;border-radius:8px;box-shadow:0 4px 16px rgba(16,185,129,0.4);">
                  Reset Password &rarr;
                </a>
              </div>
              <!-- Plain Link Fallback -->
              <p style="font-size:12.5px;line-height:1.5;color:#64748B;margin:24px 0 6px 0;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="font-size:11.5px;word-break:break-all;color:#38BDF8;margin:0 0 24px 0;">
                <a href="${recoveryLink}" style="color:#38BDF8;text-decoration:none;">${recoveryLink}</a>
              </p>
              <!-- Security Notice -->
              <div style="background-color:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px 16px;margin-top:20px;">
                <p style="font-size:12px;color:#94A3B8;margin:0;line-height:1.5;">
                  <strong style="color:#F8FAFC;">Security Notice:</strong> This link is single-use and will expire in <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email &mdash; your password remains unchanged.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#0A0F1D;border-top:1px solid rgba(255,255,255,0.04);text-align:center;">
              <p style="font-size:11.5px;color:#64748B;margin:0;">
                FinSight Autonomous Cash Flow Platform &bull; Secure Email Dispatch via Resend
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: toEmail,
      subject: 'FinSight — Reset Your Password',
      html: htmlContent
    });

    if (error) {
      console.error('[Resend Mailer Error]:', error.message || error);
      return {
        success: false,
        error: error.message || 'Resend delivery failed'
      };
    }

    console.log(`[Resend Mailer] Password recovery email dispatched successfully (ID: ${data?.id})`);
    return {
      success: true,
      messageId: data?.id
    };
  } catch (err) {
    console.error('[Resend Mailer Exception]:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}
