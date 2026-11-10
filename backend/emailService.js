import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || 'hiteshav2006@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';
const SENDER_NAME = process.env.SMTP_SENDER_NAME || 'FinSight Security';
const SENDER_EMAIL = process.env.SMTP_FROM || SMTP_USER;

let transporter = null;

/**
 * TEMPORARY 5-DAY MAINTENANCE FEATURE FLAG:
 * Temporarily disables all password recovery email sending while administrator is unavailable.
 *
 * To re-enable password recovery after five days:
 * 1. Change PASSWORD_RECOVERY_ENABLED to true below, OR
 * 2. Set ENABLE_PASSWORD_RECOVERY=true in backend/.env
 */
export const PASSWORD_RECOVERY_ENABLED = process.env.ENABLE_PASSWORD_RECOVERY === 'true';

export function isPasswordRecoveryEnabled() {
  if (process.env.ENABLE_PASSWORD_RECOVERY !== undefined) {
    return process.env.ENABLE_PASSWORD_RECOVERY === 'true';
  }
  if (process.env.DISABLE_PASSWORD_RECOVERY !== undefined) {
    return process.env.DISABLE_PASSWORD_RECOVERY !== 'true';
  }
  return PASSWORD_RECOVERY_ENABLED; // false by default during maintenance period
}

export function getEmailTransporter() {
  if (!transporter && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS.replace(/\s+/g, '') // sanitize spaces from 16-char app password
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return transporter;
}

/**
 * Sends a password recovery email to the recipient
 */
export async function sendPasswordRecoveryEmail({ toEmail, recoveryLink, recipientName = 'FinSight User' }) {
  if (!isPasswordRecoveryEnabled()) {
    console.warn(`[FinSight Mailer] Password recovery is temporarily disabled. Suppressed recovery email to ${toEmail}`);
    return {
      success: false,
      disabled: true,
      reason: 'Password recovery is temporarily unavailable. Please try again later.'
    };
  }

  const mailer = getEmailTransporter();
  if (!mailer) {
    console.warn('[FinSight Mailer] SMTP credentials not fully configured (SMTP_USER / SMTP_PASS). Skipping direct SMTP send.');
    return {
      success: false,
      reason: 'SMTP credentials not configured on backend'
    };
  }

  const mailOptions = {
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: toEmail,
    subject: 'FinSight — Password Recovery Request',
    text: `Hello ${recipientName},\n\nWe received a request to reset the password for your FinSight account.\n\nClick the link below to set a new password:\n${recoveryLink}\n\nThis recovery link will expire in 60 minutes.\nIf you did not request this, please ignore this email or contact support.\n\nBest regards,\nFinSight Security Team`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0B1220; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #0B1220; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #0F172A; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.2); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
              <tr>
                <td style="padding: 32px 32px 24px 32px; background: linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, transparent 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                  <div style="font-size: 20px; font-weight: 800; color: #38BDF8; letter-spacing: -0.5px;">
                    Fin<span style="color: #F8FAFC;">Sight</span>
                  </div>
                  <div style="font-size: 12px; color: #94A3B8; margin-top: 4px;">Uncertain Income & Cash Flow Intelligence</div>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h1 style="font-size: 20px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px 0;">Reset Your Password</h1>
                  <p style="font-size: 14.5px; line-height: 1.6; color: #CBD5E1; margin: 0 0 24px 0;">
                    Hello ${recipientName},
                  </p>
                  <p style="font-size: 14px; line-height: 1.6; color: #94A3B8; margin: 0 0 28px 0;">
                    We received a request to reset the password for your FinSight account (<strong style="color: #F8FAFC;">${toEmail}</strong>). Click the button below to choose a new password:
                  </p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${recoveryLink}" style="display: inline-block; background-color: #0284C7; background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF; font-weight: 600; font-size: 14.5px; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);">
                      Reset Password
                    </a>
                  </div>
                  <p style="font-size: 12.5px; line-height: 1.5; color: #64748B; margin: 24px 0 0 0;">
                    If the button above doesn't work, copy and paste this URL into your browser:
                  </p>
                  <p style="font-size: 11.5px; word-break: break-all; color: #38BDF8; margin: 8px 0 24px 0;">
                    ${recoveryLink}
                  </p>
                  <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 12px 16px; margin-top: 24px;">
                    <p style="font-size: 12px; color: #94A3B8; margin: 0; line-height: 1.5;">
                      <strong>Security Notice:</strong> This link is secure, single-use, and valid for 60 minutes. If you did not make this request, you can safely ignore this email — your password will remain unchanged.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 32px; background-color: #0A0F1D; border-top: 1px solid rgba(255, 255, 255, 0.04); text-align: center;">
                  <p style="font-size: 11.5px; color: #475569; margin: 0;">
                    FinSight Autonomous Cash Flow Platform • Bengaluru, India
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `
  };

  try {
    const info = await mailer.sendMail(mailOptions);
    console.log(`[FinSight Mailer] Password recovery email dispatched to ${toEmail} (Message ID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (err) {
    console.error(`[FinSight Mailer] Failed to deliver recovery email to ${toEmail}:`, err.message);
    return {
      success: false,
      error: err.message
    };
  }
}
