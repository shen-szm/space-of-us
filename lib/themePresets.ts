export const customThemePresetId = "custom-morandi" as const;

export const staticThemePresetIds = [
  "cream-blush",
  "peach-sky",
  "mint-cherry",
  "butter-garden",
  "rose-clay",
  "oat-linen",
  "mauve-milk",
  "sage-hearth",
] as const;

export const themePresetIds = [...staticThemePresetIds, customThemePresetId] as const;

export type StaticThemePresetId = (typeof staticThemePresetIds)[number];
export type ThemePresetId = (typeof themePresetIds)[number];
export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  soft: string;
  borderSoft: string;
  borderStrong: string;
  primary: string;
  secondary: string;
  highlight: string;
  wash: string;
};
export type ThemePaletteRole = "页面背景" | "卡片" | "主色" | "辅色";
export type ThemePaletteItem = { label: ThemePaletteRole; color: string };
export type ThemePreset = {
  id: ThemePresetId;
  label: string;
  description: string;
  colors: ThemeColors;
  palette: ThemePaletteItem[];
};

export const defaultThemePreset: StaticThemePresetId = "cream-blush";
export const defaultCustomThemeColor = "#C7A49D";

const paletteLabels: ThemePaletteRole[] = ["页面背景", "卡片", "主色", "辅色"];

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const parseHexColor = (value: string): [number, number, number] | null => {
  const clean = value.trim().replace(/^#/, "");
  const expanded = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  return [0, 2, 4].map((index) => Number.parseInt(expanded.slice(index, index + 2), 16)) as [number, number, number];
};

const toHex = ([red, green, blue]: [number, number, number]) =>
  "#" + [red, green, blue].map((value) => clampChannel(value).toString(16).padStart(2, "0")).join("").toUpperCase();

const mixHex = (base: string, target: string, baseWeight: number) => {
  const baseRgb = parseHexColor(base) ?? parseHexColor(defaultCustomThemeColor)!;
  const targetRgb = parseHexColor(target) ?? [255, 255, 255];
  const targetWeight = 1 - baseWeight;
  return toHex([
    baseRgb[0] * baseWeight + targetRgb[0] * targetWeight,
    baseRgb[1] * baseWeight + targetRgb[1] * targetWeight,
    baseRgb[2] * baseWeight + targetRgb[2] * targetWeight,
  ] as [number, number, number]);
};

export const normalizeCustomThemeColor = (value: unknown) => {
  if (typeof value !== "string") return defaultCustomThemeColor;
  const rgb = parseHexColor(value);
  return rgb ? toHex(rgb) : defaultCustomThemeColor;
};

const buildPalette = (colors: ThemeColors): ThemePaletteItem[] => [
  { label: paletteLabels[0], color: colors.background },
  { label: paletteLabels[1], color: colors.card },
  { label: paletteLabels[2], color: colors.primary },
  { label: paletteLabels[3], color: colors.secondary },
];

export const deriveMonoThemeColors = (baseColor: string): ThemeColors => {
  const primary = normalizeCustomThemeColor(baseColor);
  return {
    background: mixHex(primary, "#FBFAF7", 0.1),
    foreground: mixHex(primary, "#32373A", 0.16),
    card: mixHex(primary, "#FFFFFF", 0.045),
    soft: mixHex(primary, "#F8F5F0", 0.16),
    borderSoft: mixHex(primary, "#EEE8DF", 0.24),
    borderStrong: mixHex(primary, "#D8CEC3", 0.34),
    primary,
    secondary: mixHex(primary, "#F3EEE7", 0.52),
    highlight: mixHex(primary, "#FFFFFF", 0.3),
    wash: mixHex(primary, "#FFFFFF", 0.14),
  };
};

const buildStaticPreset = ({
  id,
  label,
  description,
  color,
}: {
  id: StaticThemePresetId;
  label: string;
  description: string;
  color: string;
}): ThemePreset => {
  const colors = deriveMonoThemeColors(color);
  return { id, label, description, colors, palette: buildPalette(colors) };
};

export const buildCustomThemePreset = (color: unknown): ThemePreset => {
  const colors = deriveMonoThemeColors(normalizeCustomThemeColor(color));
  return {
    id: customThemePresetId,
    label: "自定义配色",
    description: "选一个主色，系统自动生成更淡的同色阶页面。",
    colors,
    palette: buildPalette(colors),
  };
};

export const themePresetList: ThemePreset[] = [
  buildStaticPreset({
    id: "cream-blush",
    label: "奶油粉雾",
    description: "柔和奶粉色阶，像窗边透进来的淡光。",
    color: "#D4AAA6",
  }),
  buildStaticPreset({
    id: "peach-sky",
    label: "杏桃薄光",
    description: "淡杏色统一铺开，温暖但不发闷。",
    color: "#D7B196",
  }),
  buildStaticPreset({
    id: "mint-cherry",
    label: "薄荷灰绿",
    description: "浅绿灰色阶，整体清爽、安静。",
    color: "#A8BCAD",
  }),
  buildStaticPreset({
    id: "butter-garden",
    label: "黄油燕麦",
    description: "麦色和奶油感更自然，像暖桌布。",
    color: "#CDBB8F",
  }),
  buildStaticPreset({
    id: "rose-clay",
    label: "玫瑰陶土",
    description: "玫瑰灰更轻，保留亲密感，不偏甜。",
    color: "#C99E98",
  }),
  buildStaticPreset({
    id: "oat-linen",
    label: "燕麦亚麻",
    description: "燕麦色的单色过渡，干净、耐看。",
    color: "#BFA989",
  }),
  buildStaticPreset({
    id: "mauve-milk",
    label: "雾紫奶茶",
    description: "灰紫被拉淡后更像奶茶阴影。",
    color: "#B8A2B4",
  }),
  buildStaticPreset({
    id: "sage-hearth",
    label: "鼠尾暖居",
    description: "鼠尾草的淡色阶，温和且不占注意力。",
    color: "#9EAE98",
  }),
];

export const themePresets: Record<ThemePresetId, ThemePreset> = {
  ...Object.fromEntries(themePresetList.map((preset) => [preset.id, preset])),
  [customThemePresetId]: buildCustomThemePreset(defaultCustomThemeColor),
} as Record<ThemePresetId, ThemePreset>;
export const isThemePresetId = (value: unknown): value is ThemePresetId =>
  typeof value === "string" && themePresetIds.includes(value as ThemePresetId);
