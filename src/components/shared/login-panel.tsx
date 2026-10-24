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

  const quickFill = (u: string, p = "stuguide") => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="space-y-6 animate-pop-in">
      <div className="text-center">
        <Logo className="mx-auto w-fit" />
        <h1 className="mt-5 text-balance text-3xl font-extrabold tracking-tight">Chào mừng đến với Mầm Học AI</h1>
        <p className="mt-2 text-balance text-muted-foreground font-medium">AI hỗ trợ người lớn – Trẻ học qua trải nghiệm thật</p>
      </div>

      <Card className="border-border/80 bg-card shadow-float backdrop-blur">
        <CardContent className="space-y-4 p-6 sm:p-7">
          <Tabs<Mode>
            className="w-full"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setUsername("");
              setPassword("");
              setError(null);
            }}
            items={[
              { value: "staff", label: "Giáo viên & BGH" },
              { value: "parent", label: "Phụ huynh" },
            ]}
          />

          <form
            key={mode}
            className="space-y-4 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              run("login", "/api/auth/login", { username, password });
            }}
          >
            <div>
              <Label htmlFor="username" className="text-xs font-semibold text-foreground">
                {mode === "staff" ? "Email tài khoản" : "Số điện thoại phụ huynh"}
              </Label>
              <div className="relative mt-1">
                {mode === "staff" ? (
                  <Mail className="absolute top-3 left-3 size-4 text-primary" aria-hidden />
                ) : (
                  <Phone className="absolute top-3 left-3 size-4 text-sky" aria-hidden />
                )}
                <Input
                  id="username"
                  type={mode === "staff" ? "email" : "tel"}
                  inputMode={mode === "staff" ? "email" : "tel"}
                  placeholder={mode === "staff" ? "lan@hoamai.edu.vn" : "0900000001"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={254}
                  required
                  className="pl-9 bg-muted/40 focus:bg-card"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-foreground">Mật khẩu</Label>
                <span className="text-[11px] text-muted-foreground">Mặc định: <strong className="text-foreground">stuguide</strong></span>
              </div>
              <div className="relative mt-1">
                <KeyRound className="absolute top-3 left-3 size-4 text-sun" aria-hidden />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-muted/40 focus:bg-card"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full font-bold shadow-soft transition-all hover:shadow-md" size="lg" disabled={busy !== null}>
              {busy === "login" && <LoaderCircle className="animate-spin" />} Đăng nhập
            </Button>
          </form>

          {/* Khối gợi ý tài khoản demo với các huy hiệu màu sắc sinh động */}
          <div className="pt-2 border-t text-xs">
            <p className="font-semibold text-muted-foreground mb-2">Tài khoản thử nghiệm nhanh (bấm để điền):</p>
            {mode === "staff" ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => quickFill("lan@hoamai.edu.vn")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft/80 px-2.5 py-1.5 text-xs font-semibold text-primary-strong transition-all hover:scale-105"
                >
                  <span className="size-2 rounded-full bg-primary" /> Cô Lan (B1)
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("thu@hoamai.edu.vn")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-lilac/20 bg-lilac-soft/80 px-2.5 py-1.5 text-xs font-semibold text-lilac-strong transition-all hover:scale-105"
                >
                  <span className="size-2 rounded-full bg-lilac" /> Cô Thu (A2)
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("minh@hoamai.edu.vn")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sun/30 bg-sun-soft/80 px-2.5 py-1.5 text-xs font-semibold text-sun-strong transition-all hover:scale-105"
                >
                  <span className="size-2 rounded-full bg-sun" /> BGH Thầy Minh
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => quickFill("0900000001")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky/30 bg-sky-soft/80 px-2.5 py-1.5 text-xs font-semibold text-sky-strong transition-all hover:scale-105"
                >
                  <span className="size-2 rounded-full bg-sky" /> Mẹ Gia Huy (0900000001)
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("0900000002")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-mint/30 bg-mint-soft/80 px-2.5 py-1.5 text-xs font-semibold text-mint-strong transition-all hover:scale-105"
                >
                  <span className="size-2 rounded-full bg-mint" /> Bố Minh Anh (0900000002)
                </button>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral-strong animate-pop-in">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
