import type { Embeddings } from "@langchain/core/embeddings";
import type { KnowledgeCollection, KnowledgeMetadata } from "@/core/entities";
import { KNOWLEDGE_BASE } from "@/data/knowledge-base";
import { createEmbeddings } from "./embedder";
import { InMemoryKnowledgeStore } from "./vector-store";

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

export function createKnowledgeRetriever({ embeddings }: { embeddings?: Embeddings } = {}): KnowledgeRetriever {
  let storePromise: Promise<InMemoryKnowledgeStore> | undefined;
  const store = () =>
    (storePromise ??= InMemoryKnowledgeStore.fromRecords(KNOWLEDGE_BASE, embeddings ?? createEmbeddings()));

  return {
    async retrieve({ query, collection, topK = 5, filter }) {
      const s = await store();
      const q = await s.embeddings.embedQuery(query);
      const hits = await s.similaritySearchVectorWithScore(q, topK, { collection, ...filter });
      return hits.map(([doc, score]) => ({
        id: doc.id,
        content: doc.pageContent,
        metadata: doc.metadata as KnowledgeMetadata,
        similarity: score,
      }));
    },
  };
}

let defaultRetriever: KnowledgeRetriever | undefined;
/** Retriever dùng chung cho app (index một lần, lazy). */
export function getKnowledgeRetriever(): KnowledgeRetriever {
  return (defaultRetriever ??= createKnowledgeRetriever());
}
