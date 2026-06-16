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
    description: "柔和奶油白配浅粉雾面，延续当前站点的温柔基调。",
    colors: {
      shell: "#F9F6EC",
      card: "#FFF8F3",
      primary: "#D86F82",
      secondary: "#A8C8DC",
    },
  },
  {
    id: "peach-sky",
    label: "蜜桃晴空",
    description: "蜜桃暖调和晴空蓝，整体更轻快明亮。",
    colors: {
      shell: "#FFF4EE",
      card: "#FFF8F2",
      primary: "#F08B73",
      secondary: "#8EC5E8",
    },
  },
  {
    id: "mint-cherry",
    label: "薄荷樱桃",
    description: "薄荷绿和樱桃粉对比更鲜明，适合活泼页面。",
    colors: {
      shell: "#F4FBF7",
      card: "#FCFFFD",
      primary: "#D9658A",
      secondary: "#8CCDB7",
    },
  },
  {
    id: "butter-garden",
    label: "黄油花园",
    description: "黄油奶白、花园绿和一点暖粉，偏温柔治愈。",
    colors: {
      shell: "#FCF6E8",
      card: "#FFFBEF",
      primary: "#C98762",
      secondary: "#A9BF75",
    },
  },
];

export const themePresets: Record<ThemePresetId, ThemePreset> = Object.fromEntries(
  themePresetList.map((preset) => [preset.id, preset]),
) as Record<ThemePresetId, ThemePreset>;

export const isThemePresetId = (value: unknown): value is ThemePresetId =>
  typeof value === "string" && themePresetIds.includes(value as ThemePresetId);
