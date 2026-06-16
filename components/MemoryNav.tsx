"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Archive,
  ExternalLink,
  BookOpen,
  CalendarDays,
  HandHeart,
  Heart,
  Map as MapIcon,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { APP_VERSION } from "@/lib/appVersion";

export type MemoryNavKey =
  | "map"
  | "couple"
  | "memories"
  | "favorites"
  | "anniversaries"
  | "capsule"
  | "settings";

const navItems = [
  { key: "map", label: "地图", icon: MapIcon, href: "/map" },
  { key: "couple", label: "情侣中心", icon: Heart, href: "/couple" },
  { key: "memories", label: "回忆记录", icon: BookOpen, href: "/memories" },
  { key: "favorites", label: "地点收藏", icon: Heart, href: "/favorites" },
  { key: "anniversaries", label: "纪念日", icon: CalendarDays, href: "/anniversaries" },
  { key: "capsule", label: "时光宝盒", icon: Archive, href: "/time-capsule" },
  { key: "settings", label: "设置", icon: Settings, href: "/settings" },
] satisfies Array<{
  key: MemoryNavKey;
  label: string;
  icon: typeof MapIcon;
  href: string;
}>;

export function MemorySidebar({ active }: Readonly<{ active: MemoryNavKey }>) {
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportPreviewOpen, setSupportPreviewOpen] = useState(false);

  useEffect(() => {
    if (!supportOpen && !supportPreviewOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (supportPreviewOpen) {
          setSupportPreviewOpen(false);
          return;
        }
        setSupportOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [supportOpen, supportPreviewOpen]);

  return (
    <aside className="hidden min-h-screen w-[260px] shrink-0 border-r border-[#D8DDD8]/78 bg-[#FAFBF7]/78 px-5 py-8 shadow-[12px_0_34px_rgba(90,102,112,0.04)] backdrop-blur lg:block">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center">
          <Heart className="h-10 w-10 fill-[#F5DCE0] text-[#E8B8C2]" />
        </div>
        <p className="mt-2 text-lg font-semibold text-[#5A6670]">我们的地图</p>
        <p className="mt-1 text-xs text-[#5A6670]/52">只属于两个人的回忆空间</p>
      </div>

      <nav className="mt-10 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = item.key === active;

          return (
            <Link
              key={item.key}
              className={`flex w-full items-center gap-3 rounded-[8px] border px-4 py-3 text-sm font-medium transition ${
                selected
                  ? "border-[#F5DCE0] bg-[#F5DCE0]/52 text-[#D86F82]"
                  : "border-transparent text-[#5A6670]/72 hover:border-[#D8DDD8] hover:bg-[#FAFBF7]"
              }`}
              href={item.href}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 rounded-[8px] border border-[#D8DDD8]/72 bg-[#FAFBF7]/72 p-4 text-sm leading-7 text-[#5A6670]/62 shadow-[0_12px_26px_rgba(90,102,112,0.05)]">
        在地图的每个角落，慢慢收藏你们一起走过、想去、想记住的故事。
        <Heart className="ml-1 inline h-3.5 w-3.5 fill-[#F5DCE0] text-[#E8B8C2]" />
      </div>

      <div className="mt-4 overflow-hidden rounded-[8px] border border-[#D8DDD8]/72 bg-[#FAFBF7]/72 p-4 shadow-[0_12px_26px_rgba(90,102,112,0.05)]">
        <div className="flex items-center gap-2">
          <Heart className="h-3.5 w-3.5 fill-[#F5DCE0] text-[#E8B8C2]" />
          <p className="text-xs font-semibold text-[#5A6670]">关于这个空间</p>
        </div>
        <p className="mt-2 text-xs leading-6 text-[#5A6670]/60">
          这里用来装下两个人的城市足迹、纪念日、心愿清单，还有那些只想留给彼此的小约定。
        </p>

        <div className="mt-3 border-t border-[#D8DDD8]/54 pt-3">
          <p className="text-[11px] font-semibold text-[#5A6670]/48">这里会记录什么</p>
          <p className="mt-1 text-xs leading-6 text-[#5A6670]/60">
            想吃的小店、想喝的奶茶、想一起去的地方、已经发生的瞬间，都可以被轻轻放进 Space of us。
          </p>
        </div>

        <div className="mt-3 border-t border-[#D8DDD8]/54 pt-3">
          <p className="text-[11px] font-semibold text-[#5A6670]/48">我们的约定</p>
          <div className="mt-2 rounded-[7px] border border-[#F5DCE0]/70 bg-[#F5DCE0]/28 px-3 py-2 text-xs leading-6 text-[#5A6670]/64">
            不赶时间，不怕遗忘。把喜欢的事情一件件存下来，等有空的时候一起完成。
          </div>
        </div>

        <div className="mt-3 border-t border-[#D8DDD8]/54 pt-3">
          <p className="text-[11px] font-semibold text-[#5A6670]/48">灵感来源</p>
          <div className="mt-2 space-y-2 text-xs leading-6 text-[#5A6670]/60">
            <p>
              GitHub：
              <a
                className="ml-1 inline-flex items-center gap-1 text-[#D86F82] underline decoration-[#F5DCE0] underline-offset-2 transition hover:text-[#C95A70]"
                href="https://github.com/zkeyoned/map-of-us-template"
                rel="noreferrer"
                target="_blank"
              >
                github.com/zkeyoned/map-of-us-template
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            <p>抖音 ID：Zz00726yd</p>
          </div>
        </div>

        <div className="mt-3 border-t border-[#D8DDD8]/54 pt-3">
          <p className="text-[11px] font-semibold text-[#5A6670]/48">赞助支持</p>
          <p className="mt-2 text-xs leading-6 text-[#5A6670]/60">
            如果这个项目对你有帮助，愿意的话可以通过赞助支持继续完善 Space of us。
          </p>
          <button
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[7px] border border-[#F5DCE0] bg-[#F5DCE0]/34 px-3 py-2 text-xs font-semibold text-[#D86F82] transition hover:border-[#E8B8C2] hover:bg-[#F5DCE0]/52"
            type="button"
            onClick={() => setSupportOpen(true)}
          >
            <HandHeart className="h-3.5 w-3.5" />
            愿意支持
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#D8DDD8]/54 pt-3 text-[11px] font-semibold text-[#E8B8C2]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Space of us</span>
          </div>
          <span className="rounded-full border border-[#F5DCE0]/80 bg-[#F5DCE0]/24 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[#D86F82]">
            {APP_VERSION}
          </span>
        </div>
      </div>

      {supportOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#344451]/66 px-6 py-10 backdrop-blur-sm"
          onClick={() => setSupportOpen(false)}
        >
          <div
            className="relative max-h-full w-full max-w-[980px] overflow-auto rounded-[12px] bg-white p-3 shadow-[0_28px_80px_rgba(52,68,81,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label="关闭赞助图片"
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D8DDD8]/80 bg-white/88 text-[#5A6670] transition hover:border-[#E8B8C2] hover:text-[#D86F82]"
              type="button"
              onClick={() => setSupportOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <button
              className="relative mx-auto block w-full max-w-[920px]"
              type="button"
              onClick={() => setSupportPreviewOpen(true)}
            >
              <Image
                alt="赞助支持收款码"
                className="h-auto w-full rounded-[8px]"
                height={1599}
                priority
                src="/photos/support-qr.jpg"
                width={1280}
              />
            </button>
          </div>
        </div>
      )}
      {supportPreviewOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-[#161F27]/88 px-4 py-6 backdrop-blur-md"
          onClick={() => setSupportPreviewOpen(false)}
        >
          <button
            aria-label="Close full preview"
            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20"
            type="button"
            onClick={() => setSupportPreviewOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="max-h-full w-full overflow-auto" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto w-full max-w-[1280px]">
              <Image
                alt="Support QR preview"
                className="h-auto w-full rounded-[10px]"
                height={1599}
                src="/photos/support-qr.jpg"
                width={1280}
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export function MemoryPageShell({
  active,
  children,
}: Readonly<{
  active: MemoryNavKey;
  children: ReactNode;
}>) {
  const [adminSession, setAdminSession] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/accounts", { cache: "no-store" })
      .then((response) => {
        if (!cancelled) setAdminSession(response.ok);
      })
      .catch(() => {
        if (!cancelled) setAdminSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FAFBF7] text-[#5A6670]">
      <div className="map-mist-band" aria-hidden="true" />
      <span className="absolute left-[38%] top-[9%] h-2 w-2 bg-[#F5DCE0]" aria-hidden="true" />
      <span className="absolute right-[17%] top-[15%] h-2 w-2 bg-[#D6E8F0]" aria-hidden="true" />
      <div className="relative z-10 flex min-h-screen">
        <MemorySidebar active={active} />
        <section className="min-w-0 flex-1 px-6 py-8 sm:px-10">{children}</section>
      </div>
      {adminSession && (
        <Link
          className="fixed bottom-5 right-5 z-50 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/72 bg-white/70 px-4 text-sm font-semibold text-[#344451] shadow-[0_18px_46px_rgba(90,102,112,0.18)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-[#E8B8C2] hover:text-[#D86F82]"
          href="/"
        >
          <ShieldCheck className="h-4 w-4" />
          返回控制台
        </Link>
      )}
    </main>
  );
}
