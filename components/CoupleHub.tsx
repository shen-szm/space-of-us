"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Heart,
  Loader2,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Utensils,
  UsersRound,
  X,
} from "lucide-react";
import {
  agreementCategoryLabels,
  agreementStatusLabels,
  defaultCoupleStore,
  menuCategoryLabels,
  orderStatusLabels,
  partnerLabels,
  type AgreementCategory,
  type AgreementStatus,
  type CoupleHubStore,
  type CoupleMenuItem,
  type MenuCategory,
  type OrderStatus,
  type PartnerRole,
} from "@/data/couple";
import {
  agreementPresets,
  milkTeaCatalog,
  type MilkTeaProduct,
} from "@/data/milkTeaCatalog";
import AccountBindingPanel from "@/components/AccountBindingPanel";
import { MemoryPageShell } from "@/components/MemoryNav";

const roleStorageKey = "mapofus:partner-role";

type ApiResponse = CoupleHubStore & {
  store?: CoupleHubStore;
  role?: PartnerRole;
  inviteCode?: string;
};

const fetchStore = async () => {
  const response = await fetch("/api/couple", { cache: "no-store" });
  if (!response.ok) throw new Error("Load failed");
  return (await response.json()) as CoupleHubStore;
};

const postAction = async (payload: Record<string, unknown>) => {
  const response = await fetch("/api/couple", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("Save failed");
  return (await response.json()) as ApiResponse;
};

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const otherRole = (role: PartnerRole): PartnerRole => (role === "a" ? "b" : "a");

function StatPill({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="rounded-[8px] border border-white/70 bg-white/60 px-4 py-3 shadow-[0_16px_42px_rgba(90,102,112,0.07)] backdrop-blur-xl">
      <p className="text-xs font-semibold text-[#5A6670]/52">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-normal text-[#344451]">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: Readonly<{
  icon: typeof Heart;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/70 bg-white/64 text-[#D86F82] shadow-[0_10px_26px_rgba(216,111,130,0.12)] backdrop-blur-xl">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-[#344451]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ProductArt({ product }: Readonly<{ product: MilkTeaProduct }>) {
  return (
    <div
      className="relative grid aspect-[4/3] min-h-[108px] overflow-hidden rounded-[8px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
      style={{
        background:
          `radial-gradient(circle at 28% 20%, rgba(255,255,255,0.8), transparent 34%), linear-gradient(135deg, ${product.color}, #FAFBF7)`,
      }}
    >
      <div className="absolute left-4 top-4 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#5A6670]/62 backdrop-blur">
        {product.brand}
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <div className="mb-3 h-12 w-12 rounded-full border border-white/80 bg-white/58 shadow-[0_10px_24px_rgba(90,102,112,0.10)] backdrop-blur" />
        <p className="text-lg font-semibold leading-tight text-[#273846]">{product.name}</p>
      </div>
    </div>
  );
}

export default function CoupleHub({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const [store, setStore] = useState<CoupleHubStore>(() => defaultCoupleStore());
  const [role, setRole] = useState<PartnerRole>(() => {
    if (typeof window === "undefined") return "a";
    const storedRole = window.localStorage.getItem(roleStorageKey);
    return storedRole === "a" || storedRole === "b" ? storedRole : "a";
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [myName, setMyName] = useState("我");
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementForm, setAgreementForm] = useState({
    title: "",
    category: "food" as AgreementCategory,
    status: "wish" as AgreementStatus,
    date: "",
    location: "",
    note: "",
  });
  const [menuForm, setMenuForm] = useState({
    brand: "",
    name: "",
    category: "milkTea" as MenuCategory,
    preference: "",
    note: "",
  });
  const [orderNote, setOrderNote] = useState("");

  const refresh = async () => {
    const nextStore = await fetchStore();
    setStore(nextStore);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh()
        .catch(() => setNotice("还没有连接到情侣数据，登录后再试一次。"))
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 12_000);

    return () => window.clearInterval(timer);
  }, []);

  const bound = Boolean(store.profile.partners.a && store.profile.partners.b);
  const pendingForMe = useMemo(
    () => store.orders.filter((order) => order.to === role && order.status !== "completed" && order.status !== "cancelled"),
    [role, store.orders],
  );
  const recentOrders = store.orders.slice(0, 5);
  const visibleAgreements = store.agreements.filter((item) => item.status !== "archived").slice(0, 6);
  const partnerName = store.profile.partners[otherRole(role)]?.name ?? "TA";
  const brandQuery = menuForm.brand.trim().toLowerCase();
  const catalogMatches = useMemo(() => {
    if (!brandQuery) return milkTeaCatalog.slice(0, 4);
    return milkTeaCatalog
      .filter((product) =>
        `${product.brand} ${product.name} ${product.tags.join(" ")}`.toLowerCase().includes(brandQuery),
      )
      .slice(0, 6);
  }, [brandQuery]);

  const run = async (payload: Record<string, unknown>, successText?: string) => {
    setSaving(true);
    setNotice("");

    try {
      const response = await postAction(payload);
      const nextStore = response.store ?? response;
      setStore(nextStore);
      if (response.role) {
        setRole(response.role);
        window.localStorage.setItem(roleStorageKey, response.role);
      }
      if (response.inviteCode) setInviteCode(response.inviteCode);
      if (successText) setNotice(successText);
    } catch {
      setNotice("操作失败，请确认已登录并稍后重试。");
    } finally {
      setSaving(false);
    }
  };

  const fillAgreementPreset = (preset: (typeof agreementPresets)[number]) => {
    setAgreementForm((current) => ({
      ...current,
      title: preset.title,
      category: preset.category as AgreementCategory,
      note: preset.note,
    }));
  };

  const saveAgreement = () => {
    if (!agreementForm.title.trim()) return;

    void run(
      {
        action: "saveAgreement",
        item: {
          ...agreementForm,
          createdBy: role,
        },
      },
      "约定已经保存。",
    );
    setAgreementForm({
      title: "",
      category: "food",
      status: "wish",
      date: "",
      location: "",
      note: "",
    });
    setAgreementOpen(false);
  };

  const fillProduct = (product: MilkTeaProduct) => {
    setMenuForm({
      brand: product.brand,
      name: product.name,
      category: product.category,
      preference: product.preference,
      note: product.intro,
    });
  };

  const saveMenuItem = () => {
    if (!menuForm.brand.trim() || !menuForm.name.trim()) return;

    void run({ action: "saveMenuItem", item: { ...menuForm, favoriteFor: "both" } }, "菜单已经加入。");
    setMenuForm({
      brand: "",
      name: "",
      category: "milkTea",
      preference: "",
      note: "",
    });
  };

  const createOrder = (item: CoupleMenuItem) => {
    void run(
      {
        action: "createOrder",
        from: role,
        itemId: item.id,
        note: orderNote,
      },
      `已经给 ${partnerName} 下单。`,
    );
    setOrderNote("");
  };

  const setOrderStatus = (orderId: string, status: OrderStatus) => {
    void run({ action: "updateOrderStatus", id: orderId, status }, "订单状态已更新。");
  };

  const content = (
      <div className={embedded ? "mx-auto max-w-6xl" : "mx-auto max-w-7xl"}>
        <header className="relative overflow-hidden rounded-[8px] border border-white/70 bg-white/58 p-6 shadow-[0_28px_80px_rgba(90,102,112,0.10)] backdrop-blur-2xl sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(245,220,224,0.58),transparent_28%),radial-gradient(circle_at_92%_20%,rgba(214,232,240,0.72),transparent_32%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/68 px-3 py-1.5 text-xs font-semibold text-[#5A6670]/62 backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-[#D86F82]" />
                情侣生活中控台
              </div>
              <h1 className="mt-5 text-[clamp(36px,6vw,72px)] font-semibold leading-[0.95] tracking-normal text-[#273846]">
                把日常
                <span className="block text-[#D86F82]">变成约定</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#5A6670]/66">
                高级一点，也简单一点。想吃、想玩、旅行、奶茶订单，都在一个干净的情侣空间里完成。
              </p>
            </div>

            <AccountBindingPanel />

            <section className="hidden rounded-[8px] border border-white/72 bg-[#FAFBF7]/76 p-5 shadow-[0_18px_54px_rgba(90,102,112,0.08)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#344451]">{bound ? "已绑定" : "等待绑定"}</p>
                  <p className="mt-1 text-xs leading-5 text-[#5A6670]/56">
                    {bound ? `你和 ${partnerName} 正在共享这份小宇宙。` : "生成邀请码，另一方输入后就能互相下单。"}
                  </p>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#F5DCE0]/70 text-[#D86F82]">
                  <UsersRound className="h-6 w-6" />
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <input
                  className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-white/70 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                  value={myName}
                  onChange={(event) => setMyName(event.target.value)}
                  placeholder="我的昵称"
                />
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-[#273846] px-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(39,56,70,0.16)] transition hover:-translate-y-0.5 disabled:opacity-50"
                  type="button"
                  onClick={() => void run({ action: "createInvite", name: myName }, "邀请码已生成。")}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
                  生成邀请码
                </button>
              </div>

              {inviteCode && (
                <div className="mt-3 rounded-[8px] border border-[#F5DCE0] bg-[#F5DCE0]/42 px-4 py-3 text-sm font-semibold text-[#D86F82]">
                  邀请码：<span className="select-all text-lg">{inviteCode}</span>
                </div>
              )}

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-white/70 px-3 text-sm uppercase outline-none transition focus:border-[#E8B8C2]"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="输入对方邀请码"
                />
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-[#D8DDD8]/88 bg-white/70 px-4 text-sm font-semibold text-[#344451] transition hover:-translate-y-0.5 hover:border-[#E8B8C2] disabled:opacity-50"
                  type="button"
                  onClick={() => void run({ action: "acceptInvite", inviteCode: joinCode, name: myName }, "绑定成功。")}
                  disabled={saving || !joinCode.trim()}
                >
                  绑定
                </button>
              </div>
            </section>
          </div>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <StatPill label="约定" value={store.agreements.length} />
          <StatPill label="菜单" value={store.menu.length} />
          <StatPill label="待我处理" value={pendingForMe.length} />
          <StatPill label="已完成订单" value={store.orders.filter((order) => order.status === "completed").length} />
        </div>

        {notice && (
          <div className="mt-5 rounded-[8px] border border-[#D6E8F0] bg-[#D6E8F0]/45 px-4 py-3 text-sm font-semibold text-[#5A6670]">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-2 text-sm font-semibold text-[#5A6670]/62">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在读取我们的数据
          </div>
        ) : (
          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.92fr]">
            <section className="rounded-[8px] border border-white/70 bg-white/54 p-5 shadow-[0_22px_60px_rgba(90,102,112,0.08)] backdrop-blur-2xl">
              <SectionHeader
                icon={ClipboardList}
                title="我们的约定"
                subtitle="用悬浮窗添加，带分类和预设，不像普通待办那么冷。"
                action={
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] bg-[#D86F82] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(216,111,130,0.18)] transition hover:-translate-y-0.5"
                    type="button"
                    onClick={() => setAgreementOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    新建约定
                  </button>
                }
              />

              <div className="mt-6 grid gap-3">
                {visibleAgreements.map((item) => (
                  <article key={item.id} className="rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/76 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-[#344451]">{item.title}</h3>
                          <span className="rounded-full bg-[#F5DCE0]/62 px-2.5 py-1 text-xs font-semibold text-[#D86F82]">
                            {agreementCategoryLabels[item.category]}
                          </span>
                          <span className="rounded-full bg-[#D6E8F0]/62 px-2.5 py-1 text-xs font-semibold text-[#5A6670]">
                            {agreementStatusLabels[item.status]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#5A6670]/64">
                          {[item.location, item.date, item.note].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-[7px] border border-[#D8DDD8]/80 bg-white/60 px-3 py-2 text-xs font-semibold text-[#5A6670] transition hover:border-[#E8B8C2]"
                          type="button"
                          onClick={() =>
                            void run({
                              action: "saveAgreement",
                              item: { ...item, status: item.status === "done" ? "wish" : "done" },
                            })
                          }
                        >
                          {item.status === "done" ? "重新计划" : "完成"}
                        </button>
                        <button
                          className="grid h-9 w-9 place-items-center rounded-[7px] text-[#5A6670]/45 transition hover:bg-[#F5DCE0]/50 hover:text-[#D86F82]"
                          type="button"
                          onClick={() => void run({ action: "deleteAgreement", id: item.id })}
                          aria-label="删除约定"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {visibleAgreements.length === 0 && (
                  <div className="rounded-[8px] border border-dashed border-[#D8DDD8] px-6 py-12 text-center text-sm text-[#5A6670]/54">
                    还没有约定，先用预设创建第一条。
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[8px] border border-white/70 bg-white/54 p-5 shadow-[0_22px_60px_rgba(90,102,112,0.08)] backdrop-blur-2xl">
              <SectionHeader
                icon={Utensils}
                title="情侣专属菜单"
                subtitle="输入品牌名会出现参考产品卡片，直接填入菜单。"
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="relative sm:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6670]/42" />
                  <input
                    className="min-h-11 w-full rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/78 pl-9 pr-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                    value={menuForm.brand}
                    onChange={(event) => setMenuForm((current) => ({ ...current, brand: event.target.value }))}
                    placeholder="输入品牌，比如 霸王茶姬、喜茶、奈雪、茶百道"
                  />
                </div>
                <input
                  className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/78 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                  value={menuForm.name}
                  onChange={(event) => setMenuForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="饮品 / 美食名称"
                />
                <select
                  className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/78 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                  value={menuForm.category}
                  onChange={(event) => setMenuForm((current) => ({ ...current, category: event.target.value as MenuCategory }))}
                >
                  {Object.entries(menuCategoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/78 px-3 text-sm outline-none transition focus:border-[#E8B8C2] sm:col-span-2"
                  value={menuForm.preference}
                  onChange={(event) => setMenuForm((current) => ({ ...current, preference: event.target.value }))}
                  placeholder="偏好：少冰 / 三分糖 / 不要珍珠"
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {catalogMatches.map((product) => (
                  <button
                    key={`${product.brand}-${product.name}`}
                    className="group rounded-[8px] border border-white/70 bg-white/58 p-2 text-left shadow-[0_14px_38px_rgba(90,102,112,0.08)] transition hover:-translate-y-0.5 hover:border-[#E8B8C2]"
                    type="button"
                    onClick={() => fillProduct(product)}
                  >
                    <ProductArt product={product} />
                    <div className="px-1 pb-1 pt-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#344451]">{product.name}</p>
                          <p className="mt-1 text-xs leading-5 text-[#5A6670]/58">{product.intro}</p>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#5A6670]/32 transition group-hover:text-[#D86F82]" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {product.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-[#FAFBF7]/80 px-2 py-1 text-[11px] font-semibold text-[#5A6670]/56">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-[#273846] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(39,56,70,0.16)] transition hover:-translate-y-0.5 disabled:opacity-50"
                type="button"
                onClick={saveMenuItem}
                disabled={saving || !menuForm.brand.trim() || !menuForm.name.trim()}
              >
                <Plus className="h-4 w-4" />
                加入菜单
              </button>

              <input
                className="mt-5 min-h-11 w-full rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/78 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                value={orderNote}
                onChange={(event) => setOrderNote(event.target.value)}
                placeholder="下单备注：比如路过再买、不急、想要热的"
              />

              <div className="mt-4 grid gap-3">
                {store.menu.slice(0, 8).map((item) => (
                  <article key={item.id} className="rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/76 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#D86F82]">{menuCategoryLabels[item.category]}</p>
                        <h3 className="mt-1 text-base font-semibold text-[#344451]">
                          {item.brand} · {item.name}
                        </h3>
                        {item.preference && <p className="mt-2 text-sm text-[#5A6670]/62">{item.preference}</p>}
                      </div>
                      <button
                        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#F5DCE0]/74 px-3 text-xs font-semibold text-[#D86F82] transition hover:bg-[#D86F82] hover:text-white"
                        type="button"
                        onClick={() => createOrder(item)}
                      >
                        <Send className="h-4 w-4" />
                        给 TA
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[8px] border border-white/70 bg-white/54 p-5 shadow-[0_22px_60px_rgba(90,102,112,0.08)] backdrop-blur-2xl xl:col-span-2">
              <SectionHeader icon={Bell} title="订单小信箱" subtitle="一方下单，另一方收到；买到之后点完成。" />

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[8px] border border-[#F5DCE0]/70 bg-[#F5DCE0]/28 p-4">
                  <p className="text-sm font-semibold text-[#D86F82]">待我处理</p>
                  <div className="mt-3 grid gap-3">
                    {pendingForMe.length === 0 && <p className="text-sm text-[#5A6670]/58">现在没有待处理订单。</p>}
                    {pendingForMe.map((order) => (
                      <article key={order.id} className="rounded-[8px] border border-white/72 bg-white/64 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-[#344451]">{order.title}</h3>
                            <p className="mt-1 text-sm text-[#5A6670]/62">
                              {[order.brand, order.details, order.note].filter(Boolean).join(" · ")}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-[#5A6670]/42">{formatTime(order.createdAt)}</p>
                          </div>
                          <span className="rounded-full bg-[#D6E8F0]/65 px-2.5 py-1 text-xs font-semibold text-[#5A6670]">
                            {orderStatusLabels[order.status]}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className="rounded-[7px] border border-[#D8DDD8]/80 bg-white/70 px-3 py-2 text-xs font-semibold text-[#5A6670]"
                            type="button"
                            onClick={() => setOrderStatus(order.id, "preparing")}
                          >
                            准备中
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded-[7px] bg-[#D86F82] px-3 py-2 text-xs font-semibold text-white"
                            type="button"
                            onClick={() => setOrderStatus(order.id, "completed")}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            我买到啦
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  {recentOrders.map((order) => (
                    <article key={order.id} className="rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/76 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-[#344451]">{order.title}</h3>
                          <p className="mt-1 text-sm text-[#5A6670]/62">
                            {partnerLabels[order.from]} 给 {partnerLabels[order.to]} · {formatTime(order.createdAt)}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/76 px-2.5 py-1 text-xs font-semibold text-[#5A6670]">
                          {orderStatusLabels[order.status]}
                        </span>
                      </div>
                    </article>
                  ))}
                  {recentOrders.length === 0 && (
                    <div className="rounded-[8px] border border-dashed border-[#D8DDD8] px-6 py-12 text-center text-sm text-[#5A6670]/54">
                      还没有订单，从情侣菜单里给 TA 点第一份吧。
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {agreementOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#273846]/24 px-4 py-6 backdrop-blur-xl">
            <section className="max-h-[92dvh] w-full max-w-4xl overflow-auto rounded-[8px] border border-white/76 bg-[#FAFBF7]/88 p-5 shadow-[0_34px_90px_rgba(39,56,70,0.22)] backdrop-blur-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader icon={ClipboardList} title="新建约定" subtitle="先选一个预设，也可以自己写得更具体。" />
                <button
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#D8DDD8]/80 bg-white/62 text-[#5A6670]/62 transition hover:border-[#E8B8C2] hover:text-[#D86F82]"
                  type="button"
                  onClick={() => setAgreementOpen(false)}
                  aria-label="关闭"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-5">
                {Object.entries(agreementCategoryLabels).map(([value, label]) => (
                  <button
                    key={value}
                    className={`rounded-[8px] border px-3 py-3 text-sm font-semibold transition ${
                      agreementForm.category === value
                        ? "border-[#E8B8C2] bg-[#F5DCE0]/62 text-[#D86F82]"
                        : "border-[#D8DDD8]/78 bg-white/54 text-[#5A6670]/62 hover:border-[#E8B8C2]"
                    }`}
                    type="button"
                    onClick={() => setAgreementForm((current) => ({ ...current, category: value as AgreementCategory }))}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-5">
                <div className="md:col-span-2">
                  <p className="mb-2 text-xs font-semibold text-[#5A6670]/48">预设</p>
                  <div className="grid gap-2">
                    {agreementPresets.map((preset) => (
                      <button
                        key={preset.title}
                        className="rounded-[8px] border border-white/70 bg-white/58 p-3 text-left transition hover:-translate-y-0.5 hover:border-[#E8B8C2]"
                        type="button"
                        onClick={() => fillAgreementPreset(preset)}
                      >
                        <p className="text-sm font-semibold text-[#344451]">{preset.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[#5A6670]/56">{preset.note}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:col-span-3">
                  <input
                    className="min-h-12 rounded-[8px] border border-[#D8DDD8]/88 bg-white/70 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                    value={agreementForm.title}
                    onChange={(event) => setAgreementForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="约定标题"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      className="min-h-12 rounded-[8px] border border-[#D8DDD8]/88 bg-white/70 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                      value={agreementForm.location}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, location: event.target.value }))}
                      placeholder="地点 / 城市 / 店名"
                    />
                    <input
                      className="min-h-12 rounded-[8px] border border-[#D8DDD8]/88 bg-white/70 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                      value={agreementForm.date}
                      onChange={(event) => setAgreementForm((current) => ({ ...current, date: event.target.value }))}
                      placeholder="时间，比如 2026.05.20"
                    />
                  </div>
                  <select
                    className="min-h-12 rounded-[8px] border border-[#D8DDD8]/88 bg-white/70 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                    value={agreementForm.status}
                    onChange={(event) => setAgreementForm((current) => ({ ...current, status: event.target.value as AgreementStatus }))}
                  >
                    {Object.entries(agreementStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="min-h-32 resize-none rounded-[8px] border border-[#D8DDD8]/88 bg-white/70 px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#E8B8C2]"
                    value={agreementForm.note}
                    onChange={(event) => setAgreementForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="备注：想吃什么、想拍什么、谁负责提醒、有什么小仪式"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button
                  className="min-h-11 rounded-[8px] border border-[#D8DDD8]/80 bg-white/60 px-4 text-sm font-semibold text-[#5A6670]"
                  type="button"
                  onClick={() => setAgreementOpen(false)}
                >
                  取消
                </button>
                <button
                  className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-[#D86F82] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(216,111,130,0.18)] disabled:opacity-50"
                  type="button"
                  onClick={saveAgreement}
                  disabled={saving || !agreementForm.title.trim()}
                >
                  <Plus className="h-4 w-4" />
                  保存约定
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
  );

  if (embedded) return content;

  return <MemoryPageShell active="couple">{content}</MemoryPageShell>;
}
