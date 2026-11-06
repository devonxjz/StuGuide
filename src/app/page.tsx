import Link from "next/link";
import { ArrowRight, FileBarChart, MessageCircleHeart, MessageSquare, Moon, ShieldCheck, Sun, Users } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { HeroBackground } from "@/components/landing/hero-background";
import { HeroDemo } from "@/components/landing/hero-demo";
import { HeroPrompt } from "@/components/landing/hero-prompt";
import { BrowserFrame, PhoneFrame } from "@/components/landing/device-frames";
import { Parallax } from "@/components/landing/parallax";
import { ProductTour } from "@/components/landing/product-tour";
import { Reveal } from "@/components/landing/reveal";
import { ScreenGallery } from "@/components/landing/screen-gallery";
import { SiteHeader } from "@/components/landing/site-header";
import { SCREENS } from "@/components/landing/screens";
import { WaterRipple } from "@/components/landing/water-ripple";
import {
  DecorBall,
  DecorBlocks,
  DecorCrayon,
  DecorKids,
  DecorPlane,
  DecorStar,
  IllustrationFamily,
  IllustrationMemory,
  IllustrationPlan,
  IllustrationSafety,
} from "@/components/landing/illustrations";

type Art = (props: { className?: string }) => React.ReactNode;

const STANDARDS = [
  "VBHN 01/VBHN-BGDĐT",
  "Thông tư 45 – An toàn vật liệu",
  "Chương trình GDMN",
  "Screen-Free cho trẻ",
  "Dữ liệu lưu tại trường",
  "Giáo viên duyệt trước khi gửi",
];

const HIGHLIGHTS = [
  { value: "1 câu chat", label: "là có giáo án đủ 4 phần" },
  { value: "30 giây", label: "ghi nhận quan sát cả lớp" },
  { value: "5 phút", label: "nhiệm vụ cho phụ huynh mỗi tối" },
];

const FEATURES: { art: Art; tint: string; title: string; body: string; span: string }[] = [
  {
    art: IllustrationPlan,
    tint: "bg-blue-50",
    title: "Soạn giáo án bằng một câu chat",
    body: "Cô nhắn tự nhiên, StuGuide trả về kế hoạch hoạt động đầy đủ mục tiêu, chuẩn bị, tiến trình và lời dẫn.",
    span: "md:col-span-2",
  },
  {
    art: IllustrationSafety,
    tint: "bg-emerald-50",
    title: "Kiểm tra an toàn tự động",
    body: "Đối chiếu vật liệu với Thông tư 45, cảnh báo trước khi giáo án tới tay trẻ.",
    span: "",
  },
  {
    art: IllustrationMemory,
    tint: "bg-amber-50",
    title: "Nhớ lớp của cô",
    body: "Ghi nhớ sĩ số, độ tuổi, sở thích của lớp để mỗi lần soạn đều sát thực tế hơn.",
    span: "",
  },
  {
    art: IllustrationFamily,
    tint: "bg-rose-50",
    title: "Thẻ 5 phút cho phụ huynh",
    body: "Mỗi hoạt động sinh kèm một thẻ ngắn để bố mẹ chơi tiếp cùng con ở nhà, không cần màn hình.",
    span: "md:col-span-2",
  },
];

const STEPS = [
  { n: "1", tone: "bg-blue-600", title: "Nhắn yêu cầu", body: "Độ tuổi, chủ đề, vật liệu có sẵn – nói như nói với đồng nghiệp." },
  { n: "2", tone: "bg-violet-600", title: "AI soạn & tự kiểm", body: "Tra chuẩn, kiểm tra an toàn, chấm theo tiêu chí và tự sửa nếu chưa đạt." },
  { n: "3", tone: "bg-emerald-600", title: "Cô duyệt & dùng", body: "Chỉnh sửa, in A4, gửi thẻ cho phụ huynh – cô luôn là người quyết định." },
];

const FAMILY_POINTS = [
  { icon: Sun, tone: "bg-amber-100 text-amber-700", title: "Hôm nay ở lớp con làm gì?", body: "Bố mẹ đọc tóm tắt hoạt động bằng lời dễ hiểu, không thuật ngữ." },
  { icon: Moon, tone: "bg-violet-100 text-violet-700", title: "Gợi ý tối nay riêng cho bé", body: "Trợ lý gia đình biết bé thích gì, gợi ý trò chơi từ đồ có sẵn trong nhà." },
  { icon: MessageCircleHeart, tone: "bg-rose-100 text-rose-700", title: "Phản hồi cho cô một chạm", body: "Xong · Cần hỗ trợ – cô nắm được ngay bé nào cần quan tâm thêm." },
];

const SCHOOL_STATS = [
  { icon: ShieldCheck, value: "TT 45", label: "mọi giáo án đều được đối chiếu an toàn", tone: "text-emerald-400" },
  { icon: Users, value: "5 mảng", label: "theo dõi độ bao phủ phát triển của trẻ", tone: "text-rose-400" },
  { icon: FileBarChart, value: "1 chạm", label: "xuất báo cáo kiểm định chất lượng", tone: "text-sky-400" },
];

const CTA_CLASS =
  "group inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700";

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <WaterRipple />
      {/* Nav */}
      <SiteHeader>
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo compact={false} />
          <div className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a href="#tour" className="transition-colors hover:text-slate-900">Sản phẩm</a>
            <a href="#features" className="transition-colors hover:text-slate-900">Tính năng</a>
            <a href="#how" className="transition-colors hover:text-slate-900">Cách hoạt động</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:inline-flex">
              Đăng nhập
            </Link>
            <Link href="/login" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700">
              <MessageSquare className="size-4" aria-hidden /> Chat với AI
            </Link>
          </div>
        </nav>
      </SiteHeader>

      <main>
        {/* Hero */}
        <section className="relative isolate -mt-16 overflow-hidden">
          <HeroBackground>
            <div className="absolute inset-0 hidden lg:block">
              <DecorBlocks className="absolute top-44 left-[7%] w-24" />
              <DecorStar className="absolute top-40 right-[9%] w-16" />
              <DecorCrayon className="absolute top-[31rem] left-[5%] w-8 -rotate-12" />
              <DecorBall className="absolute top-[29rem] right-[6%] w-16" />
              <DecorPlane className="absolute top-80 right-[20%] w-14" />
            </div>
          </HeroBackground>

          <div className="mx-auto max-w-6xl px-4 pt-32 pb-20 text-center sm:px-6 sm:pt-40">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                Trợ lý AI cho giáo dục mầm non
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                Cô chăm các bé.{" "}
                <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">AI lo phần còn lại.</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-5 max-w-xl text-balance text-base text-slate-600 sm:text-lg">
                Hỏi StuGuide như hỏi một đồng nghiệp. Giáo án đúng chuẩn, kiểm tra an toàn và thẻ cho phụ huynh – chỉ trong một khung chat.
              </p>
            </Reveal>
            <Reveal delay={240} className="mt-10">
              <HeroPrompt />
            </Reveal>

            <Reveal delay={320}>
              <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4">
                {HIGHLIGHTS.map((h) => (
                  <div key={h.value}>
                    <dt className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{h.value}</dt>
                    <dd className="mt-1 text-xs text-slate-500 sm:text-sm">{h.label}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal delay={400} className="mt-28">
              <div className="relative mx-auto max-w-3xl">
                <DecorKids className="pointer-events-none absolute -top-[5.2rem] left-1/2 w-56 -translate-x-1/2 sm:w-64" />
                <HeroDemo />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Dải chuẩn */}
        <section aria-label="Tuân thủ" className="border-y border-slate-100 bg-slate-50/60 py-6">
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_15%,#000_85%,transparent)]">
            <div className="flex w-max animate-marquee gap-12 pr-12">
              {[...STANDARDS, ...STANDARDS].map((s, i) => (
                <span key={i} className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-500">
                  <span className="size-1.5 rounded-full bg-slate-300" aria-hidden />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Tour sản phẩm */}
        <section id="tour" className="relative mx-auto max-w-6xl scroll-mt-20 px-4 pt-24 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-violet-600">Sản phẩm thật, dữ liệu mẫu thật</p>
            <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Một ngày làm việc cùng StuGuide</h2>
            <p className="mt-4 text-balance text-slate-600">Kéo xuống để đi qua từng bước – từ lúc soạn giáo án buổi sáng tới khi phụ huynh chơi cùng con buổi tối.</p>
          </Reveal>
          <ProductTour />
        </section>

        {/* Tính năng */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-medium text-violet-600">Tính năng</p>
            <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Mọi thứ một giáo viên mầm non cần, trong một khung chat
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 80} className={f.span}>
                <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.2)]">
                  <div className={`grid h-44 place-items-center ${f.tint}`}>
                    <f.art className="h-36 w-auto transition-transform duration-500 group-hover:scale-105" />
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

        {/* Dải ảnh màn hình */}
        <section aria-labelledby="gallery-title" className="relative overflow-hidden pb-24">
          <div aria-hidden className="absolute inset-x-0 top-1/2 -z-10 h-80 -translate-y-1/2 bg-gradient-to-r from-blue-50 via-violet-50 to-amber-50" />
          <Reveal className="mx-auto max-w-2xl px-4 text-center">
            <p className="text-sm font-medium text-violet-600">Bên trong ứng dụng</p>
            <h2 id="gallery-title" className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Mỗi màn hình đều được thiết kế cho lớp mầm non</h2>
          </Reveal>
          <Reveal delay={120} className="mt-12">
            <ScreenGallery />
          </Reveal>
        </section>

        {/* Cách hoạt động */}
        <section id="how" className="scroll-mt-20 border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <Reveal className="max-w-2xl">
              <p className="text-sm font-medium text-violet-600">Cách hoạt động</p>
              <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Từ ý tưởng tới hoạt động trong 3 bước</h2>
            </Reveal>
            <ol className="relative mt-12 grid gap-8 md:grid-cols-3">
              <div aria-hidden className="absolute top-5 right-0 left-0 hidden h-px bg-slate-200 md:block" />
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.n} delay={i * 120} className="relative">
                  <span className={`relative grid size-10 place-items-center rounded-full text-sm font-semibold text-white ring-4 ring-slate-50 ${s.tone}`}>
                    {s.n}
                  </span>
                  <h3 className="mt-5 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={360} className="mt-12">
              <Link href="/login" className={CTA_CLASS}>
                Thử ngay bước 1 <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* Phụ huynh */}
        <section id="families" className="relative scroll-mt-20 overflow-hidden">
          <div aria-hidden className="absolute -top-20 right-[-10%] -z-10 size-[36rem] rounded-full bg-rose-100/60 blur-3xl" />
          <div aria-hidden className="absolute bottom-0 left-[-10%] -z-10 size-[28rem] rounded-full bg-amber-100/60 blur-3xl" />
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 py-24 sm:px-6 lg:grid-cols-2">
            <div>
              <Reveal>
                <p className="text-sm font-medium text-rose-500">Cho phụ huynh</p>
                <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">“Tối nay chơi gì với con?” – điện thoại của bố mẹ đã có câu trả lời</h2>
                <p className="mt-4 text-slate-600">Không cần cài app. Bố mẹ mở đường link cô gửi hoặc đăng nhập bằng số điện thoại là thấy con học gì hôm nay và chơi tiếp thế nào ở nhà.</p>
              </Reveal>
              <ul className="mt-8 space-y-5">
                {FAMILY_POINTS.map((point, i) => (
                  <Reveal as="li" key={point.title} delay={i * 100} className="flex gap-4">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${point.tone}`}>
                      <point.icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-semibold">{point.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{point.body}</p>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>

            <Reveal delay={150} className="relative mx-auto w-full max-w-sm">
              <div aria-hidden className="absolute inset-x-6 top-12 bottom-12 -z-10 rounded-[3rem] bg-gradient-to-br from-rose-200 via-amber-100 to-violet-200 opacity-70 blur-2xl" />
              <Parallax speed={0.06}>
                <PhoneFrame screen={SCREENS.family} className="mx-auto w-[17rem]" />
              </Parallax>
            </Reveal>
          </div>
        </section>

        {/* Ban giám hiệu */}
        <section id="school" className="relative scroll-mt-20 overflow-hidden bg-slate-950 text-white">
          <div aria-hidden className="absolute -top-40 left-1/4 size-[40rem] rounded-full bg-blue-600/25 blur-3xl" />
          <div aria-hidden className="absolute -bottom-40 right-0 size-[30rem] rounded-full bg-violet-600/25 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <Reveal className="relative order-2 lg:order-1">
              <Parallax speed={0.05}>
                <BrowserFrame screen={SCREENS.principal} sizes="(min-width: 1024px) 640px, 100vw" className="border-white/10 shadow-[0_40px_100px_-30px_rgba(59,130,246,0.55)]" />
              </Parallax>
            </Reveal>
            <div className="order-1 lg:order-2">
              <Reveal>
                <p className="text-sm font-medium text-sky-300">Cho Ban giám hiệu</p>
                <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Toàn cảnh chất lượng giáo dục của trường, trên một màn hình</h2>
                <p className="mt-4 text-slate-300">Duyệt giáo án trong hàng đợi, theo dõi độ bao phủ 5 mảng phát triển và xuất báo cáo kiểm định chất lượng khi cần.</p>
              </Reveal>
              <dl className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {SCHOOL_STATS.map((stat, i) => (
                  <Reveal key={stat.label} delay={i * 100} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <stat.icon className={`size-6 shrink-0 ${stat.tone}`} aria-hidden />
                    <div>
                      <dt className="text-xl font-semibold">{stat.value}</dt>
                      <dd className="text-sm text-slate-400">{stat.label}</dd>
                    </div>
                  </Reveal>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-24 sm:px-6">
          <Reveal>
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-slate-900 px-6 py-16 text-center text-white sm:px-12">
              <DecorStar className="pointer-events-none absolute top-8 left-[8%] hidden w-12 sm:block" />
              <DecorBall className="pointer-events-none absolute right-[8%] bottom-8 hidden w-14 sm:block" />
              <div className="relative">
                <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Buổi học ngày mai, soạn xong trong một câu chat</h2>
                <p className="mx-auto mt-3 max-w-md text-slate-300">Đăng nhập và hỏi StuGuide điều đầu tiên cô cần cho lớp mình.</p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/login"
                    className="group inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <MessageSquare className="size-4 text-violet-600" aria-hidden />
                    Bắt đầu chat với AI
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
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
