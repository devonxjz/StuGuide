import type { LessonPlanOutput } from "@/core/schemas/lesson-plan.schema";

export const sampleLessonPlan: LessonPlanOutput = {
  gameName: "Chuyến xe tình bạn – Thu gom hộp sữa",
  legalReference: {
    documentCode: "VBHN 01/VBHN-BGDĐT",
    relevantSection: "Mục tiêu Phát triển Tình cảm & Kỹ năng xã hội, trẻ 4–5 tuổi",
    summary: "Trẻ biết chia sẻ, hợp tác với bạn trong trò chơi.",
    isVerified: true,
  },
  safetyWarnings: [
    {
      level: "warning",
      material: "Vỏ hộp sữa",
      description: "Kiểm tra mép hộp không có cạnh sắc nhọn; đường chạy cách tường tối thiểu 1.5 mét.",
      ruleRef: "Thông tư 45/2021/TT-BGDĐT",
    },
  ],
  objectives: ["Trẻ biết hợp tác cùng bạn để hoàn thành nhiệm vụ", "Trẻ rèn kỹ năng phối hợp tay và mắt"],
  preparation: ["10 vỏ hộp sữa đã rửa sạch", "2 rổ nhựa lớn", "6 quả bóng nhựa nhỏ"],
  procedure: [
    { phase: "warmup", title: "Xe buýt sắp khởi hành", duration: 5, instructions: "Cô kể chuyện mở đầu và chia hai đội.", teacherTip: "Mời bé nhút nhát làm phụ lái." },
    { phase: "main", title: "Thu gom hành khách", duration: 12, instructions: "Hai đội nắm tay chạy thu gom bóng vào rổ.", teacherTip: "Nhắc trẻ giữ khoảng cách an toàn." },
    { phase: "cooldown", title: "Về bến", duration: 3, instructions: "Cả lớp ngồi vòng tròn, kể chuyện chuyến đi.", teacherTip: "Khen nỗ lực, không so sánh." },
  ],
  teacherScript: "Xe buýt tình bạn sắp khởi hành! Nhưng các hành khách nhỏ đang bị rơi xuống đường…",
  flashcards: [
    { text: "Xe buýt tình bạn màu vàng", emoji: "🚌" },
    { text: "Hành khách bóng tròn đang vẫy tay", emoji: "⚽" },
  ],
  observationCriteria: ["Chủ động rủ bạn cùng chơi", "Nắm tay bạn khi di chuyển", "Nói lời cảm ơn khi được giúp"],
  eqQuestions: ["Hôm nay con vui nhất lúc nào?", "Con đã giúp bạn điều gì?"],
};
