import { ContactsManager } from "@/components/teacher/contacts-manager";
import { getContainer } from "@/server/container";
import { requireSession } from "@/server/session";
import { toActor } from "@/server/http";

export const metadata = { title: "Danh bạ phụ huynh" };

export default async function ContactsPage() {
  const session = await requireSession(["teacher"]);
  const { services } = await getContainer();
  const rows = await services.parentEmails.contacts(toActor(session));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8">
      <header>
        <p className="text-sm font-medium text-primary-strong">{session.className ?? "Lớp học"}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Danh bạ phụ huynh</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhập email phụ huynh của lớp. Khi cô nhờ trợ lý gửi thư, thư chỉ đi tới các địa chỉ trong danh bạ này.
        </p>
      </header>
      <ContactsManager rows={rows} />
    </div>
  );
}
