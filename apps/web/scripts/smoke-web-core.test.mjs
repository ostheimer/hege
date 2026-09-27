import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { runSmoke } from "./smoke-web-core.mjs";

async function withServer(overrides, run) {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push(req.url);
    if (overrides[req.url]) return overrides[req.url](res);
    if (req.url === "/app") {
      res.writeHead(307, { location: "/login?next=%2Fapp" });
      return res.end();
    }
    if (req.url.startsWith("/api/")) {
      res.writeHead(401, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: { code: "unauthenticated" } }));
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.end("Das Revier. Gemeinsam im Blick. Revier starten Anmelden Willkommen im Revier.");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`, requests); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test("Preview prüft alle öffentlichen Seiten und geschützten API-Routen ohne Login", async () => {
  await withServer({}, async (url, requests) => {
    await runSmoke(url, { publicOnly: true });
    assert.ok(requests.includes("/api/v1/revier-map"));
    assert.ok(requests.includes("/registrieren?plan=starter"));
    assert.ok(!requests.includes("/api/v1/auth/login"));
  });
});

test("Preview bleibt bei defekter öffentlicher Seite rot", async () => {
  await withServer({ "/login": res => { res.writeHead(500); res.end(); } }, async url => {
    await assert.rejects(runSmoke(url, { publicOnly: true }), /Expected \/login to return 200/);
  });
});

test("Preview bleibt bei ungeschützter API rot", async () => {
  await withServer({ "/api/v1/me": res => {
    res.writeHead(200, { "content-type": "application/json" }); res.end("{}");
  } }, async url => {
    await assert.rejects(runSmoke(url, { publicOnly: true }), /anonymous.*401/);
  });
});

test("Release verlangt weiterhin erfolgreichen Login", async () => {
  await withServer({}, async (url, requests) => {
    await assert.rejects(runSmoke(url), /auth\/login to return 200/);
    assert.ok(requests.includes("/api/v1/auth/login"));
  });
});
