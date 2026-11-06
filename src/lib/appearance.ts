/** Tuỳ chỉnh giao diện của người dùng (chế độ, màu chủ đề, font, cỡ chữ), lưu ở localStorage của trình duyệt. */

export const APPEARANCE_STORAGE_KEY = "stuguide-appearance";
export const APPEARANCE_EVENT = "stuguide:appearance";

export const MODES = ["light", "dark", "system"] as const;
export type Mode = (typeof MODES)[number];

export const ACCENTS = [
  { id: "default", label: "Mặc định", swatch: "#0f172a" },
  { id: "blue", label: "Xanh dương", swatch: "#0052cc" },
  { id: "violet", label: "Tím", swatch: "#8b5cf6" },
  { id: "pink", label: "Hồng", swatch: "#ec4899" },
  { id: "orange", label: "Cam", swatch: "#ea580c" },
  { id: "green", label: "Xanh lá", swatch: "#16a34a" },
  { id: "brown", label: "Nâu", swatch: "#92400e" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];

export const FONTS = [
  { id: "default", label: "Be Vietnam Pro", hint: "Mặc định" },
  { id: "inter", label: "Inter", hint: "Gọn, hiện đại" },
  { id: "serif", label: "Lora", hint: "Có chân, dễ đọc dài" },
  { id: "system", label: "Hệ thống", hint: "Font của thiết bị" },
] as const;
export type FontId = (typeof FONTS)[number]["id"];

export const SIZES = [
  { id: "small", label: "Nhỏ" },
  { id: "medium", label: "Vừa" },
  { id: "large", label: "Lớn" },
] as const;
export type SizeId = (typeof SIZES)[number]["id"];

export interface Appearance {
  mode: Mode;
  accent: AccentId;
  font: FontId;
  size: SizeId;
}

export const DEFAULT_APPEARANCE: Appearance = { mode: "light", accent: "default", font: "default", size: "medium" };

/** Chỉ các khu vực này mới áp giao diện tuỳ chỉnh; landing và đăng nhập luôn giữ giao diện gốc. */
export const APP_PATH_PATTERN = "^/(teacher|principal|family)";

const has = (ids: readonly string[], value: unknown): value is string => typeof value === "string" && ids.includes(value);

/** Đọc JSON đã lưu; giá trị lạ hoặc hỏng quay về mặc định thay vì làm vỡ giao diện. */
export function parseAppearance(raw: string | null): Appearance {
  if (!raw) return DEFAULT_APPEARANCE;
  try {
    const value = JSON.parse(raw) as Partial<Record<keyof Appearance, unknown>>;
    return {
      mode: has(MODES, value.mode) ? (value.mode as Mode) : DEFAULT_APPEARANCE.mode,
      accent: has(ACCENTS.map((x) => x.id), value.accent) ? (value.accent as AccentId) : DEFAULT_APPEARANCE.accent,
      font: has(FONTS.map((x) => x.id), value.font) ? (value.font as FontId) : DEFAULT_APPEARANCE.font,
      size: has(SIZES.map((x) => x.id), value.size) ? (value.size as SizeId) : DEFAULT_APPEARANCE.size,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function isDark(mode: Mode, systemPrefersDark: boolean) {
  return mode === "dark" || (mode === "system" && systemPrefersDark);
}

export function applyAppearance(appearance: Appearance, root: HTMLElement, systemPrefersDark: boolean) {
  root.classList.toggle("dark", isDark(appearance.mode, systemPrefersDark));
  root.dataset.accent = appearance.accent;
  root.dataset.font = appearance.font;
  root.dataset.size = appearance.size;
}

export function clearAppearance(root: HTMLElement) {
  root.classList.remove("dark");
  delete root.dataset.accent;
  delete root.dataset.font;
  delete root.dataset.size;
}

/**
 * Script chạy trước khi vẽ trang để không bị nháy sáng→tối. Giữ logic khớp với applyAppearance;
 * giá trị lạ không sao vì CSS chỉ nhận các giá trị hợp lệ.
 */
export const APPEARANCE_BOOT_SCRIPT = `try{var p=location.pathname;if(new RegExp("${APP_PATH_PATTERN}").test(p)){var a=JSON.parse(localStorage.getItem("${APPEARANCE_STORAGE_KEY}")||"{}"),r=document.documentElement;if(a.mode==="dark"||(a.mode==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))r.classList.add("dark");if(a.accent)r.dataset.accent=a.accent;if(a.font)r.dataset.font=a.font;if(a.size)r.dataset.size=a.size}}catch(e){}`;
