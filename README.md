# Dispensary Menu Generator

> Open-sourced by **[DopeCast](https://www.dopecast.net/)** — built for cannabis retailers.

Generate beautiful, print-ready dispensary menus directly from your Dutchie POS inventory. Bring your own API key, runs locally on your machine — your key never leaves your computer except to authenticate with Dutchie itself.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built for](https://img.shields.io/badge/Built%20for-Dispensaries-7c3aed)](https://www.dopecast.net/)
[![Node](https://img.shields.io/badge/Node-18%2B-339933)](https://nodejs.org/)

---

## Demo

<!-- TODO: Add a real screenshot or GIF here once you've recorded one. See "Adding screenshots & GIFs" below. -->

```
┌──────────────────────────────────────────────────────────┐
│  Step 1 → Step 2 → Step 3 → Step 4                       │
│  Pick POS  Connect  Customize  Generate                  │
│                                                          │
│  Pick a style:  Slim · Slim Rows · Catalog · Dispensary  │
│  Click any item to edit price, name, description         │
│  Drag categories to reorder · Sort by price/THC/brand    │
│  Print or save as PDF                                    │
└──────────────────────────────────────────────────────────┘
```

---

## Features

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
3. **Step 1** — pick your POS (Dutchie supported today)
4. **Step 2** — paste your Dutchie API key. The browser sends it to the local proxy on your machine, which exchanges it for a Basic auth token via Dutchie's `AuthorizationHeader` endpoint
5. **Step 3** — upload your dispensary logo (auto-detects brand colors) and type your store name
6. **Step 4** — click *Generate Printable Menu*. The proxy fetches your full inventory, returns it to the browser. Pick a style, edit any item inline, sort, hide categories, then **Print** or **Save as PDF**

### What's happening behind the scenes

```
┌────────────┐     same-origin     ┌──────────────────┐    HTTPS    ┌─────────────────────────┐
│  Browser   │  ───────────────►   │  Express proxy   │  ────────►  │  api.pos.dutchie.com    │
│  (React)   │  ◄───────────────   │  localhost:3001  │  ◄────────  │  POS API                │
└────────────┘                     └──────────────────┘             └─────────────────────────┘
   port 5173                          server/index.js                  Cloudflare-fronted
   (dev only)                         50 lines, stateless              CORS-blocked from browsers
```

The Express server in `server/index.js` exposes two endpoints, called only by your local browser:

| Endpoint                        | What it does                                                                                            |
|---------------------------------|---------------------------------------------------------------------------------------------------------|
| `POST /api/dutchie/auth`        | Exchanges your raw API key for a Basic auth token via `GET /util/AuthorizationHeader/{key}`             |
| `POST /api/dutchie/menu`        | Fetches your inventory via `GET /inventory?includeLabResults=true&includeRoomQuantities=true`           |
| `GET /api/health`               | Liveness check — returns `{ ok: true }`                                                                 |

That's the entire backend. No database, no auth system, no session management, no rate limiting, no third-party calls.

### Why a proxy at all?

Dutchie's POS API does not enable CORS — `OPTIONS` preflight returns `405 Method Not Allowed` and no `Access-Control-Allow-Origin` header is sent. Direct browser requests are blocked by every modern browser. The local Express proxy solves this:

- Browser → `localhost:3001` is **same-origin** — no CORS check needed
- Node → `api.pos.dutchie.com` happens server-side — CORS doesn't apply

In dev, Vite (port 5173) proxies `/api/*` to Express (port 3001). In production (`npm start`), Express serves both the built React app and the API on a single port.

### Privacy & data flow

Your Dutchie API key:

- Is entered in the UI, **not** read from any environment variable
- Lives only in your browser's `localStorage` and the Express process memory during one HTTP request
- Is sent only to `api.pos.dutchie.com` — never to any third party
- Is **never** logged, persisted, or transmitted to DopeCast or anyone else
- Disappears the moment you clear browser storage or kill the Node process

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

Open http://localhost:5173, paste your Dutchie API key, generate.

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

1. Add an entry to the array in `src/components/POSSelector.tsx` (id, display name, logo URL)
2. Add a matching auth + inventory route pair in `server/index.js` (e.g. `POST /api/treez/auth`)
3. Branch on `selectedPOS` in `src/components/MenuGenerator.tsx` to call the right endpoint

---

## Adding screenshots & GIFs to this README

Screenshots and GIFs make a README *much* more compelling. Two ways to add them:

### Option 1 — commit the file to the repo (recommended)

```bash
mkdir -p docs
# Drop your screenshot.png or demo.gif into docs/
git add docs/screenshot.png
git commit -m "docs: add screenshot"
git push
```

Reference it in this README with a relative path:

```markdown
![Dispensary Menu Generator screenshot](docs/screenshot.png)
```

✅ Pros: image lives with the code, works offline, survives forks
❌ Cons: bloats the repo if you push huge GIFs (keep under ~5 MB)

### Option 2 — use GitHub's CDN (no commit required)

1. Go to <https://github.com/Meghvadalia/dispensary-menu-generator/issues/new> *(or any PR / issue / comment box)*
2. **Drag and drop** your image or GIF into the comment textarea
3. GitHub uploads it to `user-images.githubusercontent.com/...` and inserts the markdown link
4. **Copy that markdown link** out of the textarea — then **close the tab without submitting the issue**
5. Paste the link into this README and push

```markdown
![Demo](https://user-images.githubusercontent.com/123456/abcdef-1234.gif)
```

✅ Pros: zero repo bloat, fast to update
❌ Cons: relies on GitHub's CDN; if the repo is ever migrated, links could break

### Recording a GIF

| OS         | Tool                                                       |
|------------|------------------------------------------------------------|
| Windows    | [ScreenToGif](https://www.screentogif.com/) (free, great)  |
| macOS      | [Kap](https://getkap.co/) or [Gifski](https://gif.ski/)    |
| Any        | [Loom](https://www.loom.com/) — records video, exports GIF |

Aim for **5 seconds, ~720p, under 5 MB** so the README stays fast to load.

### Where to put the demo in this README

Replace the ASCII box in the **Demo** section near the top:

```markdown
## Demo

![Dispensary Menu Generator demo](docs/demo.gif)
```

That's all that's needed.

---

## Tech stack

Vite 5 · React 18 · TypeScript · Tailwind CSS · shadcn/ui (Radix primitives) · TanStack Query · React Hook Form + Zod · Sonner (toasts) · Recharts · Express 4 · native Node `fetch`

## Project structure

```
dispensary-menu-generator/
├── server/
│   └── index.js                  Express proxy (dev + prod, ~80 lines)
├── src/
│   ├── pages/
│   │   ├── Index.tsx             Main page — 4-step flow
│   │   └── NotFound.tsx          404
│   ├── components/
│   │   ├── APIKeyInput.tsx       Step 2 — paste Dutchie key
│   │   ├── MenuGenerator.tsx     Step 4 — fetch + render
│   │   ├── LogoUploader.tsx      Logo upload + brand color extraction
│   │   ├── POSSelector.tsx       Step 1 — POS provider picker
│   │   ├── menus/                5 menu layout implementations
│   │   └── ui/                   shadcn/ui primitives
│   ├── hooks/
│   │   └── useLocalStorage.ts    Persist UI preferences
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

---

## Troubleshooting

**`npm run dev` fails with port already in use**
Something's already on 5173 or 3001. Kill it, or set `PORT=4001 npm run dev` to use a different proxy port.

**API key authentication fails**
- Confirm the key works by curling Dutchie directly:
  ```bash
  curl https://api.pos.dutchie.com/util/AuthorizationHeader/YOUR_KEY
  ```
  A successful response is a base64 string. Anything else means the key is invalid.
- Check the proxy console for the actual upstream status code.

**Menu loads but is empty**
Your Dutchie account has no inventory rows for the queried filters. Check Dutchie POS directly to confirm there are products with `inventoryUnitCount > 0`.

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
