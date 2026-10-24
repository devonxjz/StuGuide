import type { Metadata } from "next";
import { MobileFrame } from "@/components/shared/mobile-frame";
import { AccessDenied } from "@/components/parent/access-denied";
import { ParentExperience, type ParentView } from "@/components/parent/parent-experience";
import { isAppError } from "@/core/errors";
import { getContainer } from "@/server/container";

export const metadata: Metadata = { title: "Thẻ nhiệm vụ 5 phút", robots: { index: false } };

export default async function ParentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { services } = await getContainer();

  const loaded = await services.feedback.view(token).then(
    (view) => ({ view }),
    (e: unknown) => {
      if (isAppError(e)) return { view: null };
      throw e;
    },
  );

  if (!loaded.view) {
    return (
      <MobileFrame>
        <AccessDenied message="Liên kết này không hợp lệ hoặc đã hết hạn. Bố mẹ vui lòng mở lại link cô giáo gửi trong nhóm lớp." />
      </MobileFrame>
    );
  }

  return (
    <MobileFrame>
      <ParentExperience token={token} view={loaded.view as ParentView} />
    </MobileFrame>
  );
}
