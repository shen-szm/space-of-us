"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  Mail,
  RefreshCcw,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { PublicUserAccount } from "@/data/accounts";
import type { AdminAlert } from "@/data/adminAlerts";
import AccountBindingPanel from "@/components/AccountBindingPanel";
import { LocalPrivacyBadge } from "@/components/LocalPrivacyImage";
import {
  type AuthMode,
  BrandHeart,
  adminQuickLinks,
  authModes,
  captchaToSrc,
  cleanErrorMessage,
  formatDateTime,
  isAdminName,
  modeTitles,
} from "@/components/entry/entryExperienceShared";

type RecoverStage = "request-code" | "verify-code" | "reset-password";
type Status = "idle" | "checking" | "wrong" | "done";

type CaptchaState = {
  token: string;
  svg: string;
};

const postJson = async <T,>(url: string, payload: Record<string, unknown>) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as { error?: string } & T;
  if (!response.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
};

const getJson = async <T,>(url: string) => {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const data = (await response.json().catch(() => null)) as { error?: string } & T;
  if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status})`);
  return data as T;
};

const statusClassName = (status: Status) => {
  if (status === "wrong") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-[var(--border-soft)] bg-white/72 text-[var(--text-muted)]";
};

export default function EntryExperience({
  nextPath = "/map",
}: Readonly<{
  nextPath?: string;
}>) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [recoverStage, setRecoverStage] = useState<RecoverStage>("request-code");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captcha, setCaptcha] = useState<CaptchaState | null>(null);
  const [recoverMaskedEmail, setRecoverMaskedEmail] = useState("");
  const [recoverGrantToken, setRecoverGrantToken] = useState("");
  const [registerCodeCooldown, setRegisterCodeCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<PublicUserAccount[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [adminPanel, setAdminPanel] = useState(false);
  const [bindingExpanded, setBindingExpanded] = useState(false);
  const [resetUser, setResetUser] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  const captchaSrc = useMemo(() => captchaToSrc(captcha?.svg), [captcha?.svg]);

  const resetTransient = () => {
    setStatus("idle");
    setMessage("");
    setEmailCode("");
    setCaptchaAnswer("");
    setRecoverMaskedEmail("");
    setRecoverGrantToken("");
    setRegisterCodeCooldown(0);
    setNewPassword("");
    setCaptcha(null);
    setRecoverStage("request-code");
  };

  const ensureCaptcha = async () => {
    const next = await getJson<CaptchaState>("/api/auth/captcha");
    setCaptcha(next);
    return next;
  };

  useEffect(() => {
    if (registerCodeCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setRegisterCodeCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [registerCodeCooldown]);

  useEffect(() => {
    const needsRegisterCaptcha = mode === "register" && Boolean(email.trim());
    const needsRecoverCaptcha =
      mode === "recover" && recoverStage === "request-code" && Boolean(username.trim());

    if (needsRegisterCaptcha || needsRecoverCaptcha) {
      if (!captcha) {
        const timer = window.setTimeout(() => {
          void ensureCaptcha().catch(() => undefined);
        }, 0);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    if (captcha) {
      const timer = window.setTimeout(() => {
        setCaptcha(null);
        setCaptchaAnswer("");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [mode, recoverStage, email, username, captcha]);

  const loadUsers = async () => {
    const payload = await getJson<{ users?: PublicUserAccount[] }>("/api/accounts");
    setUsers(payload.users ?? []);
  };

  const loadAlerts = async () => {
    try {
      const payload = await getJson<{ alerts?: AdminAlert[] }>("/api/admin-alerts");
      setAlerts(payload.alerts ?? []);
    } catch {
      setAlerts([]);
    }
  };

  const loadAdminData = async () => {
    const [usersResult] = await Promise.allSettled([loadUsers(), loadAlerts()]);
    if (usersResult.status === "rejected") {
      throw usersResult.reason instanceof Error ? usersResult.reason : new Error("Load users failed");
    }
  };

  const surfaceLoginMessage = (detail: string) => {
    if (detail.includes("Invalid admin")) return "管理员账号或密码不正确。";
    if (detail.includes("Invalid account")) return "账号或密码不正确，请重新确认。";
    return detail ? `登录失败：${cleanErrorMessage(detail)}` : "登录失败，请稍后重试。";
  };

  const submitLogin = async () => {
    const adminHint = isAdminName(username);
    const loginResult = await postJson<{ role: "site" | "admin" }>("/api/auth/login", {
      mode: adminHint ? "admin" : "site",
      username,
      password,
    });

    if (loginResult.role === "admin") {
      setAdminPanel(true);
      setStatus("done");
      setMessage("管理员已登录，正在读取后台数据。");
      void loadAdminData()
        .then(() => setMessage("管理员已登录。"))
        .catch((error) => {
          const detail = error instanceof Error ? error.message : "Load users failed";
          setMessage(`管理员已登录，但后台数据加载失败：${cleanErrorMessage(detail)}`);
        });
      return;
    }

    setStatus("done");
    router.push(nextPath);
  };

  const sendRegisterCode = async () => {
    setStatus("checking");
    setMessage("");
    try {
      const currentCaptcha = captcha ?? (await ensureCaptcha());
      await postJson("/api/auth/email-code", {
        purpose: "register",
        email,
        captchaToken: currentCaptcha.token,
        captchaAnswer,
      });
      setStatus("done");
      setMessage("邮箱验证码已发送，请查收邮件后继续完成注册。");
      setRegisterCodeCooldown(60);
      await ensureCaptcha();
    } catch (error) {
      setStatus("wrong");
      setMessage(error instanceof Error ? `发送失败：${cleanErrorMessage(error.message)}` : "验证码发送失败。");
      await ensureCaptcha().catch(() => undefined);
    }
  };

  const submitRegister = async () => {
    await postJson("/api/accounts", {
      action: "register",
      username,
      displayName: displayName.trim() || username.trim(),
      email,
      password,
      emailCode,
    });
    setStatus("done");
    setMode("login");
    setPassword("");
    setEmailCode("");
    setCaptchaAnswer("");
    setCaptcha(null);
    setMessage("注册成功，请使用新账号登录。");
  };

  const sendRecoverCode = async () => {
    const currentCaptcha = captcha ?? (await ensureCaptcha());
    const payload = await postJson<{ maskedEmail?: string }>("/api/auth/email-code", {
      purpose: "recover",
      identifier: username,
      captchaToken: currentCaptcha.token,
      captchaAnswer,
    });
    setRecoverMaskedEmail(payload.maskedEmail ?? "");
    setRecoverStage("verify-code");
    setEmailCode("");
    setStatus("done");
    setMessage("验证码已发送到绑定邮箱，请先完成邮箱验证。");
    await ensureCaptcha();
  };

  const verifyRecoverCode = async () => {
    const payload = await postJson<{ grantToken: string }>("/api/auth/password-recovery", {
      action: "verifyCode",
      identifier: username,
      emailCode,
    });
    setRecoverGrantToken(payload.grantToken);
    setRecoverStage("reset-password");
    setStatus("done");
    setMessage("邮箱验证通过，现在可以设置新密码。");
  };

  const submitRecoverPassword = async () => {
    await postJson("/api/accounts", {
      action: "resetPassword",
      grantToken: recoverGrantToken,
      newPassword,
    });
    setStatus("done");
    setMode("login");
    setRecoverStage("request-code");
    setPassword(newPassword);
    setNewPassword("");
    setEmailCode("");
    setRecoverGrantToken("");
    setRecoverMaskedEmail("");
    setMessage("密码已重置，请使用新密码登录。");
  };

  const submit = async () => {
    if (status === "checking") return;
    setStatus("checking");
    setMessage("");

    try {
      if (mode === "register") {
        await submitRegister();
        return;
      }

      if (mode === "recover") {
        if (recoverStage === "request-code") {
          await sendRecoverCode();
          return;
        }
        if (recoverStage === "verify-code") {
          await verifyRecoverCode();
          return;
        }
        await submitRecoverPassword();
        return;
      }

      await submitLogin();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      setStatus("wrong");
      if (mode === "login") {
        setMessage(surfaceLoginMessage(detail));
      } else if (mode === "register") {
        setMessage(detail ? `注册失败：${cleanErrorMessage(detail)}` : "注册失败，请稍后重试。");
      } else {
        setMessage(detail ? `找回失败：${cleanErrorMessage(detail)}` : "找回失败，请稍后重试。");
      }
      window.setTimeout(() => setStatus("idle"), 900);
    }
  };

  const adminResetPassword = async () => {
    if (!resetUser.trim() || !resetPassword.trim()) return;
    setStatus("checking");
    try {
      await postJson("/api/accounts", {
        action: "adminResetPassword",
        username: resetUser,
        newPassword: resetPassword,
      });
      await loadAdminData();
      setResetUser("");
      setResetPassword("");
      setStatus("done");
      setMessage("用户密码已重置。");
    } catch (error) {
      setStatus("wrong");
      setMessage(error instanceof Error ? `重置失败：${cleanErrorMessage(error.message)}` : "重置失败，请稍后重试。");
    }
  };

  const logoutAdmin = async () => {
    await fetch("/api/auth/login", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "all" }),
    }).catch(() => undefined);

    setAdminPanel(false);
    setUsers([]);
    setAlerts([]);
    setUsername("");
    setPassword("");
    setEmail("");
    setDisplayName("");
    setResetUser("");
    setResetPassword("");
    resetTransient();
  };

  const recoverHint =
    recoverStage === "verify-code"
      ? recoverMaskedEmail
        ? `验证码已发送到 ${recoverMaskedEmail}，输入邮箱验证码后继续。`
        : "验证码已发送到绑定邮箱，输入邮箱验证码后继续。"
      : recoverStage === "reset-password"
        ? "邮箱验证已通过，请输入新的登录密码。"
        : "输入用户名或邮箱，先完成图形验证，再向绑定邮箱发送验证码。";

  const modeDescription =
    mode === "register"
      ? "创建一个共享入口，把地图、回忆、纪念日和约定放进同一张私密地图里。"
      : mode === "recover"
        ? recoverHint
        : "登录后即可继续查看你们的地图、约定、纪念和共享进度。";

  const primaryLabel =
    mode === "register" ? "创建账号" : mode === "recover" ? "继续处理" : "进入网站";

  return (
    <main className="theme-page login-stage relative min-h-[100dvh] overflow-x-hidden overflow-y-auto theme-text-main">
      <LocalPrivacyBadge />
      <div className="login-paper absolute inset-0" />
      <div className="login-grid absolute inset-0" aria-hidden="true" />
      <div className="login-stage-orbit login-stage-orbit-a" aria-hidden="true" />
      <div className="login-stage-orbit login-stage-orbit-b" aria-hidden="true" />

      <div className="login-shell relative z-10 mx-auto flex min-h-[100dvh] w-full items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="login-auth-card theme-card-strong theme-floating-shadow-strong w-full border backdrop-blur-2xl">
          {!adminPanel ? (
            <div className="mx-auto flex w-full max-w-[720px] flex-col justify-center">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <BrandHeart />
                  <div>
                    <p className="theme-text-main text-[28px] font-semibold leading-none">Space of us</p>
                    <p className="theme-text-soft mt-1 text-xs font-semibold">Private Couple Space</p>
                  </div>
                </div>
                <span className="theme-soft theme-text-soft grid h-11 w-11 place-items-center rounded-full border">
                  <LockKeyhole className="h-5 w-5" />
                </span>
              </div>

              <div className="theme-soft mt-7 w-fit rounded-full border p-1">
                <div className="grid grid-cols-3 gap-1">
                  {authModes.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`min-h-10 min-w-20 rounded-full px-4 text-sm font-semibold transition ${
                        mode === item.key
                          ? "bg-white text-[var(--accent-primary)] shadow-[0_10px_24px_rgba(90,102,112,0.08)]"
                          : "theme-text-muted hover:bg-white/58 hover:text-[var(--foreground)]"
                      }`}
                      onClick={() => {
                        setMode(item.key);
                        setBindingExpanded(false);
                        resetTransient();
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <h1 className="theme-text-main text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
                  {modeTitles[mode]}
                </h1>
                <p className="theme-text-muted mt-3 max-w-[36rem] text-sm leading-7">{modeDescription}</p>
              </div>

              <div className="mt-6 grid gap-3">
                <label className="block">
                  <span className="theme-text-soft mb-2 block text-xs font-semibold">
                    {mode === "login" || mode === "recover" ? "用户名或邮箱" : "用户名"}
                  </span>
                  <span className="theme-input flex min-h-12 items-center gap-3 rounded-[16px] px-3 transition">
                    <UserRound className="theme-text-soft h-4 w-4" />
                    <input
                      className="theme-text-main min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[var(--text-soft)]"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder={mode === "login" || mode === "recover" ? "输入用户名或邮箱" : "设置登录用户名"}
                      autoComplete="username"
                    />
                  </span>
                </label>

                {mode === "register" && (
                  <>
                    <label className="block">
                      <span className="theme-text-soft mb-2 block text-xs font-semibold">显示名称</span>
                      <span className="theme-input flex min-h-12 items-center gap-3 rounded-[16px] px-3 transition">
                        <UserPlus className="theme-text-soft h-4 w-4" />
                        <input
                          className="theme-text-main min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[var(--text-soft)]"
                          value={displayName}
                          onChange={(event) => setDisplayName(event.target.value)}
                          placeholder="显示给对方看的昵称"
                        />
                      </span>
                    </label>

                    <label className="block">
                      <span className="theme-text-soft mb-2 block text-xs font-semibold">邮箱地址</span>
                      <span className="theme-input flex min-h-12 items-center gap-3 rounded-[16px] px-3 transition">
                        <Mail className="theme-text-soft h-4 w-4" />
                        <input
                          className="theme-text-main min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[var(--text-soft)]"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="输入邮箱地址"
                          autoComplete="email"
                        />
                      </span>
                    </label>
                  </>
                )}

                {mode !== "recover" && (
                  <label className="block">
                    <span className="theme-text-soft mb-2 block text-xs font-semibold">登录密码</span>
                    <span className="theme-input flex min-h-12 items-center gap-3 rounded-[16px] px-3 transition">
                      <LockKeyhole className="theme-text-soft h-4 w-4" />
                      <input
                        className="theme-text-main min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[var(--text-soft)]"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void submit();
                        }}
                        placeholder={mode === "register" ? "设置登录密码" : "输入登录密码"}
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "register" ? "new-password" : "current-password"}
                      />
                      <button
                        className="theme-text-soft grid h-8 w-8 place-items-center rounded-full transition hover:bg-[var(--accent-wash)] hover:text-[var(--foreground)]"
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "隐藏密码" : "显示密码"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </span>
                  </label>
                )}

                {((mode === "register" && email.trim()) ||
                  (mode === "recover" && recoverStage === "request-code" && username.trim())) && (
                  <div className="theme-soft grid gap-3 rounded-[20px] border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="theme-text-soft text-xs font-semibold">图形验证码</p>
                      <button
                        className="theme-subtle-button inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                        type="button"
                        onClick={() => void ensureCaptcha()}
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        刷新验证码
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                      <button
                        className="theme-card-strong overflow-hidden rounded-[16px] border p-0"
                        type="button"
                        onClick={() => void ensureCaptcha()}
                      >
                        {captchaSrc ? (
                          <Image
                            alt="图形验证码"
                            src={captchaSrc}
                            width={150}
                            height={52}
                            className="h-14 w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="grid h-14 place-items-center text-xs font-semibold text-[var(--text-muted)]">
                            正在生成
                          </span>
                        )}
                      </button>
                      <input
                        className="theme-input min-h-14 rounded-[16px] px-4 text-sm outline-none"
                        value={captchaAnswer}
                        onChange={(event) => setCaptchaAnswer(event.target.value)}
                        placeholder="输入图中验证码"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                )}

                {mode === "register" && (
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      className="theme-input min-h-12 rounded-[16px] px-4 text-sm outline-none"
                      value={emailCode}
                      onChange={(event) => setEmailCode(event.target.value.toUpperCase())}
                      placeholder="输入邮箱验证码"
                    />
                    <button
                      type="button"
                      className="theme-subtle-button min-h-12 rounded-[16px] px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => void sendRegisterCode()}
                      disabled={!email.trim() || !captchaAnswer.trim() || registerCodeCooldown > 0}
                    >
                      {registerCodeCooldown > 0 ? `${registerCodeCooldown}s 后重发` : "发送验证码"}
                    </button>
                  </div>
                )}

                {mode === "recover" && recoverStage === "verify-code" && (
                  <input
                    className="theme-input min-h-12 rounded-[16px] px-4 text-sm outline-none"
                    value={emailCode}
                    onChange={(event) => setEmailCode(event.target.value.toUpperCase())}
                    placeholder="输入邮箱验证码"
                  />
                )}

                {mode === "recover" && recoverStage === "reset-password" && (
                  <label className="block">
                    <span className="theme-text-soft mb-2 block text-xs font-semibold">新的登录密码</span>
                    <span className="theme-input flex min-h-12 items-center gap-3 rounded-[16px] px-3 transition">
                      <LockKeyhole className="theme-text-soft h-4 w-4" />
                      <input
                        className="theme-text-main min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[var(--text-soft)]"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="输入新的登录密码"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                      />
                    </span>
                  </label>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--hero-ink)] px-6 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(39,56,70,0.16)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void submit()}
                  disabled={status === "checking"}
                >
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  className="theme-subtle-button min-h-12 rounded-full px-5 text-sm font-semibold"
                  onClick={() => {
                    resetTransient();
                    setPassword("");
                    setNewPassword("");
                  }}
                >
                  清空状态
                </button>
              </div>

              <div className={`mt-5 rounded-[18px] border px-4 py-3 text-sm ${statusClassName(status)}`}>
                {message || "所有敏感数据请求都走本地接口，注册和找回流程已接入邮箱验证与图形验证码。"}
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  className="theme-soft flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left"
                  onClick={() => setBindingExpanded((current) => !current)}
                  aria-expanded={bindingExpanded}
                >
                  <div>
                    <p className="text-sm font-semibold text-[#344451]">情侣绑定</p>
                    <p className="mt-1 text-xs text-[#5A6670]/60">登录后可在这里生成邀请码或接受对方邀请。</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition ${bindingExpanded ? "rotate-180" : ""}`} />
                </button>
                {bindingExpanded && <AccountBindingPanel compact className="mt-3" />}
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="theme-soft grid h-12 w-12 place-items-center rounded-full border">
                    <UsersRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h1 className="text-2xl font-semibold text-[#344451]">管理后台</h1>
                    <p className="mt-1 text-sm text-[#5A6670]/62">保留账户、告警和快速入口，便于审查与维护。</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-white/72 px-5 text-sm font-semibold text-[#344451]"
                  onClick={() => void logoutAdmin()}
                >
                  <LogOut className="h-4 w-4" />
                  退出管理模式
                </button>
              </div>

              <div className={`rounded-[18px] border px-4 py-3 text-sm ${statusClassName(status)}`}>
                {message || "管理员会话已建立。"}
              </div>

              {alerts.length > 0 && (
                <div className="grid gap-3">
                  {alerts.map((alert) => (
                    <article key={alert.id} className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">{alert.title}</p>
                          <p className="mt-1 text-sm leading-6">{alert.message}</p>
                          <p className="mt-2 text-xs text-amber-700/80">{formatDateTime(alert.createdAt)}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="theme-card rounded-[20px] border p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#344451]">账户列表</p>
                      <p className="mt-1 text-xs text-[#5A6670]/60">展示已注册用户、邮箱状态与最近登录时间。</p>
                    </div>
                    <button
                      type="button"
                      className="theme-subtle-button rounded-full px-4 py-2 text-xs font-semibold"
                      onClick={() => void loadAdminData()}
                    >
                      刷新数据
                    </button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[16px] border border-[var(--border-soft)]">
                    <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-3 bg-white/76 px-4 py-3 text-xs font-semibold text-[#5A6670]/60">
                      <span>用户</span>
                      <span>邮箱</span>
                      <span>最近登录</span>
                      <span>状态</span>
                    </div>
                    <div className="divide-y divide-[var(--border-soft)]">
                      {users.map((user) => (
                        <div key={user.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-3 px-4 py-3 text-sm text-[#344451]">
                          <div>
                            <p className="font-semibold">{user.displayName || user.username}</p>
                            <p className="text-xs text-[#5A6670]/56">@{user.username}</p>
                          </div>
                          <div className="truncate">{user.email || "未绑定"}</div>
                          <div>{formatDateTime(user.lastLoginAt)}</div>
                          <div>{user.emailVerifiedAt ? "已验证" : "未验证"}</div>
                        </div>
                      ))}
                      {users.length === 0 && <div className="px-4 py-6 text-sm text-[#5A6670]/60">暂无用户数据。</div>}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="theme-card rounded-[20px] border p-5">
                    <p className="text-sm font-semibold text-[#344451]">快速入口</p>
                    <div className="mt-4 grid gap-2">
                      {adminQuickLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center justify-between rounded-[14px] border border-[var(--border-soft)] bg-white/64 px-4 py-3 text-sm font-semibold text-[#344451] transition hover:-translate-y-0.5"
                          >
                            <span className="flex items-center gap-3">
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </span>
                            <ArrowRight className="h-4 w-4 text-[#5A6670]/56" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="theme-card rounded-[20px] border p-5">
                    <p className="text-sm font-semibold text-[#344451]">重置用户密码</p>
                    <div className="mt-4 grid gap-3">
                      <input
                        className="theme-input min-h-11 rounded-[14px] px-4 text-sm outline-none"
                        value={resetUser}
                        onChange={(event) => setResetUser(event.target.value)}
                        placeholder="输入用户名"
                      />
                      <input
                        className="theme-input min-h-11 rounded-[14px] px-4 text-sm outline-none"
                        value={resetPassword}
                        onChange={(event) => setResetPassword(event.target.value)}
                        placeholder="输入新密码"
                        type="password"
                      />
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--hero-ink)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => void adminResetPassword()}
                        disabled={!resetUser.trim() || !resetPassword.trim()}
                      >
                        执行重置
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
