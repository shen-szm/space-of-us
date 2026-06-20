import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("auth config does not contain fallback credentials", () => {
  const source = readSource("../lib/server/auth.ts");

  assert.doesNotMatch(source, /defaultPasswords|1234|admin1234/);
});

test("account and verification hashing do not use hardcoded fallback secrets", () => {
  const accountSource = readSource("../lib/server/accountStore.ts");
  const verificationSource = readSource("../lib/server/verificationStore.ts");

  assert.doesNotMatch(accountSource, /space-of-us-account-hash-v1|map-of-us-local-dev/);
  assert.doesNotMatch(verificationSource, /space-of-us-verification-v1|map-of-us-local-dev/);
});

test("server-side Supabase config only accepts service role style keys", () => {
  const source = readSource("../lib/server/supabase.ts");

  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_(?:ANON|PUBLISHABLE)_KEY|SUPABASE_(?:ANON|PUBLISHABLE)_KEY/);
});
test("production startup validates the account hashing secret", () => {
  const source = readSource("../scripts/start-production.mjs");

  assert.match(source, /"ACCOUNT_HASH_SECRET"/);
});
