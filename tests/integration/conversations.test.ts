import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createRepositories } from "@/data/repositories";
import { createConversationService } from "@/services/conversation.service";
import { PermissionError } from "@/core/guardrails";
import { NotFoundError } from "@/core/errors";
import type { StuGuideMessage } from "@/types/chat";

type Db = Awaited<ReturnType<typeof createTestDb>>;
let db: Db;
let svc: ReturnType<typeof createConversationService>;
const summaries: { prev: string; count: number }[] = [];

beforeAll(async () => {
  db = await createTestDb();
  svc = createConversationService({
    repos: createRepositories(db.prisma),
    summarize: async ({ previousSummary, messages }) => {
      summaries.push({ prev: previousSummary, count: messages.length });
      return `${previousSummary} | tóm tắt ${messages.length} tin`.trim();
    },
  });
});
afterAll(async () => db.prisma.$disconnect());

const teacher = () => ({ id: db.ids.teacherId, role: "teacher" as const, classId: db.ids.classId });
const teacher2 = () => ({ id: db.ids.teacher2Id, role: "teacher" as const, classId: db.ids.class2Id });
const user = (id: string, text: string): StuGuideMessage => ({ id, role: "user", parts: [{ type: "text", text }] });
const assistant = (id: string, text: string, parts: StuGuideMessage["parts"] = []): StuGuideMessage => ({ id, role: "assistant", parts: [...parts, { type: "text", text }] });
const long = (n: number) => "từ ".repeat(n);

describe("ConversationService – lưu và quản lý hội thoại", () => {
  it("tạo cuộc trò chuyện theo id do client chọn, tự đặt tiêu đề từ câu đầu, lưu tin theo thứ tự", async () => {
    const turn = await svc.beginTurn(teacher(), "c-1", user("m1", "Soạn trò chơi với hộp sữa cho lớp 4-5 tuổi giúp mình"));
    expect(turn.conversation.title).toMatch(/^Soạn trò chơi với hộp sữa/);
    await svc.finishTurn("c-1", assistant("m2", "Đây là ý tưởng của mình", [{ type: "data-card", data: { kind: "notice", tone: "info", message: "ok" } }]));
    const loaded = await svc.load(teacher(), "c-1");
    expect(loaded.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(loaded.messages[1].parts.some((p) => p.type === "data-card")).toBe(true);
  });

  it("dùng lại cuộc trò chuyện cũ và đưa lịch sử vào ngữ cảnh LLM kèm bản tóm tắt thao tác", async () => {
    await svc.finishTurn("c-1", assistant("m2b", "Đã tạo", [{ type: "data-card", data: { kind: "plan", planId: "plan-77", plan: { id: "plan-77", gameName: "Hộp bí mật", status: "ai_draft" } as never, violations: [] } }]));
    const turn = await svc.beginTurn(teacher(), "c-1", user("m3", "Phê duyệt bài này nhé"));
    const texts = turn.history.map((m) => String(m.content));
    expect(texts.at(-1)).toBe("Phê duyệt bài này nhé");
    expect(texts.join("\n")).toContain("plan-77");
    expect(turn.summary).toBe("");
  });

  it("giáo viên khác không đọc/ghi được cuộc trò chuyện của người khác", async () => {
    await expect(svc.load(teacher2(), "c-1")).rejects.toBeInstanceOf(PermissionError);
    await expect(svc.beginTurn(teacher2(), "c-1", user("x", "hi"))).rejects.toBeInstanceOf(PermissionError);
    await expect(svc.load(teacher(), "khong-co")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("liệt kê mới nhất trước, xóa được", async () => {
    await svc.beginTurn(teacher(), "c-2", user("n1", "Cuộc trò chuyện thứ hai"));
    const list = await svc.list(teacher());
    expect(list[0].id).toBe("c-2");
    expect(list.map((c) => c.id)).toContain("c-1");
    await svc.remove(teacher(), "c-2");
    expect((await svc.list(teacher())).map((c) => c.id)).not.toContain("c-2");
    await expect(svc.remove(teacher2(), "c-1")).rejects.toBeInstanceOf(PermissionError);
  });

  it("ghi nhớ giáo án đang làm việc theo cuộc trò chuyện", async () => {
    await svc.setFocus("c-1", "plan-77");
    expect((await svc.load(teacher(), "c-1")).conversation.focusPlanId).toBe("plan-77");
  });
});

describe("Quản lý ngữ cảnh dài – tóm tắt cuộn", () => {
  it("hội thoại dài vượt ngân sách thì gộp phần cũ vào summary và lần sau chỉ nạp phần mới", async () => {
    for (let i = 0; i < 14; i++) {
      await svc.beginTurn(teacher(), "c-long", user(`u${i}`, long(450)));
      await svc.finishTurn("c-long", assistant(`a${i}`, long(450)));
    }
    summaries.length = 0;
    await svc.summarizeIfNeeded("c-long");
    expect(summaries).toHaveLength(1);
    expect(summaries[0].count).toBeGreaterThan(0);

    const turn = await svc.beginTurn(teacher(), "c-long", user("u-last", "Còn nhớ mình đang làm gì không?"));
    expect(turn.summary).toContain("tóm tắt");
    expect(turn.history.length).toBeLessThan(29);
    expect(String(turn.history.at(-1)!.content)).toBe("Còn nhớ mình đang làm gì không?");

    // đã gộp xong thì gọi lại không tóm tắt lần nữa
    await svc.summarizeIfNeeded("c-long");
    summaries.length = 0;
    await svc.summarizeIfNeeded("c-long");
    expect(summaries).toHaveLength(0);
  });

  it("summary cũ được truyền vào lần tóm tắt kế tiếp (cuộn)", async () => {
    for (let i = 0; i < 8; i++) {
      await svc.beginTurn(teacher(), "c-long", user(`v${i}`, long(450)));
      await svc.finishTurn("c-long", assistant(`w${i}`, long(450)));
    }
    summaries.length = 0;
    await svc.summarizeIfNeeded("c-long");
    expect(summaries[0].prev).toContain("tóm tắt");
  });
});

describe("Trí nhớ dài hạn của giáo viên", () => {
  it("lưu, loại trùng, liệt kê và quên", async () => {
    const a = await svc.remember(teacher(), "Lớp có 2 bé dị ứng đậu phộng");
    await svc.remember(teacher(), "  lớp có 2 bé dị ứng đậu phộng  ");
    await svc.remember(teacher(), "Cô thích trò chơi ngoài sân");
    const list = await svc.memories(teacher());
    expect(list.map((m) => m.content)).toEqual(["Lớp có 2 bé dị ứng đậu phộng", "Cô thích trò chơi ngoài sân"]);
    await svc.forget(teacher(), a.id);
    expect((await svc.memories(teacher())).map((m) => m.content)).toEqual(["Cô thích trò chơi ngoài sân"]);
    await expect(svc.forget(teacher2(), list[1].id)).rejects.toBeInstanceOf(PermissionError);
  });

  it("làm sạch từ ngữ dán nhãn trẻ trước khi ghi nhớ (BR-004) và giới hạn độ dài/số lượng", async () => {
    const m = await svc.remember(teacher(), "Bé An bị tăng động nên cần để ý");
    expect(m.content).not.toMatch(/tăng động/);
    await expect(svc.remember(teacher(), "")).rejects.toThrow();
    for (let i = 0; i < 40; i++) await svc.remember(teacher(), `Ghi chú số ${i}`);
    expect((await svc.memories(teacher())).length).toBeLessThanOrEqual(30);
  });

  it("beginTurn đưa trí nhớ dài hạn vào ngữ cảnh", async () => {
    const turn = await svc.beginTurn(teacher2(), "c-t2", user("t2", "chào"));
    expect(turn.memories).toEqual([]);
    await svc.remember(teacher2(), "Lớp A2 hay chơi ngoài sân");
    const again = await svc.beginTurn(teacher2(), "c-t2", user("t3", "tiếp"));
    expect(again.memories).toEqual(["Lớp A2 hay chơi ngoài sân"]);
  });
});
