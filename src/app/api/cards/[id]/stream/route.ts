import { idParams } from "@/core/schemas/common.schema";
import { route, toActor } from "@/server/http";

export const dynamic = "force-dynamic";

/** SSE realtime: phụ huynh bấm 1 chạm -> % hoàn thành trên máy cô tự nhảy (không cần F5). */
export const GET = route({ auth: ["teacher", "principal"], params: idParams }, async ({ req, params, c, session }) => {
  const stats = await c.services.parentCards.statsForActor(params.id, toActor(session));

  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const send = (data: unknown) => write(`data: ${JSON.stringify(data)}\n\n`);
      send(stats);
      const off = c.events.subscribe(params.id, send);
      const keepAlive = setInterval(() => write(": ping\n\n"), 15000);
      cleanup = () => {
        off();
        clearInterval(keepAlive);
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
});
