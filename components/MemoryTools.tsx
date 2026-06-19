"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CalendarDays,
  Download,
  Heart,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Upload,
} from "lucide-react";
import { cities } from "@/data/cities";
import { MemoryPageShell, type MemoryNavKey } from "@/components/MemoryNav";
import {
  memoryStoreUpdatedEvent,
  type LocalMemoryStore,
} from "@/data/progress";
import {
  readAppSettings,
  normalizeAppSettings,
  writeAppSettings,
  defaultAnniversaryDate,
  defaultAnniversaryLabel,
  defaultCoupleLogo,
  defaultWeatherCityIds,
  maxWeatherCities,
  type AppSettings,
} from "@/data/appSettings";
import {
  readSharedItems,
  saveSharedItems,
  sharedItemsUpdatedEvent,
  type SharedItem,
} from "@/data/sharedItems";
import {
  adminModeUpdatedEvent,
  readAdminMode,
  writeAdminMode,
} from "@/data/adminMode";
import { LocalPrivacyImage } from "@/components/LocalPrivacyImage";

type StoredItem = SharedItem;
type CityAssetStore = Record<string, string>;
type BindingProfile = {
  user: { id: string; displayName?: string; username: string };
  partner: { id: string; displayName?: string; username: string } | null;
};

type ToolConfig = {
  active: MemoryNavKey;
  icon: typeof Heart;
  title: string;
  subtitle: string;
  storageKey: string;
  kind: "favorite" | "anniversary" | "capsule";
};

const configs = {
  favorite: {
    active: "favorites",
    icon: Heart,
    title: "地点收藏",
    subtitle: "先收好想一起去的地方，不点亮地图也能记住。",
    storageKey: "mapofus:favorites",
    kind: "favorite",
  },
  anniversary: {
    active: "anniversaries",
    icon: CalendarDays,
    title: "纪念日",
    subtitle: "把重要日子放在这里，双方一起绑定，慢慢倒数。",
    storageKey: "mapofus:anniversaries",
    kind: "anniversary",
  },
  capsule: {
    active: "capsule",
    icon: Archive,
    title: "时光宝盒",
    subtitle: "存放不一定属于某座城市的小秘密。",
    storageKey: "mapofus:capsules",
    kind: "capsule",
  },
} satisfies Record<string, ToolConfig>;

const auxiliaryStorageKeys = ["mapofus:favorites", "mapofus:anniversaries", "mapofus:capsules"] as const;

const useAdminMode = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsAdmin(readAdminMode()), 0);
    const handleAdminMode = (event: Event) => {
      setIsAdmin(Boolean((event as CustomEvent<boolean>).detail));
    };

    window.addEventListener(adminModeUpdatedEvent, handleAdminMode);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(adminModeUpdatedEvent, handleAdminMode);
    };
  }, []);

  return isAdmin;
};

const readJsonArray = (key: string) => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const imageFileToSettingImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Invalid image"));
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new window.Image();

    image.addEventListener("load", () => {
      const maxSize = 1800;
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      URL.revokeObjectURL(url);

      if (!context) {
        reject(new Error("Canvas unavailable"));
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    });

    image.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image read failed"));
    });

    image.src = url;
  });

const daysUntil = (value?: string) => {
  if (!value || !/^\d{4}\.\d{2}\.\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split(".").map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
};

const normalizeDateInput = (value?: string) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(value)) return value.replaceAll(".", "-");
  return value;
};

const serializeDateInput = (value?: string) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replaceAll("-", ".");
  return value;
};

function MemoryToolPage({ config }: Readonly<{ config: ToolConfig }>) {
  const Icon = config.icon;
  const isAdmin = useAdminMode();
  const [binding, setBinding] = useState<BindingProfile | null>(null);
  const canEditShared =
    (config.kind === "favorite" || config.kind === "anniversary" || config.kind === "capsule") &&
    Boolean(binding?.partner);
  const canEdit = isAdmin || canEditShared;
  const [items, setItems] = useState<StoredItem[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [cityId, setCityId] = useState(cities[0]?.id ?? "");
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account-binding", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload) setBinding(payload as BindingProfile);
      })
      .catch(() => {
        if (!cancelled) setBinding(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const load = () => {
      void readSharedItems(config.kind)
        .then((nextItems) => {
          setItems(nextItems);
          setStatus("");
        })
        .catch((error) => {
          setStatus(error instanceof Error ? error.message : "共享内容加载失败，请稍后重试。");
        });
    };

    const timer = window.setTimeout(load, 0);
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; items?: StoredItem[] }>).detail;
      if (detail?.kind === config.kind && Array.isArray(detail.items)) {
        setItems(detail.items);
      } else {
        load();
      }
    };

    window.addEventListener(sharedItemsUpdatedEvent, handleUpdate);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(sharedItemsUpdatedEvent, handleUpdate);
    };
  }, [config.kind]);

  const cityOptions = useMemo(() => cities.slice().sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN")), []);
  const canSave = title.trim().length > 0;

  const resetForm = () => {
    setTitle("");
    setDate("");
    setNote("");
    setEditingId("");
  };

  const save = () => {
    if (!canEdit) return;
    if (!canSave) return;

    const previousItems = items;
    const item = {
      id: editingId || `${config.kind}-${Date.now()}`,
      title: title.trim(),
      date: serializeDateInput(date.trim()),
      note: note.trim(),
      cityId: config.kind === "favorite" ? cityId : undefined,
    };
    const nextItems = editingId
      ? items.map((current) => (current.id === editingId ? item : current))
      : [item, ...items];

    setItems(nextItems);
    setStatus("");
    void saveSharedItems(config.kind, nextItems)
      .then((savedItems) => {
        setItems(savedItems);
        setStatus("已同步到云端。");
      })
      .catch((error) => {
        setItems(previousItems);
        setStatus(error instanceof Error ? error.message : "保存失败，请稍后重试。");
      });
    resetForm();
  };

  const startEdit = (item: StoredItem) => {
    if (!canEdit) return;
    setEditingId(item.id);
    setTitle(item.title);
    setDate(normalizeDateInput(item.date ?? ""));
    setNote(item.note);
    if (item.cityId) setCityId(item.cityId);
  };

  const remove = (id: string) => {
    if (!canEdit) return;
    const previousItems = items;
    const nextItems = items.filter((item) => item.id !== id);
    setItems(nextItems);
    setStatus("");
    void saveSharedItems(config.kind, nextItems)
      .then((savedItems) => {
        setItems(savedItems);
        setStatus("已同步到云端。");
      })
      .catch((error) => {
        setItems(previousItems);
        setStatus(error instanceof Error ? error.message : "删除失败，请稍后重试。");
      });
    if (editingId === id) resetForm();
  };

  return (
    <MemoryPageShell active={config.active}>
      <header className="relative overflow-hidden rounded-[8px] border border-white/70 bg-white/58 p-6 shadow-[0_26px_76px_rgba(90,102,112,0.08)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(245,220,224,0.62),transparent_26%),radial-gradient(circle_at_88%_18%,rgba(214,232,240,0.74),transparent_30%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-white/78 bg-white/64 text-[#E8B8C2] shadow-[0_14px_34px_rgba(232,184,194,0.15)] backdrop-blur-xl">
              <Icon className="h-6 w-6 fill-[#F5DCE0]" />
            </span>
            <h1 className="text-[34px] font-semibold leading-tight text-[#5A6670]">{config.title}</h1>
          </div>
          <p className="mt-2 text-sm font-medium text-[#5A6670]/58">{config.subtitle}</p>
        </div>
        <div className="rounded-full border border-white/78 bg-white/60 px-4 py-2 text-sm font-semibold text-[#5A6670]/62 shadow-[0_12px_30px_rgba(90,102,112,0.08)] backdrop-blur-xl">
          {items.length} 条
        </div>
        </div>
      </header>

      <section className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="h-fit overflow-hidden rounded-[8px] border border-white/72 bg-white/58 p-5 shadow-[0_24px_70px_rgba(90,102,112,0.10)] backdrop-blur-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#5A6670]">{editingId ? "编辑内容" : "新增内容"}</p>
              <p className="mt-1 text-xs leading-5 text-[#5A6670]/48">
                {canEditShared
                  ? "绑定后的双方都可以编辑，并会同步到同一个情侣空间。"
                  : "请先完成情侣绑定后再编辑这部分共享内容。"}
              </p>
            </div>
            {!canEdit && !isAdmin && <span className="text-xs font-semibold text-[#5A6670]/42">等待绑定</span>}
          </div>
          <input
            className="mt-4 w-full rounded-[7px] border border-[#D8DDD8] bg-[#FAFBF7] px-3 py-2 text-sm outline-none transition focus:border-[#E8B8C2]"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={config.kind === "favorite" ? "想去的地方" : "标题"}
            disabled={!canEdit}
          />
          {config.kind === "favorite" && (
            <select
              className="mt-3 w-full rounded-[7px] border border-[#D8DDD8] bg-[#FAFBF7] px-3 py-2 text-sm outline-none transition focus:border-[#E8B8C2]"
              value={cityId}
              onChange={(event) => setCityId(event.target.value)}
              disabled={!canEdit}
            >
              {cityOptions.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          )}
          {config.kind !== "favorite" && (
            <input
              className="mt-3 w-full rounded-[7px] border border-[#D8DDD8] bg-[#FAFBF7] px-3 py-2 text-sm outline-none transition focus:border-[#E8B8C2]"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              type="date"
              disabled={!canEdit}
            />
          )}
          <textarea
            className="mt-3 w-full resize-none rounded-[7px] border border-[#D8DDD8] bg-[#FAFBF7] px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#E8B8C2]"
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="写一点备注……"
            disabled={!canEdit}
          />
          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[7px] bg-[#F5DCE0] px-4 py-2.5 text-sm font-semibold text-[#E8B8C2] transition hover:bg-[#E8B8C2] hover:text-[#FAFBF7] disabled:opacity-45"
            type="button"
            onClick={save}
            disabled={!canEdit || !canSave}
          >
            <Plus className="h-4 w-4" />
            {editingId ? "保存修改" : "保存"}
          </button>
          {editingId && (
            <button
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-[7px] px-4 py-2 text-sm font-semibold text-[#5A6670]/56 transition hover:bg-[#D8DDD8]/28 hover:text-[#5A6670]"
              type="button"
              onClick={resetForm}
            >
              取消编辑
            </button>
          )}
          {status ? <p className="mt-3 text-xs font-semibold text-[#5A6670]/54">{status}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const city = cities.find((candidate) => candidate.id === item.cityId);
            const leftDays = daysUntil(item.date);

            return (
              <article
                key={item.id}
                className="group relative overflow-hidden rounded-[8px] border border-white/72 bg-white/58 p-5 shadow-[0_18px_52px_rgba(90,102,112,0.08)] backdrop-blur-2xl transition hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(90,102,112,0.12)]"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(245,220,224,0.45),transparent_30%),radial-gradient(circle_at_92%_18%,rgba(214,232,240,0.56),transparent_32%)] opacity-70 transition group-hover:opacity-100" />
                <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-lg font-semibold text-[#5A6670]">{item.title}</h2>
                      {city && (
                        <span className="rounded-full bg-[#D6E8F0]/42 px-2.5 py-1 text-[11px] font-semibold text-[#5A6670]/72">
                          {city.name}
                        </span>
                      )}
                      {item.date && (
                        <span className="rounded-full bg-[#F5DCE0]/36 px-2.5 py-1 text-[11px] font-semibold text-[#D86F82]">
                          {item.date}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#5A6670]/68">
                      {item.note || (config.kind === "capsule" ? "把想留给彼此的话，暂时轻轻放在这里。" : "这一条先留白，等下次再补完整。")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="grid h-8 w-8 place-items-center rounded-[6px] text-[#5A6670]/42 transition hover:bg-[#D6E8F0]/34 hover:text-[#A8C8DC]"
                      type="button"
                      onClick={() => startEdit(item)}
                      aria-label="编辑"
                      disabled={!canEdit}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="grid h-8 w-8 place-items-center rounded-[6px] text-[#5A6670]/42 transition hover:bg-[#F5DCE0]/45 hover:text-[#E8B8C2]"
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label="删除"
                      disabled={!canEdit}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {leftDays !== null && (
                  <p className="mt-4 text-sm font-semibold text-[#E8B8C2]">
                    {leftDays >= 0 ? `还有 ${leftDays} 天` : `已经过去 ${Math.abs(leftDays)} 天`}
                  </p>
                )}
                </div>
              </article>
            );
          })}
          {items.length === 0 && (
            <div className="relative overflow-hidden rounded-[8px] border border-white/72 bg-white/50 px-6 py-16 text-center text-sm text-[#5A6670]/54 shadow-[0_18px_52px_rgba(90,102,112,0.08)] backdrop-blur-2xl md:col-span-2">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_0%,rgba(245,220,224,0.5),transparent_28%),radial-gradient(circle_at_60%_100%,rgba(214,232,240,0.62),transparent_34%)]" />
              <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/78 bg-white/62 text-[#E8B8C2] shadow-[0_16px_40px_rgba(232,184,194,0.14)]">
                <Icon className="h-6 w-6" />
              </div>
              <p className="relative mt-4 font-semibold text-[#5A6670]">
                {config.kind === "capsule" ? "时光宝盒还没有第一条内容" : "这里还空着"}
              </p>
              <p className="relative mt-1">
                {config.kind === "capsule"
                  ? "可以写下一段只属于你们两个人的小秘密、约定或想留到以后再看的话。"
                  : "先放下第一条，一起把这里慢慢填满。"}
              </p>
            </div>
          )}
        </div>
      </section>
    </MemoryPageShell>
  );
}

export function FavoritesPage() {
  return <MemoryToolPage config={configs.favorite} />;
}

export function AnniversariesPage() {
  return <MemoryToolPage config={configs.anniversary} />;
}

export function TimeCapsulePage() {
  return <MemoryToolPage config={configs.capsule} />;
}

export function SettingsPage() {
  const isAdmin = useAdminMode();
  const [memoryCount, setMemoryCount] = useState(0);
  const [appSettings, setAppSettings] = useState<AppSettings>({});
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState("");
  const [status, setStatus] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [newEntryPassword, setNewEntryPassword] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadMemoryCount = async () => {
    const response = await fetch("/api/memories", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return {};
    const data = (await response.json().catch(() => null)) as { memories?: LocalMemoryStore } | null;
    const memories = data?.memories ?? {};
    setMemoryCount(Object.values(memories).flat().length);

    return memories;
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMemoryCount();
      setAppSettings(readAppSettings());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const anniversaryDate = appSettings.anniversaryDate ?? "";
  const anniversaryLabel = appSettings.anniversaryLabel ?? "";
  const weatherCityIds = appSettings.weatherCityIds ?? defaultWeatherCityIds;

  const updateBasicSetting = (patch: Partial<AppSettings>) => {
    if (!isAdmin) {
      setStatus("请先进入管理员模式");
      return;
    }

    const next = { ...appSettings, ...patch };
    setAppSettings(next);
    writeAppSettings(next);
    setStatus("基础设置已更新");
  };

  const updateWeatherCity = (index: number, cityId: string) => {
    const nextIds = Array.from({ length: maxWeatherCities }, (_, i) =>
      i === index ? cityId : weatherCityIds[i] ?? defaultWeatherCityIds[i],
    );
    updateBasicSetting({ weatherCityIds: nextIds });
  };

  const coupleLogo = appSettings.coupleLogo ?? defaultCoupleLogo;

  const updateCoupleLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!isAdmin) {
      setStatus("请先进入管理员模式");
      event.target.value = "";
      return;
    }
    if (!file || isWorking) return;

    setIsWorking(true);
    setStatus("");

    try {
      const image = await imageFileToSettingImage(file);
      updateBasicSetting({ coupleLogo: image });
      setStatus("头像 logo 已更新");
    } catch {
      setStatus("头像 logo 更新失败，请选择一张图片");
    } finally {
      setIsWorking(false);
      event.target.value = "";
    }
  };

  const resetCoupleLogo = () => {
    if (!isAdmin) {
      setStatus("请先进入管理员模式");
      return;
    }
    updateBasicSetting({ coupleLogo: undefined });
    setStatus("头像 logo 已恢复默认");
  };

  const savePassword = async (target: "site" | "admin", value: string) => {
    if (!isAdmin) {
      setStatus("请先进入管理员模式");
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      setStatus("请输入新密码");
      return;
    }
    if (target === "site" && !/^\d{4,8}$/.test(trimmed)) {
      setStatus("进入密码请用 4-8 位数字，例如 1223");
      return;
    }

    setIsWorking(true);
    const response = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, newPassword: trimmed }),
    }).catch(() => null);
    setIsWorking(false);

    if (response?.ok) {
      setStatus(target === "site" ? "进入密码已修改" : "管理员密码已修改");
      if (target === "site") setNewEntryPassword("");
      else setNewAdminPassword("");
    } else {
      setStatus("密码修改失败，请重试");
    }
  };

  const exportLocalData = async () => {
    if (!isAdmin) {
      setStatus("请先进入管理员模式");
      return;
    }

    setIsWorking(true);
    setStatus("");

    const memories = await loadMemoryCount();
    const assetResponse = await fetch("/api/city-assets", { cache: "no-store" }).catch(() => null);
    const assetData = (await assetResponse?.json().catch(() => null)) as { assets?: CityAssetStore } | null;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      memories,
      cityAssets: assetData?.assets ?? {},
      auxiliary: Object.fromEntries(auxiliaryStorageKeys.map((key) => [key, readJsonArray(key)])),
      settings: readAppSettings(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.href = url;
    link.download = `map-of-us-backup-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("已导出完整备份");
    setIsWorking(false);
  };

  const importLocalData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!isAdmin) {
      setStatus("请先进入管理员模式");
      if (importInputRef.current) importInputRef.current.value = "";
      return;
    }
    if (!file || isWorking) return;

    setIsWorking(true);
    setStatus("");

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Invalid backup");
      }

      const payload = parsed as {
        memories?: unknown;
        cityAssets?: unknown;
        auxiliary?: Record<string, unknown>;
        settings?: unknown;
      };
      const [memoryResponse, assetResponse] = await Promise.all([
        fetch("/api/memories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memories: payload.memories ?? {} }),
        }),
        fetch("/api/city-assets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assets: payload.cityAssets ?? {} }),
        }),
      ]);

      if (!memoryResponse.ok || !assetResponse.ok) throw new Error("Import failed");

      const data = (await memoryResponse.json()) as { memories: LocalMemoryStore };
      auxiliaryStorageKeys.forEach((key) => {
        const value = payload.auxiliary?.[key];
        if (Array.isArray(value)) window.localStorage.setItem(key, JSON.stringify(value));
      });
      if (payload.settings) {
        const nextSettings = normalizeAppSettings(payload.settings);
        writeAppSettings(nextSettings);
        setAppSettings(nextSettings);
      }
      window.dispatchEvent(new CustomEvent(memoryStoreUpdatedEvent, { detail: data.memories }));
      setMemoryCount(Object.values(data.memories).flat().length);
      setStatus("导入完成，地图和回忆记录已刷新");
    } catch {
      setStatus("导入失败，请确认选择的是 Space of us 备份文件");
    } finally {
      setIsWorking(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const unlockAdmin = async () => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "admin", password: adminCode }),
    }).catch(() => null);

    if (response?.ok) {
      writeAdminMode(true);
      setAdminCode("");
      setAdminError("");
      setStatus("管理员模式已开启");
      return;
    }

    setAdminError(response?.status === 503 ? "管理员认证尚未配置" : "密码不对");
  };

  const lockAdmin = () => {
    void fetch("/api/auth/login", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "admin" }),
    }).catch(() => null);
    writeAdminMode(false);
    setAdminCode("");
    setAdminError("");
    setStatus("管理员模式已关闭");
  };

  return (
    <MemoryPageShell active="settings">
      <header>
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-[#A8C8DC]" />
          <h1 className="text-[34px] font-semibold leading-tight text-[#5A6670]">设置</h1>
        </div>
        <p className="mt-2 text-sm font-medium text-[#5A6670]/58">管理本地数据和当前项目状态。</p>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)] md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isAdmin ? (
                <ShieldCheck className="h-6 w-6 text-[#A8C8DC]" />
              ) : (
                <ShieldOff className="h-6 w-6 text-[#E8B8C2]" />
              )}
              <div>
                <p className="text-sm font-semibold text-[#5A6670]">管理员模式</p>
                <p className="mt-1 text-xs text-[#5A6670]/52">
                  {isAdmin ? "已开启，可以编辑和导入数据。" : "未开启，设置改动和删除操作已锁定。"}
                </p>
              </div>
            </div>

            {isAdmin ? (
              <button
                className="rounded-[7px] border border-[#D8DDD8] px-4 py-2 text-sm font-semibold text-[#5A6670]/64 transition hover:bg-white/60"
                type="button"
                onClick={lockAdmin}
              >
                退出管理员
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="min-h-10 w-36 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                  value={adminCode}
                  onChange={(event) => {
                    setAdminCode(event.target.value);
                    setAdminError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void unlockAdmin();
                  }}
                  placeholder="管理员密码"
                  type="password"
                />
                <button
                  className="rounded-[7px] bg-[#F5DCE0] px-4 py-2 text-sm font-semibold text-[#E8B8C2] transition hover:bg-[#E8B8C2] hover:text-[#FAFBF7]"
                  onClick={() => void unlockAdmin()}
                >
                  开启
                </button>
                {adminError && <span className="text-xs font-semibold text-[#E8B8C2]">{adminError}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)] md:col-span-2">
          <div>
            <p className="text-sm font-semibold text-[#5A6670]">密码设置</p>
            <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
              修改打开应用的进入密码和管理员密码。修改后立即生效，下次打开也使用新密码。需要先开启管理员模式。
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <span className="text-xs font-semibold text-[#5A6670]/48">进入密码（你们在一起的日期，如 1223）</span>
              <div className="flex gap-2">
                <input
                  className="min-h-10 w-full rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white disabled:opacity-50"
                  value={newEntryPassword}
                  onChange={(event) => setNewEntryPassword(event.target.value.replace(/\D/g, "").slice(0, 8))}
                  inputMode="numeric"
                  placeholder="如 1223"
                  disabled={!isAdmin}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-[7px] bg-[#F5DCE0] px-4 py-2 text-sm font-semibold text-[#E8B8C2] transition hover:bg-[#E8B8C2] hover:text-[#FAFBF7] disabled:opacity-50"
                  onClick={() => void savePassword("site", newEntryPassword)}
                  disabled={!isAdmin || isWorking}
                >
                  保存
                </button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <span className="text-xs font-semibold text-[#5A6670]/48">管理员密码（自己设置）</span>
              <div className="flex gap-2">
                <input
                  className="min-h-10 w-full rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white disabled:opacity-50"
                  value={newAdminPassword}
                  onChange={(event) => setNewAdminPassword(event.target.value)}
                  type="password"
                  placeholder="新的管理员密码"
                  disabled={!isAdmin}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-[7px] bg-[#F5DCE0] px-4 py-2 text-sm font-semibold text-[#E8B8C2] transition hover:bg-[#E8B8C2] hover:text-[#FAFBF7] disabled:opacity-50"
                  onClick={() => void savePassword("admin", newAdminPassword)}
                  disabled={!isAdmin || isWorking}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)] md:col-span-2">
          <div>
            <p className="text-sm font-semibold text-[#5A6670]">基础设置</p>
            <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
              标题、纪念日，以及首页“沿途天气”显示的城市，都可以在这里改成你自己的。
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-[#5A6670]/48">纪念日名称</span>
              <input
                className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                value={anniversaryLabel}
                placeholder={defaultAnniversaryLabel}
                onChange={(event) => updateBasicSetting({ anniversaryLabel: event.target.value })}
                disabled={!isAdmin}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-[#5A6670]/48">纪念日开始日期（如 2025.12.23）</span>
              <input
                className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                value={anniversaryDate}
                placeholder={defaultAnniversaryDate}
                onChange={(event) => updateBasicSetting({ anniversaryDate: event.target.value })}
                disabled={!isAdmin}
              />
            </label>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold text-[#5A6670]/48">沿途天气城市（最多 {maxWeatherCities} 个）</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {Array.from({ length: maxWeatherCities }).map((_, index) => (
                <select
                  key={`weather-slot-${index}`}
                  className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                  value={weatherCityIds[index] ?? ""}
                  onChange={(event) => updateWeatherCity(index, event.target.value)}
                  disabled={!isAdmin}
                >
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold text-[#5A6670]/48">右下角头像 Logo</p>
            <div className="mt-2 flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[7px] border border-[#D8DDD8]/70 bg-white/40">
                <LocalPrivacyImage
                  src={coupleLogo}
                  alt="头像 Logo 预览"
                  fill
                  sizes="80px"
                  className="object-contain"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`cursor-pointer rounded-[7px] border border-[#D8DDD8] px-4 py-2 text-sm font-semibold text-[#5A6670]/72 transition hover:bg-white/60 ${
                    isAdmin ? "" : "pointer-events-none opacity-50"
                  }`}
                >
                  上传图片
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={updateCoupleLogo}
                    disabled={!isAdmin}
                  />
                </label>
                <button
                  type="button"
                  className="rounded-[7px] border border-[#D8DDD8] px-4 py-2 text-sm font-semibold text-[#5A6670]/64 transition hover:bg-white/60 disabled:opacity-50"
                  onClick={resetCoupleLogo}
                  disabled={!isAdmin}
                >
                  恢复默认
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)]">
          <p className="text-sm font-semibold text-[#5A6670]">本地回忆</p>
          <p className="mt-2 text-3xl font-semibold text-[#E8B8C2]">{memoryCount}</p>
          <p className="mt-2 text-sm text-[#5A6670]/58">网页里新增的城市回忆数量。</p>
        </div>
        <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)]">
          <p className="text-sm font-semibold text-[#5A6670]">完整备份</p>
          <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
            导出城市回忆、城市地标图、地点收藏、纪念日和时光宝盒。换电脑前先备份一下。
          </p>
          <button
            className="mt-4 flex items-center gap-2 rounded-[7px] border border-[#A8C8DC] px-4 py-2 text-sm font-semibold text-[#A8C8DC] transition hover:bg-[#D6E8F0]/36"
            type="button"
            onClick={exportLocalData}
            disabled={isWorking || !isAdmin}
          >
            <Download className="h-4 w-4" />
            导出备份
          </button>
        </div>
        <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)]">
          <p className="text-sm font-semibold text-[#5A6670]">导入恢复</p>
          <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
            选择之前导出的备份文件，会覆盖当前城市回忆，并恢复辅助页面数据。
          </p>
          <input
            ref={importInputRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={importLocalData}
            disabled={!isAdmin}
          />
          <button
            className="mt-4 flex items-center gap-2 rounded-[7px] border border-[#E8B8C2] px-4 py-2 text-sm font-semibold text-[#E8B8C2] transition hover:bg-[#F5DCE0]/42 disabled:opacity-45"
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={isWorking || !isAdmin}
          >
            <Upload className="h-4 w-4" />
            导入备份
          </button>
        </div>
      </section>
      {status && (
        <p className="mt-5 rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/72 px-4 py-3 text-sm text-[#5A6670]/66">
          {status}
        </p>
      )}
    </MemoryPageShell>
  );
}

