import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { evalCaseListSchema } from "../../../evals/lib/case.schema";
import { loadCases, pickSample } from "../../../evals/lib/cases";
import { requiredSafetyCoverage } from "@/core/guardrails";

const CASES_PATH = path.resolve(import.meta.dirname, "../../../evals/cases/lesson-plan.json");
const validCase = { id: "lp-01", title: "t", input: { ageGroup: "4-5y", developmentArea: "physical", topic: "t", materials: ["Rổ"] }, expectations: [{ id: "e", description: "d", scope: "all", mode: "avoid", anyOf: ["x"] }] };

describe("bộ case thật (evals/cases/lesson-plan.json)", () => {
  const cases = loadCases(CASES_PATH);

  it("có 30–50 case hợp lệ, id tuần tự", () => {
    expect(cases.length).toBeGreaterThanOrEqual(30);
    expect(cases.length).toBeLessThanOrEqual(50);
    expect(cases.map((c) => c.id)).toEqual(cases.map((_, i) => `lp-${String(i + 1).padStart(2, "0")}`));
  });

  it("bao phủ đủ 4 nhóm tuổi, 5 mảng phát triển, trong lớp lẫn ngoài sân", () => {
    expect(new Set(cases.map((c) => c.input.ageGroup)).size).toBe(4);
    expect(new Set(cases.map((c) => c.input.developmentArea)).size).toBe(5);
    expect(new Set(cases.map((c) => c.input.space))).toEqual(new Set(["indoor", "outdoor"]));
  });

  it("có case dân gian, STEM, ghi chú lớp, và ghi chú cố tình bỏ qua an toàn/màn hình", () => {
    expect(cases.some((c) => c.input.folkGameEnabled)).toBe(true);
    expect(cases.some((c) => c.input.stemEnabled)).toBe(true);
    expect(cases.some((c) => /bỏ qua/i.test(c.input.classNotes ?? ""))).toBe(true);
  });

  it("mọi case đều kiểm tra screen-free và không dán nhãn trẻ", () => {
    for (const c of cases) {
      const ids = c.expectations.map((e) => e.id);
      expect(ids, c.id).toEqual(expect.arrayContaining(["screen-free", "khong-dan-nhan"]));
    }
  });

  it("case có vật liệu rủi ro (theo guard thật) đều có kỳ vọng về cảnh báo an toàn", () => {
    for (const c of cases.filter((x) => requiredSafetyCoverage(x.input.materials, x.input.ageGroup).length > 0)) {
      expect(c.expectations.some((e) => e.scope === "safetyWarnings"), c.id).toBe(true);
    }
  });
});

describe("evalCaseListSchema", () => {
  it("từ chối danh sách rỗng, id sai dạng, trường lạ và đầu vào vi phạm schema form", () => {
    expect(evalCaseListSchema.safeParse([]).success).toBe(false);
    expect(evalCaseListSchema.safeParse([{ ...validCase, id: "x1" }]).success).toBe(false);
    expect(evalCaseListSchema.safeParse([{ ...validCase, extra: 1 }]).success).toBe(false);
    expect(evalCaseListSchema.safeParse([{ ...validCase, input: { ...validCase.input, materials: [] } }]).success).toBe(false);
    expect(evalCaseListSchema.safeParse([{ ...validCase, expectations: [] }]).success).toBe(false);
  });

  it("từ chối id case trùng và id kỳ vọng trùng trong cùng case", () => {
    expect(evalCaseListSchema.safeParse([validCase, validCase]).success).toBe(false);
    expect(evalCaseListSchema.safeParse([{ ...validCase, expectations: [validCase.expectations[0], validCase.expectations[0]] }]).success).toBe(false);
  });
});

describe("loadCases", () => {
  let dir = "";
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("báo lỗi rõ ràng, nêu đường dẫn khi file sai hình dạng", () => {
    dir = mkdtempSync(path.join(tmpdir(), "evals-"));
    const file = path.join(dir, "bad.json");
    writeFileSync(file, JSON.stringify([{ ...validCase, id: "bad" }]));
    expect(() => loadCases(file)).toThrow(/Bộ case không hợp lệ.*bad\.json/);
  });

  it("file không phải JSON thì ném lỗi", () => {
    dir = mkdtempSync(path.join(tmpdir(), "evals-"));
    const file = path.join(dir, "broken.json");
    writeFileSync(file, "{not json");
    expect(() => loadCases(file)).toThrow();
  });
});

describe("pickSample", () => {
  const items = Array.from({ length: 30 }, (_, i) => i);

  it("lấy đều theo khoảng cách và tất định", () => {
    expect(pickSample(items, 3)).toEqual([0, 10, 20]);
    expect(pickSample(items, 3)).toEqual(pickSample(items, 3));
  });

  it("cỡ mẫu ≥ số phần tử thì trả đủ; cỡ 1 lấy phần tử đầu", () => {
    expect(pickSample(items, 30)).toBe(items);
    expect(pickSample(items, 99)).toBe(items);
    expect(pickSample(items, 1)).toEqual([0]);
  });

  it("không trùng phần tử và giữ thứ tự", () => {
    const sample = pickSample(items, 7);
    expect(new Set(sample).size).toBe(7);
    expect([...sample].sort((a, b) => a - b)).toEqual(sample);
  });

  it("từ chối cỡ mẫu không hợp lệ", () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) expect(() => pickSample(items, bad)).toThrow();
  });
});
