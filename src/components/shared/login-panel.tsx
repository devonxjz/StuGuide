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
        <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-slate-900">
          Chào mừng đến với StuGuide
        </h1>
        <p className="mt-2 text-balance text-slate-500 text-sm">
          AI hỗ trợ giáo viên & phụ huynh – Trẻ học qua trải nghiệm thật (Screen-Free)
        </p>
      </div>

      <Card className="border-slate-200 bg-white/90 shadow-[0_24px_64px_-24px_rgba(15,23,42,0.18)] backdrop-blur rounded-2xl">
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
              { value: "staff", label: "👩‍🏫 Giáo viên & BGH" },
              { value: "parent", label: "👨‍👩‍👧 Phụ huynh" },
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
              <Label htmlFor="username" className="text-xs font-semibold text-slate-800">
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
                  className="pl-9 bg-slate-50/70 focus:bg-white border-slate-200"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-800">Mật khẩu</Label>
                <span className="text-[11px] text-muted-foreground">Mặc định: <strong className="text-slate-800">stuguide</strong></span>
              </div>
              <div className="relative mt-1">
                <KeyRound className="absolute top-3 left-3 size-4 text-sun" aria-hidden />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-slate-50/70 focus:bg-white border-slate-200"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full font-bold shadow-colorful transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] bg-gradient-to-r from-primary via-blue-600 to-indigo-600 text-white"
              size="lg"
              disabled={busy !== null}
            >
              {busy === "login" && <LoaderCircle className="animate-spin" />} Đăng nhập vào StuGuide
            </Button>
          </form>

          {/* Khối gợi ý tài khoản demo với các huy hiệu màu sắc sinh động */}
          <div className="pt-2 border-t border-slate-100 text-xs">
            <p className="font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <span>🎯</span> Chọn nhanh tài khoản mẫu để trải nghiệm:
            </p>
            {mode === "staff" ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => quickFill("lan@hoamai.edu.vn")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-all hover:scale-105 hover:bg-blue-100"
                >
                  <span>🌸</span> Cô Lan (Lớp Chồi B1)
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("thu@hoamai.edu.vn")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/80 px-2.5 py-1.5 text-xs font-semibold text-purple-700 transition-all hover:scale-105 hover:bg-purple-100"
                >
                  <span>🌼</span> Cô Thu (Lớp Mầm A2)
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("minh@hoamai.edu.vn")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition-all hover:scale-105 hover:bg-amber-100"
                >
                  <span>🏛️</span> BGH Thầy Minh
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => quickFill("0900000001")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/80 px-2.5 py-1.5 text-xs font-semibold text-sky-700 transition-all hover:scale-105 hover:bg-sky-100"
                >
                  <span>🧸</span> Mẹ Gia Huy (0900000001)
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("0900000002")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:scale-105 hover:bg-emerald-100"
                >
                  <span>🚀</span> Bố Minh Anh (0900000002)
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
