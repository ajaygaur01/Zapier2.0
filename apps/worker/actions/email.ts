import nodemailer from "nodemailer";
import { Resend } from "resend";

const host = process.env.SMTP_ENDPOINT;
const user = process.env.SMTP_USERNAME;
const pass = process.env.SMTP_PASSWORD;
const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USERNAME || "noreply@localhost";
const resendApiKey = process.env.RESEND_API_KEY || (process.env.SMTP_ENDPOINT?.includes("resend.com") ? process.env.SMTP_PASSWORD : undefined);
const resendFrom = process.env.RESEND_FROM || process.env.SMTP_FROM || "onboarding@resend.dev";

const resend = resendApiKey ? new Resend(resendApiKey) : undefined;

if (!host || !user || !pass) {
  console.warn(
    "SMTP not fully configured: SMTP_ENDPOINT, SMTP_USERNAME, SMTP_PASSWORD must be set. SMTP fallback will fail."
  );
}

const transport = nodemailer.createTransport({
  host,
  port: 587,
  secure: false,
  requireTLS: true,
  auth: { user, pass },
});

export async function sendEmail(to: string, body: string): Promise<void> {
  try {
    if (!to || !body) {
      throw new Error(`Invalid email or body: to=${to}, body=${body}`);
    }

    const from = resend ? resendFrom : smtpFrom;

    if (resend) {
      console.log(`resend debug: from=${from}, to=${to}, resendApiKey=${Boolean(resendApiKey)}`);
      const result = await resend.emails.send({
        from,
        to,
        subject: "Hello from workflow",
        html: `<div>${body}</div>`,
      });

      console.log(`✅ Email sent via Resend to ${to}`, result ? JSON.stringify(result) : "<no result>");
      return;
    }

    const info = await transport.sendMail({
      from,
      to,
      subject: "Hello from workflow",
      text: body,
    });

    console.log(`✅ Email sent via SMTP to ${to}`, info.messageId ? `messageId=${info.messageId}` : "");
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err);
    throw err; 
  }
}