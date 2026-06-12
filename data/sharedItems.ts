export type SharedItemKind = "favorite" | "anniversary" | "capsule";

export type SharedItem = {
  id: string;
  title: string;
  date?: string;
  note: string;
  cityId?: string;
};

export const sharedItemsUpdatedEvent = "mapofus:shared-items-updated";

const endpoint = "/api/shared-items";
const storageKeys: Record<SharedItemKind, string> = {
  favorite: "mapofus:favorites",
  anniversary: "mapofus:anniversaries",
  capsule: "mapofus:capsules",
};
const migrationKeys: Record<SharedItemKind, string> = {
  favorite: "mapofus:shared-items:migrated:favorite:v1",
  anniversary: "mapofus:shared-items:migrated:anniversary:v1",
  capsule: "mapofus:shared-items:migrated:capsule:v1",
};

const syncPromises = new Map<SharedItemKind, Promise<SharedItem[]>>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const normalizeItem = (value: unknown): SharedItem | null => {
  if (!isRecord(value)) return null;

  const id = cleanString(value.id, 120);
  const title = cleanString(value.title, 120);
  const note = cleanString(value.note, 2000) ?? "";
  const date = cleanString(value.date, 20);
  const cityId = cleanString(value.cityId, 80);

  if (!id || !title) return null;

  return {
    id,
    title,
    note,
    date,
    cityId,
  };
};

const normalizeItems = (value: unknown): SharedItem[] => {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeItem).filter((item): item is SharedItem => Boolean(item));
};

const readLocalItems = (kind: SharedItemKind): SharedItem[] => {
  if (typeof window === "undefined") return [];

  try {
    return normalizeItems(JSON.parse(window.localStorage.getItem(storageKeys[kind]) ?? "[]"));
  } catch {
    return [];
  }
};

const writeLocalItems = (kind: SharedItemKind, items: SharedItem[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKeys[kind], JSON.stringify(items));
  window.dispatchEvent(
    new CustomEvent(sharedItemsUpdatedEvent, {
      detail: { kind, items },
    }),
  );
};

const hasItems = (items: SharedItem[]) => items.length > 0;

const isMigrationDone = (kind: SharedItemKind) => {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(migrationKeys[kind]) === "1";
  } catch {
    return false;
  }
};

const markMigrationDone = (kind: SharedItemKind) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(migrationKeys[kind], "1");
  } catch {
    // ignore private mode / quota issues
  }
};

const getResponseError = async (response: Response, fallback: string) => {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
};

const replaceItems = async (kind: SharedItemKind, items: SharedItem[]): Promise<SharedItem[]> => {
  const normalized = normalizeItems(items);
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, items: normalized }),
  });
  if (!response.ok) throw new Error(await getResponseError(response, `Save ${kind} failed (${response.status})`));
  const payload = (await response.json()) as { items?: unknown };
  const nextItems = normalizeItems(payload.items);
  writeLocalItems(kind, nextItems);
  markMigrationDone(kind);
  return nextItems;
};

export const syncSharedItems = async (kind: SharedItemKind): Promise<SharedItem[]> => {
  if (typeof window === "undefined") return [];

  if (!syncPromises.has(kind)) {
    syncPromises.set(
      kind,
      (async () => {
        const localItems = readLocalItems(kind);
        const response = await fetch(`${endpoint}?kind=${kind}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await getResponseError(response, `Load ${kind} failed (${response.status})`));
        }

        const payload = (await response.json()) as { items?: unknown };
        const serverItems = normalizeItems(payload.items);

        if (!isMigrationDone(kind) && hasItems(localItems) && !hasItems(serverItems)) {
          const migrated = await replaceItems(kind, localItems);
          markMigrationDone(kind);
          return migrated;
        }

        writeLocalItems(kind, serverItems);
        markMigrationDone(kind);
        return serverItems;
      })().finally(() => {
        syncPromises.delete(kind);
      }),
    );
  }

  return syncPromises.get(kind)!;
};

export const readSharedItems = async (kind: SharedItemKind) => {
  try {
    return await syncSharedItems(kind);
  } catch {
    return readLocalItems(kind);
  }
};

export const saveSharedItems = async (kind: SharedItemKind, items: SharedItem[]) => replaceItems(kind, items);

export const readCachedSharedItems = (kind: SharedItemKind) => readLocalItems(kind);
