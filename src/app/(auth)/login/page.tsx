import type { Metadata } from "next";
import { LoginPanel } from "@/components/shared/login-panel";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return <LoginPanel />;
}
