import { VectorStore } from "@langchain/core/vectorstores";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { Document, type DocumentInterface } from "@langchain/core/documents";

type MetadataFilter = Record<string, unknown>;

const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const norm = (a: number[]) => Math.hypot(...a) || 1;

/** Vector store trong bộ nhớ (prototype). Khi lên Postgres thay bằng PGVectorStore, giữ nguyên interface. */
export class InMemoryKnowledgeStore extends VectorStore {
  declare FilterType: MetadataFilter;
  private rows: { vector: number[]; doc: DocumentInterface }[] = [];

  constructor(embeddings: EmbeddingsInterface) {
    super(embeddings, {});
  }

  _vectorstoreType() {
    return "in_memory_knowledge";
  }

  async addVectors(vectors: number[][], documents: DocumentInterface[]) {
    vectors.forEach((vector, i) => this.rows.push({ vector, doc: documents[i] }));
  }

  async addDocuments(documents: DocumentInterface[]) {
    const vectors = await this.embeddings.embedDocuments(documents.map((d) => d.pageContent));
    await this.addVectors(vectors, documents);
  }

  async similaritySearchVectorWithScore(query: number[], k: number, filter?: MetadataFilter): Promise<[DocumentInterface, number][]> {
    const qn = norm(query);
    return this.rows
      .filter(({ doc }) => !filter || Object.entries(filter).every(([key, val]) => doc.metadata[key] === val))
      .map(({ vector, doc }): [DocumentInterface, number] => [doc, dot(query, vector) / (qn * norm(vector))])
      .sort((a, b) => b[1] - a[1])
      .slice(0, k);
  }

  static async fromRecords(
    records: { id: string; content: string; metadata: object }[],
    embeddings: EmbeddingsInterface,
  ) {
    const store = new InMemoryKnowledgeStore(embeddings);
    await store.addDocuments(records.map((r) => new Document({ id: r.id, pageContent: r.content, metadata: r.metadata as Record<string, unknown> })));
    return store;
  }
}
