import { NextResponse, type NextRequest } from "next/server";
import {
  type AgreementCategory,
  type AgreementStatus,
  type CoupleAgreement,
  type CoupleMenuItem,
  type CoupleOrder,
  type MenuCategory,
  type OrderStatus,
  type PartnerRole,
} from "@/data/couple";
import { getAccountBindingContext, getAccountScopeKey } from "@/lib/server/accountStore";
import { getSessionUsername, requireSiteSession } from "@/lib/server/auth";
import {
  createInviteCode,
  hashInviteCode,
  readCoupleStore,
  verifyInviteCode,
  writeCoupleStore,
} from "@/lib/server/coupleStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const partnerRoles = new Set(["a", "b"]);
const agreementCategories = new Set(["food", "play", "travel", "anniversary", "promise"]);
const agreementStatuses = new Set(["wish", "planned", "doing", "done", "archived"]);
const menuCategories = new Set(["milkTea", "food", "dessert", "snack", "other"]);
const orderStatuses = new Set(["pending", "accepted", "completed", "declined"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const asPartnerRole = (value: unknown): PartnerRole =>
  partnerRoles.has(String(value)) ? (value as PartnerRole) : "a";

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const otherRole = (role: PartnerRole): PartnerRole => (role === "a" ? "b" : "a");

const syncStoreWithBinding = async (scopeKey: string, username: string) => {
  const [store, binding] = await Promise.all([readCoupleStore(scopeKey), getAccountBindingContext(username)]);
  const nextStore = {
    ...store,
    profile: {
      ...store.profile,
      partners: { ...store.profile.partners },
    },
  };

  if (binding.isBound && binding.partner) {
    nextStore.profile.partners = {
      a:
        binding.role === "a"
          ? {
              name: binding.user.displayName || binding.user.username,
              joinedAt: store.profile.partners.a?.joinedAt ?? binding.user.createdAt,
            }
          : {
              name: binding.partner.displayName || binding.partner.username,
              joinedAt: store.profile.partners.a?.joinedAt ?? binding.partner.createdAt,
            },
      b:
        binding.role === "a"
          ? {
              name: binding.partner.displayName || binding.partner.username,
              joinedAt: store.profile.partners.b?.joinedAt ?? binding.partner.createdAt,
            }
          : {
              name: binding.user.displayName || binding.user.username,
              joinedAt: store.profile.partners.b?.joinedAt ?? binding.user.createdAt,
            },
    };
    nextStore.profile.boundAt = store.profile.boundAt ?? now();
  } else {
    nextStore.profile.partners = {};
    nextStore.profile.boundAt = undefined;
  }

  if (JSON.stringify(nextStore.profile) !== JSON.stringify(store.profile)) {
    await writeCoupleStore(nextStore, scopeKey);
  }

  return { store: nextStore, role: binding.role, isBound: binding.isBound };
};

const resolveScope = async (request: NextRequest) => {
  const authError = requireSiteSession(request);
  if (authError) return { authError };

  const username = getSessionUsername(request);
  if (!username) {
    return {
      authError: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  const scope = await getAccountScopeKey(username);
  if (!scope) {
    return {
      authError: NextResponse.json({ error: "Account not found" }, { status: 404 }),
    };
  }

  return { scopeKey: scope.scopeKey, username };
};

export async function GET(request: NextRequest) {
  const resolved = await resolveScope(request);
  if (resolved.authError) return resolved.authError;

  const synced = await syncStoreWithBinding(resolved.scopeKey, resolved.username);
  return NextResponse.json({ ...synced.store, role: synced.role });
}

export async function POST(request: NextRequest) {
  const resolved = await resolveScope(request);
  if (resolved.authError) return resolved.authError;

  const payload = await request.json().catch(() => null);
  if (!isRecord(payload) || typeof payload.action !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const synced = await syncStoreWithBinding(resolved.scopeKey, resolved.username);
  const store = synced.store;
  const currentRole = synced.role;
  const timestamp = now();

  if (payload.action === "createInvite") {
    const code = createInviteCode();
    const name = cleanString(payload.name, 24) || "我";

    store.profile.partners.a = {
      name,
      joinedAt: store.profile.partners.a?.joinedAt ?? timestamp,
    };
    store.profile.inviteCodeHash = hashInviteCode(code);
    store.profile.inviteCodePreview = code.slice(-2);
    store.profile.inviteCreatedAt = timestamp;

    await writeCoupleStore(store, resolved.scopeKey);
    return NextResponse.json({ store, role: "a", inviteCode: code });
  }

  if (payload.action === "acceptInvite") {
    const code = cleanString(payload.inviteCode, 16);
    if (!verifyInviteCode(code, store.profile.inviteCodeHash)) {
      return NextResponse.json({ error: "Invite code is invalid" }, { status: 401 });
    }

    store.profile.partners.b = {
      name: cleanString(payload.name, 24) || "TA",
      joinedAt: store.profile.partners.b?.joinedAt ?? timestamp,
    };
    store.profile.boundAt = store.profile.boundAt ?? timestamp;

    await writeCoupleStore(store, resolved.scopeKey);
    return NextResponse.json({ store, role: "b" });
  }

  if (payload.action === "saveAgreement") {
    const itemPayload = isRecord(payload.item) ? payload.item : {};
    const item: CoupleAgreement = {
      id: cleanString(itemPayload.id, 80) || id("agreement"),
      title: cleanString(itemPayload.title, 80),
      category: agreementCategories.has(String(itemPayload.category))
        ? (itemPayload.category as AgreementCategory)
        : "food",
      status: agreementStatuses.has(String(itemPayload.status))
        ? (itemPayload.status as AgreementStatus)
        : "wish",
      date: cleanString(itemPayload.date, 20) || undefined,
      location: cleanString(itemPayload.location, 80) || undefined,
      note: cleanString(itemPayload.note, 500) || undefined,
      createdBy: asPartnerRole(itemPayload.createdBy),
      createdAt: cleanString(itemPayload.createdAt, 40) || timestamp,
      updatedAt: timestamp,
    };

    if (!item.title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    store.agreements = store.agreements.some((current) => current.id === item.id)
      ? store.agreements.map((current) => (current.id === item.id ? item : current))
      : [item, ...store.agreements];

    await writeCoupleStore(store, resolved.scopeKey);
    return NextResponse.json(store);
  }

  if (payload.action === "deleteAgreement") {
    const itemId = cleanString(payload.id, 80);
    store.agreements = store.agreements.filter((item) => item.id !== itemId);
    await writeCoupleStore(store, resolved.scopeKey);
    return NextResponse.json(store);
  }

  if (payload.action === "saveMenuItem") {
    const itemPayload = isRecord(payload.item) ? payload.item : {};
    const item: CoupleMenuItem = {
      id: cleanString(itemPayload.id, 80) || id("menu"),
      brand: cleanString(itemPayload.brand, 60),
      name: cleanString(itemPayload.name, 80),
      category: menuCategories.has(String(itemPayload.category)) ? (itemPayload.category as MenuCategory) : "milkTea",
      preference: cleanString(itemPayload.preference, 160) || undefined,
      note: cleanString(itemPayload.note, 300) || undefined,
      favoriteFor:
        itemPayload.favoriteFor === "both" || partnerRoles.has(String(itemPayload.favoriteFor))
          ? (itemPayload.favoriteFor as CoupleMenuItem["favoriteFor"])
          : "both",
      createdAt: cleanString(itemPayload.createdAt, 40) || timestamp,
      updatedAt: timestamp,
    };

    if (!item.brand || !item.name) {
      return NextResponse.json({ error: "Brand and name are required" }, { status: 400 });
    }
    store.menu = store.menu.some((current) => current.id === item.id)
      ? store.menu.map((current) => (current.id === item.id ? item : current))
      : [item, ...store.menu];

    await writeCoupleStore(store, resolved.scopeKey);
    return NextResponse.json(store);
  }

  if (payload.action === "deleteMenuItem") {
    const itemId = cleanString(payload.id, 80);
    store.menu = store.menu.filter((item) => item.id !== itemId);
    await writeCoupleStore(store, resolved.scopeKey);
    return NextResponse.json(store);
  }

  if (payload.action === "createOrder") {
    if (!synced.isBound) {
      return NextResponse.json({ error: "请先完成情侣绑定后再发送订单。" }, { status: 403 });
    }

    const from = currentRole;
    const to: PartnerRole = otherRole(from);
    const menuItem = store.menu.find((item) => item.id === cleanString(payload.itemId, 80));
    const title = cleanString(payload.title, 100) || menuItem?.name || "";

    if (!title) return NextResponse.json({ error: "Order title is required" }, { status: 400 });

    const order: CoupleOrder = {
      id: id("order"),
      itemId: menuItem?.id,
      title,
      brand: menuItem?.brand || cleanString(payload.brand, 60) || undefined,
      details: menuItem?.preference || cleanString(payload.details, 180) || undefined,
      senderNote: cleanString(payload.senderNote, 300) || undefined,
      from,
      to,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    store.orders = [order, ...store.orders];
    await writeCoupleStore(store, resolved.scopeKey);
    return NextResponse.json({ ...store, role: currentRole });
  }

  if (payload.action === "updateOrderStatus") {
    const itemId = cleanString(payload.id, 80);
    const status: OrderStatus = orderStatuses.has(String(payload.status))
      ? (payload.status as OrderStatus)
      : "accepted";
    const targetOrder = store.orders.find((order) => order.id === itemId);

    if (!targetOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const canAccept = targetOrder.to === currentRole && targetOrder.status === "pending" && status === "accepted";
    const canDecline = targetOrder.to === currentRole && targetOrder.status === "pending" && status === "declined";
    const canComplete = targetOrder.to === currentRole && targetOrder.status === "accepted" && status === "completed";

    if (!canAccept && !canDecline && !canComplete) {
      return NextResponse.json({ error: "当前状态下无法执行这个订单操作。" }, { status: 403 });
    }

    store.orders = store.orders.map((order) =>
      order.id === itemId
        ? {
            ...order,
            status,
            updatedAt: timestamp,
            completedAt: status === "completed" ? timestamp : order.completedAt,
            resolvedAt: status === "completed" || status === "declined" ? timestamp : order.resolvedAt,
            resolvedBy: status === "completed" || status === "declined" ? currentRole : order.resolvedBy,
          }
        : order,
    );

    await writeCoupleStore(store, resolved.scopeKey);
    return NextResponse.json({ ...store, role: currentRole });
  }

  if (payload.action === "saveOrderFeedback") {
    const itemId = cleanString(payload.id, 80);
    const senderFeedback = cleanString(payload.senderFeedback, 240);
    const targetOrder = store.orders.find((order) => order.id === itemId);

    if (!targetOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (targetOrder.from !== currentRole || targetOrder.status !== "completed") {
      return NextResponse.json({ error: "Only the sender can save feedback after completion." }, { status: 403 });
    }
    if (!senderFeedback) {
      return NextResponse.json({ error: "Feedback is required." }, { status: 400 });
    }

    store.orders = store.orders.map((order) =>
      order.id === itemId
        ? {
            ...order,
            senderFeedback,
            senderFeedbackAt: timestamp,
            updatedAt: timestamp,
          }
        : order,
    );

    await writeCoupleStore(store, resolved.scopeKey);
    return NextResponse.json({ ...store, role: currentRole });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
