import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAppSettings } from "../data/appSettings.ts";
import { themePresetIds, themePresetList } from "../lib/themePresets.ts";

test("provides eight complete theme presets", () => {
  assert.equal(themePresetIds.length, 8);
  assert.equal(themePresetList.length, 8);

  for (const preset of themePresetList) {
    assert.deepEqual(Object.keys(preset.colors).sort(), [
      "background",
      "borderSoft",
      "borderStrong",
      "card",
      "foreground",
      "highlight",
      "primary",
      "secondary",
      "soft",
      "wash",
    ]);
  }
});

test("keeps legacy theme identifiers valid", () => {
  for (const id of ["cream-blush", "peach-sky", "mint-cherry", "butter-garden"]) {
    assert.ok(themePresetIds.includes(id as (typeof themePresetIds)[number]));
  }
});

test("theme names and descriptions are readable Chinese copy", () => {
  const mojibakePattern = /[銆€鏉窞鎴戜滑绮浘]|锛|€|�/;

  for (const preset of themePresetList) {
    assert.match(preset.label, /[\u4e00-\u9fff]/);
    assert.match(preset.description, /[\u4e00-\u9fff]/);
    assert.doesNotMatch(preset.label, mojibakePattern);
    assert.doesNotMatch(preset.description, mojibakePattern);
  }
});

test("theme presets expose ordered palette roles for the settings preview", () => {
  for (const preset of themePresetList) {
    assert.deepEqual(preset.palette.map((item) => item.label), ["页面背景", "卡片", "主色", "辅色"]);
    assert.deepEqual(preset.palette.map((item) => item.color), [
      preset.colors.background,
      preset.colors.card,
      preset.colors.primary,
      preset.colors.secondary,
    ]);
  }
});
test("ignores retired login photo fields in old backups", () => {
  const normalized = normalizeAppSettings({
    loginPhotos: { hangzhou: "data:image/png;base64,abc" },
    loginPhotoTexts: { hangzhou: { city: "杭州", label: "春日" } },
    loginCoverImage: "data:image/png;base64,legacy",
    anniversaryDate: "2025.01.01",
    anniversaryLabel: "我们在一起",
    weatherCityIds: ["beijing"],
  });

  assert.deepEqual(normalized, {
    anniversaryDate: "2025.01.01",
    anniversaryLabel: "我们在一起",
    weatherCityIds: ["beijing"],
    coupleLogo: undefined,
  });
});
