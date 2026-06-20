import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, Heart, LogIn, ShieldCheck } from "lucide-react";
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
  return (
    <main className="theme-page relative min-h-[100dvh] overflow-hidden">
      <div className="map-mist-band" aria-hidden="true" />
      <Cloud src="/sprites/decorations/cloud-medium.png" className="left-[14%] top-[14%] w-28" />
      <Cloud src="/sprites/decorations/cloud-large.png" className="right-[26%] top-[11%] w-36" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
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
              游客预览
            </span>
          </div>

          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--hero-ink)] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--accent-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-wash)]"
            href="/login"
          >
            <LogIn className="h-4 w-4" />
            登录进入自己的空间
          </Link>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <section className="relative flex min-h-[62vh] min-w-0 flex-1 items-center justify-center px-3 pb-20 sm:px-8 lg:min-h-0 lg:pb-8">
            <ChinaMap
              className="w-[min(100%,1060px)]"
              demoLitProvinceIds={guestDemoLitProvinceIds}
              height={860}
              readOnly
              width={1100}
            />

            <div className="absolute bottom-5 left-5 flex items-end gap-3 sm:left-9">
              <SouthChinaSeaInset />
              <div className="theme-card hidden rounded-[12px] border px-4 py-3 text-xs theme-text-muted sm:block">
                <p className="font-semibold theme-text-main">只读地图</p>
                <p className="mt-1">可以缩放和查看省份名称，不会保存任何内容。</p>
              </div>
            </div>
          </section>

          <aside className="theme-shell flex w-full shrink-0 flex-col border-t px-5 py-6 lg:w-[320px] lg:border-l lg:border-t-0 lg:px-7 lg:py-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-primary)]">
              <ShieldCheck className="h-4 w-4" />
              与真实用户数据完全隔离
            </div>

            <h1 className="theme-text-main mt-5 text-2xl font-semibold leading-tight text-balance">
              先看看地图，
              <br />
              再进入你们的空间。
            </h1>
            <p className="theme-text-muted mt-4 text-sm leading-7">
              {guestDemoSummary.description}
              游客不会获得账户会话，也不能编辑、上传或查看任何私人内容。
            </p>

            <div className="theme-divider mt-7 border-t pt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="theme-text-soft text-xs font-semibold">样例点亮省份</p>
                  <p className="theme-text-main mt-2 text-3xl font-semibold">
                    {guestDemoSummary.provinceCount}
                    <span className="theme-text-soft ml-1 text-sm">/ {TOTAL_PROVINCES}</span>
                  </p>
                </div>
                <Heart className="h-6 w-6 fill-[var(--accent-highlight)] text-[var(--accent-primary)]" />
              </div>
              <div className="theme-muted mt-3 h-2 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)]"
                  style={{
                    width: `${(guestDemoSummary.provinceCount / TOTAL_PROVINCES) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-auto pt-8">
              <Link
                className="theme-card-strong theme-text-main flex min-h-12 items-center justify-between gap-3 rounded-[12px] border px-4 text-sm font-semibold transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-wash)]"
                href="/login"
              >
                <span>登录、注册或找回密码</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="theme-text-soft mt-3 text-center text-xs leading-5">
                登录后才能进入地图、回忆、情侣中心和设置。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
