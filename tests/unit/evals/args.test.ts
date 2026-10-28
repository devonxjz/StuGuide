import { describe, it, expect } from "vitest";
import { parseArgs } from "../../../evals/lib/args";
import { DEFAULT_THRESHOLD } from "../../../evals/lib/baseline";

describe("parseArgs", () => {
  it("mặc định: chạy đủ, không ghi baseline, ngưỡng mặc định", () => {
    expect(parseArgs([])).toEqual({ updateBaseline: false, threshold: DEFAULT_THRESHOLD });
  });

  it("đọc --sample, --threshold, --update-baseline", () => {
    expect(parseArgs(["--sample", "6", "--threshold", "0.1"])).toEqual({ sample: 6, updateBaseline: false, threshold: 0.1 });
    expect(parseArgs(["--update-baseline"]).updateBaseline).toBe(true);
  });

  it.each([
    [["--sample"], "cần một số"],
    [["--sample", "abc"], "cần một số"],
    [["--sample", " "], "cần một số"],
    [["--sample", "0"], "số nguyên dương"],
    [["--sample", "-2"], "số nguyên dương"],
    [["--sample", "2.5"], "số nguyên dương"],
    [["--threshold", "1.5"], "0..1"],
    [["--threshold", "-0.1"], "0..1"],
    [["--bogus"], "không hợp lệ"],
    [["--sample", "5", "--update-baseline"], "bỏ --sample"],
  ])("từ chối %j", (argv, message) => {
    expect(() => parseArgs(argv)).toThrow(message);
  });
});
