import type { Embeddings } from "@langchain/core/embeddings";
import { OpenAIEmbeddings } from "@langchain/openai";
import { resolveAiConfig } from "../config";

/** Embedding thật của OpenAI cho kho tri thức và truy vấn RAG. */
export function createEmbeddings(): Embeddings {
  const cfg = resolveAiConfig();
  return new OpenAIEmbeddings({ model: cfg.embeddingModel, apiKey: cfg.apiKey });
}
