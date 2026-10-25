export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10 bg-white">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-500/15 via-violet-500/10 to-sky-400/15 blur-3xl"
      />
      <div className="relative w-full max-w-lg z-10">{children}</div>
    </main>
  );
}
