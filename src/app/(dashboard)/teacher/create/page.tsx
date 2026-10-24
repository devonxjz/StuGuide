import { CreatePlanForm } from "@/components/teacher/create-plan-form";
import { getContainer } from "@/server/container";
import { requireSession } from "@/server/session";

export const metadata = { title: "Tạo nhanh bằng form" };

export default async function CreatePage() {
  const session = await requireSession(["teacher"]);
  const { repos } = await getContainer();
  const cls = await repos.users.findClass(session.classId ?? "");
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-8">
      <header>
        <p className="text-sm font-semibold text-primary-strong">Không cần viết câu lệnh</p>
        <h1 className="text-2xl font-bold tracking-tight">Tạo Kế hoạch & Trò chơi mới</h1>
      </header>
      <CreatePlanForm defaultAge={cls?.ageGroup ?? "4-5y"} />
    </div>
  );
}
