import { describe, it, expect } from "vitest";
import { createSmtpMailer } from "@/server/mail/smtp-mailer";

describe("createSmtpMailer", () => {
  it("thiếu cấu hình thì trả null (không giả vờ gửi được)", () => {
    expect(createSmtpMailer({} as NodeJS.ProcessEnv)).toBeNull();
    expect(createSmtpMailer({ SMTP_HOST: "smtp.gmail.com", SMTP_USER: "a@gmail.com" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(createSmtpMailer({ SMTP_HOST: "  ", SMTP_USER: "a@gmail.com", SMTP_PASS: "x" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });

  it("đủ host, user, pass thì tạo được bộ gửi", () => {
    const mailer = createSmtpMailer({ SMTP_HOST: "smtp.gmail.com", SMTP_USER: "a@gmail.com", SMTP_PASS: "app-password" } as unknown as NodeJS.ProcessEnv);
    expect(typeof mailer?.send).toBe("function");
  });
});
