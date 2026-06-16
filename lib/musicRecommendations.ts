export type MusicRecommendation = {
  id: string;
  title: string;
  artist: string;
  mood: string;
  note: string;
  href: string;
};

export const musicRecommendations: MusicRecommendation[] = [
  {
    id: "city-pop-rain",
    title: "Mojito",
    artist: "周杰伦",
    mood: "晚风 / 街灯 / 轻甜",
    note: "适合在地图边上慢慢看回忆，节奏轻一点。",
    href: "https://music.163.com/#/song?id=1455701106",
  },
  {
    id: "warm-night-drive",
    title: "爱，很简单",
    artist: "陶喆",
    mood: "温柔 / 老歌 / 放松",
    note: "更像夜里散步回家时，会想单曲循环的那种歌。",
    href: "https://music.163.com/#/song?id=189986",
  },
  {
    id: "peach-sunshine",
    title: "慢慢喜欢你",
    artist: "莫文蔚",
    mood: "约会 / 晴天 / 安静",
    note: "适合把今天的城市记忆，写得再柔和一点。",
    href: "https://music.163.com/#/song?id=569200220",
  },
  {
    id: "mint-breeze",
    title: "告白气球",
    artist: "周杰伦",
    mood: "轻快 / 甜感 / 日常",
    note: "如果想给主页多一点恋爱日常，这首比较合适。",
    href: "https://music.163.com/#/song?id=418603077",
  },
];
