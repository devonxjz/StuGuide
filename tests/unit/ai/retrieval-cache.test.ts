import { describe, it, expect, vi } from "vitest";
import { KNOWLEDGE_BASE } from "@/data/knowledge-base";
import { cacheKey, createTtlCache, knowledgeVersion } from "@/ai/rag/retrieval-cache";
import { createKnowledgeRetriever } from "@/ai/rag/retriever";
import { HashEmbeddings } from "../../helpers/hash-embeddings";

/** Embedding băm có đếm số lần embedQuery (chi phí thật khi dùng OpenAI). */
class CountingEmbeddings extends HashEmbeddings {
  queries = 0;
  async embedQuery(text: string) {
    this.queries++;
    return super.embedQuery(text);
  }
}

const QUERY = { query: "hạt nhỏ vật nhỏ trẻ 24-36 tháng nguy cơ hóc", collection: "tt45-safety", topK: 3 } as const;

function setup(options: { cacheTtlMs?: number; now?: () => number; records?: typeof KNOWLEDGE_BASE } = {}) {
  const embeddings = new CountingEmbeddings();
  return { embeddings, retriever: createKnowledgeRetriever({ embeddings, ...options }) };
}

describe("cache truy vấn RAG (P1-11)", () => {
  it("cùng truy vấn gọi 2 lần trong TTL thì embedQuery chỉ chạy 1 lần và kết quả giống nhau", async () => {
    const { embeddings, retriever } = setup();
    const first = await retriever.retrieve(QUERY);
    const second = await retriever.retrieve(QUERY);
    expect(embeddings.queries).toBe(1);
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(0);
  });

  it("khác biệt về hoa/thường hay khoảng trắng vẫn trúng cache", async () => {
    const { embeddings, retriever } = setup();
    await retriever.retrieve(QUERY);
    await retriever.retrieve({ ...QUERY, query: `  ${QUERY.query.toUpperCase()}  `.replace(/ /g, "   ") });
    expect(embeddings.queries).toBe(1);
  });

  it.each([
    ["collection khác", { collection: "vbhn01" }],
    ["topK khác", { topK: 4 }],
    ["filter khác", { filter: { ageGroup: "4-5y" } }],
    ["truy vấn khác", { query: "rồng rắn lên mây" }],
  ] as const)("%s thì không dùng nhầm kết quả cache", async (_name, override) => {
    const { embeddings, retriever } = setup();
    await retriever.retrieve(QUERY);
    await retriever.retrieve({ ...QUERY, ...override });
    expect(embeddings.queries).toBe(2);
  });

  it("topK mặc định (5) và topK=5 tường minh dùng chung một mục cache", async () => {
    const { embeddings, retriever } = setup();
    await retriever.retrieve({ query: "chia sẻ", collection: "vbhn01" });
    await retriever.retrieve({ query: "chia sẻ", collection: "vbhn01", topK: 5 });
    expect(embeddings.queries).toBe(1);
  });

  it("hết TTL thì truy vấn lại", async () => {
    let clock = 0;
    const { embeddings, retriever } = setup({ cacheTtlMs: 1000, now: () => clock });
    await retriever.retrieve(QUERY);
    clock = 999;
    await retriever.retrieve(QUERY);
    expect(embeddings.queries).toBe(1);
    clock = 1000;
    await retriever.retrieve(QUERY);
    expect(embeddings.queries).toBe(2);
  });

  it("hai truy vấn giống nhau chạy đồng thời chỉ tốn 1 lần embed", async () => {
    const { embeddings, retriever } = setup();
    const [a, b] = await Promise.all([retriever.retrieve(QUERY), retriever.retrieve(QUERY)]);
    expect(embeddings.queries).toBe(1);
    expect(a).toEqual(b);
  });

  it("sửa danh sách trả về không làm bẩn kết quả cache", async () => {
    const { retriever } = setup();
    const first = await retriever.retrieve(QUERY);
    const expectedLength = first.length;
    first.length = 0;
    first.push({ content: "rác" } as never);
    expect(await retriever.retrieve(QUERY)).toHaveLength(expectedLength);
  });

  it("lỗi embedding không bị cache: lần sau thử lại và thành công", async () => {
    const { embeddings, retriever } = setup();
    vi.spyOn(embeddings, "embedQuery").mockRejectedValueOnce(new Error("rate limit"));
    await expect(retriever.retrieve(QUERY)).rejects.toThrow("rate limit");
    await expect(retriever.retrieve(QUERY)).resolves.not.toHaveLength(0);
  });

  it("kho tri thức đổi thì không dùng lại kết quả của kho cũ (khóa gồm phiên bản kho)", () => {
    const changed = [{ ...KNOWLEDGE_BASE[0], content: `${KNOWLEDGE_BASE[0].content} (sửa)` }, ...KNOWLEDGE_BASE.slice(1)];
    expect(knowledgeVersion(changed)).not.toBe(knowledgeVersion(KNOWLEDGE_BASE));
    expect(knowledgeVersion(KNOWLEDGE_BASE)).toBe(knowledgeVersion([...KNOWLEDGE_BASE]));
    expect(cacheKey(knowledgeVersion(changed), QUERY)).not.toBe(cacheKey(knowledgeVersion(KNOWLEDGE_BASE), QUERY));
  });
});

describe("cacheKey", () => {
  it("không phụ thuộc thứ tự khóa của filter và bỏ qua giá trị undefined", () => {
    const a = cacheKey("v", { ...QUERY, filter: { ageGroup: "4-5y", developmentArea: "physical" } });
    const b = cacheKey("v", { ...QUERY, filter: { developmentArea: "physical", ageGroup: "4-5y" } });
    expect(a).toBe(b);
    expect(cacheKey("v", { ...QUERY, filter: { ageGroup: undefined } })).toBe(cacheKey("v", QUERY));
  });

  it("chuẩn hóa Unicode: cùng chữ viết dạng tổ hợp và dựng sẵn cho cùng khóa", () => {
    expect(cacheKey("v", { ...QUERY, query: "hóc".normalize("NFD") })).toBe(cacheKey("v", { ...QUERY, query: "hóc".normalize("NFC") }));
  });

  it("ký tự đặc biệt trong truy vấn không làm hai khóa khác nhau trùng nhau", () => {
    expect(cacheKey("v", { ...QUERY, query: 'a","b' })).not.toBe(cacheKey("v", { ...QUERY, query: "a" }));
  });
});

describe("createTtlCache", () => {
  it("bỏ mục cũ nhất khi vượt số mục tối đa", async () => {
    const cache = createTtlCache<number>({ maxEntries: 2 });
    const load = vi.fn(async () => 1);
    await cache.get("a", load);
    await cache.get("b", load);
    await cache.get("c", load);
    expect(cache.size).toBe(2);
    await cache.get("a", load);
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("mục hết hạn được thay thế, không tích tụ", async () => {
    let clock = 0;
    const cache = createTtlCache<number>({ ttlMs: 10, now: () => clock });
    await cache.get("a", async () => 1);
    clock = 10;
    expect(await cache.get("a", async () => 2)).toBe(2);
    expect(cache.size).toBe(1);
  });
});
