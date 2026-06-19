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
    background: mixHex(primary, "#FCFAF8", 0.045),
    foreground: mixHex(primary, "#38424A", 0.11),
    card: mixHex(primary, "#FFFFFF", 0.02),
    soft: mixHex(primary, "#F8F4EF", 0.075),
    borderSoft: mixHex(primary, "#E7DED6", 0.14),
    borderStrong: mixHex(primary, "#D6C8BE", 0.21),
    primary,
    secondary: mixHex(primary, "#F4EEE8", 0.22),
    highlight: mixHex(primary, "#FFFFFF", 0.14),
    wash: mixHex(primary, "#FFFFFF", 0.07),
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
    description: "用你选中的主色生成一套柔和、统一的莫兰迪色阶。",
    colors,
    palette: buildPalette(colors),
  };
};

export const themePresetList: ThemePreset[] = [
  buildStaticPreset({
    id: "cream-blush",
    label: "奶油微醺",
    description: "轻雾奶油底色配合微醺豆沙，适合温柔、安静的页面氛围。",
    color: "#C8A7A1",
  }),
  buildStaticPreset({
    id: "peach-sky",
    label: "蜜桃天光",
    description: "桃杏色主调更明亮，适合带一点晴天感的轻盈界面。",
    color: "#CCB09A",
  }),
  buildStaticPreset({
    id: "mint-cherry",
    label: "薄荷樱雾",
    description: "偏冷的薄荷灰绿带一点樱粉，适合更清爽的情侣空间。",
    color: "#AAB5A8",
  }),
  buildStaticPreset({
    id: "butter-garden",
    label: "黄油花园",
    description: "柔黄和灰橄榄更偏生活感，适合照片和日常记录较多的页面。",
    color: "#C7B79F",
  }),
  buildStaticPreset({
    id: "rose-clay",
    label: "玫瑰陶土",
    description: "更有存在感的玫瑰陶粉，适合强调纪念感和陪伴感。",
    color: "#C09A94",
  }),
  buildStaticPreset({
    id: "oat-linen",
    label: "燕麦亚麻",
    description: "中性燕麦色更克制，适合把内容和照片放在第一位。",
    color: "#B7A896",
  }),
  buildStaticPreset({
    id: "mauve-milk",
    label: "雾紫奶霜",
    description: "带一点雾紫的奶灰调，适合更安静、偏夜晚感的主题。",
    color: "#B29FA8",
  }),
  buildStaticPreset({
    id: "sage-hearth",
    label: "鼠尾草壁炉",
    description: "沉静的鼠尾草灰绿更耐看，适合长期使用的常驻主题。",
    color: "#A1AB9C",
  }),
];

export const themePresets: Record<ThemePresetId, ThemePreset> = {
  ...Object.fromEntries(themePresetList.map((preset) => [preset.id, preset])),
  [customThemePresetId]: buildCustomThemePreset(defaultCustomThemeColor),
} as Record<ThemePresetId, ThemePreset>;

export const isThemePresetId = (value: unknown): value is ThemePresetId =>
  typeof value === "string" && themePresetIds.includes(value as ThemePresetId);
