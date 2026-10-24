import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Mầm Học AI – StuGuide", template: "%s · Mầm Học AI" },
  description: "Trợ lý AI cho giáo viên mầm non: AI hỗ trợ người lớn, trẻ học qua trải nghiệm thật (Screen-Free).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      {/* suppressHydrationWarning: tiện ích trình duyệt (vd. ColorZilla) chèn thuộc tính vào <body> trước khi React hydrate */}
      <body className="min-h-dvh antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
