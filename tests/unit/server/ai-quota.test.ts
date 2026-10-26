import { describe, it, expect } from "vitest";
import { DEVICE_AI_LIMIT, IP_AI_LIMIT, networkKey, parseLimit, quotaEntries, toQuotaStatus } from "@/server/security/ai-quota";

describe("parseLimit – đọc giới hạn từ biến môi trường", () => {
  it("nhận số nguyên dương", () => {
    expect(parseLimit("8", 5)).toBe(8);
    expect(parseLimit(" 12 ", 5)).toBe(12);
  });

  it.each([undefined, "", "0", "-3", "2.5", "abc", "Infinity"])("giá trị %j không hợp lệ → dùng mặc định", (value) => {
    expect(parseLimit(value, 5)).toBe(5);
  });

  it("mặc định của MVP: 5 lượt/thiết bị, 15 lượt/mạng", () => {
    expect(DEVICE_AI_LIMIT).toBe(5);
    expect(IP_AI_LIMIT).toBe(15);
  });
});

describe("networkKey – quy IP về mạng", () => {
  it("IPv4 giữ nguyên, bỏ khoảng trắng thừa", () => {
    expect(networkKey("203.0.113.7")).toBe("203.0.113.7");
    expect(networkKey(" 203.0.113.7 ")).toBe("203.0.113.7");
  });

  it("IPv4-mapped IPv6 quy về IPv4 (không phân biệt hoa thường)", () => {
    expect(networkKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(networkKey("::FFFF:203.0.113.7")).toBe("203.0.113.7");
  });

  it("IPv6 gộp theo dải /64: mọi cách viết của cùng một dải cho cùng một khóa", () => {
    const key = networkKey("2001:db8:abcd:12::1");
    expect(key).toBe("2001:db8:abcd:12::/64");
    expect(networkKey("2001:0db8:abcd:0012:dead:beef:0:42")).toBe(key);
    expect(networkKey("2001:DB8:ABCD:12::ffff")).toBe(key);
    expect(networkKey("2001:db8:abcd:12:0:0:0:1")).toBe(key);
  });

  it("IPv6 khác dải /64 là mạng khác", () => {
    expect(networkKey("2001:db8:abcd:13::1")).not.toBe(networkKey("2001:db8:abcd:12::1"));
  });

  it("dạng rút gọn ở đầu, ở giữa và địa chỉ toàn số 0", () => {
    expect(networkKey("::1")).toBe("0:0:0:0::/64");
    expect(networkKey("::")).toBe("0:0:0:0::/64");
    expect(networkKey("2001:db8::")).toBe("2001:db8:0:0::/64");
    expect(networkKey("fe80::1:2:3:4")).toBe("fe80:0:0:0::/64");
  });

  it("bỏ zone id của địa chỉ link-local", () => {
    expect(networkKey("fe80::1%eth0")).toBe(networkKey("fe80::2"));
  });

  it("giá trị không phải IP được giữ nguyên (vd. 'local' khi không có reverse proxy)", () => {
    expect(networkKey("local")).toBe("local");
  });
});

describe("quotaEntries – các bộ đếm của một request", () => {
  it("có id thiết bị: đếm cả thiết bị lẫn mạng", () => {
    expect(quotaEntries("abc", "203.0.113.7")).toEqual([
      { key: "device:abc", limit: DEVICE_AI_LIMIT },
      { key: "ip:203.0.113.7", limit: IP_AI_LIMIT },
    ]);
  });

  it("không có id thiết bị hợp lệ: chỉ còn bộ đếm mạng", () => {
    expect(quotaEntries(null, "2001:db8:abcd:12::1")).toEqual([{ key: "ip:2001:db8:abcd:12::/64", limit: IP_AI_LIMIT }]);
  });
});

describe("toQuotaStatus – số lượt hiển thị cho người dùng", () => {
  const device = { key: "device:a", limit: 5 };
  const network = { key: "ip:x", limit: 15 };
  const status = (deviceUsed: number, networkUsed: number) =>
    toQuotaStatus([device, network], new Map([
      [device.key, deviceUsed],
      [network.key, networkUsed],
    ]));

  it("chưa dùng lượt nào", () => {
    expect(toQuotaStatus([device, network], new Map())).toEqual({ limit: 5, used: 0, remaining: 5, isExceeded: false });
  });

  it("thiết bị là bộ đếm cạn nhất", () => {
    expect(status(2, 3)).toEqual({ limit: 5, used: 2, remaining: 3, isExceeded: false });
  });

  it("mạng là bộ đếm cạn nhất (các máy khác cùng Wi-Fi đã dùng gần hết)", () => {
    expect(status(0, 13)).toEqual({ limit: 5, used: 3, remaining: 2, isExceeded: false });
  });

  it("hết lượt khi BẤT KỲ bộ đếm nào cạn", () => {
    expect(status(5, 5).isExceeded).toBe(true);
    expect(status(0, 15).isExceeded).toBe(true);
  });

  it("dùng quá trần (vd. vừa hạ giới hạn) vẫn hiện 0 lượt, không ra số âm", () => {
    expect(status(9, 20)).toEqual({ limit: 5, used: 5, remaining: 0, isExceeded: true });
  });

  it("chỉ có bộ đếm mạng: số lượt hiển thị không vượt quá giới hạn thiết bị", () => {
    expect(toQuotaStatus([network], new Map([[network.key, 2]]))).toEqual({ limit: 5, used: 0, remaining: 5, isExceeded: false });
    expect(toQuotaStatus([network], new Map([[network.key, 12]]))).toEqual({ limit: 5, used: 2, remaining: 3, isExceeded: false });
  });
});
