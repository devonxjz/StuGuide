export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10 bg-white bg-playful-dots">
      {/* Vầng sáng kẹo ngọt tươi vui nổi bật trên nền trắng */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 size-[32rem] rounded-full bg-gradient-to-tr from-primary/15 via-sky/15 to-transparent blur-3xl animate-float"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -bottom-28 size-[30rem] rounded-full bg-gradient-to-br from-sun/20 via-coral/15 to-transparent blur-3xl animate-float"
        style={{ animationDelay: "-2.5s" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-1/4 size-[24rem] rounded-full bg-lilac/15 blur-3xl animate-pulse-soft"
      />

      <div className="relative w-full max-w-lg z-10">{children}</div>
    </main>
  );
}
