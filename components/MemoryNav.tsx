"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Archive,
  BookOpen,
  CalendarDays,
  Heart,
  Map as MapIcon,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

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

        <div className="mt-3 flex items-center gap-2 border-t border-[#D8DDD8]/54 pt-3 text-[11px] font-semibold text-[#E8B8C2]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Space of us</span>
        </div>
      </div>
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
