import type { ThemePresetId } from "@/lib/themePresets";
import {
  buildCustomThemePreset,
  customThemePresetId,
  themePresetList,
  themePresets,
} from "@/lib/themePresets";

type ThemePresetSectionProps = {
  customThemeColor: string;
  themePreset: ThemePresetId;
  themeStatus: string;
  onPreviewCustomThemeColor: (nextColor: string) => void;
  onSaveCustomThemeColor: () => void;
  onSelectThemePreset: (presetId: ThemePresetId) => void;
};

const buildPaletteGradient = (palette: { color: string }[]) => {
  const stops = [0, 34, 68, 100];
  return `linear-gradient(90deg, ${palette.map((item, index) => `${item.color} ${stops[index]}%`).join(", ")})`;
};

export default function ThemePresetSection({
  customThemeColor,
  themePreset,
  themeStatus,
  onPreviewCustomThemeColor,
  onSaveCustomThemeColor,
  onSelectThemePreset,
}: Readonly<ThemePresetSectionProps>) {
  const customThemePreview = buildCustomThemePreset(customThemeColor);
  const currentThemeLabel = themePreset === customThemePresetId ? customThemePreview.label : themePresets[themePreset].label;

  return (
    <div className="theme-card theme-floating-shadow p-5">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 rounded-full bg-[var(--accent-primary)]/15" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-[#5A6670]">个人主题预设</p>
          <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">
            预设改为更淡的单色阶，也可以用色盘选一个主色，系统自动生成温和过渡。
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[10px] border border-[color-mix(in_srgb,var(--border-soft)_82%,white)] bg-[color-mix(in_srgb,var(--surface-card-strong)_76%,white)] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#344451]">自定义配色</p>
            <p className="mt-1 text-xs leading-5 text-[#5A6670]/62">选择一个喜欢的颜色，页面会自动变成更淡、更统一的同色系。</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label className="relative flex h-11 w-16 cursor-pointer overflow-hidden rounded-[10px] border border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface-card-strong)_82%,white)] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]">
              <span className="sr-only">选择自定义主题主色</span>
              <input
                aria-label="选择自定义主题主色"
                className="h-full w-full cursor-pointer rounded-[7px] border-0 bg-transparent p-0"
                type="color"
                value={customThemeColor}
                onChange={(event) => onPreviewCustomThemeColor(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-[9px] bg-[var(--hero-ink)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary)]"
              onClick={onSaveCustomThemeColor}
            >
              保存自定义
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-[10px] border border-[color-mix(in_srgb,var(--border-soft)_76%,white)] bg-[color-mix(in_srgb,var(--surface-card)_74%,white)] p-3">
          <div
            className="h-10 rounded-[8px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.48)]"
            style={{ backgroundImage: buildPaletteGradient(customThemePreview.palette) }}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {customThemePreview.palette.map((item) => (
              <span
                className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--border-soft)_72%,white)] bg-white/60 px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]"
                key={item.label}
              >
                <span className="h-2.5 w-2.5 rounded-full border border-white/80" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {themePresetList.map((preset) => {
          const active = themePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectThemePreset(preset.id)}
              className={`rounded-[10px] border p-4 text-left transition ${
                active
                  ? "border-[color-mix(in_srgb,var(--accent-primary)_28%,var(--border-strong))] bg-[color-mix(in_srgb,var(--surface-card-strong)_90%,white)] shadow-[0_8px_18px_rgba(124,110,100,0.07)]"
                  : "border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface-card)_78%,white)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent-primary)_18%,var(--border-strong))]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#344451]">{preset.label}</p>
                  <p className="mt-2 min-h-10 text-xs leading-5 text-[#5A6670]/64">{preset.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    active ? "bg-[var(--accent-wash)] text-[var(--accent-primary)]" : "theme-muted theme-text-soft"
                  }`}
                >
                  {active ? "使用中" : "切换"}
                </span>
              </div>

              <div className="mt-4 rounded-[10px] border border-[color-mix(in_srgb,var(--border-soft)_76%,white)] bg-[color-mix(in_srgb,var(--surface-card)_70%,white)] p-3">
                <div
                  className="h-9 rounded-[8px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.48)]"
                  style={{ backgroundImage: buildPaletteGradient(preset.palette) }}
                />
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {preset.palette.map((item) => (
                    <span
                      className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--border-soft)_72%,white)] bg-white/60 px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]"
                      key={item.label}
                    >
                      <span className="h-2.5 w-2.5 rounded-full border border-white/80" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="theme-soft theme-text-muted mt-4 rounded-[8px] border px-4 py-3 text-sm">
        {themeStatus || `当前主题：${currentThemeLabel}`}
      </div>
    </div>
  );
}
