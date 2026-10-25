"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AiLoadingStepper, type GenerationStepKey } from "@/components/shared/ai-loading-stepper";
import { useDeviceQuota } from "@/hooks/use-device-quota";
import { apiStream, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { AGE_GROUPS } from "@/core/constants/age-groups";
import { DEVELOPMENT_AREAS } from "@/core/constants/development-areas";
import { DURATIONS, QUICK_MATERIALS, QUICK_TOPICS, SPACES } from "@/core/constants/materials";
import { createPlanInputSchema } from "@/core/schemas/form-inputs.schema";

type Errors = Partial<Record<"ageGroup" | "developmentArea" | "topic" | "materials", string>>;

const chip = (on: boolean) =>
  cn(
    "rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all select-none cursor-pointer",
    on
      ? "border-blue-400 bg-blue-50 text-blue-900 shadow-2xs ring-1 ring-blue-300"
      : "bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 border-slate-200"
  );

/** Màn hình 3 – Zero-Prompt UI: chọn nhanh, không cần học cách viết câu lệnh. */
export function CreatePlanForm({ defaultAge }: { defaultAge: string }) {
  const router = useRouter();
  const { quota } = useDeviceQuota();
  const [ageGroup, setAgeGroup] = useState<string>(defaultAge);
  const [area, setArea] = useState<string>("");
  const [stem, setStem] = useState(false);
  const [folk, setFolk] = useState(false);
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState<number>(20);
  const [space, setSpace] = useState<string>("indoor");
  const [materials, setMaterials] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [step, setStep] = useState<GenerationStepKey | null>(null);
  const [revisions, setRevisions] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const firstError = useRef<HTMLDivElement>(null);

  const toggle = (m: string) => setMaterials((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const submit = async () => {
    if (quota.isExceeded) {
      setError("Quá hạn sử dụng, bạn phải mua thêm lượt");
      return;
    }
    setError(null);
    const parsed = createPlanInputSchema.safeParse({ ageGroup, developmentArea: area || undefined, topic, materials, duration, space, stemEnabled: stem, folkGameEnabled: folk });
    if (!parsed.success) {
      // ERR-INPUT-01: viền đỏ, cuộn tới ô lỗi, chặn gửi lên server
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Errors] ??= issue.message;
      setErrors(next);
      setTimeout(() => firstError.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    setErrors({});
    setRevisions(0);
    setStep("legal");
    try {
      // tiến trình thật do server đẩy về từng bước (không dùng hẹn giờ giả lập)
      const { plan } = await apiStream<{ plan: { id: string } }>("/api/plans", parsed.data, (event) => {
        if (event.type !== "step") return;
        const next = event.step as GenerationStepKey;
        if (next === "revise") setRevisions((n) => n + 1);
        setStep(next);
      });
      router.push(`/teacher/plan/${plan.id}`);
    } catch (e) {
      setStep(null);
      setError(e instanceof ApiError ? e.message : "Hệ thống AI đang bận, cô thử lại hoặc dùng trợ lý chat nhé.");
    }
  };

  const err = (key: keyof Errors) =>
    errors[key] ? (
      <p role="alert" ref={Object.keys(errors)[0] === key ? (firstError as never) : undefined} className="mt-1.5 text-sm font-medium text-coral-strong">{errors[key]}</p>
    ) : null;

  return (
    <Card className="border-slate-200/90 bg-white shadow-soft rounded-3xl">
      <CardContent className="space-y-6 p-6">
        <div>
          <Label htmlFor="age">1. Độ tuổi</Label>
          <select id="age" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} aria-invalid={Boolean(errors.ageGroup)} className="h-10 w-full rounded-xl border bg-card px-3 text-sm sm:w-64">
            {AGE_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label} ({g.short})</option>)}
          </select>
          {err("ageGroup")}
        </div>

        <div>
          <Label>2. Mảng phát triển</Label>
          <div className={cn("flex flex-wrap gap-2 rounded-2xl p-1", errors.developmentArea && "ring-2 ring-coral")} role="radiogroup" aria-label="Mảng phát triển">
            {DEVELOPMENT_AREAS.map((a) => (
              <button key={a.value} type="button" role="radio" aria-checked={area === a.value} onClick={() => setArea(a.value)} className={chip(area === a.value)}>{a.label}</button>
            ))}
          </div>
          {err("developmentArea")}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-sm font-semibold">
            Ưu tiên định hướng STEM <Switch checked={stem} onCheckedChange={setStem} label="Ưu tiên định hướng STEM" />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-sm font-semibold">
            Tích hợp Trò chơi dân gian <Switch checked={folk} onCheckedChange={setFolk} label="Tích hợp Trò chơi dân gian" />
          </label>
        </div>

        <div>
          <Label htmlFor="topic">3. Chủ đề bài dạy</Label>
          <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} aria-invalid={Boolean(errors.topic)} placeholder="Ví dụ: Bản thân & Tình bạn" />
          <div className="mt-2 flex flex-wrap gap-2">{QUICK_TOPICS.map((t) => <button key={t} type="button" onClick={() => setTopic(t)} className={chip(topic === t)}>{t}</button>)}</div>
          {err("topic")}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label>4. Thời lượng</Label>
            <div className="flex gap-2">{DURATIONS.map((d) => <button key={d} type="button" aria-pressed={duration === d} onClick={() => setDuration(d)} className={chip(duration === d)}>{d} phút</button>)}</div>
          </div>
          <div>
            <Label>Địa điểm</Label>
            <div className="flex gap-2">{SPACES.map((s) => <button key={s.value} type="button" aria-pressed={space === s.value} onClick={() => setSpace(s.value)} className={chip(space === s.value)}>{s.label}</button>)}</div>
          </div>
        </div>

        <div>
          <Label>5. Học liệu có sẵn trong lớp</Label>
          <div className={cn("flex flex-wrap gap-2 rounded-2xl p-1", errors.materials && "ring-2 ring-coral")}>
            {[...QUICK_MATERIALS, ...materials.filter((m) => !(QUICK_MATERIALS as readonly string[]).includes(m))].map((m) => (
              <button key={m} type="button" aria-pressed={materials.includes(m)} onClick={() => toggle(m)} className={chip(materials.includes(m))}>{m}</button>
            ))}
          </div>
          <form className="mt-2 flex max-w-sm gap-2" onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (v && !materials.includes(v)) setMaterials([...materials, v]); setCustom(""); }}>
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Thêm học liệu khác…" aria-label="Thêm học liệu khác" />
            <Button type="submit" variant="outline" size="icon" aria-label="Thêm"><Plus /></Button>
          </form>
          {err("materials")}
        </div>

        {quota.isExceeded && (
          <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
            <AlertCircle className="size-4 shrink-0 text-rose-600" aria-hidden />
            <span className="font-bold">Quá hạn sử dụng, bạn phải mua thêm lượt</span>
          </div>
        )}

        {step ? (
          <div className="rounded-2xl bg-lilac-soft/60 p-4"><AiLoadingStepper current={step} revisions={revisions} /></div>
        ) : (
          <Button size="lg" variant="ai" className="w-full sm:w-auto" disabled={quota.isExceeded} onClick={submit}>
            <Sparkles /> Tạo bản nháp bằng AI
          </Button>
        )}
        {error && (
          <p
            role="alert"
            className={cn(
              "rounded-xl px-4 py-3 text-sm font-medium",
              error.includes("Quá hạn")
                ? "flex items-center gap-2 border border-rose-200 bg-rose-50 font-bold text-rose-800"
                : "bg-sun-soft text-sun-strong",
            )}
          >
            {error.includes("Quá hạn") && <AlertCircle className="size-4 shrink-0 text-rose-600" aria-hidden />}
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
