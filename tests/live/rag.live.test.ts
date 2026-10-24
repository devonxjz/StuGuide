import { describe, it, expect, beforeAll } from "vitest";
import { createKnowledgeRetriever } from "@/ai/rag/retriever";

describe("RAG với OpenAI embeddings thật (spec 15.3)", () => {
  const retriever = createKnowledgeRetriever();
  beforeAll(async () => void (await retriever.retrieve({ query: "khởi tạo", collection: "vbhn01", topK: 1 })));

  it("truy vấn tự nhiên về tình cảm xã hội 4-5 tuổi trả đúng mục tiêu VBHN 01", async () => {
    const hits = await retriever.retrieve({ query: "trẻ bốn đến năm tuổi biết nhường nhịn, chơi hợp tác cùng bạn", collection: "vbhn01", topK: 3 });
    expect(hits[0].metadata).toMatchObject({ documentCode: "VBHN 01/VBHN-BGDĐT", ageGroup: "4-5y", developmentArea: "social-emotional" });
  });

  it("hiểu ngữ nghĩa: 'bé hai tuổi nuốt hạt' → quy tắc hóc của TT 45", async () => {
    const hits = await retriever.retrieve({ query: "bé hai tuổi dễ nuốt nhầm hạt nhỏ khi chơi", collection: "tt45-safety", topK: 2 });
    expect(hits.some((h) => /hóc/i.test(h.content))).toBe(true);
    expect(hits[0].metadata.documentCode).toBe("45/2021/TT-BGDĐT");
  });

  it("gợi ý trò chơi dân gian đúng collection", async () => {
    const hits = await retriever.retrieve({ query: "trò chơi xếp hàng nắm áo bạn đọc đồng dao có thầy thuốc", collection: "folklore", topK: 1 });
    expect(hits[0].content).toMatch(/Rồng rắn lên mây/);
  });
});
