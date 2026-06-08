import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const supabasePath = new URL("../lib/server/supabase.ts", import.meta.url);
const schemaPath = new URL("../docs/supabase-schema.sql", import.meta.url);
const supabaseSource = await readFile(supabasePath, "utf8");
const schemaSource = await readFile(schemaPath, "utf8");

assert(
  !supabaseSource.includes(".getPublicUrl("),
  "Uploaded Supabase files must not be exposed through permanent public URLs.",
);

assert(
  supabaseSource.includes(".createSignedUrl("),
  "Private Supabase files must be read through signed URLs.",
);

assert(
  schemaSource.includes("public = false") || schemaSource.includes("set public = false"),
  "Supabase storage bucket must be configured as private.",
);

console.log("private storage guard verified");
