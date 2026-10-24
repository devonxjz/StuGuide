import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { createKnowledgeTools } from "@/ai/tools";
import type { CardData, KnowledgeItem } from "@/types/chat";

type KnowledgeTools = ReturnType<typeof createKnowledgeTools>;
type Raw = { results?: { title?: string; documentCode: string; section: string; content: string }[]; warnings?: { level: "critical" | "warning" | "info"; material: string; description: string; ruleRef: string }[]; knowledge?: { title?: string; documentCode: string; section: string; content: string; level?: "critical" | "warning" | "info" }[] };

/**
 * Bọc công cụ tra cứu RAG để chatbot nhận văn bản đọc được (cho LLM) + artifact (thẻ trong chat).
 * Quan trọng: nội dung trả về chỉ gồm trích dẫn có trong kho tri thức (BR-003).
 */
export function createChatKnowledgeTools(base: KnowledgeTools) {
  const wrap = <S extends z.ZodObject>(inner: { name: string; description: string; invoke: (a: never) => Promise<string> }, schema: S, title: string) =>
    tool(
      async (args) => {
        const data = JSON.parse(await inner.invoke(args as never)) as Raw;
        const items: KnowledgeItem[] = [
          ...(data.warnings ?? []).map((w) => ({ title: w.material, documentCode: w.ruleRef, content: w.description, level: w.level })),
          ...(data.knowledge ?? data.results ?? []).map((r) => ({
            title: r.title ?? r.section,
            documentCode: r.documentCode,
            content: r.content,
            level: "level" in r ? (r as { level?: KnowledgeItem["level"] }).level : undefined,
          })),
        ];
        const artifact: CardData = { kind: "knowledge", tool: inner.name, title, items };
        const lines = items.length
          ? items.slice(0, 6).map((i) => `- [${i.documentCode}] ${i.title}: ${i.content}`).join("\n")
          : "Không tìm thấy mục phù hợp trong kho tri thức. Đừng bịa số hiệu văn bản.";
        return [`${title}:\n${lines}`, artifact];
      },
      { name: inner.name, description: inner.description, schema, responseFormat: "content_and_artifact" },
    );

  return [
    wrap(base.searchLegalDocs, base.searchLegalDocs.schema as z.ZodObject, "Căn cứ pháp lý (VBHN 01/VBHN-BGDĐT)"),
    wrap(base.checkSafetyRules, base.checkSafetyRules.schema as z.ZodObject, "Quy tắc an toàn (Thông tư 45/2021)"),
    wrap(base.searchFolkGames, base.searchFolkGames.schema as z.ZodObject, "Trò chơi dân gian gợi ý"),
    wrap(base.searchStemActivities, base.searchStemActivities.schema as z.ZodObject, "Hoạt động STEM gợi ý"),
  ];
}
