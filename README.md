# Dispensary Menu Generator

> Open-sourced by **[DopeCast](https://www.dopecast.net/)** — built for cannabis retailers.

Generate beautiful, print-ready dispensary menus directly from your Dutchie POS inventory. Bring your own API key, runs locally on your machine — your key never leaves your computer except to authenticate with Dutchie itself.

5 menu styles, live in-place editing, multi-criteria sorting, custom logos & store names, dark/light mode, browser-printable or save-as-PDF.

## Quickstart

Requires Node.js 18 or newer.

```bash
git clone https://github.com/Meghvadalia/dispensary-menu-generator.git
cd dispensary-menu-generator
npm install
npm run dev
```

Open <http://localhost:5173>, paste your Dutchie API key, generate your menu.

## Production / self-host

```bash
npm run build
npm start
```

Serves the built React app and proxies the Dutchie API on a single port (default `3001`). Deploy anywhere Node runs — Railway, Render, Fly.io, your own VPS.

## How it works

```
Browser (React)  <->  localhost:3001 (Express proxy)  <->  api.pos.dutchie.com
```

Dutchie's POS API does not allow direct browser requests (it sends no CORS headers and rejects preflight). A small Express proxy in this repo forwards the two API calls. Your API key is sent from the browser to your local proxy on each request — it is never stored, never logged, never persisted. The server is stateless.

## Configuration

None required. The Dutchie API key is entered in the UI and held in your browser's `localStorage`. Optional environment variables:

| Var                  | Default                  | Purpose                                              |
|----------------------|--------------------------|------------------------------------------------------|
| `PORT`               | `3001`                   | Express server port                                  |
| `VITE_PROXY_TARGET`  | `http://localhost:3001`  | Where Vite dev server proxies `/api/*`               |

## Customization

- **Branding**: replace logos in `src/assets/`, edit header/footer in `src/pages/Index.tsx`
- **Theme**: edit `tailwind.config.ts` and `src/index.css`
- **Menu styles**: edit `src/components/menus/*.tsx`
- **Add another POS**: extend `src/components/POSSelector.tsx` and add a matching auth handler in `server/index.js`

## Privacy & security

This app makes **only two outbound network calls**, both to `api.pos.dutchie.com`:

1. `GET /util/AuthorizationHeader/<your-key>` — exchanges your API key for a Basic auth token
2. `GET /inventory?...` — fetches your menu data

No analytics, no telemetry, no third-party services. Your API key stays in your browser's `localStorage` plus your Express process memory for the duration of one request.

## Tech stack

Vite + React 18 + TypeScript, Tailwind CSS, shadcn/ui (Radix primitives), TanStack Query, React Hook Form + Zod, Express 4, native Node `fetch`.

## Project structure

```
dispensary-menu-generator/
├── server/
│   └── index.js                  Express proxy (dev + prod)
├── src/
│   ├── pages/
│   │   ├── Index.tsx             Main page with the 4-step flow
│   │   └── NotFound.tsx
│   ├── components/
│   │   ├── APIKeyInput.tsx       Step 2: paste Dutchie key
│   │   ├── MenuGenerator.tsx     Step 4: fetch + render
│   │   ├── menus/                5 menu style implementations
│   │   └── ui/                   shadcn/ui primitives
│   ├── hooks/
│   ├── lib/
│   └── assets/
├── public/
├── package.json
├── vite.config.ts                /api/* dev proxy -> :3001
├── tailwind.config.ts
└── tsconfig*.json
```

## About DopeCast

Built and open-sourced by **[DopeCast](https://www.dopecast.net/)** — digital menu screens and signage for cannabis dispensaries. If you want managed hardware/software for in-store screens, [get in touch](https://www.dopecast.net/contact).

## License

[MIT](LICENSE)

## Contributing

Issues and PRs welcome. Please open an issue first for non-trivial changes.
