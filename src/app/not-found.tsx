import Link from "next/link";
import { Sprout } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <Sprout className="mx-auto size-12 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Không tìm thấy trang này</h1>
        <p className="mt-2 text-muted-foreground">Trang có thể đã được di chuyển hoặc cô không có quyền truy cập.</p>
        <Link href="/login" className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Về trang chính</Link>
      </div>
    </main>
  );
}
