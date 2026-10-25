"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, History, Lock, Pencil, Printer, RefreshCw, Save, Send, Sparkles, X, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { LegalReferenceBox } from "@/components/shared/legal-reference-box";
import { SafetyAlertBox } from "@/components/shared/safety-alert-box";
import { PlanBody } from "@/components/teacher/plan-body";
import { FlashcardGallery } from "@/components/teacher/flashcard-gallery";
import { api, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { clearDraft, loadDraft, useAutoSave } from "@/hooks/use-auto-save";
import { usePlanStore } from "@/stores/plan.store";
import { getAgeLabel } from "@/core/constants/age-groups";
import { getAreaLabel } from "@/core/constants/development-areas";
import type { EditableSection } from "@/core/schemas/lesson-plan.schema";
import type { PlanDTO } from "@/types/chat";

export interface VersionDTO {
  id: string;
  versionNumber: number;
  sectionEdited: string;
  changeDescription: string;
  editedAt: string;
}

const SECTION_TITLES: Record<EditableSection, string> = {
  gameName: "Tên trò chơi",
  objectives: "Phần 1 · Mục tiêu bài học",
  preparation: "Phần 2 · Chuẩn bị đồ dùng (Screen-Free)",
  procedure: "Phần 3 · Cách chơi & luật chơi",
  teacherScript: "Lời dẫn mẫu của cô",
  safetyWarnings: "Cảnh báo an toàn",
};

type Value = string | string[] | PlanDTO["procedure"] | PlanDTO["safetyWarnings"];
const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

function currentValue(plan: PlanDTO, section: EditableSection): Value {
  return (plan[section] ?? "") as Value;
}

export function PlanEditor({ initialPlan, versions, role, hasChecklist }: { initialPlan: PlanDTO; versions: VersionDTO[]; role: "teacher" | "principal"; hasChecklist: boolean }) {
  const setPlan = usePlanStore((s) => s.setPlan);
  const stored = usePlanStore((s) => s.plans[initialPlan.id]);
  const plan = stored ?? initialPlan;
  const [history, setHistory] = useState(versions);
  const [editing, setEditing] = useState<EditableSection | null>(null);
  const [draft, setDraft] = useState<Value>("");
  const [rewriting, setRewriting] = useState<EditableSection | null>(null);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(hasChecklist);

  useEffect(() => setPlan(initialPlan), [initialPlan, setPlan]);

  const locked = role === "principal" || plan.status === "shared";
  const draftKey = editing ? `sg:plan:${plan.id}:${editing}` : "";
  const dirty = editing !== null && JSON.stringify(draft) !== JSON.stringify(currentValue(plan, editing));
  useAutoSave(draftKey, draft, { enabled: editing !== null && dirty });

  // ERR-DATA-01: cảnh báo khi đang sửa dở mà tắt tab
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const refreshVersions = async () => {
    const res = await api<{ versions: VersionDTO[] }>(`/api/plans/${plan.id}`);
    setHistory(res.versions);
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setBusy(null);
    }
  };

  const startEdit = (section: EditableSection) => {
    const saved = loadDraft<Value>(`sg:plan:${plan.id}:${section}`);
    setDraft(saved ?? currentValue(plan, section));
    if (saved) setNotice("Đã khôi phục bản nháp chưa lưu của cô.");
    setEditing(section);
    setRewriting(null);
  };

  const save = () =>
    run("save", async () => {
      if (!editing) return;
      const res = await api<{ plan: PlanDTO }>(`/api/plans/${plan.id}`, { method: "PATCH", body: { section: editing, value: draft } });
      setPlan(res.plan);
      clearDraft(draftKey);
      setEditing(null);
      await refreshVersions();
      setNotice(res.plan.status === "ai_draft" && plan.status === "approved" ? "Đã lưu. Vì có chỉnh sửa nên giáo án cần được phê duyệt lại." : "Đã lưu chỉnh sửa.");
    });

  const rewrite = (section: EditableSection) =>
    run(`rewrite-${section}`, async () => {
      const res = await api<{ plan: PlanDTO }>(`/api/plans/${plan.id}/rewrite`, { method: "POST", body: { section, instruction: instruction.trim() || undefined } });
      setPlan(res.plan);
      setRewriting(null);
      setInstruction("");
      await refreshVersions();
      setNotice(`Đã nhờ AI viết lại “${SECTION_TITLES[section]}”. Các phần khác giữ nguyên, phiên bản cũ được lưu lại.`);
    });

  const approve = () =>
    run("approve", async () => {
      const res = await api<{ plan: PlanDTO; checklistId: string | null }>(`/api/plans/${plan.id}/approve`, { method: "POST", body: {} });
      setPlan(res.plan);
      setChecklist(Boolean(res.checklistId));
      setNotice(role === "teacher" ? "Đã phê duyệt và tạo checklist quan sát. Giờ cô có thể ghi nhận quan sát cuối ngày." : "Đã phê duyệt giáo án.");
    });

  const review = (action: "submit" | "request-changes") =>
    run(action, async () => {
      const res = await api<{ plan: PlanDTO }>(`/api/plans/${plan.id}/review`, { method: "POST", body: { action } });
      setPlan(res.plan);
      setNotice(action === "submit" ? "Đã gửi Ban giám hiệu rà soát." : "Đã yêu cầu giáo viên sửa lại.");
    });

  const approved = plan.status === "approved" || plan.status === "shared";
  const sectionCards = useMemo(() => (["gameName", "objectives", "preparation", "procedure", "teacherScript"] as const), []);

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={plan.status} />
            <Badge tone="ai"><Sparkles aria-hidden /> AI soạn · cô duyệt</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">{plan.gameName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {getAgeLabel(plan.ageGroup)} · {getAreaLabel(plan.developmentArea)} · {plan.topic} · {plan.duration} phút · {plan.space === "indoor" ? "Trong lớp" : "Ngoài sân"}
          </p>
        </div>
        <Link href={`/teacher/plan/${plan.id}/print`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold hover:bg-muted">
          <Printer className="size-4" aria-hidden /> In học liệu
        </Link>
      </header>

      {plan.status === "shared" && (
        <p className="flex items-center gap-2 rounded-2xl bg-sky-soft px-4 py-3 text-sm font-medium text-sky-strong">
          <Lock className="size-4" aria-hidden /> Giáo án đã chia sẻ cho phụ huynh nên không thể chỉnh sửa.
        </p>
      )}
      {notice && <p role="status" className="rounded-2xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary-strong">{notice}</p>}
      {error && <p role="alert" className="rounded-2xl bg-coral-soft px-4 py-3 text-sm font-medium text-coral-strong">{error}</p>}

      <LegalReferenceBox reference={plan.legalReference} />
      <SafetyAlertBox warnings={plan.safetyWarnings} />

      {sectionCards.map((section) => (
        <Card key={section}>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>{SECTION_TITLES[section]}</CardTitle>
            {!locked && editing !== section && (
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => startEdit(section)}><Pencil /> Sửa phần này</Button>
                <Button size="sm" variant="soft" onClick={() => { setRewriting(rewriting === section ? null : section); setEditing(null); }}>
                  <RefreshCw /> AI viết lại phần này
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {rewriting === section && (
              <div className="space-y-2 rounded-2xl bg-lilac-soft/60 p-3">
                <label className="text-sm font-semibold text-lilac-strong" htmlFor={`ins-${section}`}>Góp ý cho AI (không bắt buộc)</label>
                <Input id={`ins-${section}`} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Ví dụ: ngắn gọn hơn, thêm đồng dao, vui nhộn hơn…" />
                <div className="flex gap-2">
                  <Button size="sm" variant="ai" disabled={busy !== null} onClick={() => rewrite(section)}>
                    <Sparkles /> {busy === `rewrite-${section}` ? "AI đang viết…" : "Viết lại"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRewriting(null)}>Hủy</Button>
                </div>
              </div>
            )}

            {editing === section ? (
              <SectionForm section={section} value={draft} onChange={setDraft} />
            ) : (
              <SectionView plan={plan} section={section} />
            )}

            {editing === section && (
              <div className="flex gap-2">
                <Button size="sm" onClick={save} disabled={busy !== null || !dirty}><Save /> {busy === "save" ? "Đang lưu…" : "Lưu chỉnh sửa"}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(null); clearDraft(draftKey); }}><X /> Hủy</Button>
                <span className="ml-auto self-center text-xs text-muted-foreground">Tự lưu nháp mỗi 0,5 giây</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <FlashcardGallery cards={plan.flashcards} planId={plan.id} />

      <Card>
        <CardHeader><CardTitle>Tiêu chí quan sát cuối ngày</CardTitle></CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-1 text-sm">{plan.observationCriteria.map((c, i) => <li key={i}>{c}</li>)}</ol>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="size-4" aria-hidden /> Lịch sử chỉnh sửa</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {history.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">v{v.versionNumber}</Badge>
                  <span>{v.changeDescription}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(v.editedAt)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border bg-card/95 p-3 shadow-soft backdrop-blur">
        {role === "teacher" && !approved && (
          <>
            <Button variant="outline" onClick={() => setNotice("Chỉnh sửa của cô luôn được tự lưu nháp.")}><Save /> Lưu nháp</Button>
            {plan.status === "ai_draft" && <Button variant="outline" disabled={busy !== null} onClick={() => review("submit")}><Send /> Gửi BGH duyệt</Button>}
          </>
        )}
        {!approved && (
          <Button disabled={busy !== null} onClick={approve}><CheckCircle2 /> {busy === "approve" ? "Đang duyệt…" : role === "teacher" ? "Phê duyệt & Tạo Checklist" : "Phê duyệt"}</Button>
        )}
        {role === "principal" && !approved && plan.status !== "shared" && (
          <Button variant="danger" disabled={busy !== null} onClick={() => review("request-changes")}><XCircle /> Yêu cầu sửa lại</Button>
        )}
        {role === "teacher" && approved && (
          <Link href={`/teacher/assess/${plan.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft">
            <ClipboardCheck className="size-4" aria-hidden /> {checklist ? "Ghi nhận quan sát" : "Tạo checklist & ghi nhận"}
          </Link>
        )}
      </div>
    </div>
  );
}

function SectionView({ plan, section }: { plan: PlanDTO; section: EditableSection }) {
  if (section === "gameName") return <p className="text-lg font-semibold">{plan.gameName}</p>;
  if (section === "teacherScript") return <p className="rounded-2xl bg-lilac-soft/70 p-4 leading-relaxed italic">{plan.teacherScript}</p>;
  if (section === "objectives" || section === "preparation")
    return <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed">{plan[section].map((x, i) => <li key={i}>{x}</li>)}</ul>;
  if (section === "procedure") return <PlanBody plan={{ ...plan, objectives: [], preparation: [], teacherScript: "" }} procedureOnly />;
  return null;
}

function SectionForm({ section, value, onChange }: { section: EditableSection; value: Value; onChange: (v: Value) => void }) {
  if (section === "gameName") return <Input value={value as string} onChange={(e) => onChange(e.target.value)} aria-label="Tên trò chơi" />;
  if (section === "teacherScript") return <Textarea rows={6} value={value as string} onChange={(e) => onChange(e.target.value)} aria-label="Lời dẫn mẫu" />;
  if (section === "objectives" || section === "preparation") {
    return (
      <div>
        <Textarea rows={6} value={(value as string[]).join("\n")} onChange={(e) => onChange(lines(e.target.value).length ? e.target.value.split("\n") : [])} aria-label={SECTION_TITLES[section]} />
        <p className="mt-1 text-xs text-muted-foreground">Mỗi dòng là một mục.</p>
      </div>
    );
  }
  if (section === "procedure") {
    const steps = value as PlanDTO["procedure"];
    const update = (i: number, patch: Partial<PlanDTO["procedure"][number]>) => onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    return (
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="space-y-2 rounded-2xl border p-3">
            <div className="flex gap-2">
              <Input value={s.title} onChange={(e) => update(i, { title: e.target.value })} aria-label={`Tên bước ${i + 1}`} />
              <Input type="number" min={1} value={s.duration} onChange={(e) => update(i, { duration: Number(e.target.value) })} className="w-24" aria-label={`Thời lượng bước ${i + 1}`} />
            </div>
            <Textarea rows={3} value={s.instructions} onChange={(e) => update(i, { instructions: e.target.value })} aria-label={`Hướng dẫn bước ${i + 1}`} />
            <Input value={s.teacherTip} onChange={(e) => update(i, { teacherTip: e.target.value })} aria-label={`Mẹo bước ${i + 1}`} />
          </div>
        ))}
      </div>
    );
  }
  return null;
}
