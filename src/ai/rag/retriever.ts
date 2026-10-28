import type { Embeddings } from "@langchain/core/embeddings";
import type { KnowledgeCollection, KnowledgeMetadata, KnowledgeRecord } from "@/core/entities";
import { KNOWLEDGE_BASE } from "@/data/knowledge-base";
import { createEmbeddings } from "./embedder";
import { InMemoryKnowledgeStore } from "./vector-store";
import { cacheKey, createTtlCache, knowledgeVersion, RETRIEVAL_CACHE_TTL_MS } from "./retrieval-cache";

export interface RetrieveParams {
  query: string;
  collection: KnowledgeCollection;
  topK?: number;
  filter?: Partial<Pick<KnowledgeMetadata, "ageGroup" | "developmentArea" | "level">>;
}

export interface RetrievedChunk {
  id?: string;
  content: string;
  metadata: KnowledgeMetadata;
  similarity: number;
}

export interface KnowledgeRetriever {
  retrieve(params: RetrieveParams): Promise<RetrievedChunk[]>;
}

export interface RetrieverOptions {
  embeddings?: Embeddings;
  /** Mặc định là kho tri thức của app; test truyền kho nhỏ */
  records?: KnowledgeRecord[];
  cacheTtlMs?: number;
  now?: () => number;
}

/** Vòng sửa của AI lặp lại các truy vấn gần như giống hệt: cùng truy vấn trong TTL chỉ embed và tìm kiếm một lần. */
export function createKnowledgeRetriever({ embeddings, records = KNOWLEDGE_BASE, cacheTtlMs = RETRIEVAL_CACHE_TTL_MS, now }: RetrieverOptions = {}): KnowledgeRetriever {
  let storePromise: Promise<InMemoryKnowledgeStore> | undefined;
  const store = () => (storePromise ??= InMemoryKnowledgeStore.fromRecords(records, embeddings ?? createEmbeddings()));
  const version = knowledgeVersion(records);
  const cache = createTtlCache<RetrievedChunk[]>({ ttlMs: cacheTtlMs, now });

  async function search({ query, collection, topK = 5, filter }: RetrieveParams): Promise<RetrievedChunk[]> {
    const s = await store();
    const q = await s.embeddings.embedQuery(query);
    const hits = await s.similaritySearchVectorWithScore(q, topK, { collection, ...filter });
    return hits.map(([doc, score]) => ({
      id: doc.id,
      content: doc.pageContent,
      metadata: doc.metadata as KnowledgeMetadata,
      similarity: score,
    }));
  }

  return {
    // Trả bản sao nông để nơi gọi sửa danh sách không làm bẩn kết quả đã cache.
    async retrieve(params) {
      const hits = await cache.get(cacheKey(version, params), () => search(params));
      return hits.map((hit) => ({ ...hit }));
    },
  };
}

let defaultRetriever: KnowledgeRetriever | undefined;
/** Retriever dùng chung cho app (index một lần, lazy). */
export function getKnowledgeRetriever(): KnowledgeRetriever {
  return (defaultRetriever ??= createKnowledgeRetriever());
}
