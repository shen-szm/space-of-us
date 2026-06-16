"use client";

import { useEffect } from "react";
import { defaultThemePreset, isThemePresetId, type ThemePresetId } from "@/lib/themePresets";

export const themePresetStorageKey = "mapofus:theme-preset";
export const themePresetUpdatedEvent = "mapofus:theme-preset-updated";

const applyThemePreset = (preset: ThemePresetId) => {
  document.documentElement.dataset.uiTheme = preset;
  document.body.dataset.uiTheme = preset;
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
      const response = await fetch("/api/account/security", {
        cache: "no-store",
        credentials: "same-origin",
      }).catch(() => null);

      if (!response?.ok) return;

      const payload = (await response.json().catch(() => null)) as
        | { user?: { themePreset?: string } }
        | null;

      const accountPreset = payload?.user?.themePreset;
      if (!isThemePresetId(accountPreset)) return;
      writeStoredThemePreset(accountPreset);
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
