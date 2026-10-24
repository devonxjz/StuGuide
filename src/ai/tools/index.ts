import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { AGE_GROUP_VALUES, getAgeLabel } from "@/core/constants/age-groups";
import { getAreaLabel } from "@/core/constants/development-areas";
import { requiredSafetyCoverage, RULE_REF } from "@/core/guardrails/safety-guard";
import type { KnowledgeRetriever, RetrievedChunk } from "../rag/retriever";

const ageGroupSchema = z.enum(AGE_GROUP_VALUES);

const brief = (h: RetrievedChunk) => ({
  documentCode: h.metadata.documentCode,
  section: h.metadata.section,
  title: h.metadata.title,
  content: h.content,
  similarity: Number(h.similarity.toFixed(3)),
});

/** Các công cụ tra cứu kho tri thức (RAG) để agent / chatbot tự gọi khi cần. */
export function createKnowledgeTools(retriever: KnowledgeRetriever) {
  const searchLegalDocs = tool(
    async ({ ageGroup, developmentArea, query }) => {
      const text = `${getAreaLabel(developmentArea ?? "")} ${ageGroup ? getAgeLabel(ageGroup) : ""} ${query}`.trim();
      const strict = await retriever.retrieve({
        query: text,
        collection: "vbhn01",
        topK: 5,
        filter: { ...(ageGroup && { ageGroup }), ...(developmentArea && { developmentArea }) },
      });
      const hits = strict.length ? strict : await retriever.retrieve({ query: text, collection: "vbhn01", topK: 5 });
      return JSON.stringify({ results: hits.map(brief) });
    },
    {
      name: "search_legal_docs",
      description:
        "Tra cứu căn cứ pháp lý Bộ GD&ĐT (VBHN 01/VBHN-BGDĐT) trong kho tri thức: mục tiêu phát triển, chuẩn đầu ra theo độ tuổi và mảng phát triển. Chỉ được trích dẫn số hiệu có trong kết quả trả về.",
      schema: z.object({
        ageGroup: ageGroupSchema.optional().describe('Nhóm tuổi: "24-36m", "3-4y", "4-5y", "5-6y"'),
        developmentArea: z.string().optional().describe("Mảng phát triển: physical, cognitive, language, social-emotional, aesthetic"),
        query: z.string().describe("Từ khóa tìm kiếm thêm"),
      }),
    },
  );

  const checkSafetyRules = tool(
    async ({ materials, activities, ageGroup }) => {
      const knowledge = await retriever.retrieve({
        query: [...materials, ...(activities ?? []), ageGroup ? getAgeLabel(ageGroup) : ""].join(" "),
        collection: "tt45-safety",
        topK: 4,
      });
      // Rủi ro bắt buộc suy ra từ luật (vật liệu × độ tuổi); nội dung hướng dẫn chi tiết lấy từ kho tri thức TT45
      return JSON.stringify({
        warnings: ageGroup || materials.length ? requiredSafetyCoverage(materials, ageGroup ?? "").map((r) => ({ level: r.minLevel, material: r.material, description: r.reason, ruleRef: RULE_REF })) : [],
        knowledge: knowledge.map((h) => ({ ...brief(h), level: h.metadata.level, ageRestriction: h.metadata.ageRestriction })),
      });
    },
    {
      name: "check_safety_rules",
      description: "Kiểm tra quy tắc an toàn vật lý theo Thông tư 45/2021/TT-BGDĐT cho vật liệu và hoạt động vận động cụ thể, có xét độ tuổi.",
      schema: z.object({
        materials: z.array(z.string()).describe("Danh sách vật liệu sử dụng"),
        activities: z.array(z.string()).optional().describe("Các hoạt động vận động (chạy, nhảy, ném...)"),
        ageGroup: ageGroupSchema.optional().describe("Nhóm tuổi (nên truyền để xét rủi ro theo tuổi)"),
      }),
    },
  );

  const searchFolkGames = tool(
    async ({ query }) => {
      const hits = await retriever.retrieve({ query, collection: "folklore", topK: 3 });
      return JSON.stringify({ results: hits.map(brief) });
    },
    {
      name: "search_folk_games",
      description: "Tìm trò chơi dân gian, đồng dao Việt Nam phù hợp để lồng ghép vào bài học.",
      schema: z.object({ query: z.string().describe("Tên hoặc ý tưởng trò chơi dân gian") }),
    },
  );

  const searchStemActivities = tool(
    async ({ query }) => {
      const hits = await retriever.retrieve({ query, collection: "stem", topK: 3 });
      return JSON.stringify({ results: hits.map(brief) });
    },
    {
      name: "search_stem_activities",
      description: "Tìm hoạt động khám phá STEM trực giác cho mầm non dùng vật liệu sẵn có (trọng lực, ma sát, thể tích, âm thanh...).",
      schema: z.object({ query: z.string().describe("Hiện tượng hoặc vật liệu muốn khám phá") }),
    },
  );

  return { searchLegalDocs, checkSafetyRules, searchFolkGames, searchStemActivities };
}

export type KnowledgeTools = ReturnType<typeof createKnowledgeTools>;
