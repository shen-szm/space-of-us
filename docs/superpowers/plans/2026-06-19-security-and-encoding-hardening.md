# Security And Encoding Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the current P0/P1 gaps around default credentials, weak password policy, unauthenticated settings reads, login brute-force protection, and verified mojibake regressions.

**Architecture:** Keep the current Next.js/Electron structure intact and apply narrow fixes at existing auth, API, and theme boundaries. Drive all behavior changes from failing tests first so the security and encoding regressions are locked down with executable evidence.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner, Electron

---

### Task 1: Lock down auth configuration and settings access

**Files:**
- Modify: `C:\Users\31795\Documents\Map\map-of-us-template-main\tests\auth-session-info.test.mts`
- Modify: `C:\Users\31795\Documents\Map\map-of-us-template-main\lib\server\auth.ts`
- Modify: `C:\Users\31795\Documents\Map\map-of-us-template-main\app\api\app-settings\route.ts`

- [ ] Add failing tests for missing password env handling and authenticated settings access.
- [ ] Run the targeted auth tests and confirm failure matches the missing hardening behavior.
- [ ] Remove default password fallback logic and require a configured password for both roles.
- [ ] Require site session on `GET /api/app-settings`.
- [ ] Re-run the targeted auth tests and confirm they pass.

### Task 2: Harden login and admin password updates

**Files:**
- Create: `C:\Users\31795\Documents\Map\map-of-us-template-main\tests\auth-security.test.mts`
- Modify: `C:\Users\31795\Documents\Map\map-of-us-template-main\app\api\auth\login\route.ts`
- Modify: `C:\Users\31795\Documents\Map\map-of-us-template-main\app\api\auth\password\route.ts`

- [ ] Add failing tests for login rate limiting and minimum password length enforcement.
- [ ] Run the targeted security tests and confirm failure.
- [ ] Add a minimal in-memory login limiter keyed by role, username, and client IP.
- [ ] Raise admin/site password update minimum length to the same floor as account passwords.
- [ ] Re-run the targeted security tests and confirm they pass.

### Task 3: Repair verified encoding regressions

**Files:**
- Modify: `C:\Users\31795\Documents\Map\map-of-us-template-main\tests\theme-settings.test.mts`
- Modify: `C:\Users\31795\Documents\Map\map-of-us-template-main\lib\themePresets.ts`
- Modify: `C:\Users\31795\Documents\Map\map-of-us-template-main\data\appSettings.ts`
- Modify: `C:\Users\31795\Documents\Map\map-of-us-template-main\app\layout.tsx`

- [ ] Fix the existing theme tests so their expectations are valid UTF-8 Chinese strings.
- [ ] Run the theme test file and confirm it still fails against current source data.
- [ ] Restore readable Chinese labels/descriptions and the expected default custom color.
- [ ] Fix the root layout metadata description text.
- [ ] Re-run the theme tests and confirm they pass.

### Task 4: Final verification

**Files:**
- Test: `C:\Users\31795\Documents\Map\map-of-us-template-main\tests\auth-session-info.test.mts`
- Test: `C:\Users\31795\Documents\Map\map-of-us-template-main\tests\auth-security.test.mts`
- Test: `C:\Users\31795\Documents\Map\map-of-us-template-main\tests\theme-settings.test.mts`

- [ ] Run the full project test command.
- [ ] Run a focused lint command if feasible within time budget; otherwise report the current limitation with evidence.
- [ ] Summarize the exact fixes, residual risks, and any remaining follow-up items.
