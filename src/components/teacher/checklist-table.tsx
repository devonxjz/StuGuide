"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCheck, ChevronDown, Lightbulb, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";
import { cn, formatDateTime } from "@/lib/utils";
import { clearDraft, loadDraft, useAutoSave } from "@/hooks/use-auto-save";
import { ASSESSMENT_RATINGS, RATING_META, type AssessmentRating } from "@/core/constants/status";
import type { AlertDTO } from "@/types/chat";

type Ratings = Record<string, AssessmentRating>;
interface Row {
  overall: AssessmentRating;
  ratings: Ratings;
  note: string;
}
type Rows = Record<string, Row>;

export interface ChecklistStudent {
  id: string;
  fullName: string;
  avatarEmoji: string | null;
}

/** Tổng quát: có bất kỳ tiêu chí cần rèn thêm => cần rèn thêm; tất cả tốt => tốt; còn lại => đã đạt. */
export function deriveOverall(ratings: Record<string | number, AssessmentRating>): AssessmentRating {
  const values = Object.values(ratings);
  if (values.includes("needs_practice")) return "needs_practice";
  if (values.length > 0 && values.every((v) => v === "excellent")) return "excellent";
  return "achieved";
}

const ratingTone: Record<AssessmentRating, string> = {
  excellent: "data-[on=true]:bg-sun data-[on=true]:text-white data-[on=true]:border-sun font-bold",
  achieved: "data-[on=true]:bg-mint data-[on=true]:text-white data-[on=true]:border-mint font-bold",
  needs_practice: "data-[on=true]:bg-coral data-[on=true]:text-white data-[on=true]:border-coral font-bold",
};

function RatingButtons({ value, onChange, small }: { value?: AssessmentRating; onChange: (r: AssessmentRating) => void; small?: boolean }) {
  return (
    <div className="inline-flex gap-1">
      {ASSESSMENT_RATINGS.map((r) => (
        <button
          key={r}
          type="button"
          data-on={value === r}
          aria-pressed={value === r}
          onClick={() => onChange(r)}
          className={cn("rounded-lg border bg-card font-semibold whitespace-nowrap transition-colors hover:bg-muted", small ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-xs sm:text-sm", ratingTone[r])}
        >
          {RATING_META[r].label}
        </button>
      ))}
    </div>
  );
}

export function ChecklistTable({
  planId,
  checklistId,
  criteria,
  students,
  initial,
  initialPlanNote = "",
  savedAt = null,
  alerts: initialAlerts,
}: {
  planId: string;
  checklistId: string;
  criteria: string[];
  students: ChecklistStudent[];
  initial: Rows;
  initialPlanNote?: string;
  /** Lần lưu gần nhất trên server (ISO) */
  savedAt?: string | null;
  alerts: AlertDTO[];
}) {
  const draftKey = `sg:assess:${checklistId}`;
  const [rows, setRows] = useState<Rows>(initial);
  const [planNote, setPlanNote] = useState(initialPlanNote);
  const [lastSavedAt, setLastSavedAt] = useState(savedAt);
  const [hydrated, setHydrated] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [showActivity, setShowActivity] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(Object.keys(initial).length === students.length && students.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Khôi phục bản nháp chưa lưu (BR-007 / ERR-DATA-01)
  useEffect(() => {
    if (Object.keys(initial).length === 0 && !initialPlanNote) {
      const draft = loadDraft<Rows>(draftKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- khôi phục nháp từ localStorage sau hydrate
      if (draft) setRows(draft);
      const noteDraft = loadDraft<string>(`${draftKey}:note`);
      if (noteDraft) setPlanNote(noteDraft);
    }
    setHydrated(true);
  }, [draftKey, initial, initialPlanNote]);
  useAutoSave(draftKey, rows, { enabled: hydrated && Object.keys(rows).length > 0 });
  useAutoSave(`${draftKey}:note`, planNote, { enabled: hydrated && planNote !== initialPlanNote });

  const remaining = students.filter((s) => !rows[s.id]).length;
  const indexes = useMemo(() => criteria.map((_, i) => String(i)), [criteria]);

  const setOverall = (id: string, rating: AssessmentRating) => {
    setSaved(false);
    setRows((prev) => ({ ...prev, [id]: { note: prev[id]?.note ?? "", overall: rating, ratings: Object.fromEntries(indexes.map((i) => [i, rating])) } }));
  };
  const setCriterion = (id: string, idx: string, rating: AssessmentRating) => {
    setSaved(false);
    setRows((prev) => {
      const base = prev[id] ?? { note: "", overall: "achieved" as const, ratings: Object.fromEntries(indexes.map((i) => [i, "achieved" as const])) };
      const ratings = { ...base.ratings, [idx]: rating };
      return { ...prev, [id]: { ...base, ratings, overall: deriveOverall(ratings) } };
    });
  };
  const setNote = (id: string, note: string) => {
    setSaved(false);
    setRows((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { overall: "achieved", ratings: Object.fromEntries(indexes.map((i) => [i, "achieved" as const])) }), note } }));
  };
  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const allSelected = students.length > 0 && selected.size === students.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(students.map((s) => s.id)));
  /** Chọn một mức đánh giá cho tất cả bé đang được tick; ghi chú của từng bé được giữ nguyên. */
  const rateSelected = (rating: AssessmentRating) => {
    setSaved(false);
    setRows((prev) => {
      const next = { ...prev };
      for (const id of selected) {
        next[id] = { note: prev[id]?.note ?? "", overall: rating, ratings: Object.fromEntries(indexes.map((i) => [i, rating])) };
      }
      return next;
    });
  };

  const markAllAchieved = () => {
    setSaved(false);
    setRows((prev) =>
      Object.fromEntries(
        students.map((s) => [s.id, prev[s.id] ?? { note: "", overall: "achieved" as const, ratings: Object.fromEntries(indexes.map((i) => [i, "achieved" as const])) }]),
      ),
    );
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const entries = students.map((s) => ({ studentId: s.id, overallRating: rows[s.id].overall, ratings: rows[s.id].ratings, note: rows[s.id].note.trim() || undefined }));
      const res = await api<{ alerts: (Omit<AlertDTO, "studentName"> & { student?: { fullName: string }; studentName?: string })[] }>(`/api/assess/${planId}`, {
        method: "POST",
        body: { checklistId, entries, planNote: planNote.trim() || undefined },
      });
      setAlerts(res.alerts.map((a) => ({ ...a, studentName: a.studentName ?? a.student?.fullName ?? students.find((s) => s.id === a.studentId)?.fullName ?? "" })));
      clearDraft(draftKey);
      clearDraft(`${draftKey}:note`);
      setSaved(true);
      setLastSavedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Chưa lưu được, bản nháp vẫn được giữ trên máy cô.");
    } finally {
      setSaving(false);
    }
  };

  const createCard = async () => {
    setError(null);
    try {
      await api("/api/cards", { method: "POST", body: { planId } });
      // Điều hướng đầy đủ để trang thẻ phụ huynh nạp lại dữ liệu mới nhất từ server
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/teacher/parent-cards";
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Chưa tạo được thẻ");
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Tiêu chí quan sát hôm nay</CardTitle>
            <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {criteria.map((c, i) => (
                <li key={i}>
                  <b className="text-foreground">{i + 1}.</b> {c}
                </li>
              ))}
            </ol>
          </div>
          <Button variant="outline" size="lg" onClick={markAllAchieved}>
            <CheckCheck /> Đánh dấu tất cả “Đã đạt”
          </Button>
        </CardHeader>
        <CardContent className="border-t px-4 pt-4 pb-2">
          <label htmlFor="plan-note" className="text-sm font-semibold">Nhận xét chung về buổi chơi</label>
          <textarea
            id="plan-note"
            value={planNote}
            onChange={(e) => {
              setSaved(false);
              setPlanNote(e.target.value);
            }}
            maxLength={1000}
            rows={3}
            placeholder="Ví dụ: Cả lớp hào hứng, trò chơi hợp độ tuổi, lần sau cần thêm thời gian chuẩn bị đạo cụ."
            className="mt-2 w-full resize-y rounded-xl border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </CardContent>
        <CardContent className="overflow-x-auto p-0 sm:p-2">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-semibold">
                  <label className="inline-flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = selected.size > 0 && !allSelected;
                      }}
                      onChange={toggleAll}
                      aria-label="Chọn tất cả bé"
                      className="size-4 accent-primary"
                    />
                    Bé
                  </label>
                </th>
                <th className="px-2 py-2 font-semibold">
                  {selected.size > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground">Đánh giá {selected.size} bé đã chọn:</span>
                      <RatingButtons small onChange={rateSelected} />
                    </div>
                  ) : (
                    "Đánh giá"
                  )}
                </th>
                <th className="px-2 py-2 font-semibold">Ghi chú khách quan</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const row = rows[s.id];
                return (
                  <FragmentRow key={s.id}>
                    <tr className="border-t align-middle">
                      <th scope="row" className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleSelected(s.id)}
                          aria-label={`Chọn ${s.fullName}`}
                          className="mr-2.5 size-4 align-middle accent-primary"
                        />
                        <span className="mr-2.5 inline-grid size-6 place-items-center rounded-full bg-slate-100 text-xs font-medium text-slate-600" aria-hidden>{s.fullName.trim().split(" ").pop()?.charAt(0)}</span>
                        {s.fullName}
                      </th>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <RatingButtons value={row?.overall} onChange={(r) => setOverall(s.id, r)} />
                          <button type="button" aria-label={`Chi tiết tiêu chí của ${s.fullName}`} aria-expanded={expanded === s.id} onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                            <ChevronDown className={cn("size-4 transition-transform", expanded === s.id && "rotate-180")} />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <Input value={row?.note ?? ""} onChange={(e) => setNote(s.id, e.target.value)} placeholder="Ghi chú khách quan (không nhận xét/dán nhãn)" className="h-9" />
                      </td>
                    </tr>
                    {expanded === s.id && (
                      <tr className="bg-muted/50">
                        <td colSpan={3} className="px-4 py-3">
                          <ul className="space-y-1.5">
                            {criteria.map((c, i) => (
                              <li key={i} className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm">{i + 1}. {c}</span>
                                <RatingButtons small value={row?.ratings[String(i)]} onChange={(r) => setCriterion(s.id, String(i), r)} />
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        </CardContent>
        <CardFooter className="justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {remaining > 0 ? `Còn ${remaining} bé chưa đánh giá` : saved ? `Đã lưu hồ sơ minh chứng${lastSavedAt ? ` · ${formatDateTime(lastSavedAt)}` : ""}` : "Đã đánh giá đủ cả lớp"}
          </p>
          <Button onClick={save} disabled={remaining > 0 || saving}>
            <Save /> {saving ? "Đang lưu…" : "Lưu hồ sơ minh chứng"}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <p role="alert" className="rounded-xl bg-coral-soft px-4 py-3 text-sm font-medium text-coral-strong">
          {error}
        </p>
      )}

      {alerts.map((a) => (
        <Card key={a.id} className="border-amber-200 bg-amber-50/50">
          <CardHeader className="flex-row items-start gap-3">
            <div>
              <CardTitle>Gợi ý quan sát sâu cho bé {a.studentName}</CardTitle>
              <p className="mt-0.5 text-sm">{a.pattern}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => setShowActivity(showActivity === a.id ? null : a.id)}>
              <Lightbulb /> Xem kịch bản hỗ trợ riêng
            </Button>
            {showActivity === a.id && <p className="rounded-xl bg-card p-3 text-sm">{a.suggestedActivity}</p>}
            <p className="text-xs text-muted-foreground">{a.disclaimer}</p>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button size="lg" disabled={!saved} onClick={createCard}>
          Tạo Thẻ nhiệm vụ 5 phút gửi Phụ huynh 
        </Button>
      </div>
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
