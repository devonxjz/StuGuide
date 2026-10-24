import { z } from "zod";
import { route, runAfterResponse, toActor } from "@/server/http";

/**
 * Điểm nhận bộ nhớ ngắn hạn từ trình duyệt (sendBeacon khi đóng/ẩn tab). Ghi DB ngay; AI chắt lọc thành trí nhớ dài hạn
 * SAU khi đã trả phản hồi (after) và chỉ khi phiên có dữ liệu mới. Idempotent theo (sessionId, seq).
 * Body kiểm tra kỹ trong service (sessionPayloadSchema: strict, giới hạn số sự kiện/độ dài).
 */
export const POST = route({ auth: ["parent"], body: z.unknown() }, async ({ body, c, session }) => {
  const result = await c.family.sessions.ingest(toActor(session), body);
  if (result.needsDistill) runAfterResponse(() => c.family.sessions.distill(result.sessionId).catch((e) => console.error("[distill]", e)));
  return { sessionId: result.sessionId, lastSeq: result.lastSeq };
});
