#!/usr/bin/env node

import { runSmokeCli } from "./smoke-web-core.mjs";

await runSmokeCli({
  targetUrl: process.argv[2] ?? process.env.PREVIEW_URL,
  label: "Preview smoke (without database)",
  publicOnly: true,
  usage: "Usage: node ./apps/web/scripts/smoke-preview.mjs <preview-url>"
});
