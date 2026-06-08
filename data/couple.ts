export type PartnerRole = "a" | "b";

export type CoupleProfile = {
  id: string;
  inviteCodeHash?: string;
  inviteCodePreview?: string;
  inviteCreatedAt?: string;
  boundAt?: string;
  partners: Partial<Record<PartnerRole, PartnerProfile>>;
};

export type PartnerProfile = {
  name: string;
  avatar?: string;
  joinedAt: string;
};

export type AgreementCategory = "food" | "play" | "travel" | "anniversary" | "promise";
export type AgreementStatus = "wish" | "planned" | "doing" | "done" | "archived";

export type CoupleAgreement = {
  id: string;
  title: string;
  category: AgreementCategory;
  status: AgreementStatus;
  date?: string;
  location?: string;
  note?: string;
  createdBy: PartnerRole;
  createdAt: string;
  updatedAt: string;
};

export type MenuCategory = "milkTea" | "food" | "dessert" | "snack" | "other";

export type CoupleMenuItem = {
  id: string;
  brand: string;
  name: string;
  category: MenuCategory;
  preference?: string;
  note?: string;
  favoriteFor?: PartnerRole | "both";
  createdAt: string;
  updatedAt: string;
};

export type OrderStatus = "pending" | "seen" | "preparing" | "completed" | "cancelled";

export type CoupleOrder = {
  id: string;
  itemId?: string;
  title: string;
  brand?: string;
  details?: string;
  note?: string;
  from: PartnerRole;
  to: PartnerRole;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type CoupleHubStore = {
  profile: CoupleProfile;
  agreements: CoupleAgreement[];
  menu: CoupleMenuItem[];
  orders: CoupleOrder[];
};

export const defaultCoupleStore = (): CoupleHubStore => ({
  profile: {
    id: "our-couple",
    partners: {},
  },
  agreements: [],
  menu: [],
  orders: [],
});

export const partnerLabels: Record<PartnerRole, string> = {
  a: "我",
  b: "TA",
};

export const agreementCategoryLabels: Record<AgreementCategory, string> = {
  food: "想吃",
  play: "想玩",
  travel: "旅行",
  anniversary: "纪念日",
  promise: "长期约定",
};

export const agreementStatusLabels: Record<AgreementStatus, string> = {
  wish: "想去",
  planned: "已约定",
  doing: "进行中",
  done: "已完成",
  archived: "已归档",
};

export const menuCategoryLabels: Record<MenuCategory, string> = {
  milkTea: "奶茶",
  food: "美食",
  dessert: "甜品",
  snack: "小吃",
  other: "其他",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "待接收",
  seen: "已看到",
  preparing: "准备中",
  completed: "已完成",
  cancelled: "已取消",
};
