import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("music recommendation card uses the requested heading copy", async () => {
  const source = await readFile(
    path.join(process.cwd(), "components", "RandomPhotoCard.tsx"),
    "utf8",
  );

  assert.match(source, /今日推荐/);
  assert.doesNotMatch(source, /今日配乐/);
});
