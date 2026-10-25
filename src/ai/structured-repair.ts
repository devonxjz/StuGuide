import { z } from "zod";

const describeIssues = (error: z.ZodError) => error.issues.map((i) => `${i.path.join(".") || "(gốc)"}: ${i.message}`).join("; ");

/**
 * Gọi model rồi parse theo schema, có sửa lại một lần khi sai định dạng.
 * Lần 1 sai → gọi lại kèm lỗi Zod cụ thể để model sửa; vẫn sai → log chi tiết
 * rồi ném lỗi thân thiện cho UI, thay vì throw thô của Zod.
 * Lỗi của chính lần gọi (mạng, timeout…) không phải lỗi parse nên được ném thẳng,
 * để tầng gọi quyết định retry hay fail-closed.
 */
export async function parseWithRepair<S extends z.ZodType>(args: {
  schema: S;
  invoke: (prompt: string) => Promise<unknown>;
  prompt: string;
  /** Nhãn dùng trong log, ví dụ "lesson_plan", "quality_review", "child_memory". */
  label: string;
  /** Thông báo thân thiện ném ra khi cả 2 lần đều sai schema. */
  friendlyMessage: string;
}): Promise<z.output<S>> {
  const first = args.schema.safeParse(await args.invoke(args.prompt));
  if (first.success) return first.data;
  const firstIssues = describeIssues(first.error);
  console.error(`[structured:${args.label}] lần 1 sai schema, thử sửa lại: ${firstIssues}`);
  const second = args.schema.safeParse(
    await args.invoke(`${args.prompt}\n\nLẦN TRƯỚC SAI ĐỊNH DẠNG: ${firstIssues}. Hãy trả lại đúng định dạng, không giải thích thêm.`),
  );
  if (second.success) return second.data;
  console.error(`[structured:${args.label}] vẫn sai schema sau khi sửa: ${describeIssues(second.error)}`);
  throw new Error(args.friendlyMessage);
}
