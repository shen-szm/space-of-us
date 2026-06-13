"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import {
  CalendarDays,
  ImagePlus,
  KeyRound,
  Mail,
  RefreshCcw,
  RotateCcw,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { MemoryPageShell } from "@/components/MemoryNav";
import { LocalPrivacyImage } from "@/components/LocalPrivacyImage";
import { cities } from "@/data/cities";
import {
  type AppSettings,
  type LoginPhotoText,
  defaultAnniversaryDate,
  defaultAnniversaryLabel,
  defaultCoupleLogo,
  defaultWeatherCityIds,
  maxWeatherCities,
  readAppSettings,
  saveAppSettings,
  syncAppSettings,
} from "@/data/appSettings";
import {
  deleteLoginPhoto,
  deleteLoginPhotoText,
  readLoginPhotoTexts,
  readLoginPhotos,
  writeLoginPhoto,
  writeLoginPhotoText,
} from "@/data/loginPhotoStore";
import type { PublicUserAccount } from "@/data/accounts";

const loginPhotoVersion = "placeholder-20260601";
const loginPhotoFallback = (fileName: string) => `/photos/login/${fileName}.jpg?v=${loginPhotoVersion}`;

const loginPhotoSlots = [
  { id: "hangzhou", city: "杭州", label: "春日湖边", fallback: loginPhotoFallback("hangzhou") },
  { id: "shanghai", city: "上海", label: "外滩傍晚", fallback: loginPhotoFallback("shanghai") },
  { id: "macau", city: "澳门", label: "旧城光影", fallback: loginPhotoFallback("macau") },
  { id: "hongkong", city: "香港", label: "夜色亮起", fallback: loginPhotoFallback("hongkong") },
  { id: "qingdao", city: "青岛", label: "海风经过", fallback: loginPhotoFallback("qingdao") },
  { id: "zhengzhou", city: "郑州", label: "见面那天", fallback: loginPhotoFallback("zhengzhou") },
  { id: "zhuhai", city: "珠海", label: "海边散步", fallback: loginPhotoFallback("zhuhai") },
  { id: "guangzhou", city: "广州", label: "旧街热气", fallback: loginPhotoFallback("guangzhou") },
  { id: "jinan", city: "济南", label: "泉边小记", fallback: loginPhotoFallback("jinan") },
] as const;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Read file failed")));
    reader.readAsDataURL(file);
  });

const postJson = async <T,>(url: string, payload: Record<string, unknown>) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(data?.error ?? "Request failed");
  }
  return data as T;
};

const getJson = async <T,>(url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json().catch(() => null)) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed (${response.status})`);
  }
  return data as T;
};

export default function SettingsExperience() {
  const [settings, setSettings] = useState<AppSettings>(() => readAppSettings());
  const [loginPhotos, setLoginPhotos] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [securityStatus, setSecurityStatus] = useState("");
  const [user, setUser] = useState<PublicUserAccount | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [nextEmail, setNextEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [sendingEmailCode, setSendingEmailCode] = useState(false);

  const anniversaryLabel = settings.anniversaryLabel ?? defaultAnniversaryLabel;
  const anniversaryDate = settings.anniversaryDate ?? defaultAnniversaryDate;
  const weatherCityIds = settings.weatherCityIds ?? defaultWeatherCityIds;
  const coupleLogo = settings.coupleLogo ?? defaultCoupleLogo;

  const persistSettings = async (next: AppSettings, successText = "设置已同步到云端。") => {
    setSettings(next);
    setIsSaving(true);
    try {
      const saved = await saveAppSettings(next);
      setSettings(saved);
      setStatus(successText);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "设置保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  };

  const updateBasicSetting = (patch: AppSettings, successText?: string) => {
    const next = { ...settings, ...patch };
    void persistSettings(next, successText);
  };

  const updateWeatherCity = (index: number, cityId: string) => {
    const next = [...weatherCityIds];
    next[index] = cityId;
    updateBasicSetting({ weatherCityIds: next.slice(0, maxWeatherCities) }, "天气城市已同步。");
  };

  const updateCoupleLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const image = await readFileAsDataUrl(file);
      await persistSettings({ ...settings, coupleLogo: image }, "头像已同步到云端。");
    } finally {
      event.target.value = "";
    }
  };

  const updateLoginPhoto = async (slotId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const image = await readFileAsDataUrl(file);
      await writeLoginPhoto(slotId, image);
      setLoginPhotos(await readLoginPhotos());
      setStatus("登录照片已同步。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "登录照片保存失败。");
    } finally {
      event.target.value = "";
    }
  };

  const resetLoginPhoto = async (slotId: string) => {
    try {
      await deleteLoginPhoto(slotId);
      setLoginPhotos(await readLoginPhotos());
      setStatus("登录照片已恢复默认。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "登录照片恢复失败。");
    }
  };

  const updateLoginPhotoText = async (slotId: string, field: keyof LoginPhotoText, value: string) => {
    const nextText = {
      ...(settings.loginPhotoTexts?.[slotId] ?? {}),
      [field]: value,
    };
    const nextSettings = {
      ...settings,
      loginPhotoTexts: {
        ...(settings.loginPhotoTexts ?? {}),
        [slotId]: nextText,
      },
    };

    setSettings(nextSettings);

    try {
      await writeLoginPhotoText(slotId, nextText);
      setStatus("登录照片文案已同步。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "登录照片文案保存失败。");
    }
  };

  const resetLoginPhotoText = async (slotId: string) => {
    const nextTexts = { ...(settings.loginPhotoTexts ?? {}) };
    delete nextTexts[slotId];
    setSettings((current) => ({ ...current, loginPhotoTexts: nextTexts }));

    try {
      await deleteLoginPhotoText(slotId);
      setStatus("登录照片文案已恢复默认。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "登录照片文案恢复失败。");
    }
  };

  const loadSecurity = async () => {
    try {
      const payload = await getJson<{ user: PublicUserAccount }>("/api/account/security");
      setUser(payload.user);
      if (!payload.user.emailVerifiedAt) {
        setSecurityStatus("当前账号还没有完成邮箱验证，建议尽快补绑邮箱。");
      }
    } catch (error) {
      setSecurityStatus(error instanceof Error ? error.message : "账号安全信息加载失败。");
    }
  };

  const changePassword = async () => {
    setSecurityStatus("");
    try {
      const payload = await postJson<{ user: PublicUserAccount }>("/api/account/security", {
        action: "changePassword",
        currentPassword,
        newPassword,
      });
      setUser(payload.user);
      setCurrentPassword("");
      setNewPassword("");
      setSecurityStatus("密码修改成功。");
    } catch (error) {
      setSecurityStatus(error instanceof Error ? error.message : "密码修改失败。");
    }
  };

  const sendRebindCode = async () => {
    if (!nextEmail.trim()) {
      setSecurityStatus("请先输入新的邮箱地址。");
      return;
    }
    setSendingEmailCode(true);
    setSecurityStatus("");
    try {
      await postJson("/api/auth/email-code", {
        purpose: "rebind",
        email: nextEmail,
      });
      setSecurityStatus("新邮箱验证码已发送，请查收邮件后完成绑定。");
    } catch (error) {
      setSecurityStatus(error instanceof Error ? error.message : "邮箱验证码发送失败。");
    } finally {
      setSendingEmailCode(false);
    }
  };

  const updateEmail = async () => {
    setSecurityStatus("");
    try {
      const payload = await postJson<{ user: PublicUserAccount }>("/api/account/security", {
        action: "updateEmail",
        email: nextEmail,
        emailCode,
      });
      setUser(payload.user);
      setNextEmail("");
      setEmailCode("");
      setSecurityStatus("邮箱已更新，并完成验证。");
    } catch (error) {
      setSecurityStatus(error instanceof Error ? error.message : "邮箱更新失败。");
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [serverSettings, photos, texts] = await Promise.all([
          syncAppSettings(),
          readLoginPhotos(),
          readLoginPhotoTexts(),
          loadSecurity(),
        ]);
        setSettings({ ...serverSettings, loginPhotoTexts: texts });
        setLoginPhotos(photos);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "云端数据加载失败，请稍后刷新。");
      }
    };

    void load();
  }, []);

  return (
    <MemoryPageShell active="settings">
      <header>
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-[#A8C8DC]" />
          <h1 className="text-[34px] font-semibold leading-tight text-[#5A6670]">设置</h1>
        </div>
        <p className="mt-2 text-sm font-medium text-[#5A6670]/58">
          这里改动的是共享设置。换手机、换电脑后，登录同一账号也会看到同一份内容。
        </p>
        <p className="mt-2 text-xs font-semibold text-[#5A6670]/44">
          当前公开入口仍然是国际托管。中国大陆网络偶尔偏慢时，可以稍后重试或切换网络。
        </p>
      </header>

      <section className="mt-10 grid gap-5">
        <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)]">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#E8B8C2]" />
            <div>
              <p className="text-sm font-semibold text-[#5A6670]">账号安全</p>
              <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">
                主动修改密码、绑定邮箱和更换邮箱都在这里完成，不再放在登录页里。
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-[8px] border border-[#D8DDD8]/70 bg-white/50 p-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#D86F82]" />
                <p className="text-sm font-semibold text-[#344451]">邮箱状态</p>
              </div>
              <p className="mt-3 text-sm text-[#5A6670]/72">{user?.email || "当前还没有绑定邮箱"}</p>
              <p className="mt-1 text-xs text-[#5A6670]/50">
                {user?.emailVerifiedAt ? `已验证 · ${new Date(user.emailVerifiedAt).toLocaleString("zh-CN")}` : "未验证"}
              </p>

              <div className="mt-4 grid gap-3">
                <input
                  className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/76 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                  value={nextEmail}
                  onChange={(event) => setNextEmail(event.target.value)}
                  placeholder="输入新的邮箱地址"
                />
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/76 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                    value={emailCode}
                    onChange={(event) => setEmailCode(event.target.value.toUpperCase())}
                    placeholder="输入邮箱验证码"
                  />
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-[#D8DDD8]/82 bg-white/70 px-4 text-sm font-semibold text-[#5A6670]"
                    onClick={() => void sendRebindCode()}
                    disabled={sendingEmailCode}
                  >
                    {sendingEmailCode ? "发送中" : "发送验证码"}
                  </button>
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#273846] px-4 text-sm font-semibold text-white"
                  onClick={() => void updateEmail()}
                  disabled={!nextEmail.trim() || !emailCode.trim()}
                >
                  更新邮箱
                </button>
              </div>
            </div>

            <div className="rounded-[8px] border border-[#D8DDD8]/70 bg-white/50 p-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#D86F82]" />
                <p className="text-sm font-semibold text-[#344451]">修改密码</p>
              </div>
              <div className="mt-4 grid gap-3">
                <input
                  className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/76 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="当前密码"
                  type="password"
                />
                <input
                  className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/76 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="新的密码"
                  type="password"
                />
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#273846] px-4 text-sm font-semibold text-white"
                  onClick={() => void changePassword()}
                  disabled={!currentPassword.trim() || !newPassword.trim()}
                >
                  保存新密码
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[8px] border border-[#F0E6D8] bg-[#FAFBF7]/78 px-4 py-3 text-sm text-[#5A6670]/64">
            {securityStatus || "账号安全信息已接入云端，支持多设备同步使用。"}
          </div>
        </div>

        <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)]">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-[#E8B8C2]" />
            <div>
              <p className="text-sm font-semibold text-[#5A6670]">基础设置</p>
              <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">
                纪念日名称、开始日期、天气城市和情侣头像都会走云端同步。
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-[#5A6670]/48">纪念日名称</span>
              <input
                className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                value={anniversaryLabel}
                onChange={(event) => updateBasicSetting({ anniversaryLabel: event.target.value }, "纪念日名称已同步。")}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-[#5A6670]/48">纪念日开始日期</span>
              <input
                className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                value={anniversaryDate}
                placeholder="2025.01.01"
                onChange={(event) => updateBasicSetting({ anniversaryDate: event.target.value }, "纪念日日期已同步。")}
              />
            </label>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold text-[#5A6670]/48">首页天气城市（最多 {maxWeatherCities} 个）</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {Array.from({ length: maxWeatherCities }).map((_, index) => (
                <select
                  key={`weather-slot-${index}`}
                  className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                  value={weatherCityIds[index] ?? ""}
                  onChange={(event) => updateWeatherCity(index, event.target.value)}
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

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[7px] border border-[#D8DDD8]/70 bg-white/40">
              <LocalPrivacyImage src={coupleLogo} alt="情侣头像预览" fill sizes="80px" className="object-contain" />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[7px] border border-[#D8DDD8] px-4 py-2 text-sm font-semibold text-[#5A6670]/72 transition hover:bg-white/60">
                <ImagePlus className="h-4 w-4" />
                上传头像
                <input type="file" accept="image/*" className="hidden" onChange={updateCoupleLogo} />
              </label>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-[7px] border border-[#D8DDD8] px-4 py-2 text-sm font-semibold text-[#5A6670]/64 transition hover:bg-white/60"
                onClick={() => updateBasicSetting({ coupleLogo: defaultCoupleLogo }, "头像已恢复默认。")}
              >
                <RotateCcw className="h-4 w-4" />
                恢复默认
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#5A6670]">登录照片</p>
              <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
                对应登录界面的照片、标题和副标题。这里的内容双方都可以修改，并会跟随账号在不同设备同步。
              </p>
            </div>
            <p className="text-xs font-semibold text-[#5A6670]/42">
              已自定义 {Object.keys(loginPhotos).length} / {loginPhotoSlots.length}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {loginPhotoSlots.map((slot) => {
              const customPhoto = loginPhotos[slot.id];
              const customText = settings.loginPhotoTexts?.[slot.id];
              const src = customPhoto ?? slot.fallback;
              const titleValue = customText?.city ?? slot.city;
              const labelValue = customText?.label ?? slot.label;

              return (
                <div className="rounded-[8px] border border-[#D8DDD8]/70 bg-white/34 p-3" key={slot.id}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[7px] bg-[#D6E8F0]/24">
                    <LocalPrivacyImage
                      className="h-full w-full object-cover"
                      src={src}
                      alt={`${slot.city} 登录照片预览`}
                      fill
                      sizes="(min-width: 1280px) 320px, (min-width: 640px) 45vw, 100vw"
                    />
                  </div>

                  <div className="mt-3 grid gap-2">
                    <input
                      className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/76 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                      value={titleValue}
                      onChange={(event) => void updateLoginPhotoText(slot.id, "city", event.target.value)}
                      placeholder="标题"
                    />
                    <input
                      className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/76 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                      value={labelValue}
                      onChange={(event) => void updateLoginPhotoText(slot.id, "label", event.target.value)}
                      placeholder="副标题"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-[7px] border border-[#D8DDD8] px-3 py-2 text-xs font-semibold text-[#5A6670]/72 transition hover:bg-white/60">
                      <ImagePlus className="h-4 w-4" />
                      更换照片
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => void updateLoginPhoto(slot.id, event)} />
                    </label>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-[7px] border border-[#D8DDD8] px-3 py-2 text-xs font-semibold text-[#5A6670]/64 transition hover:bg-white/60"
                      onClick={() => void resetLoginPhoto(slot.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      恢复照片
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-[7px] border border-[#D8DDD8] px-3 py-2 text-xs font-semibold text-[#5A6670]/64 transition hover:bg-white/60"
                      onClick={() => void resetLoginPhotoText(slot.id)}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      恢复文案
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 px-4 py-3 text-sm text-[#5A6670]/68 shadow-[0_12px_28px_rgba(90,102,112,0.06)]">
          {isSaving ? "正在同步到云端…" : status || "设置页已接入云端同步。"}
        </div>
      </section>
    </MemoryPageShell>
  );
}
