import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Inter, Lora } from "next/font/google";
import Script from "next/script";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/appearance";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-be-vietnam",
  display: "swap",
});

// Hai font tuỳ chọn trong Cài đặt: không preload, trình duyệt chỉ tải khi người dùng thật sự chọn
const inter = Inter({ subsets: ["vietnamese", "latin"], variable: "--font-inter", display: "swap", preload: false });
const lora = Lora({ subsets: ["vietnamese", "latin"], variable: "--font-lora", display: "swap", preload: false });

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
    <html lang="vi" data-theme="light" className={`${beVietnam.variable} ${inter.variable} ${lora.variable}`} suppressHydrationWarning>
      <head>
        {/* Áp giao diện đã lưu trước khi vẽ để không bị nháy sáng/tối */}
        <Script id="appearance-boot" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }} />
      </head>
      {/* suppressHydrationWarning: tiện ích trình duyệt chèn thuộc tính vào <body> trước khi React hydrate */}
      <body className="min-h-dvh antialiased bg-white text-slate-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
