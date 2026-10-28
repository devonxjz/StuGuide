import { describe, it, expect, beforeAll } from "vitest";
import { HashEmbeddings } from "../../helpers/hash-embeddings";
import { createKnowledgeRetriever, type KnowledgeRetriever } from "@/ai/rag/retriever";

describe("HashEmbeddings", () => {
  it("deterministic và chuẩn hóa độ dài", async () => {
    const e = new HashEmbeddings();
    const [a, b] = await Promise.all([e.embedQuery("trẻ biết chia sẻ"), e.embedQuery("trẻ biết chia sẻ")]);
    expect(a).toEqual(b);
    expect(Math.hypot(...a)).toBeCloseTo(1, 5);
  });
});

describe("RAG retrieval (embedding băm tất định; độ chính xác ngữ nghĩa thật ở tests/live)", () => {
  let retriever: KnowledgeRetriever;
  beforeAll(() => {
    retriever = createKnowledgeRetriever({ embeddings: new HashEmbeddings() });
  });

  it("'4-5 tuổi Tình cảm KNXH' trả về đúng mục tiêu VBHN 01", async () => {
    const hits = await retriever.retrieve({ query: "Tình cảm kỹ năng xã hội trẻ 4-5 tuổi hợp tác chia sẻ", collection: "vbhn01", topK: 3 });
    expect(hits[0].metadata.documentCode).toBe("VBHN 01/VBHN-BGDĐT");
    expect(hits[0].metadata.ageGroup).toBe("4-5y");
    expect(hits[0].metadata.developmentArea).toBe("social-emotional");
  });

  it("vật nhỏ + 24-36 tháng trả về quy tắc hóc của TT 45", async () => {
    const hits = await retriever.retrieve({ query: "hạt nhỏ vật nhỏ trẻ 24-36 tháng nguy cơ hóc", collection: "tt45-safety", topK: 3 });
    expect(hits.some((h) => /hóc/i.test(h.content))).toBe(true);
    expect(hits[0].metadata.documentCode).toBe("45/2021/TT-BGDĐT");
  });

  it("lọc theo collection, không trộn nguồn", async () => {
    const hits = await retriever.retrieve({ query: "rồng rắn lên mây", collection: "folklore", topK: 5 });
    expect(hits.every((h) => h.metadata.collection === "folklore")).toBe(true);
    expect(hits[0].content).toMatch(/Rồng rắn/);
  });

  it("filter metadata theo độ tuổi", async () => {
    const hits = await retriever.retrieve({ query: "phát triển", collection: "vbhn01", topK: 10, filter: { ageGroup: "5-6y" } });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.metadata.ageGroup === "5-6y")).toBe(true);
  });
});
