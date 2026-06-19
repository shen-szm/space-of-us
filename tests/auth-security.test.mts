import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { clearLoginRateLimit, consumeLoginRateLimit } from "../lib/server/loginRateLimit.ts";
import { isValidManagedPassword, managedPasswordPolicyText } from "../lib/server/passwordPolicy.ts";

const routePath = path.join(process.cwd(), "app", "api", "app-settings", "route.ts");
const memoryNavPath = path.join(process.cwd(), "components", "MemoryNav.tsx");
const entryExperiencePath = path.join(process.cwd(), "components", "EntryExperience.tsx");
const settingsExperiencePath = path.join(process.cwd(), "components", "SettingsExperience.tsx");
const collectSourceFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(fullPath);
      if (/\.(?:ts|tsx)$/.test(entry.name)) return [fullPath];
      return [];
    }),
  );

  return files.flat();
};

test("requires authentication for app settings reads", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /export async function GET\(request: NextRequest\)/);
  assert.match(source, /const authError = requireSiteSession\(request\)/);
  assert.match(source, /if \(authError\) return authError/);
});

test("managed password policy rejects values shorter than four characters", () => {
  assert.equal(managedPasswordPolicyText, "Password length must be 4-64");
  assert.equal(isValidManagedPassword("1"), false);
  assert.equal(isValidManagedPassword("123"), false);
  assert.equal(isValidManagedPassword("1234"), true);
  assert.equal(isValidManagedPassword("a".repeat(64)), true);
  assert.equal(isValidManagedPassword("b".repeat(65)), false);
});

test("login rate limiting blocks repeated failures from the same actor", () => {
  const actorKey = "site:user@example.com:127.0.0.1";
  clearLoginRateLimit(actorKey);

  for (let index = 0; index < 5; index += 1) {
    const attempt = consumeLoginRateLimit(actorKey);
    assert.equal(attempt.allowed, true);
    assert.equal(attempt.remaining, 4 - index);
  }

  const blocked = consumeLoginRateLimit(actorKey);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds > 0, true);

  clearLoginRateLimit(actorKey);
  assert.equal(consumeLoginRateLimit(actorKey).allowed, true);
});

test("server-side security code uses crypto-grade randomness", async () => {
  const roots = [path.join(process.cwd(), "lib", "server"), path.join(process.cwd(), "app", "api")];
  const files = (await Promise.all(roots.map(collectSourceFiles))).flat();
  const offenders: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (source.includes("Math.random")) offenders.push(path.relative(process.cwd(), file));
  }

  assert.deepEqual(offenders, []);
});

test("account password endpoints use the shared managed password policy", async () => {
  const routes = [
    path.join(process.cwd(), "app", "api", "accounts", "route.ts"),
    path.join(process.cwd(), "app", "api", "account", "security", "route.ts"),
  ];

  for (const route of routes) {
    const source = await readFile(route, "utf8");
    assert.match(source, /@\/lib\/server\/passwordPolicy/);
    assert.doesNotMatch(source, /(?:password|newPassword|currentPassword)\.length\s*</);
  }
});

test("account secret hashing uses randomized scrypt hashes", async () => {
  const source = await readFile(path.join(process.cwd(), "lib", "server", "accountStore.ts"), "utf8");

  assert.match(source, /scryptSync/);
  assert.match(source, /randomBytes/);
  assert.match(source, /scrypt:v1/);
  assert.doesNotMatch(source, /export const hashAccountSecret = \(value: string, salt: string\) => hashWithSecret/);
});

test("binding invite lookup verifies stored hashes instead of regenerating them", async () => {
  const source = await readFile(path.join(process.cwd(), "lib", "server", "accountStore.ts"), "utf8");

  assert.match(source, /verifyAccountSecret\(code, account\.id, account\.bindingInviteCodeHash\)/);
  assert.doesNotMatch(source, /safeEqual\(hashAccountSecret\(code, account\.id\), account\.bindingInviteCodeHash\)/);
});

test("memory navigation includes mobile fallback and accessible dialogs", async () => {
  const source = await readFile(memoryNavPath, "utf8");

  assert.match(source, /aria-label="Primary navigation"/);
  assert.match(source, /lg:hidden/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /focusFirstDialogElement/);
});

test("entry experience delegates shared auth metadata to a dedicated module", async () => {
  const source = await readFile(entryExperiencePath, "utf8");

  assert.match(source, /from "@\/components\/entry\/entryExperienceShared"/);
  assert.doesNotMatch(source, /const authModes:/);
  assert.doesNotMatch(source, /const modeTitles:/);
  assert.doesNotMatch(source, /const adminQuickLinks =/);
});

test("settings experience delegates theme preset rendering to a dedicated section", async () => {
  const source = await readFile(settingsExperiencePath, "utf8");

  assert.match(source, /from "@\/components\/settings\/ThemePresetSection"/);
  assert.match(source, /<ThemePresetSection/);
  assert.doesNotMatch(source, /themePresetList\.map\(/);
});
