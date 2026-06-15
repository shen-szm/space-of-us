import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { loadProductionEnvFile, parseEnvFile } = await import("./production-env.mjs");

assert.deepEqual(parseEnvFile("A=1\n# comment\nB=\"two words\"\nC='three words'\nEMPTY=\n"), {
  A: "1",
  B: "two words",
  C: "three words",
  EMPTY: "",
});

const tempDir = await mkdtemp(path.join(tmpdir(), "space-of-us-env-"));
try {
  const envPath = path.join(tempDir, ".env.production.local");
  await writeFile(envPath, "RESEND_API_KEY=re_test\nRESEND_FROM_EMAIL=\"Space of us <onboarding@resend.dev>\"\n", "utf8");

  process.env.RESEND_API_KEY = "already-set";
  delete process.env.RESEND_FROM_EMAIL;

  const result = await loadProductionEnvFile(tempDir);

  assert.equal(result.loaded, true);
  assert.equal(result.path, envPath);
  assert.equal(process.env.RESEND_API_KEY, "already-set");
  assert.equal(process.env.RESEND_FROM_EMAIL, "Space of us <onboarding@resend.dev>");
} finally {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  await rm(tempDir, { recursive: true, force: true });
}

console.log("production env loader verified from", fileURLToPath(import.meta.url));
