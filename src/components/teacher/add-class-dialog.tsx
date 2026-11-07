"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AGE_GROUPS, type AgeGroup } from "@/core/constants/age-groups";
import { ROSTER_TEMPLATE_CSV, rosterFromCsv, rosterFromTable, type RosterParseResult } from "@/core/roster-import";
import type { CreateClassResult } from "@/core/schemas/class.schema";
import { api, ApiError } from "@/lib/api-client";

const MAX_FILE_BYTES = 2_000_000;
const pad = (n: number) => String(n).padStart(2, "0");

/** Ô Excel có thể là chuỗi, số hoặc Date: quy về chuỗi mà bộ đọc CSV hiểu (ngày → yyyy-mm-dd). */
const cellText = (v: unknown) => (v instanceof Date ? `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}` : v == null ? "" : String(v).trim());

async function readRosterFile(file: File): Promise<RosterParseResult> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    const sheet = await readSheet(file);
    return rosterFromTable(sheet.map((r) => r.map(cellText)).filter((r) => r.some(Boolean)));
  }
  return rosterFromCsv(await file.text());
}

/** Hộp "Thêm lớp": nhập tên lớp, nhóm tuổi và tải CSV/Excel danh sách bé + phụ huynh để lưu vào hệ thống. */
export function AddClassDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("4-5y");
  const [parsed, setParsed] = useState<RosterParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CreateClassResult | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const reset = () => {
    setName("");
    setParsed(null);
    setFileName("");
    setError(null);
    setDone(null);
  };
  const close = () => {
    onClose();
    if (done) router.push("/teacher");
    reset();
    if (done) router.refresh();
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_FILE_BYTES) return setError("Tệp quá lớn (tối đa 2 MB).");
    if (!/\.(csv|txt|xlsx)$/i.test(file.name)) return setError("Chỉ nhận tệp .csv hoặc .xlsx. Với tệp .xls cũ, cô lưu lại thành .xlsx hoặc .csv nhé.");
    try {
      setParsed(await readRosterFile(file));
      setFileName(file.name);
    } catch {
      setParsed(null);
      setError("Không đọc được tệp. Cô kiểm tra tệp có đúng định dạng và thử lại nhé.");
    }
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([ROSTER_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "mau-danh-sach-lop.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setDone(await api<CreateClassResult>("/api/classes", { method: "POST", body: { name, ageGroup, rows: parsed?.rows ?? [] } }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Có lỗi xảy ra, cô thử lại nhé");
    } finally {
      setBusy(false);
    }
  };

  const problems = [...(parsed?.problems ?? []), ...(done?.problems ?? [])];

  return (
    <dialog ref={ref} onClose={close} aria-labelledby="add-class-title" className="m-auto w-[min(92vw,34rem)] rounded-2xl p-0 shadow-xl backdrop:bg-black/40">
      <form onSubmit={submit} className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id="add-class-title" className="text-lg font-semibold">
            Thêm lớp
          </h2>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Đóng">
            <X />
          </Button>
        </div>

        {done ? (
          <div role="status" className="space-y-2 text-sm">
            <p className="font-medium">
              Đã tạo {done.className}: {done.students} bé, {done.parents} phụ huynh mới.
            </p>
            <p className="text-slate-500">Cô hỏi trợ lý về bé hoặc phụ huynh của lớp là có ngay thông tin.</p>
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="class-name">Tên lớp</Label>
              <Input id="class-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Lớp Mầm 2" required />
            </div>
            <div>
              <Label htmlFor="class-age">Nhóm tuổi</Label>
              <select id="class-age" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as AgeGroup)} className="h-10 w-full rounded-lg border bg-card px-3 text-sm">
                {AGE_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label} ({g.short})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-medium">Danh sách bé và phụ huynh (không bắt buộc)</p>
              <p className="text-xs text-slate-500">Các cột: Họ tên bé, Ngày sinh (dd/mm/yyyy), Giới tính, Họ tên phụ huynh, Số điện thoại, Email.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
                  <Upload /> Chọn tệp CSV / Excel
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                  <Download /> Tải tệp mẫu
                </Button>
                <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" className="hidden" onChange={(e) => void pickFile(e.target.files?.[0])} />
              </div>
              {parsed && (
                <p role="status" className="text-sm">
                  {fileName}: đọc được <strong>{parsed.rows.length}</strong> bé hợp lệ{parsed.problems.length ? `, ${parsed.problems.length} dòng cần sửa` : ""}.
                </p>
              )}
            </div>
          </>
        )}

        {problems.length > 0 && (
          <ul className="max-h-32 list-inside list-disc overflow-y-auto text-sm text-amber-700">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="text-sm text-coral-strong">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          {done ? (
            <Button onClick={close}>Xong</Button>
          ) : (
            <>
              <Button variant="outline" onClick={close} disabled={busy}>
                Huỷ
              </Button>
              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? "Đang lưu…" : parsed?.rows.length ? `Tạo lớp và nhập ${parsed.rows.length} bé` : "Tạo lớp"}
              </Button>
            </>
          )}
        </div>
      </form>
    </dialog>
  );
}
