import { DecorBall, DecorBlocks, DecorCrayon, DecorPlane, DecorStar } from "@/components/landing/illustrations";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-white px-4 py-10">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-500/20 via-violet-500/15 to-sky-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 size-[28rem] rounded-full bg-gradient-to-tr from-amber-300/25 via-rose-300/20 to-transparent blur-3xl"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
        <DecorBlocks className="absolute top-[14%] left-[12%] w-24 animate-float" />
        <DecorStar className="absolute top-[12%] right-[14%] w-16 animate-float [animation-delay:-1.5s]" />
        <DecorCrayon className="absolute bottom-[18%] left-[10%] w-8 -rotate-12 animate-float [animation-delay:-3s]" />
        <DecorBall className="absolute right-[10%] bottom-[16%] w-16 animate-float [animation-delay:-2s]" />
        <DecorPlane className="absolute top-[42%] right-[24%] w-14 animate-float [animation-delay:-0.8s]" />
      </div>
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </main>
  );
}
