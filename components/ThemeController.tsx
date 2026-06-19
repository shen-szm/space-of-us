"use client";

import { useEffect } from "react";
import {
  buildCustomThemePreset,
  customThemePresetId,
  defaultCustomThemeColor,
  defaultThemePreset,
  isThemePresetId,
  normalizeCustomThemeColor,
  themePresets,
  type ThemePresetId,
} from "@/lib/themePresets";

export const themePresetStorageKey = "mapofus:theme-preset";
export const customThemeColorStorageKey = "mapofus:custom-theme-color";
export const themePresetUpdatedEvent = "mapofus:theme-preset-updated";

export type ThemePresetUpdateDetail = {
  preset: ThemePresetId;
  customThemeColor?: string;
};

const resolveThemeColors = (preset: ThemePresetId, customThemeColor?: string) =>
  preset === customThemePresetId
    ? buildCustomThemePreset(customThemeColor ?? readStoredCustomThemeColor()).colors
    : themePresets[preset].colors;

const applyThemePreset = (preset: ThemePresetId, customThemeColor?: string) => {
  const root = document.documentElement;
  const colors = resolveThemeColors(preset, customThemeColor);
  const tokens: Record<string, string> = {
    "--background": colors.background,
    "--foreground": colors.foreground,
    "--surface-shell": colors.background,
    "--surface-card": colors.card,
    "--surface-card-strong": colors.card,
    "--surface-soft": colors.soft,
    "--surface-muted": colors.wash,
    "--border-soft": colors.borderSoft,
    "--border-strong": colors.borderStrong,
    "--accent-primary": colors.primary,
    "--accent-secondary": colors.secondary,
    "--accent-highlight": colors.highlight,
    "--accent-wash": colors.wash,
    "--text-muted": "color-mix(in srgb, " + colors.foreground + " 72%, transparent)",
    "--text-soft": "color-mix(in srgb, " + colors.foreground + " 54%, transparent)",
    "--hero-ink": colors.foreground,
    "--hero-glow-a": "color-mix(in srgb, " + colors.wash + " 78%, white)",
    "--hero-glow-b": "color-mix(in srgb, " + colors.highlight + " 82%, white)",
  };
  root.dataset.uiTheme = preset;
  document.body.dataset.uiTheme = preset;
  Object.entries(tokens).forEach(([name, value]) => root.style.setProperty(name, value));
};

const readStoredThemePreset = (): ThemePresetId => {
  if (typeof window === "undefined") return defaultThemePreset;
  const stored = window.localStorage.getItem(themePresetStorageKey);
  return isThemePresetId(stored) ? stored : defaultThemePreset;
};

export const readStoredCustomThemeColor = () => {
  if (typeof window === "undefined") return defaultCustomThemeColor;
  return normalizeCustomThemeColor(window.localStorage.getItem(customThemeColorStorageKey));
};

export const writeStoredThemePreset = (preset: ThemePresetId, customThemeColor?: string) => {
  if (typeof window === "undefined") return;
  const normalizedCustomColor = normalizeCustomThemeColor(customThemeColor ?? readStoredCustomThemeColor());
  window.localStorage.setItem(themePresetStorageKey, preset);
  window.localStorage.setItem(customThemeColorStorageKey, normalizedCustomColor);
  applyThemePreset(preset, normalizedCustomColor);
  window.dispatchEvent(new CustomEvent<ThemePresetUpdateDetail>(themePresetUpdatedEvent, {
    detail: { preset, customThemeColor: normalizedCustomColor },
  }));
};

export default function ThemeController() {
  useEffect(() => {
    const syncFromLocal = () => applyThemePreset(readStoredThemePreset(), readStoredCustomThemeColor());
    syncFromLocal();
    const syncFromAccount = async () => {
      const response = await fetch("/api/account/security", { cache: "no-store", credentials: "same-origin" }).catch(() => null);
      if (!response?.ok) return;
      const payload = (await response.json().catch(() => null)) as { user?: { themePreset?: string; customThemeColor?: string } } | null;
      const accountPreset = payload?.user?.themePreset;
      if (isThemePresetId(accountPreset)) writeStoredThemePreset(accountPreset, payload?.user?.customThemeColor);
    };
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<ThemePresetUpdateDetail | ThemePresetId>).detail;
      const preset = typeof detail === "string" ? detail : detail?.preset;
      const customThemeColor = typeof detail === "string" ? readStoredCustomThemeColor() : detail?.customThemeColor;
      if (isThemePresetId(preset)) applyThemePreset(preset, customThemeColor);
    };
    void syncFromAccount();
    window.addEventListener(themePresetUpdatedEvent, handleUpdate);
    window.addEventListener("storage", syncFromLocal);
    return () => {
      window.removeEventListener(themePresetUpdatedEvent, handleUpdate);
      window.removeEventListener("storage", syncFromLocal);
    };
  }, []);
  return null;
}
