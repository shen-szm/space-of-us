"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Camera, ExternalLink, Headphones, MapPin, Play, RefreshCw, SkipForward } from "lucide-react";
import { LocalPrivacyImage, LocalPrivacyImg } from "@/components/LocalPrivacyImage";
import { cities } from "@/data/cities";
import { memories, type Memory } from "@/data/memories";
import { memoryStoreUpdatedEvent, type LocalMemoryStore } from "@/data/progress";
import { musicRecommendations, type MusicRecommendation } from "@/lib/musicRecommendations";

interface RandomPhoto {
  id: string;
  src: string;
  city: string;
  cityId: string;
  date: string;
  text: string;
}

const isBrowserImageUrl = (url: string) => url.startsWith("data:image/") || url.startsWith("https://");

function collectMemories(localMemories: LocalMemoryStore) {
  const localItems = Object.values(localMemories).flat();
  const byId = new Map<string, Memory>();

  [...memories, ...localItems].forEach((memory) => {
    if (!memory.draft) byId.set(memory.id, memory);
  });

  return [...byId.values()];
}

function pickAnother<T extends { id: string }>(current: T | null, items: T[]) {
  if (!current || items.length === 0) return items[0] ?? null;
  const candidates = items.filter((item) => item.id !== current.id);
  const source = candidates.length > 0 ? candidates : items;
  return source[Math.floor(Math.random() * source.length)] ?? null;
}

function PhotoImage({ photo }: Readonly<{ photo: RandomPhoto }>) {
  const className = "h-full w-full object-cover";

  if (isBrowserImageUrl(photo.src)) {
    return <LocalPrivacyImg className={className} src={photo.src} alt={`${photo.city} 的回忆照片`} />;
  }

  return (
    <LocalPrivacyImage
      className={className}
      src={photo.src}
      alt={`${photo.city} 的回忆照片`}
      fill
      sizes="(min-width: 1280px) 360px, 100vw"
    />
  );
}

export function MusicRecommendationCard({ className = "" }: Readonly<{ className?: string }>) {
  const [track, setTrack] = useState<MusicRecommendation>(
    () => musicRecommendations[Math.floor(Math.random() * musicRecommendations.length)] ?? musicRecommendations[0],
  );

  const shuffleTrack = () => setTrack((current) => pickAnother(current, musicRecommendations) ?? musicRecommendations[0]);

  return (
    <section
      className={`theme-card theme-floating-shadow overflow-hidden rounded-[24px] border p-4 text-[#5A6670] backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="theme-icon-chip grid h-11 w-11 shrink-0 place-items-center rounded-[14px]">
            <Headphones className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="theme-text-main truncate text-sm font-semibold">今日音乐推荐</p>
            <p className="theme-text-soft truncate text-xs">给今天的地图配一首歌</p>
          </div>
        </div>
        <button
          className="theme-subtle-button inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold transition"
          type="button"
          onClick={shuffleTrack}
        >
          <SkipForward className="h-3.5 w-3.5" />
          换一首
        </button>
      </div>

      <div className="mt-4 rounded-[20px] border border-[var(--border-soft)] bg-[linear-gradient(140deg,color-mix(in_srgb,var(--accent-wash)_88%,white),color-mix(in_srgb,var(--accent-secondary)_22%,white))] p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-end rounded-[18px] border border-white/70 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--accent-primary)_16%,white),color-mix(in_srgb,var(--accent-secondary)_34%,white))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/72 text-[var(--hero-ink)] shadow-[0_8px_20px_rgba(70,82,92,0.12)]">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="theme-text-soft text-[11px] font-semibold uppercase tracking-[0.18em]">music recommendation</p>
            <p className="theme-text-main mt-1 truncate text-xl font-semibold">{track.title}</p>
            <p className="theme-text-muted mt-1 truncate text-sm font-medium">{track.artist}</p>
            <p className="theme-text-soft mt-3 text-xs leading-6">{track.note}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/68">
            <div
              className="h-full rounded-full bg-[var(--accent-primary)]"
              style={{ width: `${42 + (track.title.length % 4) * 12}%` }}
            />
          </div>
          <div className="theme-text-soft mt-2 flex items-center justify-between text-[11px] font-medium">
            <span>{track.mood}</span>
            <span>外链播放</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="theme-text-soft text-xs leading-6">点击后跳转到外部平台继续听，不在站内播放。</p>
        <a
          className="theme-accent-button inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition hover:-translate-y-0.5"
          href={track.href}
          rel="noreferrer"
          target="_blank"
        >
          去听这首
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

export default function RandomPhotoCard() {
  const [photo, setPhoto] = useState<RandomPhoto | null>(null);
  const [photos, setPhotos] = useState<RandomPhoto[]>([]);

  useEffect(() => {
    let cancelled = false;

    const applyMemories = (localMemories: LocalMemoryStore) => {
      const nextPhotos = collectMemories(localMemories).flatMap((memory) =>
        (memory.photos?.length ? memory.photos : [memory.image]).map((src, photoIndex) => ({
          id: `${memory.id}-${photoIndex}`,
          src,
          city: memory.city,
          cityId: memory.cityId,
          date: memory.date,
          text: memory.text,
        })),
      );

      setPhotos(nextPhotos);
      setPhoto(nextPhotos.length > 0 ? nextPhotos[Math.floor(Math.random() * nextPhotos.length)] : null);
    };

    const handleMemoryUpdate = (event: Event) => {
      const detail = (event as CustomEvent<LocalMemoryStore>).detail;
      if (detail) applyMemories(detail);
    };

    async function loadLocalMemories() {
      const response = await fetch("/api/memories", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) {
        if (!cancelled) applyMemories({});
        return;
      }

      const data = (await response.json().catch(() => null)) as { memories?: LocalMemoryStore } | null;
      if (!cancelled) applyMemories(data?.memories ?? {});
    }

    window.addEventListener(memoryStoreUpdatedEvent, handleMemoryUpdate);
    void loadLocalMemories();

    return () => {
      cancelled = true;
      window.removeEventListener(memoryStoreUpdatedEvent, handleMemoryUpdate);
    };
  }, []);

  const href = useMemo(() => {
    if (!photo) return "/memories";
    const city = cities.find((candidate) => candidate.id === photo.cityId);
    return city ? `/province/${city.provinceId}?city=${photo.cityId}` : "/memories";
  }, [photo]);

  const shufflePhoto = () => setPhoto((current) => pickAnother(current, photos));

  return (
    <aside className="absolute bottom-[4.75rem] right-[2.5rem] z-30 hidden w-[372px] xl:block">
      <div className="theme-card theme-floating-shadow-strong overflow-hidden rounded-[22px] border p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="theme-icon-chip grid h-10 w-10 shrink-0 place-items-center rounded-[12px]">
              <Camera className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="theme-text-main truncate text-sm font-semibold">随机回忆</p>
              <p className="theme-text-soft truncate text-xs">从已点亮的城市里抽一张照片出来</p>
            </div>
          </div>
          <button
            className="theme-subtle-button grid h-9 w-9 place-items-center rounded-full transition"
            type="button"
            onClick={shufflePhoto}
            disabled={!photo}
            aria-label="换一张回忆照片"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {photo ? (
          <Link className="mt-4 block" href={href} aria-label={`查看 ${photo.city} 的回忆`}>
            <div className="theme-muted relative aspect-[5/4] overflow-hidden rounded-[18px] border">
              <PhotoImage photo={photo} />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/22 to-transparent" />
            </div>
            <div className="mt-4 flex items-start gap-3">
              <span className="theme-icon-chip mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[10px]">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="theme-text-main truncate text-[15px] font-semibold leading-6">
                  {photo.city}
                  <span className="theme-text-soft ml-2 text-xs font-medium">{photo.date}</span>
                </p>
                <p className="theme-text-muted mt-1 line-clamp-2 text-sm leading-6">{photo.text}</p>
              </div>
            </div>
          </Link>
        ) : (
          <div className="theme-muted mt-4 rounded-[18px] border p-4">
            <div className="grid aspect-[5/4] place-items-center rounded-[16px] border border-dashed border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface-card)_72%,white)] text-center">
              <div>
                <Camera className="mx-auto h-8 w-8 text-[var(--accent-primary)]" />
                <p className="theme-text-main mt-3 text-sm font-semibold">这里还没有随机回忆</p>
                <p className="theme-text-soft mt-1 text-xs leading-6">
                  先去点亮城市、上传照片和文字，这里会自动开始轮播。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
