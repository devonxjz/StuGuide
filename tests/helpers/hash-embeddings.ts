import { Embeddings } from "@langchain/core/embeddings";

/** Test double: embedding băm từ, tất định, chỉ dùng cho unit test (không phải sản phẩm). */
const DIMENSIONS = 512;

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Embedding cục bộ dựa trên băm từ (unigram + bigram), không cần API key.
 * Dùng cho chế độ demo và test; chất lượng thấp hơn embedding thật nhưng deterministic.
 */
export class HashEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  private embed(text: string): number[] {
    const tokens = text.normalize("NFC").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const vec = new Array<number>(DIMENSIONS).fill(0);
    const add = (feature: string, weight: number) => {
      const h = fnv1a(feature);
      vec[h % DIMENSIONS] += (h & 0x80000000 ? -1 : 1) * weight;
    };
    tokens.forEach((t, i) => {
      add(t, 1);
      if (i > 0) add(`${tokens[i - 1]} ${t}`, 1.5);
    });
    const norm = Math.hypot(...vec) || 1;
    return vec.map((v) => v / norm);
  }

  async embedQuery(text: string) {
    return this.embed(text);
  }

  async embedDocuments(texts: string[]) {
    return texts.map((t) => this.embed(t));
  }
}
