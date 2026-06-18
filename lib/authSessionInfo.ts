import type { AuthRole } from "@/lib/server/auth";

export type AuthSessionInfo = {
  authenticated: boolean;
  role: AuthRole | null;
  username: string | null;
};

export const createAuthSessionInfo = (
  role: AuthRole | null,
  username: string | null,
): AuthSessionInfo => ({
  authenticated: role !== null,
  role,
  username,
});
