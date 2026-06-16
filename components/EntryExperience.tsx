"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  Heart,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MapPinned,
  RefreshCcw,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { PublicUserAccount } from "@/data/accounts";
import type { AdminAlert } from "@/data/adminAlerts";
import AccountBindingPanel from "@/components/AccountBindingPanel";
import { LocalPrivacyBadge, LocalPrivacyImage } from "@/components/LocalPrivacyImage";
import { withVersion } from "@/lib/appVersion";

const loginPhotoPath = (fileName: string) => withVersion(`/photos/login/${fileName}.jpg`);

type AuthMode = "login" | "register" | "recover";
type RecoverStage = "request-code" | "verify-code" | "reset-password";
type Status = "idle" | "checking" | "wrong" | "done";
type CaptchaState = {
  token: string;
  svg: string;
};

type LoginPhotoStoreResponse = {
  photos?: Record<string, string>;
};

type BindingProfileResponse = {
  user?: {
    displayName?: string;
    username?: string;
  };
  partner?: {
    displayName?: string;
    username?: string;
  } | null;
};

type MemoryPhotoCandidate = {
  image?: string;
  photos?: string[];
};

const authModes: Array<{ key: AuthMode; label: string }> = [
  { key: "login", label: "登录" },
  { key: "register", label: "注册" },
  { key: "recover", label: "找回" },
];

const adminQuickLinks = [
  { label: "地图主页", href: "/map", icon: MapPinned },
  { label: "情侣中心", href: "/couple", icon: Heart },
  { label: "回忆记录", href: "/memories", icon: LayoutDashboard },
  { label: "纪念日", href: "/anniversaries", icon: CalendarDays },
  { label: "系统设置", href: "/settings", icon: ShieldCheck },
];

const isAdminName = (value: string) =>
  value.trim().toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_USERNAME || "admin").toLowerCase();

const formatDateTime = (value?: string) => {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无";
  return date.toLocaleString("zh-CN");
};

const cleanErrorMessage = (value: string) => {
  if (!value) return "";
  if (value.includes("Mail service is not configured")) return "邮件服务尚未配置，请先检查 Resend 环境变量。";
  if (value.includes("Database is not configured")) return "数据库尚未配置，请先完成 Supabase 连接配置。";
  if (value.includes("Load users failed")) return "加载用户列表失败，请稍后再试。";
  if (value.includes("Invalid API key")) return "Supabase API Key 无效，请检查线上环境变量。";
  if (value.includes("Email already exists")) return "该邮箱已被使用，请换一个。";
  if (value.includes("Account already exists")) return "该用户名已存在，请换一个。";
  if (value.includes("Invalid captcha")) return "图形验证码错误，请重新输入。";
  if (value.includes("Captcha expired")) return "图形验证码已过期，请重新获取。";
  if (value.includes("Please wait before requesting another code")) return "请等待 1 分钟后再重新发送验证码。";
  if (value.includes("Daily email limit reached")) return "当天验证码发送次数已达上限，请明天再试。";
  return value;
};

const postJson = async <T,>(url: string, payload: Record<string, unknown>) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(cleanErrorMessage(data?.error ?? "Request failed"));
  }
  return data as T;
};

const getJson = async <T,>(url: string) => {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const data = (await response.json().catch(() => null)) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(cleanErrorMessage(data?.error ?? `Request failed (${response.status})`));
  }
  return data as T;
};

const captchaToSrc = (svg?: string) =>
  svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "";

function BrandHeart() {
  return (
    <span className="grid h-12 w-12 place-items-center rounded-full border border-white/72 bg-white/62 text-[#D86F82] shadow-[0_16px_38px_rgba(216,111,130,0.16)] backdrop-blur-xl">
      <Heart className="h-6 w-6 fill-[#D86F82]" />
    </span>
  );
}

export default function EntryExperience() {
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
  const [resetUser, setResetUser] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [heroPhotoSrc, setHeroPhotoSrc] = useState(loginPhotoPath("hangzhou"));
  const [heroBadgeLabel, setHeroBadgeLabel] = useState("private album");

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

  useEffect(() => {
    let cancelled = false;

    const pickHero = async () => {
      const [bindingResult, memoryResult, loginPhotoResult] = await Promise.allSettled([
        getJson<BindingProfileResponse>("/api/account-binding"),
        fetch("/api/memories", { cache: "no-store", credentials: "same-origin" }).then((response) =>
          response.ok ? response.json() : null,
        ),
        getJson<LoginPhotoStoreResponse>("/api/login-photos"),
      ]);

      if (cancelled) return;

      const bindingPayload = bindingResult.status === "fulfilled" ? bindingResult.value : null;
      const memoryPayload = memoryResult.status === "fulfilled" ? memoryResult.value : null;
      const loginPhotoPayload = loginPhotoResult.status === "fulfilled" ? loginPhotoResult.value : null;

      const memoryPhotos = Object.values((memoryPayload ?? {}) as Record<string, MemoryPhotoCandidate>)
        .flatMap((item) => [item?.image, ...(item?.photos ?? [])])
        .filter((value): value is string => typeof value === "string" && value.length > 0);

      const configuredPhotos = Object.values(loginPhotoPayload?.photos ?? {}).filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      );

      const heroSource =
        memoryPhotos[Math.floor(Math.random() * memoryPhotos.length)] ??
        configuredPhotos[Math.floor(Math.random() * configuredPhotos.length)] ??
        loginPhotoPath("hangzhou");

      setHeroPhotoSrc(heroSource);

      const myName = bindingPayload?.user?.displayName || bindingPayload?.user?.username;
      const partnerName = bindingPayload?.partner?.displayName || bindingPayload?.partner?.username;

      if (myName && partnerName) {
        setHeroBadgeLabel(`${myName} & ${partnerName}`);
        return;
      }

      if (configuredPhotos.length > 0) {
        setHeroBadgeLabel("custom login cover");
      }
    };

    void pickHero();

    return () => {
      cancelled = true;
    };
  }, []);

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
    return detail ? `登录失败：${detail}` : "登录失败，请稍后重试。";
  };

  const submitLogin = async () => {
    const adminLogin = isAdminName(username);
    await postJson("/api/auth/login", {
      mode: adminLogin ? "admin" : "site",
      username,
      password,
    });

    if (adminLogin) {
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
    router.push("/map");
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
      setMessage(error instanceof Error ? `发送失败：${error.message}` : "验证码发送失败。");
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
    setMessage("注册成功，现在可以使用这个账号登录了。");
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
    setMessage("验证码已发送到绑定邮箱，请先完成邮箱验证，再继续密码重置。");
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
    setMessage("密码已经重置，请使用新密码登录。");
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
        setMessage(detail ? `注册失败：${detail}` : "注册失败，请稍后重试。");
      } else {
        setMessage(detail ? `找回失败：${detail}` : "找回失败，请稍后重试。");
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
      setMessage(error instanceof Error ? `重置失败：${error.message}` : "重置失败，请稍后重试。");
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

  const primaryLabel =
    mode === "register" ? "创建账号" : mode === "recover" ? "继续处理" : "进入网站";

  const renderRecoverHint = () => {
    if (recoverStage === "verify-code") {
      return recoverMaskedEmail
        ? `验证码已发送到 ${recoverMaskedEmail}，先完成邮箱验证，再进行密码重置。`
        : "验证码已发送到绑定邮箱，先完成邮箱验证，再进行密码重置。";
    }
    if (recoverStage === "reset-password") {
      return "邮箱验证成功，请输入新的登录密码。";
    }
    return "输入用户名或邮箱，先完成图形验证，再向绑定邮箱发送验证码。";
  };

  return (
    <main className="login-stage relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#F9F6EC] text-[#344451]">
      <LocalPrivacyBadge />
      <div className="login-paper absolute inset-0" />
      <div className="login-grid absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 grid min-h-[100dvh] gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)] lg:px-8">
        <section className="relative hidden min-h-0 overflow-hidden rounded-[8px] border border-[#DCCFC1]/86 bg-[#161F27] shadow-[0_28px_80px_rgba(91,71,50,0.12)] lg:block">
          <LocalPrivacyImage
            className="h-full w-full object-cover opacity-42 saturate-[1.08]"
            src={heroPhotoSrc}
            alt=""
            fill
            sizes="45vw"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,31,39,0.86),rgba(22,31,39,0.24)_50%,rgba(22,31,39,0.72)),radial-gradient(circle_at_72%_22%,rgba(245,220,224,0.24),transparent_34%)]" />
          <div className="absolute inset-x-8 inset-y-8 flex flex-col justify-between pb-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-xs font-semibold text-white/76 backdrop-blur">
              <MapPinned className="h-4 w-4 text-[#F5DCE0]" />
              {heroBadgeLabel}
            </div>
            <div>
              <p className="max-w-[440px] text-[clamp(42px,4.8vw,72px)] font-semibold leading-[0.92] tracking-normal text-white">
                旧照片
                <span className="block text-[#F5AFC0]">新地图</span>
              </p>
              <p className="mt-4 max-w-[380px] text-sm font-medium leading-7 text-white/68">
                左侧保留原来的回忆照片氛围，右侧是更清爽的账号入口，属于沈先生和张小姐的 Space of us。
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100dvh-32px)] items-center justify-center">
          <motion.div
            className="w-full max-w-[720px] rounded-[8px] border border-white/76 bg-white/66 p-5 shadow-[0_34px_100px_rgba(91,71,50,0.14)] backdrop-blur-2xl sm:p-7"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48 }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BrandHeart />
                <div>
                  <p className="text-lg font-semibold text-[#273846]">Space of us</p>
                  <p className="text-xs font-semibold text-[#5A6670]/52">
                    {adminPanel ? "Admin Console" : "Private Couple Space"}
                  </p>
                </div>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-full border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 text-[#5A6670]/56">
                {adminPanel ? <ShieldCheck className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
              </span>
            </div>

            {!adminPanel ? (
              <>
                <div className="mt-7 w-fit rounded-[8px] border border-[#D8DDD8]/74 bg-[#FAFBF7]/64 p-1">
                  <div className="grid grid-cols-3 gap-1">
                    {authModes.map((item) => (
                      <button
                        key={item.key}
                        className={`min-h-10 min-w-20 rounded-[7px] px-3 text-sm font-semibold transition ${
                          mode === item.key
                            ? "bg-white text-[#D86F82] shadow-[0_10px_24px_rgba(90,102,112,0.08)]"
                            : "text-[#5A6670]/58 hover:bg-white/58 hover:text-[#344451]"
                        }`}
                        type="button"
                        onClick={() => {
                          setMode(item.key);
                          resetTransient();
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-7">
                  <h1 className="text-[clamp(32px,5vw,54px)] font-semibold leading-tight tracking-normal text-[#273846]">
                    {mode === "register" ? "创建账号" : mode === "recover" ? "找回密码" : "欢迎回来"}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
                    {mode === "register"
                      ? "注册普通用户时，需要先通过图形验证码并完成邮箱验证。"
                      : mode === "recover"
                        ? renderRecoverHint()
                        : "输入你的账号信息，继续回到属于你们的地图。"}
                  </p>
                </div>

                <div className="mt-6 grid gap-3">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-[#5A6670]/52">
                      {mode === "login" || mode === "recover" ? "用户名或邮箱" : "用户名"}
                    </span>
                    <span className="flex min-h-12 items-center gap-3 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/74 px-3 transition focus-within:border-[#E8B8C2]">
                      <UserRound className="h-4 w-4 text-[#5A6670]/42" />
                      <input
                        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#344451] outline-none placeholder:text-[#5A6670]/36"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder={mode === "login" || mode === "recover" ? "输入用户名或邮箱" : "输入用户名"}
                        autoComplete="username"
                      />
                    </span>
                  </label>

                  {mode === "register" && (
                    <>
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold text-[#5A6670]/52">昵称</span>
                        <span className="flex min-h-12 items-center gap-3 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/74 px-3 transition focus-within:border-[#E8B8C2]">
                          <UserPlus className="h-4 w-4 text-[#5A6670]/42" />
                          <input
                            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#344451] outline-none placeholder:text-[#5A6670]/36"
                            value={displayName}
                            onChange={(event) => setDisplayName(event.target.value)}
                            placeholder="显示给对方看的昵称"
                          />
                        </span>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold text-[#5A6670]/52">邮箱</span>
                        <span className="flex min-h-12 items-center gap-3 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/74 px-3 transition focus-within:border-[#E8B8C2]">
                          <Mail className="h-4 w-4 text-[#5A6670]/42" />
                          <input
                            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#344451] outline-none placeholder:text-[#5A6670]/36"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="用于注册验证和密码找回"
                            autoComplete="email"
                          />
                        </span>
                      </label>
                    </>
                  )}

                  {mode !== "recover" && (
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[#5A6670]/52">密码</span>
                      <span className="flex min-h-12 items-center gap-3 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/74 px-3 transition focus-within:border-[#E8B8C2]">
                        <LockKeyhole className="h-4 w-4 text-[#5A6670]/42" />
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#344451] outline-none placeholder:text-[#5A6670]/36"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") void submit();
                          }}
                          placeholder="输入密码"
                          type={showPassword ? "text" : "password"}
                          autoComplete={mode === "register" ? "new-password" : "current-password"}
                        />
                        <button
                          className="grid h-8 w-8 place-items-center rounded-full text-[#5A6670]/46 transition hover:bg-[#D8DDD8]/30 hover:text-[#344451]"
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
                    <div className="grid gap-3 rounded-[8px] border border-[#E9E2D6] bg-[#FAFBF7]/66 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-[#5A6670]/56">图形验证码</p>
                        <button
                          className="inline-flex items-center gap-1 rounded-full border border-[#D8DDD8]/80 px-3 py-1 text-xs font-semibold text-[#5A6670]/58"
                          type="button"
                          onClick={() => void ensureCaptcha()}
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                          换一张
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                        <button
                          className="overflow-hidden rounded-[8px] border border-[#D8DDD8]/80 bg-white/70 p-0"
                          type="button"
                          onClick={() => void ensureCaptcha()}
                        >
                          {captchaSrc ? (
                            <Image alt="图形验证码" src={captchaSrc} width={150} height={52} className="h-14 w-full object-cover" unoptimized />
                          ) : (
                            <span className="grid h-14 place-items-center text-xs text-[#5A6670]/52">点击加载验证码</span>
                          )}
                        </button>
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-[#5A6670]/52">输入验证码</span>
                          <input
                            className="min-h-12 w-full rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/74 px-3 text-sm font-medium text-[#344451] outline-none transition focus:border-[#E8B8C2]"
                            value={captchaAnswer}
                            onChange={(event) => setCaptchaAnswer(event.target.value)}
                            placeholder="不区分大小写"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {mode === "register" && (
                    <div className="grid gap-3 rounded-[8px] border border-[#E9E2D6] bg-[#FAFBF7]/66 p-4">
                      <div className="flex flex-wrap items-end gap-3 sm:grid sm:grid-cols-[1fr_auto]">
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-[#5A6670]/52">邮箱验证码</span>
                          <input
                            className="min-h-12 w-full rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/74 px-3 text-sm font-medium text-[#344451] outline-none transition focus:border-[#E8B8C2]"
                            value={emailCode}
                            onChange={(event) => setEmailCode(event.target.value.toUpperCase())}
                            placeholder="输入收到的验证码"
                          />
                        </label>
                        <button
                          className="inline-flex min-h-12 items-center justify-center rounded-[8px] border border-[#D8DDD8]/82 bg-white/70 px-4 text-sm font-semibold text-[#5A6670] transition hover:border-[#E8B8C2] hover:text-[#D86F82]"
                          type="button"
                          onClick={() => void sendRegisterCode()}
                          disabled={!email.trim() || !captchaAnswer.trim() || status === "checking" || registerCodeCooldown > 0}
                        >
                          {registerCodeCooldown > 0 ? `${registerCodeCooldown}s 后重发` : "获取邮箱验证码"}
                        </button>
                      </div>
                      <p className="text-xs leading-6 text-[#5A6670]/50">
                        发送验证码前会先校验图形验证码；同一个邮箱需要等待 1 分钟冷却后才能再次发送。
                      </p>
                    </div>
                  )}

                  {mode === "recover" && recoverStage === "verify-code" && (
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[#5A6670]/52">邮箱验证码</span>
                      <input
                        className="min-h-12 w-full rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/74 px-3 text-sm font-medium text-[#344451] outline-none transition focus:border-[#E8B8C2]"
                        value={emailCode}
                        onChange={(event) => setEmailCode(event.target.value.toUpperCase())}
                        placeholder="输入邮箱里收到的验证码"
                      />
                    </label>
                  )}

                  {mode === "recover" && recoverStage === "reset-password" && (
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[#5A6670]/52">新密码</span>
                      <span className="flex min-h-12 items-center gap-3 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/74 px-3 transition focus-within:border-[#E8B8C2]">
                        <LockKeyhole className="h-4 w-4 text-[#5A6670]/42" />
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#344451] outline-none placeholder:text-[#5A6670]/36"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          placeholder="设置新的登录密码"
                          type={showPassword ? "text" : "password"}
                        />
                      </span>
                    </label>
                  )}
                </div>

                <div className="mt-4 min-h-6 text-xs font-semibold text-[#5A6670]/52">
                  <span className={status === "wrong" ? "text-[#D86F82]" : status === "done" ? "text-[#6E9B7C]" : ""}>
                    {message}
                  </span>
                </div>

                <button
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#273846] px-4 text-sm font-semibold text-white shadow-[0_20px_46px_rgba(39,56,70,0.18)] transition hover:-translate-y-0.5 hover:bg-[#D86F82] disabled:opacity-55"
                  type="button"
                  onClick={() => void submit()}
                  disabled={status === "checking"}
                >
                  {status === "checking" ? "处理中" : primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>

                {mode === "recover" && recoverStage !== "request-code" && (
                  <button
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-4 text-sm font-semibold text-[#5A6670]"
                    type="button"
                    onClick={() => {
                      setRecoverStage("request-code");
                      setEmailCode("");
                      setRecoverGrantToken("");
                      setRecoverMaskedEmail("");
                      setNewPassword("");
                      setMessage("");
                    }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    重新开始找回流程
                  </button>
                )}

                <div className="hidden rounded-[8px] border border-[#F0E6D8] bg-[#FAFBF7]/76 px-4 py-3 text-xs leading-6 text-[#5A6670]/58">
                  当前公开入口仍然是国际托管。换设备登录后，数据会从云端同步；若中国大陆网络访问偏慢，可以稍后重试或切换网络。
                </div>

                {mode !== "recover" && <AccountBindingPanel compact className="mt-4" />}
              </>
            ) : (
              <div className="mt-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-[clamp(30px,5vw,48px)] font-semibold leading-tight tracking-normal text-[#273846]">
                      管理界面
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
                      管理员可以进入主站功能，并查看注册用户、绑定状态和系统提醒。
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/74 px-3 text-sm font-semibold text-[#5A6670]"
                      type="button"
                      onClick={() => void loadAdminData()}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      刷新
                    </button>
                    <button
                      className="inline-flex min-h-10 items-center gap-2 rounded-[8px] border border-[#F5DCE0] bg-[#F5DCE0]/54 px-3 text-sm font-semibold text-[#D86F82]"
                      type="button"
                      onClick={() => void logoutAdmin()}
                    >
                      <LogOut className="h-4 w-4" />
                      退出后台
                    </button>
                  </div>
                </div>

                {alerts.length > 0 && (
                  <div className="mt-5 rounded-[8px] border border-[#F5B8C6]/70 bg-[#FFF1F4]/76 p-4 shadow-[0_18px_46px_rgba(216,111,130,0.10)]">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/72 text-[#D86F82]">
                        <AlertTriangle className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#8F4152]">系统提醒</p>
                        <div className="mt-2 space-y-2">
                          {alerts.slice(0, 3).map((alert) => (
                            <div key={alert.id} className="rounded-[7px] border border-white/70 bg-white/62 px-3 py-2">
                              <p className="text-sm font-semibold text-[#344451]">{alert.title}</p>
                              <p className="mt-1 text-xs leading-5 text-[#5A6670]/62">{alert.message}</p>
                              <p className="mt-1 text-[11px] font-semibold text-[#5A6670]/42">
                                {formatDateTime(alert.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[8px] border border-white/70 bg-white/58 p-4">
                    <p className="text-xs font-semibold text-[#5A6670]/48">注册用户</p>
                    <p className="mt-1 text-3xl font-semibold text-[#273846]">{users.length}</p>
                  </div>
                  <div className="rounded-[8px] border border-white/70 bg-white/58 p-4">
                    <p className="text-xs font-semibold text-[#5A6670]/48">已绑定用户</p>
                    <p className="mt-1 text-3xl font-semibold text-[#273846]">
                      {users.filter((user) => Boolean(user.partnerUserId)).length}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-white/70 bg-white/58 p-4">
                    <p className="text-xs font-semibold text-[#5A6670]/48">待处理邀请</p>
                    <p className="mt-1 text-3xl font-semibold text-[#273846]">
                      {users.reduce(
                        (total, user) =>
                          total + (user.bindingRequests ?? []).filter((request) => request.status === "pending").length,
                        0,
                      )}
                    </p>
                  </div>
                </div>

                <div className="relative mt-5 overflow-hidden rounded-[8px] border border-white/72 bg-white/58 p-5 shadow-[0_22px_64px_rgba(90,102,112,0.10)] backdrop-blur-2xl">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(245,220,224,0.55),transparent_28%),radial-gradient(circle_at_90%_18%,rgba(214,232,240,0.62),transparent_34%)]" />
                  <div className="relative flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-white/80 bg-white/62 text-[#D86F82]">
                      <LayoutDashboard className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#344451]">主站功能</p>
                      <p className="mt-1 text-xs text-[#5A6670]/50">像启动台一样快速进入每个页面。</p>
                    </div>
                  </div>
                  <div className="relative mt-4 grid gap-3 sm:grid-cols-5">
                    {adminQuickLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-[8px] border border-white/72 bg-white/54 px-3 text-sm font-semibold text-[#5A6670] shadow-[0_12px_30px_rgba(90,102,112,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#E8B8C2] hover:bg-white/72 hover:text-[#D86F82]"
                          type="button"
                          onClick={() => router.push(item.href)}
                        >
                          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#FAFBF7]/78 text-[#5A6670]/70 transition group-hover:scale-110 group-hover:bg-[#F5DCE0]/72 group-hover:text-[#D86F82]">
                            <Icon className="h-5 w-5" />
                          </span>
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 rounded-[8px] border border-[#D8DDD8]/76 bg-[#FAFBF7]/72 p-4">
                  <p className="text-sm font-semibold text-[#344451]">帮用户重置密码</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-white/70 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                      value={resetUser}
                      onChange={(event) => setResetUser(event.target.value)}
                      placeholder="用户名"
                    />
                    <input
                      className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-white/70 px-3 text-sm outline-none transition focus:border-[#E8B8C2]"
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                      placeholder="新密码"
                      type="password"
                    />
                    <button
                      className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#273846] px-4 text-sm font-semibold text-white disabled:opacity-50"
                      type="button"
                      onClick={() => void adminResetPassword()}
                      disabled={!resetUser.trim() || !resetPassword.trim()}
                    >
                      重置
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-[8px] border border-[#D8DDD8]/76 bg-[#FAFBF7]/72 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <UsersRound className="h-4 w-4 text-[#D86F82]" />
                      <p className="text-sm font-semibold text-[#344451]">注册用户详情</p>
                    </div>
                    <span className="text-xs font-semibold text-[#5A6670]/48">{users.length} 人</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#5A6670]/48">
                    后台不会显示用户密码，只显示账号、邮箱、绑定和邀请状态。
                  </p>
                  <div className="mt-3 max-h-[420px] space-y-3 overflow-auto pr-1">
                    {users.length === 0 && (
                      <p className="rounded-[7px] border border-dashed border-[#D8DDD8] px-4 py-8 text-center text-sm text-[#5A6670]/52">
                        暂无注册用户。
                      </p>
                    )}
                    {users.map((user) => (
                      <div key={user.id} className="rounded-[7px] border border-white/70 bg-white/66 px-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#344451]">{user.displayName}</p>
                            <p className="mt-1 text-xs text-[#5A6670]/48">@{user.username}</p>
                          </div>
                          <button
                            className="rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 py-2 text-xs font-semibold text-[#5A6670]"
                            type="button"
                            onClick={() => setResetUser(user.username)}
                          >
                            选择重置
                          </button>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs leading-5 text-[#5A6670]/58 sm:grid-cols-2">
                          <p>
                            <span className="font-semibold text-[#344451]">用户 ID：</span>
                            <span className="select-all">{user.id}</span>
                          </p>
                          <p>
                            <span className="font-semibold text-[#344451]">邮箱：</span>
                            {user.email || "未绑定"}
                          </p>
                          <p>
                            <span className="font-semibold text-[#344451]">邮箱验证：</span>
                            {user.emailVerifiedAt ? `已验证 · ${formatDateTime(user.emailVerifiedAt)}` : "未验证"}
                          </p>
                          <p>
                            <span className="font-semibold text-[#344451]">密码更新时间：</span>
                            {formatDateTime(user.passwordUpdatedAt)}
                          </p>
                          <p>
                            <span className="font-semibold text-[#344451]">注册时间：</span>
                            {formatDateTime(user.createdAt)}
                          </p>
                          <p>
                            <span className="font-semibold text-[#344451]">最近登录：</span>
                            {formatDateTime(user.lastLoginAt)}
                          </p>
                          <p>
                            <span className="font-semibold text-[#344451]">绑定对象：</span>
                            {user.partnerDisplayName || user.partnerUsername || "未绑定"}
                          </p>
                          <p>
                            <span className="font-semibold text-[#344451]">邀请记录：</span>
                            {(user.bindingRequests ?? []).length} 条
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </section>
      </div>
    </main>
  );
}
