import { describe, it, expect, beforeAll } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createAiQuotaRepo } from "@/data/repositories/ai-quota.repo";

let repo: ReturnType<typeof createAiQuotaRepo>;
let seq = 0;
/** Mỗi test một bộ khóa riêng để không ảnh hưởng chéo */
const keys = () => {
  seq++;
  return { device: { key: `device:t${seq}`, limit: 5 }, network: { key: `ip:t${seq}`, limit: 15 } };
};

beforeAll(async () => {
  const { prisma } = await createTestDb({ seed: false });
  repo = createAiQuotaRepo(prisma);
});

describe("aiQuota repo – usage", () => {
  it("khóa chưa từng dùng = 0 lượt, giữ đúng thứ tự khóa yêu cầu", async () => {
    const { device, network } = keys();
    expect([...(await repo.usage([network.key, device.key])).entries()]).toEqual([
      [network.key, 0],
      [device.key, 0],
    ]);
  });

  it("danh sách khóa rỗng → Map rỗng", async () => {
    expect((await repo.usage([])).size).toBe(0);
  });
});

describe("aiQuota repo – consume", () => {
  it("trừ 1 lượt trên mọi bộ đếm mỗi lần gọi", async () => {
    const { device, network } = keys();
    expect(await repo.consume([device, network])).toBe(true);
    expect(await repo.consume([device, network])).toBe(true);
    expect([...(await repo.usage([device.key, network.key])).values()]).toEqual([2, 2]);
  });

  it("dùng đủ trần thì từ chối, và lượt bị từ chối không được tính", async () => {
    const { device } = keys();
    for (let i = 0; i < 5; i++) expect(await repo.consume([device])).toBe(true);
    expect(await repo.consume([device])).toBe(false);
    expect(await repo.consume([device])).toBe(false);
    expect((await repo.usage([device.key])).get(device.key)).toBe(5);
  });

  it("all-or-nothing: bộ đếm sau đã cạn thì hoàn lại lượt vừa trừ ở bộ đếm trước", async () => {
    const { device, network } = keys();
    const tinyNetwork = { ...network, limit: 1 };
    expect(await repo.consume([device, tinyNetwork])).toBe(true);

    expect(await repo.consume([device, tinyNetwork])).toBe(false);
    expect([...(await repo.usage([device.key, network.key])).values()]).toEqual([1, 1]);
  });

  it("bộ đếm đầu tiên đã cạn: không đụng tới bộ đếm sau", async () => {
    const { device, network } = keys();
    const tinyDevice = { ...device, limit: 1 };
    await repo.consume([tinyDevice]);

    expect(await repo.consume([tinyDevice, network])).toBe(false);
    expect((await repo.usage([network.key])).get(network.key)).toBe(0);
  });

  it("request song song không vượt trần (UPDATE có điều kiện là nguyên tử)", async () => {
    const { device, network } = keys();
    const results = await Promise.all(Array.from({ length: 12 }, () => repo.consume([device, network])));
    expect(results.filter(Boolean)).toHaveLength(5);
    expect([...(await repo.usage([device.key, network.key])).values()]).toEqual([5, 5]);
  });

  it("giới hạn bị hạ thấp hơn số đã dùng: từ chối, không trừ thêm", async () => {
    const { device } = keys();
    for (let i = 0; i < 3; i++) await repo.consume([device]);
    expect(await repo.consume([{ ...device, limit: 2 }])).toBe(false);
    expect((await repo.usage([device.key])).get(device.key)).toBe(3);
  });

  it("danh sách bộ đếm rỗng: không có gì để chặn", async () => {
    expect(await repo.consume([])).toBe(true);
  });
});
