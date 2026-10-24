import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createLiveContainer } from "../helpers/live-container";
import { createSummarizer } from "@/ai/memory/summarizer";
import { routeModel } from "@/ai/model-router";
import { checkLanguage } from "@/core/guardrails/language-guard";

type L = Awaited<ReturnType<typeof createLiveContainer>>;
let L: L;
const conv = { brainstorm: crypto.randomUUID(), work: crypto.randomUUID(), other: crypto.randomUUID(), long: crypto.randomUUID() };

beforeAll(async () => {
  L = await createLiveContainer();
});
afterAll(async () => L.prisma.$disconnect());

describe("Chat thật với AI: trò chuyện sáng tạo, công cụ, trí nhớ và quản lý ngữ cảnh", () => {
  it("1. Cô kể một điều bền vững về lớp → AI tự ghi nhớ dài hạn (save_memory)", async () => {
    const r = await L.say(conv.brainstorm, "Chào mình nhé. Lớp mình có 2 bé dị ứng đậu phộng, nhớ giúp mình để lần sau đừng đưa đậu phộng vào trò chơi nha.");
    expect(r.reply.length).toBeGreaterThan(10);
    const memories = (await L.conversations.memories(L.actor)).map((m) => m.content.toLowerCase());
    expect(memories.some((m) => m.includes("đậu phộng"))).toBe(true);
    expect(checkLanguage(r.reply).passed).toBe(true);
  });

  it("2. Yêu cầu mơ hồ → AI đề xuất các hướng sáng tạo có tên gợi hình và hỏi chọn, chưa vội tạo giáo án", async () => {
    const r = await L.say(conv.brainstorm, "Mình muốn một trò chơi vui với hộp sữa cho lớp, bạn gợi ý vài ý tưởng đi?");
    expect(r.cards.find((c) => c.kind === "plan")).toBeUndefined();
    expect(r.reply).toMatch(/\b(1|2)[.)]|•|-\s|\*\*/); // liệt kê nhiều hướng
    expect(r.reply.length).toBeGreaterThan(200);
    expect(r.reply.slice(-260)).toMatch(/\?|chọn|thích|muốn|cho mình biết|hướng nào/i); // mời cô chọn hướng
    expect(r.reply.toLowerCase()).not.toContain("đậu phộng"); // không đưa đậu phộng vào ý tưởng
    console.info("[live] brainstorm:\n" + r.reply);
  });

  it("3. Cô chọn một hướng → AI gọi công cụ soạn giáo án thật, nhớ ngữ cảnh lượt trước, bản nháp an toàn", async () => {
    const r = await L.say(conv.brainstorm, "Mình chọn ý đầu tiên của bạn nhé. Soạn luôn cho lớp mình, có thêm rổ nhựa và bóng.");
    const card = r.cards.find((c) => c.kind === "plan");
    expect(card, `reply=${r.reply}`).toBeDefined();
    expect(card!.plan.status).toBe("ai_draft");
    expect(JSON.stringify(card!.plan.materials).toLowerCase()).toContain("hộp sữa");
    expect(r.status.filter((s) => s.type === "step").map((s) => s.step)).toEqual(["legal", "safety", "generate"]);
    const text = JSON.stringify([card!.plan.preparation, card!.plan.procedure]).toLowerCase();
    expect(text).not.toContain("đậu phộng"); // áp dụng trí nhớ dài hạn
    expect(card!.plan.safetyWarnings.length).toBeGreaterThan(0);
    console.info(`[live] giáo án: ${card!.plan.gameName}\n${r.reply}`);
  });

  it("4. Đại từ 'bài vừa rồi' + hành động: AI biết giáo án đang làm việc và chỉ duyệt khi cô nói rõ", async () => {
    const before = await L.repos.lessonPlans.listByClass(L.ids.classId, 50);
    const draft = before.find((p) => p.status === "ai_draft" && p.createdAt.getTime() > Date.now() - 600_000)!;
    expect(draft).toBeDefined();

    const ask = await L.say(conv.brainstorm, "Bài vừa rồi tên là gì vậy bạn?");
    expect(ask.cards.find((c) => c.kind === "plan")).toBeUndefined();
    expect(ask.reply.toLowerCase()).toContain(draft.gameName!.split("–")[0].trim().toLowerCase().slice(0, 12));
    expect((await L.repos.lessonPlans.findById(draft.id))!.status).toBe("ai_draft"); // hỏi thôi thì không duyệt

    const approve = await L.say(conv.brainstorm, "Ok, phê duyệt bài này giúp mình.");
    expect(approve.cards.find((c) => c.kind === "checklist")).toBeDefined();
    expect((await L.repos.lessonPlans.findById(draft.id))!.status).toBe("approved");
  });

  it("5. Cuộc trò chuyện KHÁC vẫn nhớ trí nhớ dài hạn của cô", async () => {
    const r = await L.say(conv.other, "Mình định cho các bé ăn nhẹ sau trò chơi, bạn gợi ý món nào nhé?");
    // AI áp dụng trí nhớ: nhắc rõ là tránh đậu phộng/dị ứng, và không đề xuất món chứa đậu phộng
    const reply = r.reply.toLowerCase();
    expect(reply).toMatch(/dị ứng|không (dùng|chứa|có|cho)[^.\n]{0,30}(đậu phộng|lạc)|tránh[^.\n]{0,30}(đậu phộng|lạc)/);
    const suggestions = reply.split("\n").filter((l) => /^\s*(\d+[.)]|[-•*])/.test(l));
    expect(suggestions.filter((l) => /đậu phộng|lạc/.test(l) && !/không|tránh|không có|không chứa/.test(l))).toEqual([]);
    console.info("[live] gợi ý ăn nhẹ:\n" + r.reply);
  });

  it("6. Hội thoại dài → tóm tắt cuộn bằng AI, tin cũ được gộp mà vẫn nhớ ý chính", async () => {
    const svc = L.conversations;
    const filler = "Mình đang cân nhắc cách bố trí lớp học cho buổi vận động sắp tới, ".repeat(10);
    const script: [string, string][] = [
      ["Lớp mình dự định làm trò chơi tên là 'Tàu vũ trụ hộp sữa' cho tuần sau, dùng 10 hộp sữa và 2 rổ.", "Nghe hay quá cô ơi, mình ghi nhận tên 'Tàu vũ trụ hộp sữa' với 10 hộp sữa và 2 rổ nhé."],
      ["Chủ đề của tuần là Giao thông, các bé 4-5 tuổi.", "Dạ chủ đề Giao thông cho lớp 4-5 tuổi, rất phù hợp ạ."],
    ];
    for (const [i, [u, a]] of script.entries()) {
      await svc.beginTurn(L.actor, conv.long, { id: `lu${i}`, role: "user", parts: [{ type: "text", text: u }] });
      await svc.finishTurn(conv.long, { id: `la${i}`, role: "assistant", parts: [{ type: "text", text: a }] });
    }
    for (let i = 2; i < 12; i++) {
      await svc.beginTurn(L.actor, conv.long, { id: `lu${i}`, role: "user", parts: [{ type: "text", text: filler + i }] });
      await svc.finishTurn(conv.long, { id: `la${i}`, role: "assistant", parts: [{ type: "text", text: filler + "trả lời " + i }] });
    }
    expect(await svc.summarizeIfNeeded(conv.long)).toBe(true);
    const { conversation } = await svc.load(L.actor, conv.long);
    expect(conversation.summaryUpTo).toBeGreaterThan(0);
    expect(conversation.summary.toLowerCase()).toMatch(/tàu vũ trụ|hộp sữa/);
    expect(conversation.summary.split(/\s+/).length).toBeLessThan(300);

    // Tin đầu tiên đã không còn trong cửa sổ, chỉ còn trong bản tóm tắt → AI vẫn trả lời được
    const r = await L.say(conv.long, "Cho mình hỏi lại: trò chơi tuần sau mình đặt tên là gì và dùng bao nhiêu hộp sữa nhỉ?");
    expect(r.reply.toLowerCase()).toMatch(/tàu vũ trụ/);
    expect(r.reply).toMatch(/10/);
  });

  it("7. Summarizer độc lập: bản tóm tắt giữ id/quyết định và không chứa nhãn chẩn đoán", async () => {
    const summarize = createSummarizer(() => routeModel("summarization_memory"));
    const out = await summarize({
      previousSummary: "- Cô chọn chủ đề Gia đình, lớp 4-5 tuổi.",
      messages: [
        { seq: 1, role: "user", parts: [{ type: "text", text: "Bé Nam hay đứng một mình, có phải bé tự kỷ không?" }] },
        { seq: 2, role: "assistant", parts: [{ type: "text", text: "Mình không chẩn đoán được. Giáo án 'Hộp bí mật' (planId=abc-123) đã được duyệt." }] },
      ],
    });
    expect(out).toMatch(/Gia đình/);
    expect(out).toContain("abc-123");
    expect(out.toLowerCase()).not.toMatch(/tự kỷ/);
  });
});
