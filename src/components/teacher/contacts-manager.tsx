"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";
import { parseContactLines } from "@/core/student-matching";
import type { ContactRow } from "@/core/schemas/parent-email.schema";

const MAX_FILE_BYTES = 200_000;

interface ImportResult {
  updated: { studentName: string; parentName: string; email: string }[];
  problems: string[];
}

/** Danh bạ phụ huynh của lớp: xem ai đã có email và nhập hàng loạt theo "tên bé, email". */
export function ContactsManager({ rows }: { rows: ContactRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const withEmail = rows.filter((r) => r.parents.some((p) => p.email)).length;

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("Tệp quá lớn (tối đa 200 KB). Cô tách thành nhiều tệp nhỏ hơn nhé.");
      return;
    }
    setError(null);
    setText(await file.text());
  };

  const submit = async () => {
    const parsed = parseContactLines(text);
    if (!parsed.length) {
      setError("Chưa thấy dòng hợp lệ. Mỗi dòng gồm: tên bé, email phụ huynh.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api<ImportResult>("/api/contacts/import", { method: "POST", body: { rows: parsed } });
      setResult(res);
      if (res.updated.length) {
        setText("");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Có lỗi xảy ra, cô thử lại nhé");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nhập email phụ huynh</CardTitle>
          <p className="text-sm text-slate-500">Mỗi dòng một bé, cách nhau bằng dấu phẩy: tên bé, email phụ huynh. Có thể dán từ Excel hoặc tải tệp CSV.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={"Trần Gia Huy, me.giahuy@gmail.com\nNguyễn Minh Anh, bo.minhanh@gmail.com"}
            aria-label="Danh sách tên bé và email phụ huynh"
            maxLength={20_000}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={submit} disabled={busy || !text.trim()}>
              {busy ? "Đang nhập…" : "Nhập vào danh bạ"}
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload /> Tải tệp CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => void readFile(e.target.files?.[0])} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-coral-strong">
              {error}
            </p>
          )}
          {result && (
            <div role="status" className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-medium">Đã cập nhật {result.updated.length} bé.</p>
              {result.problems.length > 0 && (
                <ul className="list-inside list-disc text-amber-700">
                  {result.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Học sinh của lớp</CardTitle>
          <Badge tone={withEmail === rows.length && rows.length > 0 ? "success" : "neutral"}>
            {withEmail}/{rows.length} bé đã có email
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y text-left text-xs text-slate-500">
                <th className="px-5 py-2 font-medium">Bé</th>
                <th className="px-5 py-2 font-medium">Phụ huynh</th>
                <th className="px-5 py-2 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) =>
                (r.parents.length ? r.parents : [null]).map((p, i) => (
                  <tr key={`${r.studentId}-${p?.parentId ?? i}`} className="border-b last:border-0">
                    <td className="px-5 py-2.5 font-medium">{i === 0 ? r.studentName : ""}</td>
                    <td className="px-5 py-2.5 text-slate-600">{p?.parentName ?? "Chưa liên kết phụ huynh"}</td>
                    <td className="px-5 py-2.5">{p?.email ?? <span className="text-slate-400">Chưa có</span>}</td>
                  </tr>
                )),
              )}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-slate-500">
                    Lớp chưa có học sinh.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
