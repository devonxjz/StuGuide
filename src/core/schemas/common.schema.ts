import { z } from "zod";

/** Khối dựng chung cho validation đầu vào API: mọi chuỗi đều có giới hạn độ dài, mọi id đều có định dạng. */

/** Id trong hệ thống: UUID hoặc id dạng slug của dữ liệu seed (chữ, số, gạch nối, gạch dưới). */
export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "Mã định danh không hợp lệ");

/** Token liên kết phụ huynh (base64url, sinh từ 18 byte ngẫu nhiên; seed dùng slug). */
export const parentTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "Liên kết không hợp lệ");

/** Chuỗi một dòng: cắt khoảng trắng, không rỗng, không xuống dòng. */
export const lineText = (max: number, message = "Vui lòng nhập nội dung") =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, `Tối đa ${max} ký tự`)
    .refine((s) => !/[\r\n]/.test(s), "Không được xuống dòng");

/** Đoạn văn nhiều dòng có giới hạn. */
export const paragraph = (max: number, message = "Vui lòng nhập nội dung") => z.string().trim().min(1, message).max(max, `Tối đa ${max} ký tự`);

export const idParams = z.strictObject({ id: idSchema });
export const emptyBody = z.strictObject({}).optional();
