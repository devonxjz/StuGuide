export interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
}

/**
 * Chia văn bản dài thành các đoạn theo câu, có phần gối đầu (overlap).
 * (Spec: ~500 token/đoạn, overlap 100 token → ở đây quy đổi gần đúng theo ký tự.)
 */
export function chunkText(text: string, { maxChars = 1200, overlapChars = 200 }: ChunkOptions = {}): string[] {
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]*/g) ?? [];
  const chunks: string[] = [];
  let current = "";

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (current && current.length + sentence.length + 1 > maxChars) {
      chunks.push(current);
      const tail = current.slice(-overlapChars);
      current = tail.slice(tail.indexOf(" ") + 1);
    }
    current = current ? `${current} ${sentence}` : sentence;
    while (current.length > maxChars) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(maxChars - overlapChars);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
