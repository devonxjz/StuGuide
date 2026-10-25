// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DeviceQuotaBadge } from "@/components/shared/device-quota-badge";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DeviceQuotaBadge Component", () => {
  it("hiển thị số lượt AI khi chưa vượt ngưỡng 5 lượt", () => {
    render(
      <DeviceQuotaBadge
        quota={{
          limit: 5,
          used: 2,
          remaining: 3,
          isExceeded: false,
          message: null,
        }}
      />,
    );

    expect(screen.getByText("AI: 2/5 lượt")).toBeInTheDocument();
  });

  it("hiển thị badge cảnh báo 'Quá hạn sử dụng, bạn phải mua thêm lượt' khi đã đạt ngưỡng 5 lượt", () => {
    render(
      <DeviceQuotaBadge
        quota={{
          limit: 5,
          used: 5,
          remaining: 0,
          isExceeded: true,
          message: "Quá hạn sử dụng, bạn phải mua thêm lượt",
        }}
      />,
    );

    expect(screen.getByText("Quá hạn sử dụng, bạn phải mua thêm lượt")).toBeInTheDocument();
  });

  it("hiển thị badge cảnh báo khi còn 1 lượt cuối (4/5 lượt)", () => {
    render(
      <DeviceQuotaBadge
        quota={{
          limit: 5,
          used: 4,
          remaining: 1,
          isExceeded: false,
          message: null,
        }}
      />,
    );

    expect(screen.getByText("AI: 4/5 lượt")).toBeInTheDocument();
  });

  it("ẩn khi showNormal=false nếu chưa vượt ngưỡng, nhưng vẫn hiện khi đã vượt ngưỡng", () => {
    const { rerender } = render(
      <DeviceQuotaBadge
        showNormal={false}
        quota={{
          limit: 5,
          used: 2,
          remaining: 3,
          isExceeded: false,
          message: null,
        }}
      />,
    );
    expect(screen.queryByText(/AI: \d+\/5 lượt/)).not.toBeInTheDocument();

    rerender(
      <DeviceQuotaBadge
        showNormal={false}
        quota={{
          limit: 5,
          used: 5,
          remaining: 0,
          isExceeded: true,
          message: "Quá hạn sử dụng, bạn phải mua thêm lượt",
        }}
      />,
    );
    expect(screen.getByText("Quá hạn sử dụng, bạn phải mua thêm lượt")).toBeInTheDocument();
  });
});
