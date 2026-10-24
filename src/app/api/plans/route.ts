import { createPlanInputSchema } from "@/core/schemas/form-inputs.schema";
import { route, toActor, toErrorResponse } from "@/server/http";

export const maxDuration = 180;

/**
 * Tạo giáo án từ form nhanh (Màn hình 3). Trả về NDJSON: mỗi dòng là một bước THẬT của pipeline
 * (tra cứu căn cứ → an toàn → sinh → chấm theo tiêu chí → AI tự sửa) rồi dòng kết quả – không có tiến trình giả.
 */
export const POST = route({ auth: ["teacher"], body: createPlanInputSchema, rateLimit: "ai" }, async ({ req, body, c, session }) => {
  const encoder = new TextEncoder();
  const actor = toActor(session);
  const stream = new ReadableStream({
    async start(controller) {
      const line = (data: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
      try {
        const { plan, violations } = await c.services.lessonPlanner.create(body, actor, { onStep: (step) => line({ type: "step", step }) });
        line({ type: "result", plan: { id: plan.id }, violations });
      } catch (e) {
        if (!req.signal.aborted) line({ type: "error", ...((await toErrorResponse(e).json()) as object) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
});
