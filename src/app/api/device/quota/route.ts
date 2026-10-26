import { aiQuotaEntries, readQuotaStatus, route } from "@/server/http";
import { QUOTA_EXCEEDED_MESSAGE } from "@/core/constants/quota";

export const dynamic = "force-dynamic";

/**
 * Chỉ ĐỌC số lượt AI còn lại của thiết bị/mạng hiện tại. Không có thao tác reset từ phía client:
 * cấp thêm lượt là việc của quản trị (sửa trực tiếp bảng AiQuota).
 */
export const GET = route({ auth: "public" }, async ({ req, c }) => {
  const quota = await readQuotaStatus(c, aiQuotaEntries(req));
  return { ...quota, message: quota.isExceeded ? QUOTA_EXCEEDED_MESSAGE : null };
});
