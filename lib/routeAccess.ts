import type { AuthRole } from "@/lib/server/auth";

export type RouteAccessDecision =
  | { action: "next" }
  | { action: "redirect"; destination: string };

const privatePagePrefixes = [
  "/map",
  "/couple",
  "/memories",
  "/favorites",
  "/anniversaries",
  "/time-capsule",
  "/settings",
  "/feedback",
  "/province",
] as const;

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const isPrivatePagePath = (pathname: string) =>
  privatePagePrefixes.some((prefix) => matchesPrefix(pathname, prefix));

export const getSafeNextPath = (value?: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/map";
  if (value.includes("\\") || /[\u0000-\u001F\u007F]/.test(value)) return "/map";

  return value;
};

export const decidePageAccess = (
  pathname: string,
  search: string,
  role: AuthRole | null,
): RouteAccessDecision => {
  if ((pathname === "/" || pathname === "/login") && role) {
    return { action: "redirect", destination: "/map" };
  }

  if (isPrivatePagePath(pathname) && !role) {
    const nextPath = getSafeNextPath(`${pathname}${search}`);
    return {
      action: "redirect",
      destination: `/login?next=${encodeURIComponent(nextPath)}`,
    };
  }

  return { action: "next" };
};
