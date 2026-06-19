"use client";

import { useEffect } from "react";
import { defaultThemePreset, isThemePresetId, themePresets, type ThemePresetId } from "@/lib/themePresets";

export const themePresetStorageKey = "mapofus:theme-preset";
export const themePresetUpdatedEvent = "mapofus:theme-preset-updated";

const applyThemePreset = (preset: ThemePresetId) => {
  const root = document.documentElement;
  const colors = themePresets[preset].colors;
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
    "--hero-glow-a": colors.highlight,
    "--hero-glow-b": colors.secondary,
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

export const writeStoredThemePreset = (preset: ThemePresetId) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(themePresetStorageKey, preset);
  applyThemePreset(preset);
  window.dispatchEvent(new CustomEvent(themePresetUpdatedEvent, { detail: preset }));
};

export default function ThemeController() {
  useEffect(() => {
    const syncFromLocal = () => applyThemePreset(readStoredThemePreset());
    syncFromLocal();
    const syncFromAccount = async () => {
      const response = await fetch("/api/account/security", { cache: "no-store", credentials: "same-origin" }).catch(() => null);
      if (!response?.ok) return;
      const payload = (await response.json().catch(() => null)) as { user?: { themePreset?: string } } | null;
      const accountPreset = payload?.user?.themePreset;
      if (isThemePresetId(accountPreset)) writeStoredThemePreset(accountPreset);
    };
    const handleUpdate = (event: Event) => {
      const preset = (event as CustomEvent<ThemePresetId>).detail;
      if (isThemePresetId(preset)) applyThemePreset(preset);
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
