import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";

const root = process.cwd();
const port = 3015;
const host = "127.0.0.1";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  const response = await fetch(url);
  const text = await response.text();
  return { response, text };
}

async function waitForHttp(url, attempts = 40) {
  let lastError = null;

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await fetchText(url);
    } catch (error) {
      lastError = error;
      await wait(500);
    }
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const child = spawn(process.execPath, ["scripts/start-production.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: host,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let stdout = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", () => {});

  try {
    for (let index = 0; index < 20; index += 1) {
      if (stdout.includes(`http://${host}:${port}`) || stdout.includes("Ready in")) break;
      await wait(500);
    }

    const { response, text } = await waitForHttp(`http://${host}:${port}/map`);
    assert.equal(response.status, 200, `Expected /map to return 200, got ${response.status}`);

    const assetMatches = [...text.matchAll(/(?:href|src)="([^"]*\/_next\/static\/[^"]+\.(?:css|js))"/g)];
    assert.ok(assetMatches.length > 0, "Expected /map HTML to reference Next static assets");

    for (const [, assetPath] of assetMatches.slice(0, 8)) {
      const assetResponse = await fetch(`http://${host}:${port}${assetPath}`);
      assert.equal(
        assetResponse.status,
        200,
        `Expected asset ${assetPath} to return 200, got ${assetResponse.status}`,
      );
    }
  } finally {
    child.kill("SIGTERM");
    try {
      execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    } catch {
      // ignore cleanup failures
    }
    await wait(500);
    if (!child.killed) child.kill("SIGKILL");
  }

  console.log("start-production serves /map and its referenced static assets");
  process.exit(0);
}

main().catch((error) => {
  console.error(error?.stack ?? String(error));
  process.exitCode = 1;
});
