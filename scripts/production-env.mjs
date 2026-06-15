import { readFile } from "node:fs/promises";
import path from "node:path";

export function parseEnvFile(source) {
  const values = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export async function loadProductionEnvFile(rootDir = process.cwd()) {
  const envPath = path.join(rootDir, ".env.production.local");
  let source;

  try {
    source = await readFile(envPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { loaded: false, path: envPath, keys: [] };
    }
    throw error;
  }

  const parsed = parseEnvFile(source);
  const keys = [];

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
    keys.push(key);
  }

  return { loaded: true, path: envPath, keys };
}
