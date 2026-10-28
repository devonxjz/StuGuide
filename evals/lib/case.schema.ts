import { z } from "zod";
import { createPlanInputSchema } from "@/core/schemas/form-inputs.schema";

/** Phần của giáo án mà kỳ vọng được kiểm tra trên đó. */
export const EXPECTATION_SCOPES = ["all", "safetyWarnings", "procedure"] as const;
export type ExpectationScope = (typeof EXPECTATION_SCOPES)[number];

/**
 * Một kỳ vọng dạng checklist, kiểm tra tất định bằng từ khóa:
 *  - mention: đạt khi phần được kiểm tra nhắc tới ÍT NHẤT MỘT từ khóa trong anyOf.
 *  - avoid: đạt khi KHÔNG có từ khóa nào trong anyOf xuất hiện.
 */
export const expectationSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/, "id chỉ gồm chữ thường, số và dấu gạch ngang"),
  description: z.string().trim().min(1),
  scope: z.enum(EXPECTATION_SCOPES),
  mode: z.enum(["mention", "avoid"]),
  anyOf: z.array(z.string().trim().min(1)).min(1),
});
export type Expectation = z.infer<typeof expectationSchema>;

export const evalCaseSchema = z.strictObject({
  id: z.string().regex(/^lp-\d{2}$/, "id có dạng lp-01"),
  title: z.string().trim().min(1),
  input: createPlanInputSchema,
  expectations: z.array(expectationSchema).min(1),
});
export type EvalCase = z.infer<typeof evalCaseSchema>;

/** Bộ case hợp lệ: id không trùng, kỳ vọng trong mỗi case không trùng id. */
export const evalCaseListSchema = z.array(evalCaseSchema).min(1).superRefine((cases, ctx) => {
  const seen = new Set<string>();
  cases.forEach((c, index) => {
    if (seen.has(c.id)) ctx.addIssue({ code: "custom", path: [index, "id"], message: `Trùng id case "${c.id}"` });
    seen.add(c.id);
    const expectationIds = c.expectations.map((e) => e.id);
    if (new Set(expectationIds).size !== expectationIds.length) ctx.addIssue({ code: "custom", path: [index, "expectations"], message: `Case "${c.id}" có kỳ vọng trùng id` });
  });
});
