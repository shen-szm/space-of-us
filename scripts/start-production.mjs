import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadProductionEnvFile } from "./production-env.mjs";

const root = process.cwd();
const result = await loadProductionEnvFile(root);

const requiredKeys = [
  "AUTH_COOKIE_SECRET",
  "SITE_PASSWORD",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
];

const missing = requiredKeys.filter((key) => !process.env[key]?.trim());

if (!result.loaded) {
  console.warn(`[production] ${result.path} was not found; using process environment only.`);
}

if (missing.length > 0) {
  console.warn(`[production] missing required environment variables: ${missing.join(", ")}`);
}

process.env.PORT = process.env.PORT || "3000";
process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";

await import(pathToFileURL(path.join(root, ".next", "standalone", "server.js")).href);
