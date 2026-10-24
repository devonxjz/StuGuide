export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 size-[28rem] rounded-full bg-primary-soft blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-32 size-[26rem] rounded-full bg-sun-soft blur-3xl" />
      <div className="relative w-full max-w-lg">{children}</div>
    </main>
  );
}
