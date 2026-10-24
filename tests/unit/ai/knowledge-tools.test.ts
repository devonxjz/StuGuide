import { describe, it, expect } from "vitest";
import { createKnowledgeTools } from "@/ai/tools";
import { createKnowledgeRetriever } from "@/ai/rag/retriever";
import { HashEmbeddings } from "../../helpers/hash-embeddings";

const retriever = createKnowledgeRetriever({ embeddings: new HashEmbeddings() });
const tools = createKnowledgeTools(retriever);

describe("LangChain knowledge tools", () => {
  it("search_legal_docs trả về trích dẫn có số hiệu từ kho tri thức", async () => {
    const out = JSON.parse(await tools.searchLegalDocs.invoke({ ageGroup: "4-5y", developmentArea: "social-emotional", query: "hợp tác chia sẻ" }));
    expect(out.results[0].documentCode).toBe("VBHN 01/VBHN-BGDĐT");
    expect(out.results[0].content).toMatch(/chia sẻ/);
  });

  it("check_safety_rules gộp rule của kho tri thức và rule miền", async () => {
    const out = JSON.parse(await tools.checkSafetyRules.invoke({ materials: ["Hạt nhựa"], activities: ["chạy"], ageGroup: "24-36m" }));
    expect(out.warnings.some((w: { level: string }) => w.level === "critical")).toBe(true);
    expect(out.knowledge.length).toBeGreaterThan(0);
  });

  it("search_folk_games và search_stem_activities lọc đúng collection", async () => {
    const folk = JSON.parse(await tools.searchFolkGames.invoke({ query: "rồng rắn" }));
    expect(folk.results[0].title).toBe("Rồng rắn lên mây");
    const stem = JSON.parse(await tools.searchStemActivities.invoke({ query: "tháp hộp sữa trọng lực" }));
    expect(stem.results[0].title).toMatch(/Tháp hộp sữa/);
  });

  it("mô tả tool bằng tiếng Việt cho LLM", () => {
    expect(tools.searchLegalDocs.description).toMatch(/pháp lý/i);
    expect(tools.searchLegalDocs.name).toBe("search_legal_docs");
  });
});
