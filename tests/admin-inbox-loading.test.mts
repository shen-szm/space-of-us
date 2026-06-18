import assert from "node:assert/strict";
import test from "node:test";
import { loadAdminInboxSources } from "../lib/adminInboxLoading.ts";

test("keeps feedback available when account loading fails", async () => {
  const result = await loadAdminInboxSources(
    async () => [{ id: "feedback-1" }],
    async () => {
      throw new Error("accounts unavailable");
    },
  );

  assert.deepEqual(result.feedback.data, [{ id: "feedback-1" }]);
  assert.equal(result.feedback.error, null);
  assert.deepEqual(result.accounts.data, []);
  assert.equal(result.accounts.error, "accounts unavailable");
});

test("keeps accounts available when feedback loading fails", async () => {
  const result = await loadAdminInboxSources(
    async () => {
      throw new Error("feedback unavailable");
    },
    async () => [{ id: "user-1" }],
  );

  assert.deepEqual(result.feedback.data, []);
  assert.equal(result.feedback.error, "feedback unavailable");
  assert.deepEqual(result.accounts.data, [{ id: "user-1" }]);
  assert.equal(result.accounts.error, null);
});
