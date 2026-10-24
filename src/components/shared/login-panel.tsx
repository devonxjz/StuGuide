"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, Mail, Phone } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api-client";

type Mode = "staff" | "parent";

/** Màn hình 1 – đăng nhập bằng tài khoản thật cho cả 3 vai trò. */
export function LoginPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("staff");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const run = async (key: string, url: string, body: unknown) => {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      const { redirect } = await api<{ redirect: string }>(url, { method: "POST", body });
      router.push(redirect);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Logo className="mx-auto w-fit" />
        <h1 className="mt-5 text-balance text-3xl font-bold tracking-tight">Chào mừng đến với Mầm Học AI</h1>
        <p className="mt-2 text-balance text-muted-foreground">AI hỗ trợ người lớn – Trẻ học qua trải nghiệm thật</p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <Tabs<Mode> className="w-full" value={mode} onChange={(m) => { setMode(m); setUsername(""); setPassword(""); setError(null); }} items={[{ value: "staff", label: "Giáo viên & BGH" }, { value: "parent", label: "Phụ huynh" }]} />

          <form
            key={mode}
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run("login", "/api/auth/login", { username, password });
            }}
          >
            <div>
              <Label htmlFor="username">{mode === "staff" ? "Email" : "Số điện thoại"}</Label>
              <div className="relative">
                {mode === "staff" ? <Mail className="absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden /> : <Phone className="absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden />}
                <Input
                  id="username"
                  type={mode === "staff" ? "email" : "tel"}
                  inputMode={mode === "staff" ? "email" : "tel"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={254}
                  required
                  className="pl-9"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <KeyRound className="absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" autoComplete="current-password" maxLength={128} required />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy !== null}>
              {busy === "login" && <LoaderCircle className="animate-spin" />} Đăng nhập
            </Button>
          </form>

          {error && (
            <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral-strong">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
