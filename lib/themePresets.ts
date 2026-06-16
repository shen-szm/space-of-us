export const themePresetIds = ["cream-blush", "peach-sky", "mint-cherry", "butter-garden"] as const;

export type ThemePresetId = (typeof themePresetIds)[number];

export type ThemePreset = {
  id: ThemePresetId;
  label: string;
  description: string;
  colors: {
    shell: string;
    card: string;
    primary: string;
    secondary: string;
  };
};

export const defaultThemePreset: ThemePresetId = "cream-blush";

export const themePresetList: ThemePreset[] = [
  {
    id: "cream-blush",
    label: "奶油粉雾",
    description: "奶白、豆沙和暖灰的低饱和组合，整体最柔和。",
    colors: {
      shell: "#F5F0EA",
      card: "#FFF9F5",
      primary: "#BF7B7B",
      secondary: "#9EB0BC",
    },
  },
  {
    id: "peach-sky",
    label: "蜜桃晴空",
    description: "浅蜜桃、雾蓝和米杏搭配，明亮但不过分跳。",
    colors: {
      shell: "#F7EFE8",
      card: "#FFF9F4",
      primary: "#C98C84",
      secondary: "#A5B7C6",
    },
  },
  {
    id: "mint-cherry",
    label: "薄荷樱桃",
    description: "灰绿和淡樱粉更安静，适合想要清新感的页面。",
    colors: {
      shell: "#EEF2EE",
      card: "#FAFCFA",
      primary: "#B9808F",
      secondary: "#9DB8AE",
    },
  },
  {
    id: "butter-garden",
    label: "黄油花园",
    description: "黄油米、鼠尾草和浅藕灰更治愈，整体更温暖。",
    colors: {
      shell: "#F4EFE6",
      card: "#FFFBF5",
      primary: "#B88F73",
      secondary: "#A9B59B",
    },
  },
];

export const themePresets: Record<ThemePresetId, ThemePreset> = Object.fromEntries(
  themePresetList.map((preset) => [preset.id, preset]),
) as Record<ThemePresetId, ThemePreset>;

export const isThemePresetId = (value: unknown): value is ThemePresetId =>
  typeof value === "string" && themePresetIds.includes(value as ThemePresetId);
