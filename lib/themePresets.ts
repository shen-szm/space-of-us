export const themePresetIds = [
  "cream-blush",
  "peach-sky",
  "mint-cherry",
  "butter-garden",
  "rose-clay",
  "oat-linen",
  "mauve-milk",
  "sage-hearth",
] as const;

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

export const defaultThemePreset: ThemePresetId = "cream-blush";

const withPalette = (preset: Omit<ThemePreset, "palette">): ThemePreset => ({
  ...preset,
  palette: [
    { label: "页面背景", color: preset.colors.background },
    { label: "卡片", color: preset.colors.card },
    { label: "主色", color: preset.colors.primary },
    { label: "辅色", color: preset.colors.secondary },
  ],
});

export const themePresetList: ThemePreset[] = [
  withPalette({
    id: "cream-blush",
    label: "奶油粉雾",
    description: "奶白、雾粉和豆沙灰铺开，像午后窗帘透进来的柔光。",
    colors: {
      background: "#F4EEE9",
      foreground: "#5D5652",
      card: "#FFFDFC",
      soft: "#EFE7E2",
      borderSoft: "#D7CCC5",
      borderStrong: "#C7B8B0",
      primary: "#B98582",
      secondary: "#C7A49D",
      highlight: "#E7D4CF",
      wash: "#F2E4E1",
    },
  }),
  withPalette({
    id: "peach-sky",
    label: "杏桃晨光",
    description: "杏桃、米橙和浅陶色靠近一组，明亮但不刺眼。",
    colors: {
      background: "#F5EDE4",
      foreground: "#5E5851",
      card: "#FFFDF9",
      soft: "#EFE4DA",
      borderSoft: "#DACBBE",
      borderStrong: "#C9B6A7",
      primary: "#BD8A74",
      secondary: "#D2AE92",
      highlight: "#EBD5C6",
      wash: "#F4E4D7",
    },
  }),
  withPalette({
    id: "mint-cherry",
    label: "薄荷樱桃",
    description: "灰绿底色里只留一点樱桃粉，清新但不跳脱。",
    colors: {
      background: "#EEF1EA",
      foreground: "#565F58",
      card: "#FCFEFA",
      soft: "#E6ECE4",
      borderSoft: "#C8D1C6",
      borderStrong: "#B4C0B4",
      primary: "#A97883",
      secondary: "#8FA696",
      highlight: "#D8C8CC",
      wash: "#EAE3E4",
    },
  }),
  withPalette({
    id: "butter-garden",
    label: "黄油花园",
    description: "黄油米和鼠尾草绿都压低饱和，整体更像暖桌布。",
    colors: {
      background: "#F1ECDD",
      foreground: "#5F5C50",
      card: "#FFFDF4",
      soft: "#EAE2D0",
      borderSoft: "#D3C9B3",
      borderStrong: "#BFB39C",
      primary: "#A68C64",
      secondary: "#9BA382",
      highlight: "#E1D4B9",
      wash: "#EFE5CF",
    },
  }),
  withPalette({
    id: "rose-clay",
    label: "玫瑰陶土",
    description: "玫瑰灰和陶土棕保持同一暖度，亲密但不甜腻。",
    colors: {
      background: "#F0E7E3",
      foreground: "#625855",
      card: "#FFFDFC",
      soft: "#E9DDD8",
      borderSoft: "#D4C2BA",
      borderStrong: "#BFA9A0",
      primary: "#A46F68",
      secondary: "#B98C7B",
      highlight: "#DEC5BD",
      wash: "#EEDBD6",
    },
  }),
  withPalette({
    id: "oat-linen",
    label: "燕麦亚麻",
    description: "燕麦、亚麻和浅榛色叠在一起，像自然光下的餐桌。",
    colors: {
      background: "#F0EADF",
      foreground: "#5D594F",
      card: "#FFFDF8",
      soft: "#E8E0D1",
      borderSoft: "#D1C7B6",
      borderStrong: "#BDAF9B",
      primary: "#9F8262",
      secondary: "#B4A283",
      highlight: "#DED0BA",
      wash: "#EEE2D0",
    },
  }),
  withPalette({
    id: "mauve-milk",
    label: "雾紫奶茶",
    description: "奶茶底里加入灰紫，柔软安静，适合长时间停留。",
    colors: {
      background: "#EFE8EC",
      foreground: "#5D5860",
      card: "#FFFDFE",
      soft: "#E8DEE4",
      borderSoft: "#D0C1CB",
      borderStrong: "#BCAAB7",
      primary: "#92788D",
      secondary: "#B49BA8",
      highlight: "#D8C5D1",
      wash: "#ECE0E7",
    },
  }),
  withPalette({
    id: "sage-hearth",
    label: "鼠尾暖居",
    description: "鼠尾草绿和暖灰褐收在同一层次里，克制、耐看。",
    colors: {
      background: "#E9EDE5",
      foreground: "#555E55",
      card: "#FCFEFA",
      soft: "#E1E8DE",
      borderSoft: "#C4CEBF",
      borderStrong: "#ADB9A8",
      primary: "#7F9078",
      secondary: "#A28E7D",
      highlight: "#CDD8C8",
      wash: "#E3EADD",
    },
  }),
];

export const themePresets: Record<ThemePresetId, ThemePreset> = Object.fromEntries(
  themePresetList.map((preset) => [preset.id, preset]),
) as Record<ThemePresetId, ThemePreset>;
export const isThemePresetId = (value: unknown): value is ThemePresetId =>
  typeof value === "string" && themePresetIds.includes(value as ThemePresetId);
