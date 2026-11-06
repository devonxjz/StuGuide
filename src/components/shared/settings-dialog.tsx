"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LogOut, Monitor, Moon, Palette, Settings, Sun, X } from "lucide-react";
import { useAppearance } from "@/hooks/use-appearance";
import { ACCENTS, DEFAULT_APPEARANCE, FONTS, SIZES, type Mode } from "@/lib/appearance";
import { cn } from "@/lib/utils";

type Section = "general" | "appearance";

const SECTIONS: { id: Section; label: string; icon: typeof Settings }[] = [
  { id: "general", label: "Chung", icon: Settings },
  { id: "appearance", label: "Giao diện", icon: Palette },
];

const MODE_OPTIONS: { id: Mode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Sáng", icon: Sun },
  { id: "dark", label: "Tối", icon: Moon },
  { id: "system", label: "Theo hệ thống", icon: Monitor },
];

/** Mỗi font hiển thị chữ "Aa" bằng chính font đó để người dùng thấy trước khi chọn. */
const FONT_PREVIEW: Record<string, string> = {
  default: "var(--font-be-vietnam), sans-serif",
  inter: "var(--font-inter), sans-serif",
  serif: "var(--font-lora), serif",
  system: "system-ui, sans-serif",
};

const group = "rounded-2xl bg-slate-50 divide-y divide-slate-200/70";
const row = "flex items-center justify-between gap-4 px-4 py-3.5";

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-6 px-1 text-sm font-medium text-slate-500 first:mt-0">{children}</h3>;
}

/** Hộp Cài đặt dạng modal bo tròn: menu trái, nội dung phải, Đăng xuất ở góc dưới trái. */
export function SettingsDialog({
  open,
  onClose,
  onLogout,
  userName,
  subtitle,
  roleLabel,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  userName: string;
  subtitle: string;
  roleLabel: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [section, setSection] = useState<Section>("general");

  // <dialog> native: tự có focus trap, phím Esc và lớp nền mờ
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.focus(); // tránh viền focus lệch trên mục đầu tiên
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Cài đặt"
      onClose={onClose}
      tabIndex={-1}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto h-[min(40rem,88dvh)] w-[min(56rem,94vw)] overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl focus:outline-none backdrop:bg-black/50 backdrop:backdrop-blur-[2px] open:flex open:flex-col md:open:flex-row"
    >
      {open && (
        <>
          <aside className="flex shrink-0 flex-col gap-3 border-b border-slate-200/70 bg-white p-3 md:w-60 md:border-r md:border-b-0 md:p-4">
            <h2 className="px-2 pt-1 text-lg font-semibold tracking-tight">Cài đặt</h2>
            <nav aria-label="Mục cài đặt" className="flex gap-1 md:flex-col">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  aria-current={section === id ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                    section === id ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <Icon className="size-4 text-slate-500" aria-hidden />
                  {label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 max-md:hidden md:mt-auto"
            >
              <LogOut className="size-4 text-slate-500" aria-hidden />
              Đăng xuất
            </button>
          </aside>

          <div className="relative flex min-h-0 flex-1 flex-col">
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cài đặt"
              className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
            >
              <X className="size-4" aria-hidden />
            </button>
            <div className="scroll-thin flex-1 overflow-y-auto p-5 pt-6 md:p-6">
              {section === "general" ? (
                <GeneralSection userName={userName} subtitle={subtitle} roleLabel={roleLabel} />
              ) : (
                <AppearanceSection />
              )}
              <button
                type="button"
                onClick={onLogout}
                className="mt-8 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 md:hidden"
              >
                <LogOut className="size-4" aria-hidden />
                Đăng xuất
              </button>
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}

function GeneralSection({ userName, subtitle, roleLabel }: { userName: string; subtitle: string; roleLabel: string }) {
  return (
    <div>
      <GroupTitle>Tài khoản</GroupTitle>
      <div className={group}>
        <div className="flex items-center gap-3.5 px-4 py-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-200 text-base font-medium text-slate-700">
            {userName.trim().split(" ").pop()?.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{userName}</p>
            <p className="truncate text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className={row}>
          <span className="text-sm">Vai trò</span>
          <span className="text-sm text-slate-500">{roleLabel}</span>
        </div>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; icon?: typeof Sun }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-slate-100 p-1">
      {options.map(({ id, label: optionLabel, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          aria-label={optionLabel}
          title={optionLabel}
          onClick={() => onChange(id)}
          className={cn(
            "grid h-8 place-items-center rounded-full text-sm transition-colors",
            Icon ? "w-10" : "px-3.5",
            value === id ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
          )}
        >
          {Icon ? <Icon className="size-4" aria-hidden /> : optionLabel}
        </button>
      ))}
    </div>
  );
}

function AppearanceSection() {
  const { appearance, update } = useAppearance();
  const isDefault = JSON.stringify(appearance) === JSON.stringify(DEFAULT_APPEARANCE);

  return (
    <div>
      <GroupTitle>Giao diện</GroupTitle>
      <div className={group}>
        <div className={row}>
          <span className="text-sm">Chế độ</span>
          <Segmented label="Chế độ" value={appearance.mode} onChange={(mode) => update({ mode })} options={MODE_OPTIONS} />
        </div>
        <div className={row}>
          <span className="text-sm">Màu chủ đề</span>
          <div role="radiogroup" aria-label="Màu chủ đề" className="flex flex-wrap justify-end gap-2">
            {ACCENTS.map(({ id, label, swatch }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={appearance.accent === id}
                aria-label={label}
                title={label}
                onClick={() => update({ accent: id })}
                style={{ backgroundColor: swatch }}
                className={cn(
                  "grid size-7 place-items-center rounded-full border border-slate-300 text-white ring-offset-2 ring-offset-slate-50 transition-shadow",
                  appearance.accent === id ? "ring-2 ring-slate-400" : "hover:ring-2 hover:ring-slate-300",
                )}
              >
                {appearance.accent === id && <Check className="size-3.5" aria-hidden />}
              </button>
            ))}
          </div>
        </div>
        <div className={row}>
          <span className="text-sm">Cỡ chữ</span>
          <Segmented label="Cỡ chữ" value={appearance.size} onChange={(size) => update({ size })} options={[...SIZES]} />
        </div>
      </div>

      <GroupTitle>Phông chữ</GroupTitle>
      <div role="radiogroup" aria-label="Phông chữ" className="grid gap-2 sm:grid-cols-2">
        {FONTS.map(({ id, label, hint }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={appearance.font === id}
            onClick={() => update({ font: id })}
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
              appearance.font === id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50",
            )}
          >
            <span className="text-2xl leading-none" style={{ fontFamily: FONT_PREVIEW[id] }} aria-hidden>
              Aa
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{label}</span>
              <span className="block truncate text-xs text-slate-500">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={isDefault}
          onClick={() => update(DEFAULT_APPEARANCE)}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40"
        >
          Đặt lại mặc định
        </button>
      </div>
    </div>
  );
}
