import { isPinnedModel, type AiConfig } from "./config";

const MODELS_ENDPOINT = "https://api.openai.com/v1/models";
export const MODEL_HEALTH_TIMEOUT_MS = 10_000;

export type ModelRole = "chat" | "fast" | "embedding";
/**
 * ok: model còn dùng được. missing: nhà cung cấp trả 404 (đã bị gỡ/deprecate hoặc sai tên).
 * error: chưa kết luận được (khóa sai, quá tải, mạng) — không đồng nghĩa model hỏng.
 */
export type ModelStatus = "ok" | "missing" | "error";

export interface ModelHealth {
  model: string;
  /** Các vai trò dùng chung một model gộp làm một lần kiểm tra */
  roles: ModelRole[];
  status: ModelStatus;
  pinned: boolean;
  httpStatus?: number;
}

export interface HealthReport {
  healthy: boolean;
  checkedAt: string;
  models: ModelHealth[];
}

type Fetch = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ status: number }>;

/** Gộp các vai trò trùng model để mỗi model chỉ hỏi nhà cung cấp một lần. */
function distinctModels(config: AiConfig): { model: string; roles: ModelRole[] }[] {
  const byModel = new Map<string, ModelRole[]>();
  for (const [role, model] of [["chat", config.chatModel], ["fast", config.fastModel], ["embedding", config.embeddingModel]] as const) {
    byModel.set(model, [...(byModel.get(model) ?? []), role]);
  }
  return [...byModel].map(([model, roles]) => ({ model, roles }));
}

const statusOf = (httpStatus: number): ModelStatus => (httpStatus >= 200 && httpStatus < 300 ? "ok" : httpStatus === 404 ? "missing" : "error");

/**
 * Hỏi OpenAI (Models API, không tốn token) xem các model đang cấu hình còn tồn tại không,
 * để biết model pin bị gỡ trước khi người dùng gặp lỗi. Không bao giờ ném lỗi: lỗi mạng chỉ là status "error".
 */
export async function checkModelHealth(config: AiConfig, { fetchFn = fetch as Fetch, now = () => new Date() }: { fetchFn?: Fetch; now?: () => Date } = {}): Promise<HealthReport> {
  const models = await Promise.all(
    distinctModels(config).map(async ({ model, roles }): Promise<ModelHealth> => {
      const base = { model, roles, pinned: isPinnedModel(model) };
      try {
        const res = await fetchFn(`${MODELS_ENDPOINT}/${encodeURIComponent(model)}`, {
          headers: { Authorization: `Bearer ${config.apiKey}` },
          signal: AbortSignal.timeout(MODEL_HEALTH_TIMEOUT_MS),
        });
        return { ...base, status: statusOf(res.status), httpStatus: res.status };
      } catch {
        return { ...base, status: "error" };
      }
    }),
  );
  return { healthy: models.every((m) => m.status === "ok"), checkedAt: now().toISOString(), models };
}

/** Ghi log để cảnh báo: model bị gỡ/không kiểm tra được là lỗi, model chưa pin là cảnh báo. */
export function logHealthReport(report: HealthReport): void {
  for (const m of report.models) {
    if (m.status !== "ok") console.error(JSON.stringify({ event: "model_health", level: "error", model: m.model, roles: m.roles, status: m.status, httpStatus: m.httpStatus }));
    else if (!m.pinned) console.warn(JSON.stringify({ event: "model_health", level: "warn", model: m.model, roles: m.roles, note: "chưa pin snapshot có ngày" }));
  }
}
