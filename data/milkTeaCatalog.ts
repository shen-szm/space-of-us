import type { MenuCategory } from "@/data/couple";

export type MilkTeaProduct = {
  brand: string;
  name: string;
  category: MenuCategory;
  tags: string[];
  intro: string;
  preference: string;
  color: string;
};

export const milkTeaCatalog: MilkTeaProduct[] = [
  {
    brand: "霸王茶姬",
    name: "伯牙绝弦",
    category: "milkTea",
    tags: ["原叶茶", "茉莉", "清爽"],
    intro: "经典茉莉鲜奶茶，茶感干净，适合想喝清爽一点的时候。",
    preference: "少冰 / 三分糖 / 想更轻一点可以备注少奶",
    color: "#D6E8F0",
  },
  {
    brand: "霸王茶姬",
    name: "万里木兰",
    category: "milkTea",
    tags: ["乌龙", "鲜奶茶", "茶感"],
    intro: "乌龙香更明显，口味比甜奶茶更稳一点。",
    preference: "少冰 / 五分糖 / 想要茶味更重可备注加浓",
    color: "#D4E8D0",
  },
  {
    brand: "喜茶",
    name: "多肉葡萄",
    category: "milkTea",
    tags: ["水果茶", "葡萄", "人气"],
    intro: "葡萄果肉和茶底很适合做惊喜小订单。",
    preference: "少冰 / 少糖 / 保留果肉",
    color: "#D9C8F0",
  },
  {
    brand: "喜茶",
    name: "芝芝莓莓",
    category: "dessert",
    tags: ["草莓", "芝士", "甜一点"],
    intro: "果香和奶盖都更明显，拍照也很好看。",
    preference: "少冰 / 少糖 / 奶盖分装",
    color: "#F5DCE0",
  },
  {
    brand: "奈雪的茶",
    name: "霸气橙子",
    category: "milkTea",
    tags: ["水果茶", "橙子", "清爽"],
    intro: "更适合天气热、或者不太想喝奶茶的时候。",
    preference: "少冰 / 少糖 / 保留果肉",
    color: "#F6D9B8",
  },
  {
    brand: "茶百道",
    name: "杨枝甘露",
    category: "dessert",
    tags: ["芒果", "西柚", "甜品感"],
    intro: "更像一杯可以喝的甜品，适合当约会后的加餐。",
    preference: "少冰 / 少糖 / 加小料",
    color: "#F5E1A8",
  },
  {
    brand: "蜜雪冰城",
    name: "柠檬水",
    category: "milkTea",
    tags: ["平价", "清爽", "随手买"],
    intro: "适合路过顺手带一杯，也适合作为小惊喜。",
    preference: "正常冰 / 少糖 / 多柠檬",
    color: "#F2E8A8",
  },
  {
    brand: "瑞幸咖啡",
    name: "生椰拿铁",
    category: "other",
    tags: ["咖啡", "生椰", "上班日"],
    intro: "适合工作日互相投喂，味道接受度比较高。",
    preference: "少冰 / 半糖 / 加厚奶",
    color: "#D8C7B8",
  },
  {
    brand: "海底捞",
    name: "番茄锅双人餐",
    category: "food",
    tags: ["火锅", "约会", "晚餐"],
    intro: "适合认真吃一顿的正式约会，也适合纪念日前后安排。",
    preference: "番茄锅 / 多点肥牛 / 预留胃口吃甜品",
    color: "#F5C7B8",
  },
  {
    brand: "太二酸菜鱼",
    name: "老坛子酸菜鱼",
    category: "food",
    tags: ["酸菜鱼", "下饭", "聚餐"],
    intro: "开胃又热乎，适合不知道吃什么但又想吃顿像样的。",
    preference: "微辣 / 加粉 / 两碗米饭",
    color: "#E8E1B8",
  },
  {
    brand: "肯德基",
    name: "蛋挞",
    category: "dessert",
    tags: ["甜点", "顺手买", "小惊喜"],
    intro: "适合见面路上顺手带，轻轻松松就有被记得的感觉。",
    preference: "热的 / 原味 / 到手就吃",
    color: "#F0C2B8",
  },
  {
    brand: "麦当劳",
    name: "麦辣鸡翅",
    category: "snack",
    tags: ["小吃", "夜宵", "炸物"],
    intro: "适合晚一点一起追剧或聊天的时候来一份。",
    preference: "趁热 / 配可乐 / 可以加薯条",
    color: "#F4D28E",
  },
  {
    brand: "鲍师傅",
    name: "肉松小贝",
    category: "snack",
    tags: ["糕点", "分享", "加餐"],
    intro: "很适合做见面时的小礼物，不夸张，但很有心意。",
    preference: "原味 / 当天吃 / 小份也够开心",
    color: "#EFD6A8",
  },
  {
    brand: "绝味鸭脖",
    name: "鸭脖拼盘",
    category: "snack",
    tags: ["卤味", "夜宵", "追剧"],
    intro: "更适合两个人窝着聊天看剧的时候慢慢吃。",
    preference: "微辣 / 多拿手套 / 配冰饮",
    color: "#D9B1A8",
  },
  {
    brand: "本地小吃",
    name: "烤冷面",
    category: "snack",
    tags: ["街边", "热乎", "分享"],
    intro: "不一定非得是品牌，街边小吃也可以变成固定菜单。",
    preference: "加蛋 / 加肠 / 少洋葱",
    color: "#F3D6A4",
  },
  {
    brand: "本地小吃",
    name: "章鱼小丸子",
    category: "snack",
    tags: ["逛街", "小吃", "分着吃"],
    intro: "适合逛街时边走边吃，一人一半刚刚好。",
    preference: "多木鱼花 / 少酱 / 趁热",
    color: "#E9C7B4",
  },
  {
    brand: "本地小吃",
    name: "糖炒栗子",
    category: "snack",
    tags: ["秋冬", "热乎", "小惊喜"],
    intro: "天气冷的时候很适合放进订单里，像一份会冒热气的小关心。",
    preference: "热的 / 小份 / 好剥一点",
    color: "#D8B08A",
  },
];

export const agreementPresets = [
  {
    title: "周末去吃一顿想了很久的店",
    category: "food",
    note: "提前收好店名，到那天谁先闲下来谁负责提醒。",
  },
  {
    title: "一起去看一场电影",
    category: "play",
    note: "挑一个舒服的场次，散场以后顺路买奶茶。",
  },
  {
    title: "计划一次两天一夜的小旅行",
    category: "travel",
    note: "先定城市，再慢慢补路线、酒店和想拍的照片。",
  },
  {
    title: "纪念日吃一顿正式晚餐",
    category: "anniversary",
    note: "不用太贵，但可以认真一点，留一点仪式感。",
  },
  {
    title: "吵架后当天把话说清楚",
    category: "promise",
    note: "先抱一下，再说问题，不冷战过夜。",
  },
] as const;
