"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { CalendarDays, ImagePlus, RotateCcw, Settings, Upload } from "lucide-react";
import { cities } from "@/data/cities";
import {
  type AppSettings,
  type LoginPhotoText,
  defaultAnniversaryDate,
  defaultAnniversaryLabel,
  defaultCoupleLogo,
  defaultWeatherCityIds,
  maxWeatherCities,
  readAppSettings,
  writeAppSettings,
} from "@/data/appSettings";
import {
  deleteLoginPhoto,
  deleteLoginPhotoText,
  readLoginPhotos,
  writeLoginPhoto,
  writeLoginPhotoText,
} from "@/data/loginPhotoStore";
import { LocalPrivacyImage } from "@/components/LocalPrivacyImage";
import { MemoryPageShell } from "@/components/MemoryNav";

const loginPhotoVersion = "placeholder-20260601";
const loginPhotoFallback = (fileName: string) => `/photos/login/${fileName}.jpg?v=${loginPhotoVersion}`;

const loginPhotoSlots = [
  { id: "hangzhou", city: "杭州", label: "春日湖畔", fallback: loginPhotoFallback("hangzhou") },
  { id: "shanghai", city: "上海", label: "外滩傍晚", fallback: loginPhotoFallback("shanghai") },
  { id: "macau", city: "澳门", label: "旧城花影", fallback: loginPhotoFallback("macau") },
  { id: "hongkong", city: "香港", label: "夜色亮起", fallback: loginPhotoFallback("hongkong") },
  { id: "qingdao", city: "青岛", label: "海风经过", fallback: loginPhotoFallback("qingdao") },
  { id: "zhengzhou", city: "郑州", label: "见面那天", fallback: loginPhotoFallback("zhengzhou") },
  { id: "zhuhai", city: "珠海", label: "海边散步", fallback: loginPhotoFallback("zhuhai") },
  { id: "guangzhou", city: "广州", label: "旧街热气", fallback: loginPhotoFallback("guangzhou") },
  { id: "jinan", city: "济南", label: "泉边小记", fallback: loginPhotoFallback("jinan") },
] as const;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Read file failed")));
    reader.readAsDataURL(file);
  });

export default function SettingsExperience() {
  const [settings, setSettings] = useState<AppSettings>(() => readAppSettings());
  const [loginPhotos, setLoginPhotos] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");

  const anniversaryLabel = settings.anniversaryLabel ?? defaultAnniversaryLabel;
  const anniversaryDate = settings.anniversaryDate ?? defaultAnniversaryDate;
  const weatherCityIds = settings.weatherCityIds ?? defaultWeatherCityIds;
  const coupleLogo = settings.coupleLogo ?? defaultCoupleLogo;

  const updateSettings = (next: AppSettings) => {
    setSettings(next);
    writeAppSettings(next);
    setStatus("已保存");
  };

  const updateBasicSetting = (patch: AppSettings) => {
    updateSettings({ ...settings, ...patch });
  };

  const updateWeatherCity = (index: number, cityId: string) => {
    const next = [...weatherCityIds];
    next[index] = cityId;
    updateBasicSetting({ weatherCityIds: next.slice(0, maxWeatherCities) });
  };

  const updateCoupleLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const image = await readFileAsDataUrl(file);
    updateBasicSetting({ coupleLogo: image });
  };

  const updateLoginPhoto = async (slotId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const image = await readFileAsDataUrl(file);
      await writeLoginPhoto(slotId, image);
      setLoginPhotos(await readLoginPhotos());
      setStatus("登录照片已保存");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "登录照片保存失败");
    } finally {
      event.target.value = "";
    }
  };

  const resetLoginPhoto = async (slotId: string) => {
    try {
      await deleteLoginPhoto(slotId);
      setLoginPhotos(await readLoginPhotos());
      setStatus("登录照片已恢复默认");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "登录照片恢复失败");
    }
  };

  const updateLoginPhotoText = async (slotId: string, field: keyof LoginPhotoText, value: string) => {
    const nextText = {
      ...(settings.loginPhotoTexts?.[slotId] ?? {}),
      [field]: value,
    };
    const nextSettings = {
      ...settings,
      loginPhotoTexts: {
        ...(settings.loginPhotoTexts ?? {}),
        [slotId]: nextText,
      },
    };
    setSettings(nextSettings);
    writeAppSettings(nextSettings);
    try {
      await writeLoginPhotoText(slotId, nextText);
      setStatus("登录照片文字已保存");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "登录照片文字保存失败");
    }
  };

  const resetLoginPhotoText = async (slotId: string) => {
    const nextTexts = { ...(settings.loginPhotoTexts ?? {}) };
    delete nextTexts[slotId];
    const nextSettings = { ...settings, loginPhotoTexts: nextTexts };
    setSettings(nextSettings);
    writeAppSettings(nextSettings);
    try {
      await deleteLoginPhotoText(slotId);
      setStatus("登录照片文字已恢复默认");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "登录照片文字恢复失败");
    }
  };

  useEffect(() => {
    void readLoginPhotos().then(setLoginPhotos);
  }, []);

  return (
    <MemoryPageShell active="settings">
      <header>
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-[#A8C8DC]" />
          <h1 className="text-[34px] font-semibold leading-tight text-[#5A6670]">设置</h1>
        </div>
        <p className="mt-2 text-sm font-medium text-[#5A6670]/58">
          这里的内容双方都可以自行调整，不需要进入管理员模式。
        </p>
      </header>

      <section className="mt-10 grid gap-5">
        <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)]">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-[#E8B8C2]" />
            <div>
              <p className="text-sm font-semibold text-[#5A6670]">基础设置</p>
              <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">
                纪念日名称、开始日期和首页天气城市都可以由用户自己修改。
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-[#5A6670]/48">纪念日名称</span>
              <input
                className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                value={anniversaryLabel}
                onChange={(event) => updateBasicSetting({ anniversaryLabel: event.target.value })}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-[#5A6670]/48">纪念日开始日期</span>
              <input
                className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                value={anniversaryDate}
                placeholder="2025.01.01"
                onChange={(event) => updateBasicSetting({ anniversaryDate: event.target.value })}
              />
            </label>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold text-[#5A6670]/48">沿途天气城市（最多 {maxWeatherCities} 个）</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {Array.from({ length: maxWeatherCities }).map((_, index) => (
                <select
                  key={`weather-slot-${index}`}
                  className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                  value={weatherCityIds[index] ?? ""}
                  onChange={(event) => updateWeatherCity(index, event.target.value)}
                >
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[7px] border border-[#D8DDD8]/70 bg-white/40">
              <LocalPrivacyImage src={coupleLogo} alt="情侣头像 logo 预览" fill sizes="80px" className="object-contain" />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[7px] border border-[#D8DDD8] px-4 py-2 text-sm font-semibold text-[#5A6670]/72 transition hover:bg-white/60">
                <ImagePlus className="h-4 w-4" />
                上传头像
                <input type="file" accept="image/*" className="hidden" onChange={updateCoupleLogo} />
              </label>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-[7px] border border-[#D8DDD8] px-4 py-2 text-sm font-semibold text-[#5A6670]/64 transition hover:bg-white/60"
                onClick={() => updateBasicSetting({ coupleLogo: defaultCoupleLogo })}
              >
                <RotateCcw className="h-4 w-4" />
                恢复默认
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#5A6670]">登录照片</p>
              <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
                对应登录界面的照片、标题和副标题。这里的内容双方都可以修改。
              </p>
            </div>
            <p className="text-xs font-semibold text-[#5A6670]/42">
              已自定义 {Object.keys(loginPhotos).length} / {loginPhotoSlots.length}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {loginPhotoSlots.map((slot) => {
              const customPhoto = loginPhotos[slot.id];
              const customText = settings.loginPhotoTexts?.[slot.id];
              const src = customPhoto ?? slot.fallback;
              const titleValue = customText?.city ?? slot.city;
              const labelValue = customText?.label ?? slot.label;

              return (
                <div className="rounded-[8px] border border-[#D8DDD8]/70 bg-white/34 p-3" key={slot.id}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[7px] bg-[#D6E8F0]/24">
                    <LocalPrivacyImage
                      className="h-full w-full object-cover"
                      src={src}
                      alt={`${slot.city} 登录照片预览`}
                      fill
                      sizes="(max-width: 768px) 50vw, 260px"
                    />
                  </div>
                  <div className="mt-3 grid gap-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-[#5A6670]/48">标题</span>
                      <input
                        className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm font-semibold text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                        value={titleValue}
                        onChange={(event) => void updateLoginPhotoText(slot.id, "city", event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-[#5A6670]/48">副标题</span>
                      <input
                        className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                        value={labelValue}
                        onChange={(event) => void updateLoginPhotoText(slot.id, "label", event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-[#5A6670]/44">{customPhoto || customText ? "已自定义" : "默认内容"}</p>
                    <div className="flex shrink-0 gap-2">
                      <label className="grid h-9 w-9 cursor-pointer place-items-center rounded-[7px] border border-[#A8C8DC] text-[#A8C8DC] transition hover:bg-[#D6E8F0]/36">
                        <Upload className="h-4 w-4" />
                        <input
                          className="hidden"
                          type="file"
                          accept="image/*"
                          onChange={(event) => void updateLoginPhoto(slot.id, event)}
                        />
                      </label>
                      <button
                        className="rounded-[7px] border border-[#D8DDD8] px-3 text-xs font-semibold text-[#5A6670]/58 transition hover:bg-white/68 disabled:opacity-35"
                        type="button"
                        onClick={() => void resetLoginPhoto(slot.id)}
                        disabled={!customPhoto}
                      >
                        图片
                      </button>
                      <button
                        className="rounded-[7px] border border-[#D8DDD8] px-3 text-xs font-semibold text-[#5A6670]/58 transition hover:bg-white/68 disabled:opacity-35"
                        type="button"
                        onClick={() => void resetLoginPhotoText(slot.id)}
                        disabled={!customText}
                      >
                        文字
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {status && (
        <p className="mt-5 rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/72 px-4 py-3 text-sm text-[#5A6670]/66">
          {status}
        </p>
      )}
    </MemoryPageShell>
  );
}
