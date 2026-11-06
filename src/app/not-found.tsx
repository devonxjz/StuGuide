import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Không tìm thấy trang này</h1>
        <p className="mt-2 text-muted-foreground">Trang có thể đã được di chuyển hoặc cô không có quyền truy cập.</p>
        <Link href="/login" className="mt-5 inline-flex h-10 items-center rounded-lg bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-700">Về trang chính</Link>
      </div>
    </main>
  );
}
