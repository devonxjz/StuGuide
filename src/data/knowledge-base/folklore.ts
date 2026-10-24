import type { KnowledgeRecord } from "@/core/entities";

const game = (id: string, title: string, content: string, ageGroup?: string): KnowledgeRecord => ({
  id: `folk-${id}`,
  content: `${title}: ${content}`,
  metadata: { collection: "folklore", documentCode: "Ngân hàng văn hóa dân gian", section: title, title, ageGroup, isSummary: true },
});

export const FOLKLORE_CHUNKS: KnowledgeRecord[] = [
  game(
    "rong-ran",
    "Rồng rắn lên mây",
    'Trẻ xếp hàng nắm vạt áo người đằng trước làm "rồng rắn", một bạn đóng thầy thuốc. Cả hàng đọc đồng dao "Rồng rắn lên mây, có cây núc nắc, có nhà điên điên, thầy thuốc có nhà hay không?". Luật cốt lõi: đầu rồng tránh bị bắt, đuôi không được đứt. Phù hợp phát triển vận động và hợp tác.',
    "4-5y",
  ),
  game(
    "meo-duoi-chuot",
    "Mèo đuổi chuột",
    "Trẻ đứng thành vòng tròn nắm tay, một bạn làm mèo ngoài vòng, một bạn làm chuột trong vòng. Mèo đuổi chuột, cả vòng giúp chuột bằng cách nâng tay lên hạ tay xuống. Rèn phản xạ và sự đồng cảm.",
    "4-5y",
  ),
  game(
    "nu-na-nu-nong",
    "Nu na nu nống",
    'Trẻ ngồi duỗi chân, cô dùng tay chạm từng chân theo nhịp đồng dao "Nu na nu nống, cái trống cầm chầu, con chim ăn ổi, cái bổi ăn trầu". Rèn nhịp điệu, ngôn ngữ và sự tập trung.',
    "3-4y",
  ),
  game(
    "chi-chi-chanh-chanh",
    "Chi chi chành chành",
    'Một bạn xòe tay, các bạn khác đặt ngón trỏ vào lòng bàn tay, cùng đọc "Chi chi chành chành, cái đanh thổi lửa". Đến câu cuối, bạn xòe tay nắm ngón tay lại, ai bị bắt thì đổi vai. Rèn phản xạ nhanh.',
    "3-4y",
  ),
  game(
    "keo-co",
    "Kéo co",
    "Hai đội kéo một sợi dây lớn, đội nào kéo vạch giữa sang phía mình là thắng. Ở mầm non dùng sợi dây mềm, chia đội cân sức, cô nhấn mạnh tinh thần cả đội cùng cố gắng.",
    "5-6y",
  ),
  game(
    "bit-mat-bat-de",
    "Bịt mắt bắt dê",
    'Một bạn che mắt bằng khăn mềm làm người đi bắt, các bạn khác phát tiếng "be be" để dẫn hướng. Chơi trong không gian rộng, cô bao quát để tránh va chạm.',
    "5-6y",
  ),
];
