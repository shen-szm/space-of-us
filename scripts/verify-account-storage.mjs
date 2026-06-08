import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const accountStorePath = new URL("../lib/server/accountStore.ts", import.meta.url);
const source = await readFile(accountStorePath, "utf8");

assert(
  !source.includes("__spaceOfUsAccountStore"),
  "Production account storage must not fall back to in-memory data.",
);

assert(
  source.includes("assertWritableStorageConfigured();"),
  "Account writes must require persistent storage when running in production.",
);

console.log("account storage guard verified");
