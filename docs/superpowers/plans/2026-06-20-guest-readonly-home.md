# Guest Read-Only Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/` a data-isolated read-only guest map, move authentication to `/login`, and require a real authenticated session for every product page.

**Architecture:** A pure route-policy module determines whether a request may continue or should redirect. Next.js `proxy.ts` applies that policy before private pages render. The guest home uses a dedicated component with fixed demo province IDs and a guest mode on the map component that skips real APIs and private navigation.

**Tech Stack:** Next.js 16 App Router and Proxy, React 19, TypeScript, Node test runner, Tailwind CSS.

---

### Task 1: Define Route Access and Safe Return Paths

**Files:**
- Create: `lib/routeAccess.ts`
- Create: `tests/guest-access.test.mts`
- Modify: `package.json`

- [ ] **Step 1: Write failing route-policy tests**

Test that anonymous `/` stays public, authenticated `/` redirects to `/map`, anonymous private routes redirect to `/login?next=...`, and unsafe external return paths normalize to `/map`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --no-warnings --test tests/guest-access.test.mts`

Expected: FAIL because `lib/routeAccess.ts` does not exist.

- [ ] **Step 3: Implement the pure route-policy helpers**

Define:

```ts
export type RouteAccessDecision =
  | { action: "next" }
  | { action: "redirect"; destination: string };

export const getSafeNextPath = (value?: string | null) => { ... };
export const decidePageAccess = (pathname: string, search: string, role: AuthRole | null) => { ... };
```

Private prefixes include `/map`, `/couple`, `/memories`, `/favorites`, `/anniversaries`, `/time-capsule`, `/settings`, `/feedback`, and `/province`.

- [ ] **Step 4: Add the focused test to `npm test` and verify green**

Run: `npm test`

Expected: all tests pass.

### Task 2: Enforce Page Access in Next.js Proxy

**Files:**
- Create: `proxy.ts`
- Modify: `tests/guest-access.test.mts`

- [ ] **Step 1: Add a failing source-level proxy test**

Require `proxy.ts` to call both `getAuthRole(request)` and `decidePageAccess(...)`, and to redirect using `NextResponse.redirect`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --no-warnings --test tests/guest-access.test.mts`

Expected: FAIL because `proxy.ts` does not exist.

- [ ] **Step 3: Implement the proxy**

Apply policy to `/`, `/login`, and all private page prefixes. Keep `/api` outside the matcher so existing API authorization remains the final write boundary.

- [ ] **Step 4: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: tests pass and Next.js lists Proxy compilation without route errors.

### Task 3: Move Authentication UI to `/login`

**Files:**
- Create: `app/login/page.tsx`
- Modify: `components/EntryExperience.tsx`
- Modify: `components/BackToLoginButton.tsx`
- Modify: `tests/guest-access.test.mts`

- [ ] **Step 1: Add failing login-route and redirect tests**

Check that `/login` renders `EntryExperience`, that `EntryExperience` accepts a safe `nextPath`, and that logout returns to `/`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --no-warnings --test tests/guest-access.test.mts`

Expected: FAIL because `/login` is missing and `EntryExperience` has no `nextPath`.

- [ ] **Step 3: Implement the login route and safe post-login navigation**

Read `searchParams.next` on the server page, normalize it with `getSafeNextPath`, and pass it into:

```tsx
<EntryExperience nextPath={safeNextPath} />
```

Normal account login navigates to `nextPath`; administrator behavior remains unchanged.

- [ ] **Step 4: Update logout copy**

Keep clearing all auth cookies, return to `/`, and label the action “退出登录”.

- [ ] **Step 5: Run focused and complete tests**

Run:

```bash
node --no-warnings --test tests/guest-access.test.mts
npm test
```

Expected: all tests pass.

### Task 4: Build the Data-Isolated Guest Home

**Files:**
- Create: `components/GuestHomeExperience.tsx`
- Create: `data/guestDemo.ts`
- Modify: `app/page.tsx`
- Modify: `components/ChinaMap.tsx`
- Modify: `tests/guest-access.test.mts`

- [ ] **Step 1: Add failing guest-isolation tests**

Verify the root page renders `GuestHomeExperience`; guest modules do not import account, memory, couple, app-settings, Supabase, or server stores; and `ChinaMap` exposes guest demo inputs.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --no-warnings --test tests/guest-access.test.mts`

Expected: FAIL because the guest modules do not exist.

- [ ] **Step 3: Add fixed demo data**

Export a small fixed set of highlighted province IDs and summary counts from `data/guestDemo.ts`. The module must contain no user-derived values.

- [ ] **Step 4: Add guest mode to `ChinaMap`**

Accept optional `demoLitProvinceIds` and `readOnly` props. When demo IDs are supplied:

- skip `/api/memories`
- use the provided highlights
- disable province navigation
- retain zoom, reset, hover, and keyboard-readable labels

- [ ] **Step 5: Implement the guest home**

Use the current map visual language with:

- “游客预览” status
- “登录进入自己的空间” link to `/login`
- fixed demo progress
- a concise read-only explanation
- no private navigation, settings, feedback, upload, edit, binding, or admin controls

- [ ] **Step 6: Replace the root login page**

Render `GuestHomeExperience` from `app/page.tsx`.

- [ ] **Step 7: Run tests, lint, and build**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all commands exit 0.

### Task 5: Browser Regression and Release

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Record the access-model change**

Add a V3.4.2 revision entry covering guest home, `/login`, private-route protection, and demo-data isolation.

- [ ] **Step 2: Run browser checks**

Verify:

- anonymous `/` shows guest preview
- anonymous `/map` redirects to `/login?next=/map`
- `/login` renders the auth UI
- guest map makes no `/api/memories` request
- desktop and mobile layouts do not overflow

- [ ] **Step 3: Run final verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

- [ ] **Step 4: Commit and push**

Commit the implementation and push `HEAD` to `origin/V3` and the current remote branch.

- [ ] **Step 5: Deploy to Aliyun**

On `/var/www/space-of-us`, pull `V3`, stop PM2, clear `.next`, install dependencies, build, start `space-of-us`, save PM2, reload nginx, and verify both local port 3000 and `https://space-of-us.online` return HTTP 200.
