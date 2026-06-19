import { CalendarDays, Heart, Inbox, LayoutDashboard, MapPinned, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type AuthMode = "login" | "register" | "recover";

export const authModes: Array<{ key: AuthMode; label: string }> = [
  { key: "login", label: "登录" },
  { key: "register", label: "注册" },
  { key: "recover", label: "找回" },
];

export const modeTitles: Record<AuthMode, string> = {
  login: "欢迎回来",
  register: "创建你们的入口",
  recover: "找回密码",
};

export const adminQuickLinks: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "地图主页", href: "/map", icon: MapPinned },
  { label: "情侣中心", href: "/couple", icon: Heart },
  { label: "回忆记录", href: "/memories", icon: LayoutDashboard },
  { label: "纪念日", href: "/anniversaries", icon: CalendarDays },
  { label: "用户反馈", href: "/admin/inbox", icon: Inbox },
  { label: "系统设置", href: "/settings", icon: ShieldCheck },
];

export const isAdminName = (value: string) =>
  value.trim().toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_USERNAME || "admin").toLowerCase();

export const formatDateTime = (value?: string) => {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无";
  return date.toLocaleString("zh-CN");
};

export const cleanErrorMessage = (value: string) => {
  if (!value) return "";
  if (value.includes("Mail service is not configured")) return "邮件服务尚未配置，请先检查 Resend 环境变量。";
  if (value.includes("Database is not configured")) return "数据库尚未配置，请先完成 Supabase 连接配置。";
  if (value.includes("Load users failed")) return "加载用户列表失败，请稍后再试。";
  if (value.includes("Invalid API key")) return "Supabase API Key 无效，请检查线上环境变量。";
  if (value.includes("Email already exists")) return "该邮箱已被使用，请更换一个。";
  if (value.includes("Account already exists")) return "该用户名已存在，请更换一个。";
  if (value.includes("Invalid captcha")) return "图形验证码错误，请重新输入。";
  if (value.includes("Captcha expired")) return "图形验证码已过期，请重新获取。";
  if (value.includes("Please wait before requesting another code")) return "请等待 1 分钟后再重新发送验证码。";
  if (value.includes("Daily email limit reached")) return "当天验证码发送次数已达上限，请明天再试。";
  return value;
};

export const captchaToSrc = (svg?: string) =>
  svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "";

export function BrandHeart(): ReactNode {
  return (
    <span className="grid h-12 w-12 place-items-center rounded-full border border-white/72 bg-white/62 text-[#D86F82] shadow-[0_16px_38px_rgba(216,111,130,0.16)] backdrop-blur-xl">
      <Heart className="h-6 w-6 fill-[#D86F82]" />
    </span>
  );
}
