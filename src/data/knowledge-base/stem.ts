import type { KnowledgeRecord } from "@/core/entities";

const stem = (id: string, title: string, content: string): KnowledgeRecord => ({
  id: `stem-${id}`,
  content: `${title}: ${content}`,
  metadata: { collection: "stem", documentCode: "Dự án STEM mầm non", section: title, title, isSummary: true },
});

export const STEM_CHUNKS: KnowledgeRecord[] = [
  stem("thap-hop", "Tháp hộp sữa đổ vì sao?", "Trẻ xếp chồng các hộp sữa thành tháp và quan sát khi nào tháp đổ. Gợi mở câu hỏi: tháp cao hơn hay thấp hơn thì vững hơn, đặt hộp nào ở dưới. Khám phá trọng lực và sự cân bằng bằng trải nghiệm."),
  stem("bong-lan", "Bóng lăn xa hơn ở đâu", "Trẻ thả bóng lăn trên sàn nhẵn, thảm và cỏ rồi so sánh quãng đường. Khám phá ma sát một cách trực giác, cô chỉ đặt câu hỏi không giảng giải."),
  stem("nuoc-chai", "Đổ nước vào chai nào nhanh hơn", "Trẻ rót nước (hoặc cát) vào chai miệng rộng và chai miệng hẹp, so sánh thời gian đầy. Khám phá thể tích và sự nhường chỗ."),
  stem("phan-loai-la", "Phân loại lá cây theo màu và hình", "Trẻ nhặt lá khô, phân loại theo màu, kích thước, hình dạng gân lá, và tô nhẹ bằng bút sáp lên lá để hiện hoa văn (kỹ thuật frottage). Rèn quan sát và phân loại."),
  stem("am-thanh-hop", "Gõ hộp nghe âm thanh", "Trẻ gõ thìa gỗ vào hộp sữa rỗng, hộp đầy cát, rổ nhựa và nhận ra âm thanh khác nhau. Khám phá âm thanh và nhịp điệu."),
];
