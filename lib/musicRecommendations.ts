export type MusicRecommendation = {
  id: string;
  title: string;
  artist: string;
  mood: string;
  note: string;
  href: string;
  palette: {
    shell: string;
    glow: string;
    pixel: string;
    accent: string;
    ink: string;
  };
  cover: {
    label: string;
    pattern: "sunset-grid" | "night-window" | "peach-signal" | "mint-lane";
  };
};

export const musicRecommendations: MusicRecommendation[] = [
  {
    id: "city-pop-rain",
    title: "Mojito",
    artist: "\u5468\u6770\u4f26",
    mood: "\u665a\u98ce / \u8857\u706f / \u8f7b\u751c",
    note: "\u9002\u5408\u5728\u5730\u56fe\u8fb9\u4e0a\u6162\u6162\u770b\u56de\u5fc6\uff0c\u8282\u594f\u8f7b\u4e00\u70b9\u3002",
    href: "https://music.163.com/#/song?id=1455701106",
    palette: {
      shell: "#92734B",
      glow: "#F8D37B",
      pixel: "#FFE8A6",
      accent: "#F05E63",
      ink: "#FFF9EC",
    },
    cover: {
      label: "CITY POP",
      pattern: "sunset-grid",
    },
  },
  {
    id: "warm-night-drive",
    title: "\u7231\uff0c\u5f88\u7b80\u5355",
    artist: "\u9676\u5586",
    mood: "\u6e29\u67d4 / \u8001\u6b4c / \u653e\u677e",
    note: "\u66f4\u50cf\u591c\u91cc\u6563\u6b65\u56de\u5bb6\u65f6\uff0c\u4f1a\u60f3\u5355\u66f2\u5faa\u73af\u7684\u90a3\u79cd\u6b4c\u3002",
    href: "https://music.163.com/#/song?id=189986",
    palette: {
      shell: "#7E6359",
      glow: "#F4D3C8",
      pixel: "#FFF5F1",
      accent: "#E58E8B",
      ink: "#FFF8F5",
    },
    cover: {
      label: "NIGHT LOOP",
      pattern: "night-window",
    },
  },
  {
    id: "peach-sunshine",
    title: "\u6162\u6162\u559c\u6b22\u4f60",
    artist: "\u83ab\u6587\u851a",
    mood: "\u7ea6\u4f1a / \u6674\u5929 / \u5b89\u9759",
    note: "\u9002\u5408\u628a\u4eca\u5929\u7684\u57ce\u5e02\u8bb0\u5fc6\uff0c\u5199\u5f97\u518d\u67d4\u548c\u4e00\u70b9\u3002",
    href: "https://music.163.com/#/song?id=569200220",
    palette: {
      shell: "#D28D7B",
      glow: "#F8D5C6",
      pixel: "#FFF1E7",
      accent: "#DB6F82",
      ink: "#FFF8F2",
    },
    cover: {
      label: "SOFT CITY",
      pattern: "peach-signal",
    },
  },
  {
    id: "mint-breeze",
    title: "\u544a\u767d\u6c14\u7403",
    artist: "\u5468\u6770\u4f26",
    mood: "\u8f7b\u5feb / \u751c\u611f / \u65e5\u5e38",
    note: "\u5982\u679c\u60f3\u7ed9\u4e3b\u9875\u591a\u4e00\u70b9\u604b\u7231\u65e5\u5e38\uff0c\u8fd9\u9996\u6bd4\u8f83\u5408\u9002\u3002",
    href: "https://music.163.com/#/song?id=418603077",
    palette: {
      shell: "#70998E",
      glow: "#CBE7D4",
      pixel: "#F3FFF8",
      accent: "#E98E9D",
      ink: "#F7FFFC",
    },
    cover: {
      label: "DAILY GLOW",
      pattern: "mint-lane",
    },
  },
];
