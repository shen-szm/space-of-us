"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Camera, ExternalLink, Headphones, MapPin, RefreshCw, SkipForward } from "lucide-react";
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

function PixelMusicCover({
  track,
  className = "w-[88px]",
}: Readonly<{ track: MusicRecommendation; className?: string }>) {
  const { shell, glow, pixel, accent, ink } = track.palette;

  return (
    <div
      className={`pixelated relative grid aspect-square shrink-0 place-items-center overflow-hidden rounded-[16px] border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_14px_34px_rgba(60,44,36,0.12)] ${className}`}
      style={{ background: `linear-gradient(145deg, ${shell}, ${glow})` }}
    >
      <div className="absolute inset-[8px] rounded-[12px] border border-white/18 bg-black/16" />
      {track.cover.pattern === "sunset-grid" && (
        <>
          <div className="absolute inset-x-3 bottom-4 h-7 border-t-2 border-white/30" />
          <div className="absolute inset-x-3 bottom-4 h-7 bg-[linear-gradient(90deg,transparent_0_8px,rgba(255,255,255,0.18)_8px_9px)] bg-[length:10px_10px]" />
          <div
            className="absolute left-1/2 top-[26px] h-10 w-10 -translate-x-1/2 rounded-full"
            style={{ background: glow, boxShadow: `0 0 0 6px ${pixel}33` }}
          />
        </>
      )}
      {track.cover.pattern === "night-window" && (
        <>
          <div className="absolute left-4 top-4 grid grid-cols-3 gap-[3px]">
            {Array.from({ length: 9 }).map((_, index) => (
              <span key={index} className="h-3 w-3" style={{ background: index % 2 === 0 ? pixel : ink }} />
            ))}
          </div>
          <div className="absolute bottom-5 left-5 h-8 w-12 rounded-[3px]" style={{ background: `${accent}aa` }} />
        </>
      )}
      {track.cover.pattern === "peach-signal" && (
        <>
          <div className="absolute left-4 top-5 h-3 w-14" style={{ background: pixel }} />
          <div className="absolute left-7 top-8 h-3 w-8" style={{ background: ink }} />
          <div className="absolute bottom-4 right-4 h-12 w-12 rounded-full border-[6px]" style={{ borderColor: accent }} />
        </>
      )}
      {track.cover.pattern === "mint-lane" && (
        <>
          <div className="absolute inset-x-4 bottom-5 h-4 rounded-[4px]" style={{ background: ink }} />
          <div className="absolute left-5 top-5 h-16 w-4 rounded-[3px]" style={{ background: pixel }} />
          <div className="absolute right-5 top-8 h-10 w-10 rounded-full" style={{ background: `${accent}cc` }} />
        </>
      )}
      <div className="absolute bottom-3 left-3 rounded-[6px] border border-white/20 bg-black/18 px-2 py-1 text-[9px] font-semibold tracking-[0.18em] text-white/88">
        {track.cover.label}
      </div>
    </div>
  );
}

export function MusicRecommendationCard({ className = "" }: Readonly<{ className?: string }>) {
  const [track, setTrack] = useState<MusicRecommendation>(
    () => musicRecommendations[Math.floor(Math.random() * musicRecommendations.length)] ?? musicRecommendations[0],
  );

  const moodLine = track.mood.replaceAll("/", " · ");

  const shuffleTrack = () =>
    setTrack((current) => pickAnother(current, musicRecommendations) ?? musicRecommendations[0]);

  return (
    <section
      className={`theme-card theme-floating-shadow overflow-hidden rounded-[18px] border p-4 text-[#5A6670] backdrop-blur-xl ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="theme-icon-chip grid h-10 w-10 shrink-0 place-items-center rounded-[14px]">
            <Headphones className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="theme-text-main truncate text-[15px] font-semibold">今日配乐</p>
            <p className="theme-text-soft mt-1 line-clamp-2 text-xs leading-5">
              留一首安静的背景音，陪今天的地图继续往下走。
            </p>
          </div>
        </div>
        <button
          className="theme-subtle-button inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition"
          type="button"
          onClick={shuffleTrack}
          aria-label="换一首推荐音乐"
        >
          <SkipForward className="h-3.5 w-3.5" />
          换一首
        </button>
      </div>

      <div className="mt-4 rounded-[16px] border border-[var(--border-soft)] bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(250,251,247,0.84))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4">
          <PixelMusicCover track={track} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-[#5A6670]/46">APPLE MUSIC 气质</p>
            <h3 className="mt-2 line-clamp-2 text-[clamp(1.65rem,3.5vw,2rem)] font-semibold leading-[0.95] text-[#344451] [text-wrap:balance]">
              {track.title}
            </h3>
            <p className="mt-2 truncate text-sm font-medium text-[#5A6670]/76">{track.artist}</p>
            <p className="mt-2 truncate text-[11px] font-semibold text-[#D86F82]/86">{moodLine}</p>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#5A6670]/70">{track.note}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-white/72 bg-white/78 px-3 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#344451] text-white shadow-[0_8px_18px_rgba(52,68,81,0.16)]">
            <span className="ml-0.5 inline-block h-0 w-0 border-b-[7px] border-l-[11px] border-t-[7px] border-b-transparent border-l-white border-t-transparent" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-[#5A6670]/58">推荐曲目已绑定网易云</p>
            <p className="mt-1 truncate text-xs text-[#5A6670]/48">不在站内播放，只保留静态入口。</p>
          </div>
        </div>

        <a
          className="theme-accent-button mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition hover:-translate-y-0.5"
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
              <p className="theme-text-soft truncate text-xs">从已经点亮的城市里抽一张照片出来</p>
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
