import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { decidePageAccess, getSafeNextPath } from "../lib/routeAccess.ts";

test("keeps the public home available to anonymous visitors", () => {
  assert.deepEqual(decidePageAccess("/", "", null), { action: "next" });
});

test("redirects authenticated visitors from the public entry to their map", () => {
  assert.deepEqual(decidePageAccess("/", "", "site"), {
    action: "redirect",
    destination: "/map",
  });
  assert.deepEqual(decidePageAccess("/login", "", "admin"), {
    action: "redirect",
    destination: "/map",
  });
});

test("redirects anonymous private-page requests to login with a safe return path", () => {
  assert.deepEqual(decidePageAccess("/map", "?panel=progress", null), {
    action: "redirect",
    destination: "/login?next=%2Fmap%3Fpanel%3Dprogress",
  });
  assert.deepEqual(decidePageAccess("/province/zhejiang", "", null), {
    action: "redirect",
    destination: "/login?next=%2Fprovince%2Fzhejiang",
  });
});

test("allows authenticated visitors to use private pages", () => {
  assert.deepEqual(decidePageAccess("/settings", "", "site"), { action: "next" });
  assert.deepEqual(decidePageAccess("/couple", "", "admin"), { action: "next" });
});

test("normalizes unsafe login return paths", () => {
  assert.equal(getSafeNextPath("/memories?city=hangzhou"), "/memories?city=hangzhou");
  assert.equal(getSafeNextPath("https://evil.example"), "/map");
  assert.equal(getSafeNextPath("//evil.example/path"), "/map");
  assert.equal(getSafeNextPath("javascript:alert(1)"), "/map");
  assert.equal(getSafeNextPath(null), "/map");
});

test("proxy delegates access decisions to the shared route policy", async () => {
  const source = await readFile(path.join(process.cwd(), "proxy.ts"), "utf8");

  assert.match(source, /getAuthRole\(request\)/);
  assert.match(source, /decidePageAccess\(request\.nextUrl\.pathname/);
  assert.match(source, /NextResponse\.redirect/);
});

test("login route renders the existing authentication experience", async () => {
  const source = await readFile(path.join(process.cwd(), "app", "login", "page.tsx"), "utf8");

  assert.match(source, /EntryExperience/);
  assert.match(source, /getSafeNextPath/);
  assert.match(source, /nextPath=/);
});

test("guest home stays isolated from private data sources", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "app", "page.tsx"), "utf8");
  const guestSource = await readFile(
    path.join(process.cwd(), "components", "GuestHomeExperience.tsx"),
    "utf8",
  );
  const demoSource = await readFile(path.join(process.cwd(), "data", "guestDemo.ts"), "utf8");
  const combined = `${guestSource}\n${demoSource}`;

  assert.match(rootSource, /GuestHomeExperience/);
  assert.doesNotMatch(
    combined,
    /api\/|accountStore|memories|coupleStore|appSettings|supabase|localStorage/,
  );
  assert.match(guestSource, /demoLitProvinceIds/);
  assert.match(guestSource, /readOnly/);
  assert.match(guestSource, /href="\/login"/);
});

test("logout returns to the public guest home", async () => {
  const source = await readFile(
    path.join(process.cwd(), "components", "BackToLoginButton.tsx"),
    "utf8",
  );

  assert.match(source, /router\.push\("\/"\)/);
  assert.match(source, new RegExp("\\u9000\\u51fa\\u767b\\u5f55"));
});