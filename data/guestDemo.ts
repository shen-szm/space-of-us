export const guestDemoLitProvinceIds = [
  "beijing",
  "shanghai",
  "jiangsu",
  "zhejiang",
  "shandong",
  "henan",
  "guangdong",
  "sichuan",
] as const;

export const guestDemoSummary = {
  provinceCount: guestDemoLitProvinceIds.length,
  cityCount: 12,
  description: "一张使用固定样例数据生成的公开地图。",
} as const;
