import { readFile, writeFile } from "node:fs/promises";

const configPath = new URL("../dist/server/wrangler.json", import.meta.url);
const config = JSON.parse(await readFile(configPath, "utf8"));

if (config.name !== "machiba-ai-beginner-guide") {
  throw new Error("Unexpected Cloudflare Worker name in generated configuration.");
}

if (config.compatibility_date !== "2026-08-22") {
  throw new Error("Unexpected Cloudflare compatibility date in generated configuration.");
}

// The current Vite plugin still emits this no-op legacy field, while current
// Wrangler rejects it. Removing it preserves the existing one-Worker behavior.
delete config.legacy_env;

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
