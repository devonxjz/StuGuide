export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10 bg-dots">
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-20 size-[32rem] rounded-full bg-gradient-to-tr from-primary/15 via-lilac/10 to-transparent blur-3xl animate-float" />
      <div aria-hidden className="pointer-events-none absolute -right-20 -bottom-40 size-[30rem] rounded-full bg-gradient-to-br from-sun/15 via-coral/10 to-transparent blur-3xl animate-float" style={{ animationDelay: "-2s" }} />
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[40rem] rounded-full bg-sky/5 blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-lg z-10">{children}</div>
    </main>
  );
}
