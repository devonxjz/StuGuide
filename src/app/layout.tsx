import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "StuGuide · Trợ Lý AI Giáo Dục Mầm Non", template: "%s · StuGuide" },
  description: "StuGuide – Lakofoxygen team: AI hỗ trợ giáo viên & phụ huynh mầm non, đồng hành cùng trẻ em qua trải nghiệm thật (Screen-Free).",
  icons: {
    icon: "/stuguide-icon.png",
    apple: "/stuguide-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0052cc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme="light" className={beVietnam.variable}>
      {/* suppressHydrationWarning: tiện ích trình duyệt chèn thuộc tính vào <body> trước khi React hydrate */}
      <body className="min-h-dvh antialiased bg-white text-slate-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
