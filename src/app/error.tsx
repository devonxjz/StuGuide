"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">Có lỗi nhỏ xảy ra</h1>
        <p className="mt-2 text-muted-foreground">{error.message.includes("npm run setup") ? error.message : "Cô thử tải lại giúp mình nhé. Dữ liệu cô đang soạn vẫn được lưu nháp trên máy."}</p>
        <Button className="mt-5" onClick={reset}><RotateCcw /> Thử lại</Button>
      </div>
    </main>
  );
}
