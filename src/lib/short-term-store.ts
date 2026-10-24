import type { SessionEvent } from "@/core/schemas/family.schema";

const MAX_EVENTS = 500;
const MAX_TURNS = 60;
/** Khớp giới hạn của server (sessionEventSchema): vượt thì cả gói bị từ chối và mất phiên. */
const MAX_DATA_KEYS = 10;
const MAX_TEXT = 500;
const MAX_TURN_TEXT = 4000;

type EventData = NonNullable<SessionEvent["data"]>;
const clampData = (data: Record<string, unknown>): EventData =>
  Object.fromEntries(
    Object.entries(data)
      .slice(0, MAX_DATA_KEYS)
      .map(([k, v]) => [k.slice(0, 40), typeof v === "string" ? v.slice(0, MAX_TEXT) : typeof v === "number" || typeof v === "boolean" || v === null ? v : String(v).slice(0, MAX_TEXT)]),
  );

export interface Turn {
  role: "parent" | "assistant";
  text: string;
}

export interface StoreOptions {
  sessionId: string;
  studentId: string;
  endpoint: string;
}

/**
 * Bộ nhớ ngắn hạn nằm hoàn toàn trong RAM của trình duyệt: ghi sự kiện và hội thoại khi phụ huynh dùng iPad.
 * Chỉ khi tab bị ẩn/đóng (visibilitychange=hidden, pagehide) mới đẩy một lần lên server bằng sendBeacon,
 * server ghi vào DB và AI chắt lọc thành trí nhớ dài hạn của bé. Server loại trùng theo (sessionId, seq).
 *
 * Lưu ý: nếu hệ điều hành kill tab đột ngột (hết RAM, sập trình duyệt) thì phần chưa đẩy sẽ mất;
 * vì vậy tab bị ẩn (chuyển app) cũng được tính là điểm đẩy, không chờ tới lúc đóng hẳn.
 */
export class ShortTermStore {
  private events: SessionEvent[] = [];
  private seq = 0;
  private transcript: Turn[] = [];
  private lastSent = "";

  constructor(private readonly options: StoreOptions) {}

  record(type: SessionEvent["type"], data?: Record<string, unknown>) {
    this.seq += 1;
    this.events.push({ seq: this.seq, type, at: new Date().toISOString(), ...(data && { data: clampData(data) }) });
    if (this.events.length > MAX_EVENTS) this.events = this.events.slice(-MAX_EVENTS);
  }

  setTranscript(turns: Turn[]) {
    this.transcript = turns.slice(-MAX_TURNS).map((t) => ({ role: t.role, text: t.text.slice(0, MAX_TURN_TEXT) }));
  }

  snapshot() {
    return { events: [...this.events], transcript: [...this.transcript] };
  }

  /** Đẩy lên server nếu có dữ liệu mới. Trả về true nếu đã gửi. */
  flush(): boolean {
    if (this.events.length === 0 && this.transcript.length === 0) return false;
    const signature = `${this.seq}:${this.transcript.length}:${this.transcript.at(-1)?.text ?? ""}`;
    if (signature === this.lastSent) return false;

    const body = JSON.stringify({ sessionId: this.options.sessionId, studentId: this.options.studentId, ...this.snapshot() });
    const { endpoint } = this.options;
    const beaconed = typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function" && navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
    if (!beaconed) {
      void fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
    this.lastSent = signature;
    return true;
  }

  /** Gắn sự kiện vòng đời trang. Trả về hàm gỡ. */
  attach(win: Window = window, doc: Document = document): () => void {
    const onHidden = () => {
      if (doc.visibilityState === "hidden") this.flush();
    };
    const onPageHide = () => void this.flush();
    doc.addEventListener("visibilitychange", onHidden);
    win.addEventListener("pagehide", onPageHide);
    return () => {
      doc.removeEventListener("visibilitychange", onHidden);
      win.removeEventListener("pagehide", onPageHide);
    };
  }
}
