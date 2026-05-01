import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { normalizeDutchieItem } from "./normalize/dutchie.js";
import { normalizeFlowhubItem } from "./normalize/flowhub.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DUTCHIE_BASE = "https://api.pos.dutchie.com";
const FLOWHUB_BASE = "https://api.flowhub.co";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

// POST /api/dutchie/auth   { apiKey } -> { authCode }
app.post("/api/dutchie/auth", async (req, res) => {
  const apiKey = String(req.body?.apiKey || "").trim();
  if (!apiKey) {
    return res.status(400).json({ error: "Missing apiKey" });
  }

  try {
    const r = await fetch(
      `${DUTCHIE_BASE}/util/AuthorizationHeader/${encodeURIComponent(apiKey)}`,
      { method: "GET", headers: { Accept: "application/json" } }
    );
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: "Failed to authenticate with Dutchie" });
    }
    let authCode = (await r.text()).replace(/^["']+|["']+$/g, "").trim();
    if (authCode.startsWith("Basic ")) authCode = authCode.slice(6).trim();
    return res.json({ authCode });
  } catch (e) {
    return res.status(502).json({ error: "Network error", details: e?.message });
  }
});

// POST /api/dutchie/menu   { authCode } -> { menu }
app.post("/api/dutchie/menu", async (req, res) => {
  const authCode = String(req.body?.authCode || "").trim();
  if (!authCode) {
    return res.status(400).json({ error: "Missing authCode" });
  }

  try {
    const r = await fetch(
      `${DUTCHIE_BASE}/inventory?includeLabResults=true&includeRoomQuantities=true`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${authCode}`,
          Accept: "application/json",
        },
      }
    );
    if (!r.ok) {
      const details = await r.text().catch(() => "");
      return res
        .status(r.status)
        .json({ error: "Failed to fetch inventory", details });
    }
    const raw = await r.json();
    const rawArray = Array.isArray(raw) ? raw : [];
    const menu = rawArray.filter(Boolean).map(normalizeDutchieItem);
    return res.json({ menu });
  } catch (e) {
    return res.status(502).json({ error: "Network error", details: e?.message });
  }
});

// POST /api/flowhub/locations  { clientId, apiKey } -> { locations }
app.post("/api/flowhub/locations", async (req, res) => {
  const clientId = String(req.body?.clientId || "").trim();
  const apiKey = String(req.body?.apiKey || "").trim();
  if (!clientId || !apiKey) {
    return res.status(400).json({ error: "Missing clientId or apiKey" });
  }

  try {
    const r = await fetch(`${FLOWHUB_BASE}/v0/clientsLocations`, {
      method: "GET",
      headers: { clientId, key: apiKey, Accept: "application/json" },
    });
    if (r.status === 401) {
      return res.status(401).json({ error: "Invalid Flowhub credentials" });
    }
    if (!r.ok) {
      const details = await r.text().catch(() => "");
      return res
        .status(r.status)
        .json({ error: "Failed to fetch locations", details });
    }
    const body = await r.json();
    const data = (Array.isArray(body?.data) ? body.data : []).filter(Boolean);
    const locations = data.map((loc) => ({
      locationId: loc.locationId,
      locationName: loc.locationName,
      address: {
        city: loc.address?.city ?? null,
        state: loc.address?.state ?? null,
      },
    }));
    return res.json({ locations });
  } catch (e) {
    return res.status(502).json({ error: "Network error", details: e?.message });
  }
});

// POST /api/flowhub/menu  { clientId, apiKey, locationId } -> { menu }
app.post("/api/flowhub/menu", async (req, res) => {
  const clientId = String(req.body?.clientId || "").trim();
  const apiKey = String(req.body?.apiKey || "").trim();
  const locationId = String(req.body?.locationId || "").trim();
  if (!clientId || !apiKey || !locationId) {
    return res
      .status(400)
      .json({ error: "Missing clientId, apiKey, or locationId" });
  }

  try {
    const r = await fetch(`${FLOWHUB_BASE}/v0/inventoryNonZero`, {
      method: "GET",
      headers: { clientId, key: apiKey, Accept: "application/json" },
    });
    if (r.status === 401) {
      return res.status(401).json({ error: "Invalid Flowhub credentials" });
    }
    if (!r.ok) {
      const details = await r.text().catch(() => "");
      return res
        .status(r.status)
        .json({ error: "Failed to fetch inventory", details });
    }
    const body = await r.json();
    const data = (Array.isArray(body?.data) ? body.data : []).filter(Boolean);
    const filtered = data.filter(
      (i) => i.locationId === locationId && (i.quantity ?? 0) > 0,
    );
    const menu = filtered.map(normalizeFlowhubItem);
    return res.json({ menu });
  } catch (e) {
    return res.status(502).json({ error: "Network error", details: e?.message });
  }
});

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Production: serve the built React app from /dist
const distPath = path.join(__dirname, "..", "dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Dispensary Menu Generator server: http://localhost:${port}`);
  if (!existsSync(distPath)) {
    // eslint-disable-next-line no-console
    console.log(`(dev mode — frontend served by Vite; API at this port)`);
  }
});
