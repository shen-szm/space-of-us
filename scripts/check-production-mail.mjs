import { loadProductionEnvFile } from "./production-env.mjs";

const result = await loadProductionEnvFile(process.cwd());
const apiKey = process.env.RESEND_API_KEY?.trim() || "";
const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "";

const checks = {
  envFileLoaded: result.loaded,
  envFilePath: result.path,
  resendApiKey: apiKey ? `SET len=${apiKey.length}` : "MISSING",
  resendFromEmail: fromEmail || "MISSING",
  resendFromEmailLooksValid: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fromEmail) || /^.+<[^@\s]+@[^@\s]+\.[^@\s]+>$/.test(fromEmail),
};

console.log(JSON.stringify(checks, null, 2));

if (!apiKey || !fromEmail || !checks.resendFromEmailLooksValid) {
  process.exitCode = 1;
}
