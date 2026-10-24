/** Lỗi nghiệp vụ có mã (spec mục 14) để API/UI hiển thị đúng thông điệp. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** ERR-FLOW-01: thao tác sai trình tự (vd. gửi phụ huynh khi bài còn là bản nháp). */
export class FlowError extends AppError {
  constructor(message: string) {
    super("ERR-FLOW-01", message, 409);
  }
}

/** ERR-INPUT-01: dữ liệu đầu vào sai định dạng / vượt giới hạn (413: quá lớn, 415: sai kiểu nội dung). */
export class InputError extends AppError {
  constructor(message = "Dữ liệu gửi lên không hợp lệ", status = 400) {
    super(status === 413 ? "ERR-INPUT-413" : "ERR-INPUT-01", message, status);
  }
}

export class NotFoundError extends AppError {
  constructor(what: string) {
    super("ERR-NOT-FOUND", `Không tìm thấy ${what}`, 404);
  }
}

/**
 * Nhận diện lỗi nghiệp vụ theo hình dạng thay vì `instanceof`: container được cache trên globalThis
 * và có thể được nạp từ bundle khác (route handler vs. page), khi đó lớp lỗi là hai bản khác nhau.
 */
export function isAppError(e: unknown): e is AppError {
  return typeof e === "object" && e !== null && typeof (e as AppError).code === "string" && (e as AppError).code.startsWith("ERR-") && typeof (e as AppError).status === "number";
}

export const hasErrorCode = (e: unknown, code: string): e is AppError => isAppError(e) && e.code === code;

export function isZodError(e: unknown): e is { issues: { message: string }[] } {
  return typeof e === "object" && e !== null && (e as { name?: string }).name === "ZodError" && Array.isArray((e as { issues?: unknown }).issues);
}
