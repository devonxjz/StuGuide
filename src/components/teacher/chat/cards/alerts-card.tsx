"use client";

import { useState } from "react";
import { Eye, Gamepad2, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CardData } from "@/types/chat";

/** Gợi ý quan sát sâu – chỉ mô tả hành vi quan sát được, luôn kèm lời nhắc không phải chẩn đoán (BR-004). */
export function AlertsCard({ data }: { data: Extract<CardData, { kind: "alerts" }> }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (data.alerts.length === 0) return null;
  return (
    <div className="max-w-[44rem] space-y-3">
      {data.alerts.map((a) => (
        <Card key={a.id} className="animate-pop-in border-sun/50 bg-sun-soft/50">
          <CardHeader className="flex-row items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sun text-[oklch(0.3_0.06_70)]">
              <Eye className="size-5" aria-hidden />
            </span>
            <div>
              <CardTitle>Gợi ý quan sát sâu cho bé {a.studentName}</CardTitle>
              <p className="mt-0.5 text-sm">
                {a.pattern} · <span className="font-medium">{a.skillArea}</span>
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => setOpenId(openId === a.id ? null : a.id)}>
              <Gamepad2 /> {openId === a.id ? "Ẩn kịch bản hỗ trợ" : "Xem kịch bản hỗ trợ riêng"}
            </Button>
            {openId === a.id && (
              <p className="flex gap-2 rounded-xl bg-card p-3 text-sm">
                <HeartHandshake className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {a.suggestedActivity}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{a.disclaimer}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
