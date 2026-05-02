# Dispensary Menu Generator

> Open-sourced by **[DopeCast](https://www.dopecast.net/)** — built for cannabis retailers.

Generate beautiful, print-ready dispensary menus directly from your POS inventory. Supports **Dutchie** and **Flowhub** today. Bring your own credentials, runs locally on your machine — your keys never leave your computer except to talk to your POS provider.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built for](https://img.shields.io/badge/Built%20for-Dispensaries-7c3aed)](https://www.dopecast.net/)
[![Node](https://img.shields.io/badge/Node-18%2B-339933)](https://nodejs.org/)

---

## Demo

<!-- Demo video coming soon -->

---

## Features

- **Multi-POS** — Dutchie and Flowhub supported, server-side normalization keeps the menu UI vendor-agnostic
- **Auto store name** — Dutchie `whoami` and Flowhub `clientsLocations` populate the store name automatically (still editable)
- **5 menu layouts** — Slim, Slim Rows, Catalog, Catalog Fixed, Dispensary
- **Inline editing** — click any text (price, name, description) to edit directly on the menu
- **Live category management** — show/hide, reorder, rename, page-break controls
- **Multi-criteria sorting** — name, brand, price, THC, ascending or descending
- **Custom branding** — upload your dispensary logo, set store name, auto-extracts brand colors
- **Print or PDF export** — uses the browser's native print dialog (no server-side rendering)
- **Dark / light mode** with persistent preference
- **Offline after first load** — settings live in your browser's `localStorage`
- **No accounts, no analytics, no tracking**

---

## How it works

### From your perspective

1. Run `npm run dev`
2. Open http://localhost:5173 — the app loads in dark mode by default
3. **Step 1** — pick your POS (Dutchie or Flowhub)
4. **Step 2** — connect your account:
   - **Dutchie**: paste your API key. The local proxy exchanges it for a Basic auth token via Dutchie's `AuthorizationHeader` endpoint.
   - **Flowhub**: paste your `clientId` and API key. The proxy fetches your locations via `/v0/clientsLocations`. With one location the wizard auto-confirms; with multiple, pick from the dropdown.
5. **Step 3** — upload your dispensary logo (auto-detects brand colors). Your store name is pre-filled from the POS — edit it if you want a different display name.
6. **Step 4** — click *Generate Printable Menu*. The proxy fetches your full inventory, normalizes each row to a unified `MenuItem` shape (cents → dollars, range/single cannabinoid display, etc.), and returns it to the browser. Pick a style, edit any item inline, sort, hide categories, then **Print** or **Save as PDF**

### What's happening behind the scenes

```
┌────────────┐     same-origin     ┌──────────────────────┐    HTTPS    ┌─────────────────────────┐
│  Browser   │  ───────────────►   │   Express proxy      │  ────────►  │  api.pos.dutchie.com    │
│  (React)   │  ◄───────────────   │   localhost:3001     │  ────────►  │  api.flowhub.co         │
└────────────┘                     │   normalizes →       │  ◄────────  │  (vendor POS APIs)      │
   port 5173                       │   MenuItem[]         │             │  CORS-blocked from      │
   (dev only)                      └──────────────────────┘             │  browsers               │
                                      server/index.js + normalize/      └─────────────────────────┘
                                      stateless, ~165 lines
```

The Express server exposes a small set of endpoints, called only by your local browser:

| Endpoint                          | What it does                                                                                                     |
|-----------------------------------|------------------------------------------------------------------------------------------------------------------|
| `POST /api/dutchie/auth`          | Exchanges your raw API key for a Basic auth token via `GET /util/AuthorizationHeader/{key}`                      |
| `POST /api/dutchie/whoami`        | Resolves the store name and address via `GET /whoami` (used to pre-fill the customize step)                      |
| `POST /api/dutchie/menu`          | Fetches Dutchie inventory and normalizes each row to the unified `MenuItem` shape                                |
| `POST /api/flowhub/locations`     | Lists locations under your Flowhub `clientId` via `GET /v0/clientsLocations` (only `locationId`/`name`/`address` returned) |
| `POST /api/flowhub/menu`          | Fetches Flowhub `inventoryNonZero`, filters to your selected `locationId`, normalizes to `MenuItem`              |
| `GET /api/health`                 | Liveness check — returns `{ ok: true }`                                                                          |

Both `/menu` endpoints return the **same shape** — `{ menu: MenuItem[] }` — so the React layer is fully POS-agnostic. Per-vendor quirks (Dutchie's `labResults`, Flowhub's range-style `cannabinoidInformation`, prices in cents vs dollars, `fluidounces` UOM) are normalized server-side in `server/normalize/{dutchie,flowhub}.js`.

That's the entire backend. No database, no auth system, no session management, no rate limiting, no third-party calls.

### Why a proxy at all?

Both vendor APIs are server-to-server. Dutchie's POS API does not enable CORS — `OPTIONS` preflight returns `405 Method Not Allowed` and no `Access-Control-Allow-Origin` header is sent. Flowhub authenticates with `clientId` + `key` headers that you wouldn't want a browser holding directly anyway. The local Express proxy solves both:

- Browser → `localhost:3001` is **same-origin** — no CORS check needed
- Node → `api.pos.dutchie.com` / `api.flowhub.co` happens server-side — CORS doesn't apply, and credentials never reach the browser's network log

In dev, Vite (port 5173) proxies `/api/*` to Express (port 3001). In production (`npm start`), Express serves both the built React app and the API on a single port.

### Privacy & data flow

Your POS credentials (Dutchie API key, or Flowhub `clientId` + API key):

- Are entered in the UI, **not** read from any environment variable
- Live only in React component state and the Express process memory during one HTTP request — they are **not** persisted to `localStorage`, disk, or any cookie
- Are sent only to your POS provider's API — never to any third party
- Are **never** logged, persisted, or transmitted to DopeCast or anyone else
- Disappear the moment you refresh the page or kill the Node process

(`localStorage` is used only for non-sensitive UI preferences: chosen menu style, category order, sort criteria, dark/light mode.)

No analytics. No telemetry. No tracking pixels. No third-party scripts.

---

## Quickstart

Requires **Node.js 18 or newer**. Check with `node -v`.

```bash
git clone https://github.com/Meghvadalia/dispensary-menu-generator.git
cd dispensary-menu-generator
npm install
npm run dev
```

Open http://localhost:5173, pick your POS, paste credentials, generate.

`npm run dev` starts both Vite (UI on :5173) and Express (proxy on :3001) together in one terminal. `Ctrl+C` kills both.

---

## Production / self-host

Build the React app, then run a single Express process that serves the static UI and proxies the API on one port:

```bash
npm run build
npm start
```

Open http://localhost:3001. Deploy anywhere Node 18+ runs — Railway, Render, Fly.io, your own VPS, a Raspberry Pi.

| Variable             | Default                  | Purpose                                              |
|----------------------|--------------------------|------------------------------------------------------|
| `PORT`               | `3001`                   | Express server port                                  |
| `VITE_PROXY_TARGET`  | `http://localhost:3001`  | Where the Vite dev server proxies `/api/*` to        |

---

## Customization

### Branding

| What                 | Where                                                            |
|----------------------|------------------------------------------------------------------|
| Header / footer logo | `src/assets/dopecast-logo-*.png` and the `<img>` tags in `src/pages/Index.tsx` |
| Page title           | `<title>` in `index.html`                                        |
| Favicon              | `public/favicon.png`                                             |
| Footer links         | `src/pages/Index.tsx` (privacy / contact anchors)                |
| Promo text           | Footer of `src/pages/Index.tsx` and bottom of `src/components/MenuGenerator.tsx` |

### Theme & colors

- Tailwind config: `tailwind.config.ts`
- CSS custom properties (HSL color tokens, gradients, animations): `src/index.css`
- Dark/light mode toggle: implemented in `src/pages/Index.tsx` via the `dark` class on `<html>`

### Menu styles

Each menu layout is a self-contained component:

```
src/components/menus/
├── DispensaryMenu.tsx      Default — large cards with imagery
├── SlimMenu.tsx            Compact tile grid
├── SlimRowsMenu.tsx        Horizontal rows, "Most Used" default
├── CatalogMenu.tsx         Multi-column catalog
└── CatalogFixedMenu.tsx    Fixed-page catalog with controlled pagination
```

Add a 6th by copying any of those files and registering it in `src/components/MenuVersionSelector.tsx`.

### Add another POS provider

The architecture is designed to make this mechanical. Add a new POS in roughly seven steps:

1. Flip / add the tile in `src/components/POSSelector.tsx` (id, display name, logo URL, set `available: true`).
2. Add the credential field config to `POS_CONFIG` in `src/components/ConnectAccount.tsx` (one entry per POS, lists the input fields and which `flow` to use; add a new `ConnectFlow` value if your POS has a unique connect handshake).
3. Extend the `Connection` discriminated union in `src/types/connection.ts` with a new arm for your POS, and add the human-readable label to `POS_LABELS`.
4. Add server-side route(s) in `server/index.js` (auth + menu, plus any per-POS extras like `/whoami` or `/locations`).
5. Implement `server/normalize/<pos>.js` exporting a pure `normalize<Pos>Item(raw) → MenuItem` function. Map vendor fields (price, cannabinoid info, weight units, strain, image URL) to the unified `MenuItem` shape defined in `src/types/menu.ts`.
6. Add fixture rows + golden assertions to `server/normalize/__fixtures__/<pos>-inventory.json` and `server/normalize/check.js`. Run `npm run check:normalize` until your fixtures pass.
7. Update `MenuGenerator.tsx`'s fetch dispatch (`connection.pos === '<your-pos>' ? ... : ...`) — typically a one-line addition.

The seam — the `/api/{pos}/menu` boundary — guarantees that none of the 5 menu layouts need to change when you add a POS. They consume `MenuItem[]`, full stop.

### A note on Treez support

The **Treez** tile in the POS selector is intentionally disabled (`available: false`). Treez's API uses keys that DopeCast holds at the integrator level, not per-merchant keys, so a self-hosted/local OSS instance has no way to authenticate directly the way Dutchie and Flowhub do. If you need a Treez-backed menu, [contact DopeCast](https://www.dopecast.net/contact) — that integration runs on managed DopeCast infrastructure, not from this open-source repo.

---

## Tech stack

Vite 5 · React 18 · TypeScript · Tailwind CSS · shadcn/ui (Radix primitives) · TanStack Query · React Hook Form + Zod · Sonner (toasts) · Recharts · Express 4 · native Node `fetch`

## Project structure

```
dispensary-menu-generator/
├── server/
│   ├── index.js                  Express proxy (dev + prod, ~165 lines)
│   └── normalize/
│       ├── dutchie.js            Dutchie /inventory row → unified MenuItem
│       ├── flowhub.js            Flowhub /v0/inventoryNonZero row → MenuItem
│       ├── check.js              Fixture-driven assertion harness (no test framework)
│       └── __fixtures__/         Synthesized rows exercising each normalizer's branches
├── src/
│   ├── pages/
│   │   ├── Index.tsx             Main page — 4-step flow + Connection state
│   │   └── NotFound.tsx          404
│   ├── components/
│   │   ├── ConnectAccount.tsx    Step 2 — POS-aware credential entry + Flowhub location picker
│   │   ├── MenuGenerator.tsx     Step 4 — fetch normalized menu + render
│   │   ├── LogoUploader.tsx      Logo upload + brand color extraction + store name input
│   │   ├── POSSelector.tsx       Step 1 — POS provider picker
│   │   ├── menus/                5 menu layout implementations
│   │   └── ui/                   shadcn/ui primitives
│   ├── types/
│   │   ├── connection.ts         Connection discriminated union (dutchie | flowhub) + POS_LABELS
│   │   └── menu.ts               Unified MenuItem type — single source of truth for renderers
│   ├── hooks/
│   │   └── useLocalStorage.ts    Persist UI preferences (style, sort, category order)
│   ├── lib/
│   ├── assets/                   Logos
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                 Tailwind + custom theme tokens
├── public/                       Static assets served as-is
├── package.json
├── vite.config.ts                /api/* dev proxy → :3001
├── tailwind.config.ts
└── tsconfig*.json
```

Run `npm run check:normalize` to exercise both POS normalizers against the fixture rows.

---

## Troubleshooting

**`npm run dev` fails with port already in use**
Something's already on 5173 or 3001. Kill it, or set `PORT=4001 npm run dev` to use a different proxy port.

**Dutchie authentication fails**
- Confirm the key works by curling Dutchie directly:
  ```bash
  curl https://api.pos.dutchie.com/util/AuthorizationHeader/YOUR_KEY
  ```
  A successful response is a base64 string. Anything else means the key is invalid.
- Check the proxy console for the actual upstream status code.

**Flowhub authentication fails**
- Confirm both `clientId` and API key by curling Flowhub directly:
  ```bash
  curl -H "clientId: YOUR_CLIENT_ID" -H "key: YOUR_API_KEY" \
    https://api.flowhub.co/v0/clientsLocations
  ```
  A successful response is `{"status":200,"data":[...]}` with at least one location. Anything else (typically `Unauthorized`) means one of the two values is wrong.
- Flowhub credentials are issued per-integrator. If you don't have a `clientId`/`key` pair yet, contact `api@flowhub.com`.

**Menu loads but is empty (Dutchie)**
Your Dutchie account has no inventory rows for the queried filters. Check Dutchie POS directly to confirm there are products with `inventoryUnitCount > 0`.

**Menu loads but is empty (Flowhub)**
- The selected location has zero in-stock SKUs. Verify in Flowhub.
- Or you picked the wrong `locationId` in the dropdown. Hit `/api/flowhub/locations` directly and confirm the `locationId` you're using matches the store you expect.

**Print preview cuts off rows**
Open the Category Manager, set per-category page breaks. Print at 100% scale, A4 or US Letter portrait.

---

## Contributing

Issues and PRs welcome. For non-trivial changes, please open an issue first to discuss.

---

## About DopeCast

Built and open-sourced by **[DopeCast](https://www.dopecast.net/)** — digital menu screens and signage for cannabis dispensaries. If you want managed hardware/software for in-store screens, [get in touch](https://www.dopecast.net/contact).

---

## License

[MIT](LICENSE) — fork it, ship it, sell it. Just keep the copyright notice.
