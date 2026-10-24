import type { KnowledgeRecord } from "@/core/entities";

const CODE = "45/2021/TT-BGDĐT";
const rule = (
  id: string,
  title: string,
  content: string,
  level: "critical" | "warning" | "info",
  ageRestriction?: string,
): KnowledgeRecord => ({
  id: `tt45-${id}`,
  content: `${title}: ${content}`,
  metadata: { collection: "tt45-safety", documentCode: CODE, section: title, title, level, ageRestriction, isSummary: true },
});

/** Tóm lược minh họa các quy tắc an toàn (không phải trích nguyên văn). */
export const TT45_CHUNKS: KnowledgeRecord[] = [
  rule(
    "small-objects",
    "Vật nhỏ và nguy cơ hóc",
    "Không cho trẻ 24–36 tháng tiếp xúc với hạt, cúc, viên nhỏ hoặc vật có thể lọt vào miệng gây hóc, sặc. Thay bằng vật có kích thước lớn hơn bàn tay trẻ và luôn có người lớn bao quát.",
    "critical",
    "24-36m",
  ),
  rule(
    "sharp-edges",
    "Mép sắc của đồ dùng tái chế",
    "Hộp giấy, lon, chai nhựa tái chế phải được kiểm tra, loại bỏ mép sắc nhọn, rửa sạch và phơi khô trước khi dùng cho trẻ.",
    "warning",
  ),
  rule(
    "movement-distance",
    "Khoảng cách an toàn khi vận động",
    "Khi tổ chức trò chơi chạy nhảy, bố trí đường chạy cách tường, góc bàn và cạnh sắc tối thiểu 1.5 mét để tránh va chạm.",
    "warning",
  ),
  rule(
    "wet-floor",
    "Sàn khô ráo, chống trơn trượt",
    "Kiểm tra sàn lớp, sân chơi khô ráo, không có nước hay vật cản trước khi vận động; trẻ đi chân trần hoặc giày chống trơn.",
    "warning",
  ),
  rule(
    "count-items",
    "Đếm đồ chơi nhỏ trước và sau khi chơi",
    "Với các đồ chơi nhỏ như bóng, khối gỗ, cô đếm đủ số lượng trước và sau hoạt động để không thất lạc hoặc trẻ ngậm giữ trong miệng.",
    "info",
    "3-4y",
  ),
  rule(
    "outdoor-heat",
    "Hoạt động ngoài sân",
    "Chọn thời điểm mát, có bóng râm, chuẩn bị nước uống; kiểm tra sân không có vật nguy hiểm trước khi cho trẻ ra chơi.",
    "info",
  ),
  rule(
    "natural-materials",
    "Vật liệu thiên nhiên (lá cây, hạt, cành)",
    "Lá cây, cành nhỏ phải sạch, khô, không có gai, nhựa mủ hay sâu bọ; nhắc trẻ không cho vào miệng.",
    "warning",
  ),
  rule(
    "supervision",
    "Bao quát trẻ",
    "Cô luôn đứng ở vị trí bao quát toàn bộ trẻ, chia nhóm vừa sức, không để trẻ ở một mình trong không gian vận động.",
    "info",
  ),
];
