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

export type OrderStatus = "pending" | "accepted" | "completed" | "declined";

export type CoupleOrder = {
  id: string;
  itemId?: string;
  title: string;
  brand?: string;
  details?: string;
  senderNote?: string;
  senderFeedback?: string;
  senderFeedbackAt?: string;
  resolvedAt?: string;
  resolvedBy?: PartnerRole;
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
  a: "\u6211",
  b: "TA",
};

export const agreementCategoryLabels: Record<AgreementCategory, string> = {
  food: "\u60f3\u5403",
  play: "\u60f3\u73a9",
  travel: "\u65c5\u884c",
  anniversary: "\u7eaa\u5ff5\u65e5",
  promise: "\u957f\u671f\u7ea6\u5b9a",
};

export const agreementStatusLabels: Record<AgreementStatus, string> = {
  wish: "\u60f3\u53bb",
  planned: "\u5df2\u8ba1\u5212",
  doing: "\u8fdb\u884c\u4e2d",
  done: "\u5df2\u5b8c\u6210",
  archived: "\u5df2\u5f52\u6863",
};

export const menuCategoryLabels: Record<MenuCategory, string> = {
  milkTea: "\u5976\u8336",
  food: "\u7f8e\u98df",
  dessert: "\u751c\u54c1",
  snack: "\u5c0f\u5403",
  other: "\u5176\u4ed6",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "\u5f85\u63a5\u6536",
  accepted: "\u5f85\u63a8\u8fdb",
  completed: "\u5df2\u5b8c\u6210",
  declined: "\u5df2\u62d2\u7edd",
};
