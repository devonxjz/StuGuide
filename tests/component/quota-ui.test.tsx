// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Composer } from "@/components/teacher/chat/composer";
import { CreatePlanForm } from "@/components/teacher/create-plan-form";

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock useDeviceQuota
const mockUseDeviceQuota = vi.fn();
vi.mock("@/hooks/use-device-quota", () => ({
  useDeviceQuota: () => mockUseDeviceQuota(),
  DEVICE_QUOTA_EVENT: "sg:device-quota-updated",
}));

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
afterEach(cleanup);

describe("Giao diện khi vượt quá 5 lượt tương tác AI", () => {
  describe("Composer (ô soạn tin chat)", () => {
    it("khóa ô nhập và đổi placeholder khi thiết bị đã quá hạn sử dụng", () => {
      render(
        <Composer
          onSend={vi.fn()}
          busy={true}
          placeholder="Quá hạn sử dụng, bạn phải mua thêm lượt"
        />,
      );

      const textbox = screen.getByRole("textbox");
      expect(textbox).toBeDisabled();
      expect(textbox).toHaveAttribute("placeholder", "Quá hạn sử dụng, bạn phải mua thêm lượt");

      const submitBtn = screen.getByRole("button", { name: /Gửi/ });
      expect(submitBtn).toBeDisabled();
    });
  });

  describe("CreatePlanForm (form tạo giáo án nhanh)", () => {
    it("hiển thị thông báo quá hạn sử dụng và vô hiệu hóa nút tạo bản nháp bằng AI khi đã đạt ngưỡng 5 lượt", () => {
      mockUseDeviceQuota.mockReturnValue({
        quota: {
          limit: 5,
          used: 5,
          remaining: 0,
          isExceeded: true,
          message: "Quá hạn sử dụng, bạn phải mua thêm lượt",
        },
        loading: false,
        refresh: vi.fn(),
      });

      render(<CreatePlanForm defaultAge="4-5y" />);

      // Thông báo alert được hiển thị rõ ràng trên màn hình
      const alerts = screen.getAllByRole("alert");
      const quotaAlert = alerts.find((a) => a.textContent?.includes("Quá hạn sử dụng, bạn phải mua thêm lượt"));
      expect(quotaAlert).toBeDefined();
      expect(quotaAlert).toHaveTextContent("Quá hạn sử dụng, bạn phải mua thêm lượt");

      // Nút Tạo bản nháp bằng AI bị vô hiệu hóa
      const submitBtn = screen.getByRole("button", { name: /Tạo bản nháp bằng AI/ });
      expect(submitBtn).toBeDisabled();
    });

    it("cho phép gửi bình thường khi thiết bị chưa vượt quá 5 lượt", () => {
      mockUseDeviceQuota.mockReturnValue({
        quota: {
          limit: 5,
          used: 2,
          remaining: 3,
          isExceeded: false,
          message: null,
        },
        loading: false,
        refresh: vi.fn(),
      });

      render(<CreatePlanForm defaultAge="4-5y" />);

      // Không có thông báo quá hạn
      expect(screen.queryByText("Quá hạn sử dụng, bạn phải mua thêm lượt")).not.toBeInTheDocument();

      // Nút Tạo bản nháp bằng AI không bị disabled
      const submitBtn = screen.getByRole("button", { name: /Tạo bản nháp bằng AI/ });
      expect(submitBtn).not.toBeDisabled();
    });
  });
});
