import type { StaticImageData } from "next/image";
import assess from "@/assets/landing/assess.webp";
import cards from "@/assets/landing/cards.webp";
import create from "@/assets/landing/create.webp";
import family from "@/assets/landing/family.webp";
import plan from "@/assets/landing/plan.webp";
import principal from "@/assets/landing/principal.webp";
import print from "@/assets/landing/print.webp";

/** Ảnh chụp màn hình thật của StuGuide (dữ liệu mẫu Trường Mầm non Hoa Mai) dùng cho landing page. */
export interface Screen {
  src: StaticImageData;
  alt: string;
  /** Đường dẫn hiển thị trên thanh địa chỉ của khung trình duyệt */
  url: string;
  label: string;
}

export const SCREENS = {
  create: { src: create, alt: "Biểu mẫu tạo kế hoạch và trò chơi mới: chọn độ tuổi, mảng phát triển, thời lượng và học liệu có sẵn", url: "app.stuguide.vn/teacher/create", label: "Soạn giáo án" },
  plan: { src: plan, alt: "Giáo án Chuyến xe tình bạn kèm căn cứ pháp lý VBHN 01 và cảnh báo an toàn theo Thông tư 45", url: "app.stuguide.vn/teacher/plan", label: "Giáo án chi tiết" },
  assess: { src: assess, alt: "Bảng ghi nhận quan sát cuối ngày cho cả lớp với các mức Tốt, Đã đạt, Cần rèn thêm", url: "app.stuguide.vn/teacher/assess", label: "Quan sát 30 giây" },
  cards: { src: cards, alt: "Thẻ nhiệm vụ 5 phút gửi phụ huynh và biểu đồ 63% phụ huynh đã hoàn thành", url: "app.stuguide.vn/teacher/parent-cards", label: "Thẻ phụ huynh" },
  print: { src: print, alt: "Flashcard khổ A4 in cho trẻ tô màu: xe buýt tình bạn", url: "app.stuguide.vn/teacher/plan/print", label: "Học liệu in A4" },
  principal: { src: principal, alt: "Bảng điều khiển Ban giám hiệu: giáo án đã duyệt, tỉ lệ đạt chuẩn Thông tư 45, độ bao phủ 5 mảng phát triển", url: "app.stuguide.vn/principal", label: "Ban giám hiệu" },
  family: { src: family, alt: "Màn hình điện thoại của phụ huynh bé Gia Huy: hôm nay ở lớp con làm gì và trợ lý gia đình", url: "", label: "Phụ huynh" },
} satisfies Record<string, Screen>;
