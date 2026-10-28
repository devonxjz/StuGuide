import { DEFAULT_THRESHOLD } from "./baseline";

export interface EvalArgs {
  /** Chỉ chạy mẫu nhỏ (chế độ nhẹ cho CI); undefined = chạy toàn bộ */
  sample?: number;
  /** Ghi đè baseline bằng kết quả run này */
  updateBaseline: boolean;
  threshold: number;
}

function readNumber(flag: string, raw: string | undefined): number {
  const value = Number(raw);
  if (raw === undefined || raw.trim() === "" || !Number.isFinite(value)) throw new Error(`${flag} cần một số`);
  return value;
}

export function parseArgs(argv: string[]): EvalArgs {
  const args: EvalArgs = { updateBaseline: false, threshold: DEFAULT_THRESHOLD };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--update-baseline") args.updateBaseline = true;
    else if (flag === "--sample") {
      args.sample = readNumber(flag, argv[++i]);
      if (!Number.isInteger(args.sample) || args.sample < 1) throw new Error("--sample phải là số nguyên dương");
    } else if (flag === "--threshold") {
      args.threshold = readNumber(flag, argv[++i]);
      if (args.threshold < 0 || args.threshold > 1) throw new Error("--threshold phải nằm trong 0..1");
    } else throw new Error(`Tham số không hợp lệ: ${flag}`);
  }
  if (args.updateBaseline && args.sample !== undefined) throw new Error("Không cập nhật baseline từ run mẫu nhỏ: bỏ --sample");
  return args;
}
