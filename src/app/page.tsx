import Link from "next/link";
import { ArrowRight, BookOpenCheck, Printer, Sparkles } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { HeroDemo } from "@/components/landing/hero-demo";
import { Reveal } from "@/components/landing/reveal";
import {
  DecorBall,
  DecorBlocks,
  DecorCrayon,
  DecorKids,
  DecorPlane,
  DecorStar,
  IllustrationFamily,
  IllustrationMemory,
  IllustrationParent,
  IllustrationPlan,
  IllustrationSafety,
  IllustrationSchool,
  IllustrationTeacher,
} from "@/components/landing/illustrations";

const STANDARDS = [
  "VBHN 01/VBHN-BGDĐT",
  "Thông tư 45 – An toàn vật liệu",
  "Chương trình GDMN",
  "Screen-Free cho trẻ",
  "Dữ liệu lưu tại trường",
  "Giáo viên duyệt trước khi gửi",
];

const FEATURES = [
  {
    art: IllustrationPlan,
    tint: "from-blue-50 to-violet-50",
    title: "Soạn giáo án bằng một câu chat",
    body: "Cô nhắn tự nhiên, StuGuide trả về kế hoạch hoạt động đầy đủ mục tiêu, chuẩn bị, tiến trình và lời dẫn.",
    span: "md:col-span-2",
  },
  {
    art: IllustrationSafety,
    tint: "from-emerald-50 to-sky-50",
    title: "Kiểm tra an toàn tự động",
    body: "Đối chiếu vật liệu với Thông tư 45, cảnh báo trước khi giáo án tới tay trẻ.",
    span: "",
  },
  {
    art: IllustrationMemory,
    tint: "from-amber-50 to-orange-50",
    title: "Nhớ lớp của cô",
    body: "Ghi nhớ sĩ số, độ tuổi, sở thích của lớp để mỗi lần soạn đều sát thực tế hơn.",
    span: "",
  },
  {
    art: IllustrationFamily,
    tint: "from-rose-50 to-violet-50",
    title: "Thẻ 5 phút cho phụ huynh",
    body: "Mỗi hoạt động sinh kèm một thẻ ngắn để bố mẹ chơi tiếp cùng con ở nhà, không cần màn hình.",
    span: "md:col-span-2",
  },
];

const STEPS = [
  { n: "01", title: "Nhắn yêu cầu", body: "Độ tuổi, chủ đề, vật liệu có sẵn – nói như nói với đồng nghiệp." },
  { n: "02", title: "AI soạn & tự kiểm", body: "Tra chuẩn, kiểm tra an toàn, chấm theo tiêu chí và tự sửa nếu chưa đạt." },
  { n: "03", title: "Cô duyệt & dùng", body: "Chỉnh sửa, in A4, gửi thẻ cho phụ huynh – cô luôn là người quyết định." },
];

const ROLES = [
  { art: IllustrationTeacher, tint: "from-emerald-50 to-teal-50", title: "Giáo viên", body: "Bớt giấy tờ, thêm thời gian chơi cùng trẻ." },
  { art: IllustrationParent, tint: "from-sky-50 to-blue-50", title: "Phụ huynh", body: "Biết con học gì hôm nay và chơi gì cùng con tối nay." },
  { art: IllustrationSchool, tint: "from-violet-50 to-fuchsia-50", title: "Ban giám hiệu", body: "Duyệt giáo án, theo dõi chỉ số phát triển toàn trường." },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/75 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo compact={false} />
          <div className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-900">Tính năng</a>
            <a href="#how" className="transition-colors hover:text-slate-900">Cách hoạt động</a>
            <a href="#roles" className="transition-colors hover:text-slate-900">Dành cho ai</a>
          </div>
          <Link
            href="/login"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            Đăng nhập
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
            <DecorBlocks className="absolute top-28 left-[8%] w-24 animate-float" />
            <DecorStar className="absolute top-24 right-[10%] w-16 animate-float [animation-delay:-1.5s]" />
            <DecorCrayon className="absolute top-[26rem] left-[5%] w-8 -rotate-12 animate-float [animation-delay:-3s]" />
            <DecorBall className="absolute top-[24rem] right-[6%] w-16 animate-float [animation-delay:-2s]" />
            <DecorPlane className="absolute top-60 right-[22%] w-14 animate-float [animation-delay:-0.8s]" />
          </div>
          <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs">
                <Sparkles className="size-3.5 text-violet-600" aria-hidden />
                Trợ lý AI cho giáo dục mầm non
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                AI lo giấy tờ. <span className="text-gradient-ai">Cô lo cho trẻ.</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-5 max-w-xl text-balance text-base text-slate-600 sm:text-lg">
                StuGuide soạn giáo án đúng chuẩn, kiểm tra an toàn và kết nối phụ huynh – để trẻ học qua trải nghiệm thật, không qua màn hình.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="group inline-flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800"
                >
                  Vào ứng dụng
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <a
                  href="#how"
                  className="inline-flex h-11 items-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Xem cách hoạt động
                </a>
              </div>
            </Reveal>
            <Reveal delay={320} className="mt-16">
              <div className="relative mx-auto max-w-3xl">
                <DecorKids className="pointer-events-none absolute -top-[5.2rem] left-1/2 w-56 -translate-x-1/2 sm:w-64" />
                <HeroDemo />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Dải chuẩn */}
        <section aria-label="Tuân thủ" className="border-y border-slate-100 bg-slate-50/50 py-6">
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_15%,#000_85%,transparent)]">
            <div className="flex w-max animate-marquee gap-12 pr-12">
              {[...STANDARDS, ...STANDARDS].map((s, i) => (
                <span key={i} className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-500">
                  <BookOpenCheck className="size-4 text-slate-400" aria-hidden /> {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Tính năng */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Tính năng</p>
            <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Mọi thứ một giáo viên mầm non cần, trong một khung chat
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 80} className={f.span}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.2)]">
                  <div className={`grid h-44 place-items-center bg-gradient-to-br ${f.tint}`}>
                    <f.art className="h-36 w-auto transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-1" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Cách hoạt động */}
        <section id="how" className="scroll-mt-20 border-t border-slate-100 bg-slate-50/50">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <Reveal className="max-w-2xl">
              <p className="text-sm font-medium text-primary">Cách hoạt động</p>
              <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Từ ý tưởng tới hoạt động trong 3 bước</h2>
            </Reveal>
            <ol className="relative mt-12 grid gap-8 md:grid-cols-3">
              <div aria-hidden className="absolute top-5 right-0 left-0 hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent md:block" />
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.n} delay={i * 120} className="relative">
                  <span className="relative grid size-10 place-items-center rounded-full border border-slate-200 bg-white font-mono text-xs font-medium text-slate-500 shadow-xs">
                    {s.n}
                  </span>
                  <h3 className="mt-5 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Vai trò */}
        <section id="roles" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Dành cho ai</p>
            <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Một nền tảng, ba người đồng hành cùng trẻ</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {ROLES.map((r, i) => (
              <Reveal key={r.title} delay={i * 80}>
                <div className="group h-full overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.2)]">
                  <div className={`grid h-40 place-items-center bg-gradient-to-br ${r.tint}`}>
                    <r.art className="h-32 w-auto transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold">{r.title}</h3>
                    <p className="mt-1.5 text-sm text-slate-600">{r.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-24 sm:px-6">
          <Reveal>
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-slate-900 px-6 py-16 text-center text-white sm:px-12">
              <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-600/40 via-violet-600/30 to-sky-400/20 blur-3xl" />
              <div className="relative">
                <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Sẵn sàng cho buổi học tiếp theo?</h2>
                <p className="mx-auto mt-3 max-w-md text-slate-300">Đăng nhập và soạn giáo án đầu tiên trong chưa đầy một phút.</p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link href="/login" className="group inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100">
                    Bắt đầu ngay <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                  <span className="inline-flex items-center gap-2 text-sm text-slate-400">
                    <Printer className="size-4" aria-hidden /> In A4 · Không cần cài đặt
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo compact />
          <p>© 2026 StuGuide · Lakofoxygen team</p>
        </div>
      </footer>
    </div>
  );
}
