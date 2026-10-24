import { BookOpenCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CardData } from "@/types/chat";

const LEVEL = { critical: "danger", warning: "warning", info: "info" } as const;

/** Trích dẫn lấy từ kho tri thức (RAG) – chỉ hiển thị số hiệu có trong cơ sở dữ liệu (BR-003). */
export function KnowledgeCard({ data }: { data: Extract<CardData, { kind: "knowledge" }> }) {
  return (
    <Card className="max-w-[44rem] animate-pop-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpenCheck className="size-5 text-primary" aria-hidden /> {data.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {data.items.length === 0 && <p className="text-sm text-muted-foreground">Không tìm thấy mục phù hợp trong kho tri thức.</p>}
        {data.items.slice(0, 5).map((item, i) => (
          <div key={i} className="rounded-xl bg-muted/60 p-3 text-sm">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge tone={item.level ? LEVEL[item.level] : "success"}>{item.documentCode}</Badge>
              <span className="font-semibold">{item.title}</span>
            </div>
            <p className="leading-relaxed text-muted-foreground">{item.content}</p>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground">Nội dung trong prototype là bản tóm lược minh họa, cần đối chiếu văn bản gốc trước khi dùng chính thức.</p>
      </CardContent>
    </Card>
  );
}
