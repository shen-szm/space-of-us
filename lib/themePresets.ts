export const themePresetIds = [
  "cream-blush", "peach-sky", "mint-cherry", "butter-garden",
  "rose-clay", "oat-linen", "mauve-milk", "sage-hearth",
] as const;

export type ThemePresetId = (typeof themePresetIds)[number];
export type ThemeColors = { background: string; foreground: string; card: string; soft: string; borderSoft: string; borderStrong: string; primary: string; secondary: string; highlight: string; wash: string; };
export type ThemePreset = { id: ThemePresetId; label: string; description: string; colors: ThemeColors; };
export const defaultThemePreset: ThemePresetId = "cream-blush";

export const themePresetList: ThemePreset[] = [
  { id: "cream-blush", label: "奶油粉雾", description: "奶白、豆沙和暖灰的低饱和组合，整体最柔和。", colors: { background: "#F5F0EA", foreground: "#5F6670", card: "#FFF9F5", soft: "#F3EDE8", borderSoft: "#D6CCC4", borderStrong: "#C6BAB1", primary: "#BF7B7B", secondary: "#9EB0BC", highlight: "#E6D5D1", wash: "#F4E7E4" } },
  { id: "peach-sky", label: "蜜桃晴空", description: "浅蜜桃、雾蓝和米杏搭配，明亮但不过分跳脱。", colors: { background: "#F7EFE8", foreground: "#5C6672", card: "#FFF9F4", soft: "#F5EBE4", borderSoft: "#DDCDC2", borderStrong: "#CEBEB4", primary: "#C98C84", secondary: "#A5B7C6", highlight: "#EAD6CB", wash: "#F5E8E1" } },
  { id: "mint-cherry", label: "薄荷樱桃", description: "灰绿和淡樱粉更安静，适合想要清新感的页面。", colors: { background: "#EEF2EE", foreground: "#596660", card: "#FAFCFA", soft: "#E8EEE9", borderSoft: "#C4CFC7", borderStrong: "#B5C1B9", primary: "#B9808F", secondary: "#9DB8AE", highlight: "#DFD0D7", wash: "#F0E7EB" } },
  { id: "butter-garden", label: "黄油花园", description: "黄油米、鼠尾草和浅藕灰更治愈，整体更温暖。", colors: { background: "#F4EFE6", foreground: "#666358", card: "#FFFBF5", soft: "#F0EADF", borderSoft: "#D4CDBB", borderStrong: "#C4BCAA", primary: "#B88F73", secondary: "#A9B59B", highlight: "#E6DBC8", wash: "#F3EBDD" } },
  { id: "rose-clay", label: "玫瑰陶土", description: "灰玫瑰与陶土暖棕，沉静中保留柔软的亲密感。", colors: { background: "#F1E9E7", foreground: "#655C61", card: "#FCF8F6", soft: "#EDE3E1", borderSoft: "#D3C4C1", borderStrong: "#BEADAA", primary: "#A87878", secondary: "#9B9298", highlight: "#DFC9C6", wash: "#F0DEDB" } },
  { id: "oat-linen", label: "燕麦亚麻", description: "燕麦、亚麻与柔和苔绿，像自然光下的温暖居所。", colors: { background: "#F0EBE2", foreground: "#625F57", card: "#FCFAF6", soft: "#EBE5DA", borderSoft: "#D2C9BA", borderStrong: "#BEB3A3", primary: "#A38268", secondary: "#9A9B87", highlight: "#DED3C2", wash: "#EEE6D9" } },
  { id: "mauve-milk", label: "雾紫奶茶", description: "奶茶底色加入灰紫，柔和安静，不显甜腻。", colors: { background: "#EEE9ED", foreground: "#625D65", card: "#FBF8FA", soft: "#E9E2E7", borderSoft: "#CEC4CC", borderStrong: "#B9ACB6", primary: "#987C91", secondary: "#A49AA6", highlight: "#D8CBD4", wash: "#ECE1E8" } },
  { id: "sage-hearth", label: "鼠尾暖居", description: "鼠尾草绿与暖灰褐，克制、耐看，也更有生活气息。", colors: { background: "#E9ECE6", foreground: "#596158", card: "#F8FAF6", soft: "#E3E8E0", borderSoft: "#C5CEC1", borderStrong: "#AFBAAB", primary: "#82917E", secondary: "#A49284", highlight: "#CFD7CB", wash: "#E2E9DE" } },
];

export const themePresets: Record<ThemePresetId, ThemePreset> = Object.fromEntries(themePresetList.map((preset) => [preset.id, preset])) as Record<ThemePresetId, ThemePreset>;
export const isThemePresetId = (value: unknown): value is ThemePresetId => typeof value === "string" && themePresetIds.includes(value as ThemePresetId);
