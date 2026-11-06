// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { ProductTour } from "@/components/landing/product-tour";
import { ScreenGallery } from "@/components/landing/screen-gallery";
import { Parallax } from "@/components/landing/parallax";
import { PhoneFrame } from "@/components/landing/device-frames";
import { SCREENS } from "@/components/landing/screens";
import { SiteHeader } from "@/components/landing/site-header";

// next/image cần cấu hình của Next; trong test chỉ cần thẻ img có alt
/* eslint-disable @next/next/no-img-element */
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string | { src: string } }) => <img alt={alt} src={typeof src === "string" ? src : src.src} />,
}));

/** IntersectionObserver giả: test tự báo phần tử nào đang ở giữa màn hình */
let observed: Element[] = [];
let notify: (targets: Element[]) => void = () => {};
class FakeIO {
  constructor(cb: (entries: { isIntersecting: boolean; target: Element }[]) => void) {
    notify = (targets) => cb(targets.map((target) => ({ isIntersecting: true, target })));
  }
  observe = (el: Element) => observed.push(el);
  disconnect = vi.fn();
}

const media = (matches: Record<string, boolean>) => (query: string) => ({ matches: matches[query] ?? false, media: query, addEventListener() {}, removeEventListener() {} });

beforeEach(() => {
  observed = [];
  vi.stubGlobal("IntersectionObserver", FakeIO);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ProductTour – cuộn kể chuyện", () => {
  it("5 chương, chương đầu đang hiện; cuộn tới chương nào thì khung ảnh dính đổi sang màn hình đó", () => {
    render(<ProductTour />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(5);
    expect(observed).toHaveLength(5);

    // khung dính chỉ có một ảnh không bị ẩn
    const visible = () => document.querySelectorAll('.sticky [aria-hidden="false"] img');
    expect(visible()).toHaveLength(1);
    expect(visible()[0]).toHaveAttribute("alt", SCREENS.create.alt);

    act(() => notify([observed[3]]));
    expect(visible()[0]).toHaveAttribute("alt", SCREENS.assess.alt);
  });

  it("mỗi chương có ảnh riêng cho điện thoại và mô tả thay thế cho trình đọc màn hình", () => {
    render(<ProductTour />);
    expect(screen.getAllByAltText(SCREENS.plan.alt).length).toBeGreaterThanOrEqual(2);
  });
});

describe("ScreenGallery – dải ảnh", () => {
  it("hai hàng chạy ngược chiều; bản lặp để nối vòng bị ẩn với trình đọc màn hình", () => {
    const { container } = render(<ScreenGallery />);
    expect(container.querySelector(".animate-marquee-slow")).not.toBeNull();
    expect(container.querySelector(".animate-marquee-reverse")).not.toBeNull();
    const items = container.querySelectorAll(".shrink-0");
    expect(items).toHaveLength(16);
    expect(container.querySelectorAll('.shrink-0[aria-hidden="true"]')).toHaveLength(8);
    expect(screen.getAllByText("Ban giám hiệu").length).toBeGreaterThan(0);
  });
});

describe("Parallax", () => {
  const box = (top: number) => ({ top, height: 200, bottom: top + 200, left: 0, right: 0, width: 0, x: 0, y: top, toJSON() {} }) as DOMRect;

  it("màn hình rộng: dịch theo vị trí cuộn, có giới hạn để không trôi quá xa", async () => {
    vi.stubGlobal("matchMedia", media({ "(min-width: 1024px)": true }));
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => (cb(0), 1));
    vi.stubGlobal("DOMMatrixReadOnly", class { m42 = 0; });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(box(3000));
    render(<Parallax speed={0.1}>ảnh</Parallax>);
    const el = screen.getByText("ảnh");
    // tâm cách giữa màn hình (768/2) rất xa → bị giới hạn ở 120px
    expect(el.style.transform).toBe("translate3d(0, -120.0px, 0)");

    (HTMLElement.prototype.getBoundingClientRect as ReturnType<typeof vi.fn>).mockReturnValue(box(284));
    act(() => void window.dispatchEvent(new Event("scroll")));
    // tâm = 284 + 100 = 384 = giữa màn hình → không dịch
    expect(el.style.transform).toBe("translate3d(0, 0.0px, 0)");
    vi.restoreAllMocks();
  });

  it("điện thoại: không dịch (tránh đè lên chữ)", () => {
    vi.stubGlobal("matchMedia", media({}));
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => (cb(0), 1));
    render(<Parallax>ảnh</Parallax>);
    expect(screen.getByText("ảnh").style.transform).toBe("");
  });

  it("người dùng chọn giảm chuyển động: không gắn sự kiện cuộn", () => {
    vi.stubGlobal("matchMedia", media({ "(prefers-reduced-motion: reduce)": true, "(min-width: 1024px)": true }));
    const add = vi.spyOn(window, "addEventListener");
    render(<Parallax>ảnh</Parallax>);
    expect(add).not.toHaveBeenCalledWith("scroll", expect.anything(), expect.anything());
    vi.restoreAllMocks();
  });
});

describe("PhoneFrame", () => {
  it("hiển thị ảnh màn hình phụ huynh với mô tả", () => {
    render(<PhoneFrame screen={SCREENS.family} />);
    expect(screen.getByAltText(SCREENS.family.alt)).toBeInTheDocument();
  });
});

describe("SiteHeader", () => {
  it("đầu trang: trong suốt để nền hero tràn lên; cuộn xuống: có nền mờ để chữ dễ đọc", () => {
    render(<SiteHeader>menu</SiteHeader>);
    const header = screen.getByRole("banner");
    expect(header).toHaveAttribute("data-scrolled", "false");
    expect(header.className).toContain("bg-transparent");

    act(() => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 300 });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(header).toHaveAttribute("data-scrolled", "true");
    expect(header.className).toContain("backdrop-blur-xl");

    act(() => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(header).toHaveAttribute("data-scrolled", "false");
  });
});
