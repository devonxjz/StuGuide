import type { LessonPlanOutput } from "../schemas/lesson-plan.schema";
import type { ParentCardContent } from "../schemas/parent-card.schema";

/** Bài mẫu theo spec mục 18.1 – dùng cho seed và chế độ demo (không cần API key). */
export const CHUYEN_XE_TINH_BAN: LessonPlanOutput = {
  gameName: "Chuyến xe tình bạn – Thu gom hộp sữa",
  legalReference: {
    documentCode: "VBHN 01/VBHN-BGDĐT",
    relevantSection: "Mục tiêu Phát triển Tình cảm & Kỹ năng xã hội – Trẻ mẫu giáo 4–5 tuổi",
    summary:
      "Bám sát Mục tiêu Phát triển Tình cảm & Kỹ năng xã hội – VBHN 01/VBHN-BGDĐT (hợp nhất TT 28/2016 và TT 51/2020), trẻ mẫu giáo 4–5 tuổi: trẻ biết chờ đến lượt, hợp tác và chia sẻ với bạn.",
    isVerified: true,
  },
  safetyWarnings: [
    {
      level: "warning",
      material: "Vỏ hộp sữa tươi",
      description:
        "Kiểm tra các mép vỏ hộp sữa không có cạnh sắc nhọn; bố trí đường chạy của trẻ cách xa góc bàn và vách tường tối thiểu 1.5 mét để tránh va chạm.",
      ruleRef: "Thông tư 45/2021/TT-BGDĐT",
    },
    {
      level: "info",
      material: "Bóng nhựa nhỏ",
      description: "Cô đếm đủ 6 quả bóng trước và sau khi chơi; không để trẻ ngậm bóng vào miệng.",
      ruleRef: "Thông tư 45/2021/TT-BGDĐT",
    },
  ],
  objectives: [
    "Kiến thức: Trẻ biết chiếc \"xe buýt\" cần cả đội cùng góp sức mới chạy được.",
    "Kỹ năng: Trẻ phối hợp tay – mắt khi nhặt và thả bóng vào rổ; biết nắm tay bạn khi di chuyển.",
    "Thái độ: Trẻ vui vẻ rủ bạn chơi cùng và nói lời cảm ơn khi được giúp đỡ.",
  ],
  preparation: [
    "10 vỏ hộp sữa tươi đã rửa sạch, phơi khô (\"xe buýt tình bạn\")",
    "2 rổ nhựa lớn (\"bến xe\")",
    "6 quả bóng nhựa nhỏ (\"hành khách tí hon\")",
    "1 chiếc chuông nhỏ hoặc thìa gỗ để cô gõ nhịp (đồ thật, không dùng thiết bị điện tử)",
  ],
  procedure: [
    {
      phase: "warmup",
      title: "Xe buýt sắp khởi hành",
      duration: 5,
      instructions:
        "Cô kể câu chuyện mở đầu, mời trẻ chia thành hai đội \"tài xế\" và cùng nắm tay nhau thành một đoàn tàu nhỏ đi vòng quanh lớp.",
      teacherTip: "Mời bé còn ngại giao tiếp làm \"phụ lái\" đứng cạnh cô để dần tự tin.",
    },
    {
      phase: "main",
      title: "Thu gom hành khách tí hon",
      duration: 12,
      instructions:
        "Các \"hành khách\" (bóng) rơi rải rác. Mỗi đội cầm tay nhau chạy đi nhặt từng hành khách, đặt vào \"xe buýt\" (hộp sữa) rồi chở về \"bến\" (rổ). Khi cô gõ chuông là \"trạm tiếp theo\", hai đội đổi bến cho nhau.",
      teacherTip: "Nhắc trẻ chờ đến lượt thả bóng; khen những bạn biết nhường và nói \"cảm ơn\".",
    },
    {
      phase: "cooldown",
      title: "Về bến và kể chuyện chuyến đi",
      duration: 3,
      instructions: "Cả lớp ngồi vòng tròn, mỗi bạn kể một điều vui trong chuyến xe và tặng bạn bên cạnh một cái bắt tay.",
      teacherTip: "Khen nỗ lực của cả đội, không so sánh giữa các bạn.",
    },
  ],
  teacherScript:
    "Các con ơi, xe buýt tình bạn sắp khởi hành rồi! Nhưng ôi, những hành khách tí hon đang bị rơi xuống đường mất rồi. Chúng mình cùng nắm tay nhau, chạy thật nhanh để đón các bạn ấy lên xe nhé!",
  flashcards: [
    { text: "Xe buýt tình bạn màu vàng với nhiều cửa sổ tròn, các bạn nhỏ vẫy tay", emoji: "🚌" },
    { text: "Hành khách tí hon là những quả bóng có mắt tròn đang chờ ở trạm", emoji: "⚽" },
    { text: "Hai bạn nhỏ nắm tay nhau, mỉm cười, kèm chữ \"Cảm ơn bạn\"", emoji: "🤝" },
  ],
  observationCriteria: [
    "Chủ động rủ bạn cùng chơi hoặc cùng nhặt bóng",
    "Nắm tay bạn khi di chuyển cùng đội",
    "Chờ đến lượt khi thả bóng vào rổ",
    "Nói lời cảm ơn khi được bạn giúp",
  ],
  eqQuestions: [
    "Hôm nay trên chuyến xe tình bạn, con thấy vui nhất lúc nào?",
    "Con đã giúp bạn nào lên xe? Lúc đó con cảm thấy thế nào?",
  ],
};

export const CHUYEN_XE_PARENT_CARD: ParentCardContent = {
  greeting: "Chào bố mẹ của bé! Cô Lan xin chia sẻ một chút niềm vui từ lớp hôm nay ạ.",
  classSummary:
    "Hôm nay lớp mình lái \"xe buýt tình bạn\" đi đón những hành khách tí hon. Các con cùng nắm tay nhau, chờ đến lượt và nói lời cảm ơn khi được bạn giúp đỡ.",
  missionTitle: "5 phút trò chuyện trước giờ đi ngủ",
  duration: 5,
  eqQuestions: [
    "Hôm nay trên chuyến xe tình bạn, con thấy vui nhất lúc nào?",
    "Con đã giúp bạn nào lên xe? Lúc đó con cảm thấy thế nào?",
  ],
  adultRole: "Bố mẹ chỉ cần ngồi cạnh, lắng nghe và mỉm cười – không cần sửa hay đánh giá câu trả lời của con.",
};
