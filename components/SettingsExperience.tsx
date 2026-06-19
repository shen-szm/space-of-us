"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useState } from "react";
import {
  CalendarDays,
  ImagePlus,
  KeyRound,
  Mail,
  MailPlus,
  MessageCircleMore,
  RotateCcw,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { MemoryPageShell } from "@/components/MemoryNav";
import { LocalPrivacyImage } from "@/components/LocalPrivacyImage";
import { themePresetUpdatedEvent, writeStoredThemePreset } from "@/components/ThemeController";
import { cities } from "@/data/cities";
import { defaultThemePreset, themePresetList, themePresets, type ThemePresetId } from "@/lib/themePresets";
import {
  type AppSettings,
  defaultAnniversaryDate,
  defaultAnniversaryLabel,
  defaultCoupleLogo,
  defaultWeatherCityIds,
  maxWeatherCities,
  readAppSettings,
  saveAppSettings,
  syncAppSettings,
} from "@/data/appSettings";
import type { PublicUserAccount } from "@/data/accounts";
import type { AuthSessionInfo } from "@/lib/authSessionInfo";


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
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [securityStatus, setSecurityStatus] = useState("");
  const [user, setUser] = useState<PublicUserAccount | null>(null);
  const [session, setSession] = useState<AuthSessionInfo | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [nextEmail, setNextEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [themePreset, setThemePreset] = useState<ThemePresetId>(defaultThemePreset);
  const [themeStatus, setThemeStatus] = useState("");

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

  const loadSecurity = async () => {
    try {
      const payload = await getJson<{ user: PublicUserAccount }>("/api/account/security");
      setUser(payload.user);
      setThemePreset((payload.user.themePreset as ThemePresetId) || defaultThemePreset);
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

  const updateThemePreset = async (nextPreset: ThemePresetId) => {
    setThemePreset(nextPreset);
    writeStoredThemePreset(nextPreset);
    window.dispatchEvent(new CustomEvent(themePresetUpdatedEvent));
    setThemeStatus("正在同步个人主题…");
    try {
      const payload = await postJson<{ user: PublicUserAccount }>("/api/account/security", {
        action: "updateThemePreset",
        themePreset: nextPreset,
      });
      setUser(payload.user);
      setThemePreset((payload.user.themePreset as ThemePresetId) || nextPreset);
      setThemeStatus(`个人主题已切换为 ${themePresets[nextPreset].label}。`);
    } catch (error) {
      setThemeStatus(error instanceof Error ? error.message : "个人主题保存失败。");
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const authSession = await getJson<AuthSessionInfo>("/api/auth/session");
        setSession(authSession);

        const serverSettings = await syncAppSettings();
        setSettings(serverSettings);
        if (authSession.role === "site" && authSession.username) await loadSecurity();
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
        <div className="theme-card theme-floating-shadow p-5">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-[var(--accent-primary)]" />
            <div>
              <p className="text-sm font-semibold text-[#5A6670]">个人主题预设</p>
              <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">
                这些配色只影响当前账号自己的页面视觉，不会改动对方看到的主题。
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {themePresetList.map((preset) => {
              const active = themePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => void updateThemePreset(preset.id)}
                  className={`rounded-[10px] border p-4 text-left transition ${
                    active
                      ? "border-[color-mix(in_srgb,var(--accent-primary)_34%,var(--border-strong))] bg-[color-mix(in_srgb,var(--surface-card-strong)_88%,white)] shadow-[0_10px_24px_rgba(126,106,96,0.10)]"
                      : "border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface-card)_78%,white)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent-primary)_24%,var(--border-strong))]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#344451]">{preset.label}</p>
                      <p className="mt-2 min-h-10 text-xs leading-5 text-[#5A6670]/64">{preset.description}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        active ? "bg-[var(--accent-wash)] text-[var(--accent-primary)]" : "theme-muted theme-text-soft"
                      }`}
                    >
                      {active ? "使用中" : "切换"}
                    </span>
                  </div>

                  <div className="mt-4 rounded-[8px] border border-[color-mix(in_srgb,var(--border-soft)_82%,white)] bg-white/34 p-3">
                    <div className="flex h-7 overflow-hidden rounded-[7px] border border-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.32)]">
                      {preset.palette.map((item) => (
                        <span
                          aria-label={item.label}
                          className="min-w-0 flex-1 border-r border-white/64 last:border-r-0"
                          key={item.label}
                          style={{ backgroundColor: item.color }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px] leading-4 text-[var(--text-muted)]">
                      {preset.palette.map((item) => (
                        <span className="truncate" key={item.label}>
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="theme-soft theme-text-muted mt-4 rounded-[8px] border px-4 py-3 text-sm">
            {themeStatus || `当前主题：${themePresets[themePreset].label}`}
          </div>
        </div>

        {session?.role === "site" && session.username && (
        <div className="theme-card theme-floating-shadow rounded-[8px] border p-5">
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
            <div className="theme-soft rounded-[8px] border p-4">
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
                  className="theme-input min-h-11 rounded-[8px] px-3 text-sm transition"
                  value={nextEmail}
                  onChange={(event) => setNextEmail(event.target.value)}
                  placeholder="输入新的邮箱地址"
                />
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    className="theme-input min-h-11 rounded-[8px] px-3 text-sm transition"
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

            <div className="theme-soft rounded-[8px] border p-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#D86F82]" />
                <p className="text-sm font-semibold text-[#344451]">修改密码</p>
              </div>
              <div className="mt-4 grid gap-3">
                <input
                  className="theme-input min-h-11 rounded-[8px] px-3 text-sm transition"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="当前密码"
                  type="password"
                />
                <input
                  className="theme-input min-h-11 rounded-[8px] px-3 text-sm transition"
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

          <div className="theme-soft theme-text-muted mt-4 rounded-[8px] border px-4 py-3 text-sm">
            {securityStatus || "账号安全信息已接入云端，支持多设备同步使用。"}
          </div>
        </div>
        )}

        <div className="theme-card theme-floating-shadow rounded-[8px] border p-5">
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

        <div className="grid gap-4 lg:grid-cols-2">
          <Link
            className="theme-card theme-floating-shadow rounded-[8px] border p-5 transition hover:-translate-y-0.5"
            href="/feedback"
          >
            <div className="flex items-center gap-3">
              <MessageCircleMore className="h-5 w-5 text-[#D86F82]" />
              <div>
                <p className="text-sm font-semibold text-[#344451]">意见反馈</p>
                <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">单独进入反馈页提交问题、建议或使用感受，管理员会同步收到。</p>
              </div>
            </div>
          </Link>

          {session?.role === "admin" ? (
            <Link
              className="theme-card theme-floating-shadow rounded-[8px] border p-5 transition hover:-translate-y-0.5"
              href="/admin/inbox"
            >
              <div className="flex items-center gap-3">
                <MailPlus className="h-5 w-5 text-[#D86F82]" />
                <div>
                  <p className="text-sm font-semibold text-[#344451]">管理员收件箱</p>
                  <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">查看用户反馈，并进入邮件发送中心批量给用户发送自定义内容。</p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="theme-card theme-floating-shadow rounded-[8px] border p-5 opacity-68">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#A8C8DC]" />
                <div>
                  <p className="text-sm font-semibold text-[#344451]">管理员区</p>
                  <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">管理员入口只对管理员账户显示。</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="theme-soft theme-text-muted rounded-[8px] border px-4 py-3 text-sm shadow-[0_12px_28px_rgba(90,102,112,0.06)]">
          {isSaving ? "正在同步到云端…" : status || "设置页已接入云端同步。"}
        </div>
      </section>
    </MemoryPageShell>
  );
}
