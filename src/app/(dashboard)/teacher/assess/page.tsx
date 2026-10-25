import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { getContainer } from "@/server/container";
import { requireSession } from "@/server/session";

export const metadata = { title: "Ghi nhận quan sát" };

/** Vào nhanh bảng đánh giá của giáo án đã duyệt gần nhất. */
export default async function AssessIndex() {
  const session = await requireSession(["teacher"]);
  const { services } = await getContainer();
  const plans = await services.lessonPlanner.listForClass(session.classId ?? "", 10);
  const target = plans.find((p) => p.status === "approved") ?? plans.find((p) => p.status === "shared");
  if (target) redirect(`/teacher/assess/${target.id}`);

  return (
    <div className="mx-auto grid max-w-lg place-items-center px-4 py-20 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-sun-soft text-sun-strong"><ClipboardCheck className="size-7" aria-hidden /></span>
      <h1 className="text-xl font-bold">Chưa có giáo án nào đã duyệt</h1>
      <p className="mt-2 text-muted-foreground">Cô soạn và phê duyệt một giáo án trước, mình sẽ tự tạo checklist quan sát cho cả lớp.</p>
      <Link href="/teacher" className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Về trợ lý chat</Link>
    </div>
  );
}
