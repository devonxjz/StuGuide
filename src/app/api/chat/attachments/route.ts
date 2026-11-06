import { InputError } from "@/core/errors";
import { EmptyDocumentError, MAX_DOCUMENT_BYTES, UnsupportedDocumentError, extractDocumentText } from "@/ai/documents/extract";
import { route } from "@/server/http";
import { readUploadedFile } from "@/server/security/input";

export const maxDuration = 60;

/**
 * Đọc tài liệu cô tải lên (PDF, Word, văn bản) và trả về văn bản trích được để đính kèm vào tin nhắn.
 * Không gọi AI và không lưu tệp gốc: chỉ trả chữ; AI chỉ đọc khi cô gửi tin (tính vào lượt ở /api/chat).
 */
export const POST = route({ auth: ["teacher"] }, async ({ req }) => {
  const file = await readUploadedFile(req, MAX_DOCUMENT_BYTES);
  try {
    const doc = await extractDocumentText(file);
    return { name: file.name, text: doc.text, truncated: doc.truncated, totalChars: doc.totalChars };
  } catch (e) {
    if (e instanceof UnsupportedDocumentError || e instanceof EmptyDocumentError) throw new InputError(e.message, 415);
    throw e;
  }
});
