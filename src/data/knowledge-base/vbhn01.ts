import { AGE_GROUPS, type AgeGroup } from "@/core/constants/age-groups";
import { DEVELOPMENT_AREAS, type DevelopmentArea } from "@/core/constants/development-areas";
import type { KnowledgeRecord } from "@/core/entities";

const CODE = "VBHN 01/VBHN-BGDĐT";

/** Tóm lược minh họa mục tiêu theo độ tuổi × mảng phát triển (không phải trích nguyên văn). */
const OBJECTIVES: Record<DevelopmentArea, Record<AgeGroup, string>> = {
  "social-emotional": {
    "24-36m": "Trẻ nhận biết cảm xúc vui, buồn, sợ; thể hiện sự quan tâm đơn giản với người thân; làm quen và chơi cạnh bạn.",
    "3-4y": "Trẻ biết tên và đặc điểm của bản thân; thể hiện cảm xúc vui, buồn, tức giận; chơi hòa thuận với bạn, biết chào hỏi và cảm ơn.",
    "4-5y": "Trẻ biết chia sẻ đồ chơi và hợp tác với bạn trong trò chơi; biết chờ đến lượt; nhận ra cảm xúc của mình và của bạn, biết an ủi bạn; thực hiện quy định chung của lớp.",
    "5-6y": "Trẻ tự tin nêu ý kiến; biết thương lượng, hợp tác giải quyết vấn đề trong nhóm; kiềm chế cảm xúc, tôn trọng người khác; có trách nhiệm với việc được giao.",
  },
  physical: {
    "24-36m": "Trẻ đi, chạy, bò, trèo qua vật cản thấp; cầm nắm, xếp chồng khối lớn; thực hiện một số động tác cùng cô.",
    "3-4y": "Trẻ thực hiện nhịp nhàng các động tác thể dục; đi, chạy, nhảy giữ thăng bằng; phối hợp tay mắt khi tung và bắt bóng lớn.",
    "4-5y": "Trẻ giữ thăng bằng khi đi trên ghế thể dục; ném và bắt bóng; phối hợp tay mắt khi nhặt, xếp vật; biết giữ khoảng cách an toàn khi vận động.",
    "5-6y": "Trẻ vận động nhanh nhẹn, khéo léo theo hiệu lệnh; bật nhảy, leo trèo; thuần thục vận động tinh như cắt, xếp, gài cúc; biết tự bảo vệ an toàn.",
  },
  cognitive: {
    "24-36m": "Trẻ nhận biết đồ vật quen thuộc và màu cơ bản; thích khám phá bằng giác quan; bắt chước hành động đơn giản.",
    "3-4y": "Trẻ phân biệt màu sắc, hình khối đơn giản; đếm đến 5; nhận biết đặc điểm nổi bật của cây và con vật gần gũi.",
    "4-5y": "Trẻ quan sát, so sánh và phân loại đối tượng theo một hai dấu hiệu; đếm đến 10; tò mò đặt câu hỏi vì sao; nhận biết đặc điểm của cây, con vật quen thuộc.",
    "5-6y": "Trẻ phân loại theo nhiều dấu hiệu; đếm, so sánh số lượng trong phạm vi 10; giải thích đơn giản một số hiện tượng tự nhiên; biết giải quyết vấn đề bằng nhiều cách.",
  },
  language: {
    "24-36m": "Trẻ nghe và hiểu lời nói đơn giản; nói được câu 2–3 từ; thích nghe cô đọc thơ, kể chuyện ngắn.",
    "3-4y": "Trẻ nghe hiểu và trả lời câu hỏi đơn giản; kể lại sự việc ngắn; đọc thuộc bài thơ, đồng dao ngắn.",
    "4-5y": "Trẻ nghe hiểu nội dung truyện, kể lại truyện có mở đầu kết thúc; dùng câu đầy đủ để diễn đạt nhu cầu, suy nghĩ; đọc thuộc đồng dao, ca dao.",
    "5-6y": "Trẻ kể chuyện mạch lạc, đặt và trả lời câu hỏi vì sao; nhận biết chữ cái; biết chờ đến lượt khi trò chuyện và lắng nghe người khác.",
  },
  aesthetic: {
    "24-36m": "Trẻ thích nghe hát, vận động theo nhạc đơn giản; làm quen với việc chấm, vẽ nguệch ngoạc, nặn đất.",
    "3-4y": "Trẻ hát theo cô, vận động theo nhịp bài hát; vẽ các nét cơ bản; xé, dán, nặn các hình đơn giản.",
    "4-5y": "Trẻ hát đúng giai điệu, gõ đệm theo nhịp; vẽ, tô màu, xé dán tạo sản phẩm có bố cục; biết tận dụng nguyên liệu tái chế để tạo hình.",
    "5-6y": "Trẻ thể hiện cảm xúc khi hát, múa, vận động; sáng tạo sản phẩm tạo hình có chủ đề; nhận xét vẻ đẹp của sản phẩm của mình và của bạn.",
  },
};

export const VBHN01_CHUNKS: KnowledgeRecord[] = DEVELOPMENT_AREAS.flatMap((area) =>
  AGE_GROUPS.map((age): KnowledgeRecord => ({
    id: `vbhn01-${area.value}-${age.value}`,
    content: `Mục tiêu phát triển ${area.label} – trẻ ${age.label} (${age.short}): ${OBJECTIVES[area.value][age.value]}`,
    metadata: {
      collection: "vbhn01",
      documentCode: CODE,
      section: `Mục tiêu giáo dục – ${area.label} – ${age.label}`,
      ageGroup: age.value,
      developmentArea: area.value,
      isSummary: true,
    },
  })),
);
