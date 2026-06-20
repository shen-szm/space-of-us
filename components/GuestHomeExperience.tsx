"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, Heart, ShieldCheck } from "lucide-react";
import ChinaMap, { SouthChinaSeaInset } from "@/components/ChinaMap";
import { guestDemoLitProvinceIds, guestDemoSummary } from "@/data/guestDemo";
import { TOTAL_PROVINCES } from "@/data/provinces";

function BrandMark() {
  return (
    <span className="grid h-11 w-11 place-items-center" aria-hidden="true">
      <Heart className="h-9 w-9 fill-[var(--accent-highlight)] text-[var(--accent-primary)]" />
    </span>
  );
}

function Cloud({ src, className }: Readonly<{ src: string; className: string }>) {
  return (
    <Image
      alt=""
      className={`pointer-events-none absolute pixelated opacity-20 ${className}`}
      height={54}
      priority
      src={src}
      unoptimized
      width={132}
    />
  );
}

export default function GuestHomeExperience() {
  const router = useRouter();
  const progress = (guestDemoSummary.provinceCount / TOTAL_PROVINCES) * 100;
  const openLogin = () => router.push("/login");

  return (
    <main
      className="theme-page group relative min-h-[100dvh] cursor-pointer overflow-hidden outline-none"
      onClick={openLogin}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLogin();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="点击进入登录页面"
    >
      <div className="map-mist-band" aria-hidden="true" />
      <Cloud src="/sprites/decorations/cloud-medium.png" className="left-[14%] top-[14%] w-28" />
      <Cloud src="/sprites/decorations/cloud-large.png" className="right-[26%] top-[11%] w-36" />

      <div className="pointer-events-none relative z-10 flex min-h-[100dvh] flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-9 sm:py-7">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="theme-text-main text-xl font-semibold leading-tight sm:text-[28px]">
                Space of us
              </p>
              <p className="theme-text-muted mt-1 text-xs font-medium sm:text-sm">公开地图预览</p>
            </div>
            <span className="theme-soft theme-text-muted ml-2 hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold sm:inline-flex">
              <Eye className="h-3.5 w-3.5" />
              游客只读
            </span>
          </div>

          <div className="theme-card-strong theme-text-main hidden rounded-full border px-4 py-2 text-sm font-semibold shadow-none sm:block">
            点击屏幕进入
          </div>
        </header>

        <section className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-24 pt-2 sm:px-8 sm:pb-28">
          <ChinaMap
            className="w-[min(100%,1120px)] transition duration-300 group-hover:scale-[1.01]"
            demoLitProvinceIds={guestDemoLitProvinceIds}
            height={860}
            readOnly
            width={1100}
          />

          <div className="absolute bottom-5 left-5 flex items-end gap-3 sm:left-9">
            <SouthChinaSeaInset />
            <div className="theme-card hidden rounded-[12px] border px-4 py-3 text-xs theme-text-muted sm:block">
              <p className="font-semibold theme-text-main">只读地图</p>
              <p className="mt-1">可以查看样例点亮省份，不会保存任何内容。</p>
            </div>
          </div>

          <div className="theme-shell absolute bottom-5 right-5 w-[min(300px,calc(100%-40px))] rounded-[16px] border px-5 py-4 shadow-none sm:right-9">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-primary)]">
              <ShieldCheck className="h-4 w-4" />
              与真实用户数据完全隔离
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="theme-text-soft text-xs font-semibold">样例点亮省份</p>
                <p className="theme-text-main mt-1 text-3xl font-semibold">
                  {guestDemoSummary.provinceCount}
                  <span className="theme-text-soft ml-1 text-sm">/ {TOTAL_PROVINCES}</span>
                </p>
              </div>
              <Heart className="h-6 w-6 fill-[var(--accent-highlight)] text-[var(--accent-primary)]" />
            </div>
            <div className="theme-muted mt-3 h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="theme-text-muted mt-3 text-xs leading-5 sm:hidden">点击屏幕进入</p>
          </div>
        </section>
      </div>
    </main>
  );
}
