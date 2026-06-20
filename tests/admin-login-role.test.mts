import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { resolveLoginRole } from "../lib/server/loginIdentity.ts";

test("recognizes the configured administrator username regardless of client mode", () => {
  assert.equal(
    resolveLoginRole({
      requestedMode: "site",
      username: "owner",
      adminUsername: "Owner",
    }),
    "admin",
  );
});

test("keeps regular usernames in site mode", () => {
  assert.equal(
    resolveLoginRole({
      requestedMode: "site",
      username: "regular-user",
      adminUsername: "owner",
    }),
    "site",
  );
});

test("entry experience trusts the authenticated role returned by the server", async () => {
  const source = await readFile(
    path.join(process.cwd(), "components", "EntryExperience.tsx"),
    "utf8",
  );

  assert.match(source, /postJson<\{ role: "site" \| "admin" \}>/);
  assert.match(source, /loginResult\.role === "admin"/);
});
test("login API resolves the administrator role on the server", async () => {
  const source = await readFile(
    path.join(process.cwd(), "app", "api", "auth", "login", "route.ts"),
    "utf8",
  );

  assert.match(source, /resolveLoginRole/);
  assert.match(source, /adminUsername: process\.env\.ADMIN_USERNAME/);
});