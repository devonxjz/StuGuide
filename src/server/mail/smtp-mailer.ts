import nodemailer from "nodemailer";
import type { Mailer } from "@/services/types";

/**
 * Gửi thư qua SMTP (Gmail: smtp.gmail.com cổng 587 + "mật khẩu ứng dụng" của tài khoản bật xác minh 2 bước).
 * Thiếu cấu hình thì trả null; service sẽ báo rõ thay vì giả vờ đã gửi.
 */
export function createSmtpMailer(env: NodeJS.ProcessEnv = process.env): Mailer | null {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(env.SMTP_PORT) || 587;
  const from = env.SMTP_FROM?.trim() || `StuGuide <${user}>`;
  const transport = nodemailer.createTransport({
    host,
    port,
    // cổng 465 dùng TLS ngay từ đầu; cổng khác (587) nâng cấp bằng STARTTLS
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });

  return {
    async send({ to, subject, text, html, replyTo }) {
      await transport.sendMail({ from, to, subject, text, ...(html ? { html } : {}), ...(replyTo ? { replyTo } : {}) });
    },
  };
}
