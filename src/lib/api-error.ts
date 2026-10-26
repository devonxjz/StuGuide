/**
 * Lỗi từ API phía client. Server luôn trả lỗi dạng { error: { code: "ERR-…", message } },
 * nên giao diện hiển thị được đúng thông điệp server (hết lượt AI, bấm quá nhanh, input sai…).
 */

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Đọc lỗi từ phản hồi HTTP không thành công; body không đúng dạng thì dùng mã và thông điệp mặc định. */
export async function apiErrorFrom(res: Response): Promise<ApiError> {
  const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  return new ApiError(data?.error?.code ?? "ERR-INTERNAL", data?.error?.message ?? "Có lỗi xảy ra", res.status);
}

/**
 * Câu hiển thị cho người dùng: lỗi nghiệp vụ (4xx) dùng thông điệp của server;
 * lỗi hệ thống (5xx), lỗi mạng hay lỗi lạ dùng câu dự phòng của từng màn hình.
 */
export function userMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError && err.status < 500 ? err.message : fallback;
}
