export type LoginRole = "site" | "admin";

type ResolveLoginRoleInput = {
  requestedMode: LoginRole;
  username: string;
  adminUsername?: string;
};

export const resolveLoginRole = ({
  requestedMode,
  username,
  adminUsername,
}: ResolveLoginRoleInput): LoginRole => {
  if (requestedMode === "admin") return "admin";

  const normalizedUsername = username.trim().toLowerCase();
  const acceptedAdminNames = new Set(
    [adminUsername, "admin"]
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim().toLowerCase()),
  );

  return normalizedUsername && acceptedAdminNames.has(normalizedUsername) ? "admin" : "site";
};
