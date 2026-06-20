import assert from "node:assert/strict";
import test from "node:test";
import { getReadableDisplayName } from "../data/accounts.ts";
import { createAuthSessionInfo } from "../lib/authSessionInfo.ts";

test("reports an authenticated admin session without a registered username", () => {
  assert.deepEqual(createAuthSessionInfo("admin", null), {
    authenticated: true,
    role: "admin",
    username: null,
  });
});

test("reports an authenticated registered site session", () => {
  assert.deepEqual(createAuthSessionInfo("site", "xixi"), {
    authenticated: true,
    role: "site",
    username: "xixi",
  });
});

test("reports an anonymous session", () => {
  assert.deepEqual(createAuthSessionInfo(null, null), {
    authenticated: false,
    role: null,
    username: null,
  });
});

test("falls back to username for unreadable legacy display names", () => {
  assert.equal(getReadableDisplayName("??", "test1294264091"), "test1294264091");
  assert.equal(getReadableDisplayName("张小姐", "zhang"), "张小姐");
});
