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
import { agreementPresets, milkTeaCatalog, type MilkTeaProduct } from "@/data/milkTeaCatalog";
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
        background: `radial-gradient(circle at 28% 20%, rgba(255,255,255,0.8), transparent 34%), linear-gradient(135deg, ${product.color}, #FAFBF7)`,
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
        .catch(() => setNotice("情侣空间暂时没有连上云端数据，请稍后再试。"))
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
  const myName = store.profile.partners[role]?.name ?? partnerLabels[role];
  const partnerName = store.profile.partners[otherRole(role)]?.name ?? "TA";
  const incomingPendingOrders = useMemo(
    () => store.orders.filter((order) => order.to === role && order.status === "pending"),
    [role, store.orders],
  );
  const outgoingActiveOrders = useMemo(
    () =>
      store.orders.filter(
        (order) => order.from === role && (order.status === "accepted" || order.status === "preparing"),
      ),
    [role, store.orders],
  );
  const visibleAgreements = useMemo(
    () => store.agreements.filter((item) => item.status !== "archived").slice(0, 6),
    [store.agreements],
  );
  const recentOrders = useMemo(() => store.orders.slice(0, 8), [store.orders]);
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
      if (successText) setNotice(successText);
    } catch {
      setNotice("操作失败，请确认已登录并稍后再试。");
    } finally {
      setSaving(false);
    }
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
      "约定已保存。",
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

  const saveMenuItem = () => {
    if (!menuForm.brand.trim() || !menuForm.name.trim()) return;

    void run({ action: "saveMenuItem", item: { ...menuForm, favoriteFor: "both" } }, "菜单已加入。");
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
      `已发给 ${partnerName}。`,
    );
    setOrderNote("");
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, successText: string) => {
    void run({ action: "updateOrderStatus", id: orderId, status }, successText);
  };

  const fillAgreementPreset = (preset: (typeof agreementPresets)[number]) => {
    setAgreementForm((current) => ({
      ...current,
      title: preset.title,
      category: preset.category as AgreementCategory,
      note: preset.note,
    }));
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

  const content = (
    <div className={embedded ? "mx-auto max-w-6xl" : "mx-auto max-w-7xl"}>
      <header className="relative overflow-hidden rounded-[8px] border border-white/70 bg-white/58 p-6 shadow-[0_28px_80px_rgba(90,102,112,0.10)] backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(245,220,224,0.58),transparent_28%),radial-gradient(circle_at_92%_20%,rgba(214,232,240,0.72),transparent_32%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/68 px-3 py-1.5 text-xs font-semibold text-[#5A6670]/62 backdrop-blur-xl">
              <Sparkles className="h-4 w-4 text-[#D86F82]" />
              情侣空间
            </div>
            <h1 className="mt-5 text-[clamp(36px,6vw,72px)] font-semibold leading-[0.95] tracking-normal text-[#273846]">
              把日常
              <span className="block text-[#D86F82]">变成约定</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#5A6670]/66">
              这里保留三条主线：约定、菜单、订单。待处理事项会直接出现在下方，不再让人反复找入口。
            </p>
          </div>

          <AccountBindingPanel />
        </div>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <StatPill label="我的待接单" value={incomingPendingOrders.length} />
        <StatPill label="我在推进" value={outgoingActiveOrders.length} />
        <StatPill label="共同约定" value={store.agreements.length} />
        <StatPill label="已完成订单" value={store.orders.filter((order) => order.status === "completed").length} />
      </div>

      <section className="mt-5 rounded-[8px] border border-white/72 bg-white/58 p-5 shadow-[0_22px_64px_rgba(90,102,112,0.10)] backdrop-blur-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#344451]">情侣总览</p>
            <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">
              {bound ? `${myName} 和 ${partnerName} 已绑定` : "还未完成双方绑定，先在右侧完成绑定。"}
            </p>
          </div>
          <div className="rounded-full border border-[#F5DCE0]/80 bg-[#F5DCE0]/30 px-3 py-1 text-xs font-semibold text-[#D86F82]">
            {bound ? "已绑定" : "待绑定"}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/78 p-4">
            <p className="text-xs font-semibold text-[#5A6670]/48">双方昵称</p>
            <p className="mt-2 text-sm font-semibold text-[#344451]">
              {store.profile.partners.a?.name ?? "我"} / {store.profile.partners.b?.name ?? "TA"}
            </p>
          </div>
          <div className="rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/78 p-4">
            <p className="text-xs font-semibold text-[#5A6670]/48">待处理摘要</p>
            <p className="mt-2 text-sm font-semibold text-[#344451]">
              待接收 {incomingPendingOrders.length} 单，推进中 {outgoingActiveOrders.length} 单
            </p>
          </div>
          <div className="rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/78 p-4">
            <p className="text-xs font-semibold text-[#5A6670]/48">下一步</p>
            <p className="mt-2 text-sm font-semibold text-[#344451]">{bound ? "继续处理订单和地图回忆" : "先完成绑定"}</p>
          </div>
        </div>
      </section>

      {notice && (
        <div className="mt-5 rounded-[8px] border border-[#D6E8F0] bg-[#D6E8F0]/45 px-4 py-3 text-sm font-semibold text-[#5A6670]">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="mt-12 flex items-center justify-center gap-2 text-sm font-semibold text-[#5A6670]/62">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在读取情侣空间数据…
        </div>
      ) : (
        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.92fr]">
          <section className="rounded-[8px] border border-white/70 bg-white/54 p-5 shadow-[0_22px_60px_rgba(90,102,112,0.08)] backdrop-blur-2xl">
            <SectionHeader
              icon={ClipboardList}
              title="我们的约定"
              subtitle="想吃、想去、想完成的事，都留在这里。"
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
                          run({
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
                        onClick={() => run({ action: "deleteAgreement", id: item.id })}
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
                  这里还没有约定，先写下第一条。
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[8px] border border-white/70 bg-white/54 p-5 shadow-[0_22px_60px_rgba(90,102,112,0.08)] backdrop-blur-2xl">
            <SectionHeader icon={Utensils} title="情侣菜单" subtitle="录入喜欢的奶茶和小店，直接从这里发给 TA。" />

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="relative sm:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6670]/42" />
                <input
                  className="min-h-11 w-full rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/78 pl-9 pr-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                  value={menuForm.brand}
                  onChange={(event) => setMenuForm((current) => ({ ...current, brand: event.target.value }))}
                  placeholder="输入品牌，例如喜茶、茶百道、霸王茶姬"
                />
              </div>
              <input
                className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/78 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                value={menuForm.name}
                onChange={(event) => setMenuForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="饮品或餐品名称"
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
                placeholder="偏好，例如少冰 / 三分糖 / 不要珍珠"
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
              placeholder="下单备注，例如路过再买、不急、想要热的"
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
                      发给 TA
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[8px] border border-white/70 bg-white/54 p-5 shadow-[0_22px_60px_rgba(90,102,112,0.08)] backdrop-blur-2xl xl:col-span-2">
            <SectionHeader
              icon={Bell}
              title="订单流"
              subtitle="发给 TA -> TA 接单或拒绝 -> 发起方推进 -> 双方看到完成结果。"
            />

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <div className="rounded-[8px] border border-[#F5DCE0]/70 bg-[#F5DCE0]/28 p-4">
                <p className="text-sm font-semibold text-[#D86F82]">1. 发给我的待处理</p>
                <div className="mt-3 grid gap-3">
                  {incomingPendingOrders.length === 0 && <p className="text-sm text-[#5A6670]/58">现在没有待接收订单。</p>}
                  {incomingPendingOrders.map((order) => (
                    <article key={order.id} className="rounded-[8px] border border-white/72 bg-white/64 p-4">
                      <h3 className="font-semibold text-[#344451]">{order.title}</h3>
                      <p className="mt-1 text-sm text-[#5A6670]/62">{[order.brand, order.details, order.note].filter(Boolean).join(" · ")}</p>
                      <p className="mt-2 text-xs font-semibold text-[#5A6670]/42">
                        来自 {partnerLabels[order.from]} · {formatTime(order.updatedAt || order.createdAt)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="inline-flex min-h-9 items-center gap-1 rounded-[7px] bg-[#D86F82] px-3 text-xs font-semibold text-white"
                          type="button"
                          onClick={() => updateOrderStatus(order.id, "accepted", "已接单，等待发起方继续推进。")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          接单
                        </button>
                        <button
                          className="inline-flex min-h-9 items-center gap-1 rounded-[7px] border border-[#D8DDD8]/80 bg-white/70 px-3 text-xs font-semibold text-[#5A6670]"
                          type="button"
                          onClick={() => updateOrderStatus(order.id, "declined", "已拒绝这笔订单。")}
                        >
                          <X className="h-4 w-4" />
                          拒绝
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-[8px] border border-[#D6E8F0]/70 bg-[#D6E8F0]/26 p-4">
                <p className="text-sm font-semibold text-[#344451]">2. 我发起后的推进</p>
                <div className="mt-3 grid gap-3">
                  {outgoingActiveOrders.length === 0 && <p className="text-sm text-[#5A6670]/58">还没有需要你继续推进的订单。</p>}
                  {outgoingActiveOrders.map((order) => (
                    <article key={order.id} className="rounded-[8px] border border-white/72 bg-white/64 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-[#344451]">{order.title}</h3>
                          <p className="mt-1 text-sm text-[#5A6670]/62">{[order.brand, order.details, order.note].filter(Boolean).join(" · ")}</p>
                        </div>
                        <span className="rounded-full bg-white/76 px-2.5 py-1 text-xs font-semibold text-[#5A6670]">
                          {orderStatusLabels[order.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-[#5A6670]/42">
                        发给 {partnerLabels[order.to]} · 最后更新 {formatTime(order.updatedAt || order.createdAt)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.status === "accepted" && (
                          <button
                            className="rounded-[7px] border border-[#D8DDD8]/80 bg-white/70 px-3 py-2 text-xs font-semibold text-[#5A6670]"
                            type="button"
                            onClick={() => updateOrderStatus(order.id, "preparing", "订单已进入准备中。")}
                          >
                            标记准备中
                          </button>
                        )}
                        <button
                          className="inline-flex items-center gap-1 rounded-[7px] bg-[#273846] px-3 py-2 text-xs font-semibold text-white"
                          type="button"
                          onClick={() => updateOrderStatus(order.id, "completed", "订单已完成。")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          标记完成
                        </button>
                        <button
                          className="inline-flex items-center gap-1 rounded-[7px] border border-[#D8DDD8]/80 bg-white/70 px-3 py-2 text-xs font-semibold text-[#5A6670]"
                          type="button"
                          onClick={() => updateOrderStatus(order.id, "cancelled", "订单已取消。")}
                        >
                          取消
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/76 p-4">
                <p className="text-sm font-semibold text-[#344451]">3. 历史记录</p>
                <div className="mt-3 grid gap-3">
                  {recentOrders.length === 0 && <p className="text-sm text-[#5A6670]/58">还没有订单历史。</p>}
                  {recentOrders.map((order) => (
                    <article key={order.id} className="rounded-[8px] border border-[#D8DDD8]/70 bg-white/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-[#344451]">{order.title}</h3>
                          <p className="mt-1 text-sm text-[#5A6670]/62">
                            {partnerLabels[order.from]} {"->"} {partnerLabels[order.to]}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#FAFBF7]/90 px-2.5 py-1 text-xs font-semibold text-[#5A6670]">
                          {orderStatusLabels[order.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[#5A6670]/50">
                        最后更新时间 {formatTime(order.updatedAt || order.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
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
                    placeholder="时间，例如 2026.05.20"
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
                  placeholder="备注：想吃什么、谁负责提醒、有没有小仪式"
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
