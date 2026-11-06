"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
} from "lucide-react";
import { DecorKids } from "@/components/landing/illustrations";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
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
  const [showPassword, setShowPassword] = useState(false);

  const run = async (key: string, url: string, body: unknown) => {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      const { redirect } = await api<{ redirect: string }>(url, {
        method: "POST",
        body,
      });
      router.push(redirect);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Có lỗi xảy ra, vui lòng thử lại",
      );
      setBusy(null);
    }
  };

  const quickFill = (u: string, p = "stuguide") => {
    setUsername(u);
    setPassword(p);
  };

  const demo =
    mode === "staff"
      ? [
          { label: "Cô Lan", username: "lan@hoamai.edu.vn", tone: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" },
          { label: "Cô Thu", username: "thu@hoamai.edu.vn", tone: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100" },
          { label: "BGH", username: "minh@hoamai.edu.vn", tone: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" },
        ]
      : [
          { label: "Mẹ Gia Huy", username: "0900000001", tone: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100" },
          { label: "Bố Minh Anh", username: "0900000002", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
        ];

  return (
    <div className="space-y-8 animate-pop-in">
      <div className="text-center">
        <DecorKids className="mx-auto -mb-1 w-48 animate-bounce-gentle" />
        <Logo compact className="mx-auto mt-3 w-fit" />
        <h1 className="mt-5 text-balance text-2xl font-semibold tracking-tight text-slate-900">
          Đăng nhập
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">Tiếp tục với StuGuide</p>
      </div>

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_24px_64px_-24px_rgba(15,23,42,0.18)] backdrop-blur">
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
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run("login", "/api/auth/login", { username, password });
          }}
        >
          <div>
            <Label
              htmlFor="username"
              className="text-sm font-medium text-slate-700"
            >
              {mode === "staff" ? "Email" : "Số điện thoại"}
            </Label>
            <div className="relative">
              {mode === "staff" ? (
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-blue-500"
                  aria-hidden
                />
              ) : (
                <Phone
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sky-500"
                  aria-hidden
                />
              )}
              <Input
                id="username"
                type={mode === "staff" ? "email" : "tel"}
                inputMode={mode === "staff" ? "email" : "tel"}
                placeholder={
                  mode === "staff" ? "lan@hoamai.edu.vn" : "0900000001"
                }
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={254}
                required
                className="h-11 rounded-lg border-slate-200 bg-white pl-9"
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <Label
              htmlFor="password"
              className="text-sm font-medium text-slate-700"
            >
              Mật khẩu
            </Label>
            <div className="relative">
              <LockKeyhole
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-amber-500"
                aria-hidden
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-white px-9"
                autoComplete="current-password"
                maxLength={128}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn ký tự đã nhập" : "Hiện ký tự đã nhập"}
                className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-coral-strong animate-pop-in"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={busy !== null}
            className="h-11 w-full rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 font-medium text-white shadow-[0_10px_25px_-8px_rgba(79,70,229,0.5)] transition-all hover:brightness-110"
          >
            {busy === "login" && <LoaderCircle className="animate-spin" />}
            Đăng nhập
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-xs text-slate-500">
          <span>Tài khoản mẫu:</span>
          {demo.map((d) => (
            <button
              key={d.username}
              type="button"
              onClick={() => quickFill(d.username)}
              className={`rounded-full border px-2.5 py-1 font-medium transition-colors ${d.tone}`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
