"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  AlertTriangle,
  CalendarDays,
  Eye,
  EyeOff,
  Heart,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MapPinned,
  RefreshCcw,
  ShieldCheck,
  UsersRound,
  UserPlus,
  UserRound,
} from "lucide-react";
import type { PublicUserAccount } from "@/data/accounts";
import type { AdminAlert } from "@/data/adminAlerts";
import AccountBindingPanel from "@/components/AccountBindingPanel";
import { LocalPrivacyBadge, LocalPrivacyImage } from "@/components/LocalPrivacyImage";

const loginPhotoVersion = "placeholder-20260601";
const loginPhotoPath = (fileName: string) => `/photos/login/${fileName}.jpg?v=${loginPhotoVersion}`;

type AuthMode = "login" | "register" | "recover";
type Status = "idle" | "checking" | "wrong" | "open" | "done";

const authModes: Array<{ key: AuthMode; label: string }> = [
  { key: "login", label: "登录" },
  { key: "register", label: "注册" },
  { key: "recover", label: "找回" },
];

const isAdminName = (value: string) =>
  value.trim().toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_USERNAME || "admin").toLowerCase();

const formatDateTime = (value?: string) => {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无";
  return date.toLocaleString("zh-CN");
};

const adminQuickLinks = [
  { label: "地图主页", href: "/map", icon: MapPinned },
  { label: "情侣中心", href: "/couple", icon: Heart },
  { label: "回忆记录", href: "/memories", icon: LayoutDashboard },
  { label: "纪念日", href: "/anniversaries", icon: CalendarDays },
  { label: "系统设置", href: "/settings", icon: ShieldCheck },
];

function BrandHeart() {
  return (
    <span className="grid h-12 w-12 place-items-center rounded-full border border-white/72 bg-white/62 text-[#D86F82] shadow-[0_16px_38px_rgba(216,111,130,0.16)] backdrop-blur-xl">
      <Heart className="h-6 w-6 fill-[#D86F82]" />
    </span>
  );
}

const postJson = async (url: string, payload: Record<string, unknown>) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorPayload?.error ?? "Request failed");
  }
  return response.json() as Promise<unknown>;
};

export default function EntryExperience() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<PublicUserAccount[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [adminPanel, setAdminPanel] = useState(false);
  const [resetUser, setResetUser] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 70, damping: 24 });
  const smoothY = useSpring(pointerY, { stiffness: 70, damping: 24 });
  const driftX = useTransform(smoothX, [-0.5, 0.5], [-18, 18]);
  const driftY = useTransform(smoothY, [-0.5, 0.5], [-12, 12]);
  const reverseX = useTransform(smoothX, [-0.5, 0.5], [14, -14]);

  const loadUsers = async () => {
    const response = await fetch("/api/accounts", { cache: "no-store" });
    if (!response.ok) throw new Error("Load users failed");
    const payload = (await response.json()) as { users?: PublicUserAccount[] };
    setUsers(payload.users ?? []);
  };

  const loadAlerts = async () => {
    const response = await fetch("/api/admin-alerts", { cache: "no-store" });
    if (!response.ok) {
      setAlerts([]);
      return;
    }
    const payload = (await response.json()) as { alerts?: AdminAlert[] };
    setAlerts(payload.alerts ?? []);
  };

  const loadAdminData = async () => {
    await Promise.all([loadUsers(), loadAlerts()]);
  };

  const submit = async () => {
    if (status === "checking") return;
    setStatus("checking");
    setMessage("");

    try {
      if (mode === "register") {
        await postJson("/api/accounts", {
          action: "register",
          username,
          displayName: displayName.trim() || username.trim(),
          password,
          recoveryPhrase: recoveryPhrase.trim() || password,
        });
        setStatus("done");
        setMode("login");
        setPassword("");
        setMessage("注册成功，现在可以用这个账号登录。");
        return;
      }

      if (mode === "recover") {
        await postJson("/api/accounts", {
          action: "resetPassword",
          username,
          recoveryPhrase,
          newPassword,
        });
        setStatus("done");
        setMode("login");
        setPassword(newPassword);
        setMessage("密码已重置，请使用新密码登录。");
        return;
      }

      const adminLogin = isAdminName(username);
      await postJson("/api/auth/login", {
        mode: adminLogin ? "admin" : "site",
        username,
        password,
      });

      if (adminLogin) {
        await loadAdminData();
        setAdminPanel(true);
        setStatus("done");
        setMessage("管理员已登录。");
        return;
      }

      setStatus("open");
      window.setTimeout(() => router.push("/map"), 460);
    } catch (error) {
      setStatus("wrong");
      const detail = error instanceof Error ? error.message : "";
      if (detail.includes("Database is not configured")) {
        setMessage("数据库还没有连接完成，请先配置 Supabase 并重新部署。");
      } else if (mode === "register") {
        setMessage(
          detail === "Account already exists"
            ? "注册失败：用户名已经存在。"
            : "注册失败：用户名至少 2 位，密码至少 4 位。",
        );
      } else if (mode === "recover") {
        setMessage("找回失败：请确认用户名、找回口令和新密码。");
      } else {
        setMessage("账号或密码不正确，请重新确认。");
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
    } catch {
      setStatus("wrong");
      setMessage("重置失败，请确认用户存在。");
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
    setResetUser("");
    setResetPassword("");
    setStatus("idle");
    setMessage("");
  };

  const primaryLabel = mode === "register" ? "创建账号" : mode === "recover" ? "重置密码" : "进入网站";

  return (
    <main
      className="login-stage relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#F9F6EC] text-[#344451]"
      onPointerMove={(event) => {
        pointerX.set(event.clientX / window.innerWidth - 0.5);
        pointerY.set(event.clientY / window.innerHeight - 0.5);
      }}
    >
      <LocalPrivacyBadge />
      <div className="login-paper absolute inset-0" />
      <motion.div className="login-sun" style={{ x: reverseX }} aria-hidden="true" />
      <motion.div className="login-cloud login-cloud-a" style={{ x: driftX }} aria-hidden="true" />
      <motion.div className="login-cloud login-cloud-b" style={{ x: reverseX }} aria-hidden="true" />
      <div className="login-grid absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 grid min-h-[100dvh] gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)] lg:px-8">
        <section className="relative hidden min-h-0 overflow-hidden rounded-[8px] border border-[#DCCFC1]/86 bg-[#161F27] shadow-[0_28px_80px_rgba(91,71,50,0.12)] lg:block">
          <LocalPrivacyImage
            className="h-full w-full object-cover opacity-42 saturate-[1.08]"
            src={loginPhotoPath("hangzhou")}
            alt=""
            fill
            sizes="45vw"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,31,39,0.86),rgba(22,31,39,0.24)_50%,rgba(22,31,39,0.72)),radial-gradient(circle_at_72%_22%,rgba(245,220,224,0.24),transparent_34%)]" />
          <motion.div className="absolute inset-x-8 inset-y-8 flex flex-col justify-between pb-8" style={{ x: driftX, y: driftY }}>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-xs font-semibold text-white/76 backdrop-blur">
              <MapPinned className="h-4 w-4 text-[#F5DCE0]" />
              private album
            </div>
            <div>
              <p className="max-w-[440px] text-[clamp(42px,4.8vw,72px)] font-semibold leading-[0.92] tracking-normal text-white">
                旧照片
                <span className="block text-[#F5AFC0]">新地图</span>
              </p>
              <p className="mt-4 max-w-[360px] text-sm font-medium leading-7 text-white/68">
                左侧保留原来的回忆照片氛围，右侧是更清爽的账号入口，属于沈先生和张小姐的 Space of us。
              </p>
            </div>
          </motion.div>
        </section>

        <section className="flex min-h-[calc(100dvh-32px)] items-center justify-center">
          <motion.div
            className="w-full max-w-[620px] rounded-[8px] border border-white/76 bg-white/66 p-5 shadow-[0_34px_100px_rgba(91,71,50,0.14)] backdrop-blur-2xl sm:p-7"
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
                          setStatus("idle");
                          setMessage("");
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
                      ? "注册普通用户，设置密码和找回口令。"
                      : mode === "recover"
                        ? "使用注册时设置的找回口令重置密码。"
                        : "输入你的账号信息，继续回到属于你们的地图。"}
                  </p>
                </div>

                <div className="mt-6 grid gap-3">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-[#5A6670]/52">用户名</span>
                    <span className="flex min-h-12 items-center gap-3 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/74 px-3 transition focus-within:border-[#E8B8C2]">
                      <UserRound className="h-4 w-4 text-[#5A6670]/42" />
                      <input
                        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#344451] outline-none placeholder:text-[#5A6670]/36"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="输入用户名"
                        autoComplete="username"
                      />
                    </span>
                  </label>

                  {mode === "register" && (
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[#5A6670]/52">昵称</span>
                      <span className="flex min-h-12 items-center gap-3 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/74 px-3 transition focus-within:border-[#E8B8C2]">
                        <UserPlus className="h-4 w-4 text-[#5A6670]/42" />
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#344451] outline-none placeholder:text-[#5A6670]/36"
                          value={displayName}
                          onChange={(event) => setDisplayName(event.target.value)}
                          placeholder="显示给对方看的名字"
                        />
                      </span>
                    </label>
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

                  {(mode === "register" || mode === "recover") && (
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[#5A6670]/52">找回口令</span>
                      <span className="flex min-h-12 items-center gap-3 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/74 px-3 transition focus-within:border-[#E8B8C2]">
                        <KeyRound className="h-4 w-4 text-[#5A6670]/42" />
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#344451] outline-none placeholder:text-[#5A6670]/36"
                          value={recoveryPhrase}
                          onChange={(event) => setRecoveryPhrase(event.target.value)}
                          placeholder="只有你知道的一句话"
                        />
                      </span>
                    </label>
                  )}

                  {mode === "recover" && (
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[#5A6670]/52">新密码</span>
                      <span className="flex min-h-12 items-center gap-3 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/74 px-3 transition focus-within:border-[#E8B8C2]">
                        <LockKeyhole className="h-4 w-4 text-[#5A6670]/42" />
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#344451] outline-none placeholder:text-[#5A6670]/36"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          placeholder="设置新密码"
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
                  disabled={status === "checking" || status === "open"}
                >
                  {status === "checking" ? "处理中" : primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <AccountBindingPanel compact className="mt-4" />
              </>
            ) : (
              <div className="mt-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-[clamp(30px,5vw,48px)] font-semibold leading-tight tracking-normal text-[#273846]">
                      管理界面
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
                      管理员可进入主站功能，并查看注册用户的账号、绑定与邀请状态。
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
                      <p className="mt-1 text-xs text-[#5A6670]/50">像启动台一样快速进入每个页面</p>
                    </div>
                  </div>
                  <div className="relative mt-4 grid gap-3 sm:grid-cols-5">
                    {adminQuickLinks.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.href}
                          className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-[8px] border border-white/72 bg-white/54 px-3 text-sm font-semibold text-[#5A6670] shadow-[0_12px_30px_rgba(90,102,112,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#E8B8C2] hover:bg-white/72 hover:text-[#D86F82] hover:shadow-[0_20px_46px_rgba(90,102,112,0.11)]"
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
                    后台不会显示用户密码、找回口令或哈希值，只显示账号、绑定和邀请状态。
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
                            <p className="mt-1 text-xs text-[#5A6670]/48">{user.username}</p>
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
                            <span className="font-semibold text-[#344451]">显示名：</span>
                            {user.displayName || "未设置"}
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
                            <span className="font-semibold text-[#344451]">邀请码尾号：</span>
                            {user.bindingInviteCodePreview ? `**${user.bindingInviteCodePreview}` : "未生成"}
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
