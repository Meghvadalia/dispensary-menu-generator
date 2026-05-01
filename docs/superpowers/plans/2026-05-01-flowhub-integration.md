# Flowhub POS Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Flowhub as a supported POS, with seamless behavior alongside Dutchie, by moving inventory normalization from the React layer into the Express proxy and exposing a `Connection` discriminated union to the frontend.

**Architecture:** Server-side normalization to a unified `MenuItem` shape. Both `/api/{pos}/menu` endpoints return `{ menu: MenuItem[] }` regardless of vendor. Flowhub auth is two-step: credentials → location picker (`/v0/clientsLocations`) → location selected → menu fetch.

**Tech Stack:** Express 4 (ESM), React 18 + TypeScript 5.8, Vite 5, Tailwind, shadcn/ui primitives. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-01-flowhub-integration-design.md`](../specs/2026-05-01-flowhub-integration-design.md)

**Live API verification:** Already performed during brainstorming. `clientId`/`key` headers work, `/v0/clientsLocations` returns 1 location for the test client, `/v0/inventoryNonZero` returns 341 items. Normalizer logic already corrected for dual-unit cannabinoids, messy `speciesName` values, and `fluidounces` UOM.

---

## File Structure

| Path | Action | Responsibility |
| --- | --- | --- |
| `src/types/menu.ts` | NEW | `MenuItem` type — unified shape both POSes produce. Single source of truth for renderers. |
| `src/types/connection.ts` | NEW | `Connection` discriminated union (`pos: 'dutchie' \| 'flowhub'`). Threaded from `Index` → `ConnectAccount` and `MenuGenerator`. |
| `server/normalize/dutchie.js` | NEW | Pure function `normalizeDutchieItem(raw) → MenuItem`. Logic moved from `MenuGenerator.tsx:300-328`. |
| `server/normalize/flowhub.js` | NEW | Pure function `normalizeFlowhubItem(raw) → MenuItem`. Handles dual-unit cannabinoids, strain mapping, cents→dollars. |
| `server/normalize/check.js` | NEW | Fixture-driven assertion harness. Runs both normalizers against fixtures and checks structural + semantic correctness. |
| `server/normalize/__fixtures__/dutchie-inventory.json` | NEW | 3 synthesized rows mirroring the shape the Dutchie normalizer reads (flower %, edible mg, minimal-fields fallback). |
| `server/normalize/__fixtures__/flowhub-inventory-nonzero.json` | NEW | 3 OAS-derived rows: flower (% THC), vape (dual-unit mg + % THC, prefer % since UOM=grams), edible (UOM=each, prefer mg + speciesName='50/50' → 'Hybrid'). |
| `server/index.js` | MODIFY | (a) refactor `/api/dutchie/menu` to call `normalizeDutchieItem`, (b) add `/api/flowhub/locations`, (c) add `/api/flowhub/menu` with location filter + normalize. |
| `package.json` | MODIFY | Add `"check:normalize"` script. |
| `src/components/POSSelector.tsx` | MODIFY | Set `flowhub.available = true`, update description. |
| `src/components/APIKeyInput.tsx` | RENAME → `ConnectAccount.tsx` | POS-aware: config-driven fields + flow dispatcher (`dutchie-auth` vs `flowhub-location-picker`). Emits `Connection`. |
| `src/components/MenuGenerator.tsx` | MODIFY | `authCode: string` → `connection: Connection`. Drop in-component normalizer. POS-aware fetch dispatch. POS label in heading copy. |
| `src/pages/Index.tsx` | MODIFY | `authCode` state → `connection: Connection \| null`. Wire updated component props. |

---

## Task 1: Add unified frontend types

**Files:**
- Create: `src/types/menu.ts`
- Create: `src/types/connection.ts`

This task only adds types — no behavior. Subsequent tasks will import from these.

- [ ] **Step 1: Create `src/types/menu.ts`**

```ts
export type MenuItem = {
  id: string;
  name: string;
  category: string;
  brand?: string;
  strain?: string;
  thc?: string;
  cbd?: string;
  price: number;
  weight?: string;
  description?: string;
  imageUrl?: string;
};
```

- [ ] **Step 2: Create `src/types/connection.ts`**

```ts
export type Connection =
  | { pos: 'dutchie'; authCode: string }
  | {
      pos: 'flowhub';
      clientId: string;
      apiKey: string;
      locationId: string;
      locationName: string;
    };

export type PosId = Connection['pos'];

export const POS_LABELS: Record<PosId, string> = {
  dutchie: 'Dutchie',
  flowhub: 'Flowhub',
};
```

- [ ] **Step 3: Verify TS compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no new files reference these types yet, so no errors).

- [ ] **Step 4: Commit**

```bash
git add src/types/menu.ts src/types/connection.ts
git commit -m "feat(types): add unified MenuItem and Connection types"
```

---

## Task 2: Move Dutchie normalizer to server (TDD via fixture check)

**Files:**
- Create: `server/normalize/dutchie.js`
- Create: `server/normalize/check.js`
- Create: `server/normalize/__fixtures__/dutchie-inventory.json`

The repo has no test framework; we use a Node script (`check.js`) with `node:assert/strict` instead. Same TDD discipline: write fixture + assertions first, see it fail, implement, see it pass.

- [ ] **Step 1: Create the Dutchie fixture**

Create `server/normalize/__fixtures__/dutchie-inventory.json` with 3 rows that exercise the normalizer's branches:

```json
[
  {
    "inventoryId": "inv-001",
    "productId": "prod-001",
    "productName": "Blue Dream 3.5g",
    "category": "Flower",
    "masterCategory": "Flower",
    "brandName": "Premium Gardens",
    "vendor": null,
    "strainType": "Hybrid",
    "strain": "Blue Dream",
    "labResults": [
      { "labTest": "THC", "value": 22.4, "labResultUnit": "Percent" },
      { "labTest": "CBD", "value": 0.1, "labResultUnit": "Percent" }
    ],
    "unitPrice": 45,
    "recUnitPrice": 45,
    "unitWeight": 3.5,
    "unitWeightUnit": "g",
    "description": "Sweet berry aroma."
  },
  {
    "inventoryId": "inv-002",
    "productId": "prod-002",
    "productName": "Indica Gummies 10pk",
    "category": "Edibles",
    "brandName": null,
    "vendor": "Sweet Relief",
    "strainType": null,
    "strain": "No Strain",
    "labResults": [
      { "labTest": "THC", "value": 100, "labResultUnit": "Milligrams" },
      { "labTest": "CBD", "value": 0, "labResultUnit": "Milligrams" }
    ],
    "unitPrice": 25,
    "unitWeight": null,
    "unitWeightUnit": null,
    "description": "Nighttime gummies."
  },
  {
    "productId": "prod-003",
    "productName": "Generic Item",
    "masterCategory": "Other",
    "labResults": null,
    "recUnitPrice": 10
  }
]
```

- [ ] **Step 2: Create `server/normalize/check.js` skeleton (will fail because dutchie.js doesn't exist yet)**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { normalizeDutchieItem } from './dutchie.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const readFixture = (name) =>
  JSON.parse(readFileSync(path.join(__dirname, '__fixtures__', name), 'utf8'));

const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;
const isOptionalString = (v) => v === undefined || isNonEmptyString(v);
const isFiniteNonNeg = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function assertMenuItem(item, label) {
  assert(isNonEmptyString(item.id), `${label}: id must be non-empty string`);
  assert(isNonEmptyString(item.name), `${label}: name must be non-empty string`);
  assert(isNonEmptyString(item.category), `${label}: category must be non-empty string`);
  assert(isOptionalString(item.brand), `${label}: brand must be string or undefined`);
  assert(isOptionalString(item.strain), `${label}: strain must be string or undefined`);
  assert(isOptionalString(item.thc), `${label}: thc must be string or undefined`);
  assert(isOptionalString(item.cbd), `${label}: cbd must be string or undefined`);
  assert(isOptionalString(item.weight), `${label}: weight must be string or undefined`);
  assert(isOptionalString(item.description), `${label}: description must be string or undefined`);
  assert(isOptionalString(item.imageUrl), `${label}: imageUrl must be string or undefined`);
  assert(isFiniteNonNeg(item.price), `${label}: price must be finite non-negative number`);
}

// --- Dutchie ---
{
  const fixture = readFixture('dutchie-inventory.json');
  const items = fixture.map(normalizeDutchieItem);

  items.forEach((it, i) => assertMenuItem(it, `dutchie[${i}]`));

  // Golden: row 0 — flower, percent cannabinoids, weight present, brandName preferred
  assert.equal(items[0].id, 'inv-001');
  assert.equal(items[0].name, 'Blue Dream 3.5g');
  assert.equal(items[0].category, 'Flower');
  assert.equal(items[0].brand, 'Premium Gardens');
  assert.equal(items[0].strain, 'Hybrid');
  assert.equal(items[0].thc, '22.4%');
  assert.equal(items[0].cbd, '0.1%');
  assert.equal(items[0].price, 45);
  assert.equal(items[0].weight, '3.5g');
  assert.equal(items[0].imageUrl, undefined);

  // Golden: row 1 — edible, mg cannabinoids, vendor fallback for brand, "No Strain" sentinel → undefined
  assert.equal(items[1].id, 'inv-002');
  assert.equal(items[1].brand, 'Sweet Relief');
  assert.equal(items[1].strain, undefined);
  assert.equal(items[1].thc, '100mg');
  assert.equal(items[1].cbd, '0mg');
  assert.equal(items[1].weight, undefined);

  // Golden: row 2 — minimal, no labResults, productId fallback for id, masterCategory fallback for category, recUnitPrice fallback
  assert.equal(items[2].id, 'prod-003');
  assert.equal(items[2].category, 'Other');
  assert.equal(items[2].thc, undefined);
  assert.equal(items[2].cbd, undefined);
  assert.equal(items[2].price, 10);

  console.log(`✓ dutchie: ${items.length} rows passed`);
}

console.log('All normalizer checks passed.');
```

- [ ] **Step 3: Run check, verify it fails because `dutchie.js` doesn't exist**

Run: `node server/normalize/check.js`
Expected: FAIL with `Cannot find module ... dutchie.js`.

- [ ] **Step 4: Implement `server/normalize/dutchie.js`**

```js
/**
 * @typedef {Object} MenuItem
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} [brand]
 * @property {string} [strain]
 * @property {string} [thc]
 * @property {string} [cbd]
 * @property {number} price
 * @property {string} [weight]
 * @property {string} [description]
 * @property {string} [imageUrl]
 */

const STRAIN_NONE = 'No Strain';

function pickFromLabResults(arr, target) {
  if (!Array.isArray(arr)) return undefined;
  const hit = arr.find((r) => r && r.labTest === target);
  if (!hit || hit.value === undefined || hit.value === null) return undefined;
  return hit.labResultUnit === 'Milligrams' ? `${hit.value}mg` : `${hit.value}%`;
}

/** @returns {MenuItem} */
export function normalizeDutchieItem(raw) {
  const id = String(raw.inventoryId ?? raw.productId ?? '');
  const name = raw.productName || 'Unknown Product';
  const category = raw.category || raw.masterCategory || 'Other';
  const brand = raw.brandName || raw.vendor || undefined;

  let strain;
  if (raw.strainType) strain = raw.strainType;
  else if (raw.strain && raw.strain !== STRAIN_NONE) strain = raw.strain;

  const thc = pickFromLabResults(raw.labResults, 'THC');
  const cbd = pickFromLabResults(raw.labResults, 'CBD');

  const priceRaw = raw.unitPrice ?? raw.recUnitPrice ?? 0;
  const price = Number(priceRaw) || 0;

  const weight = raw.unitWeight
    ? `${raw.unitWeight}${raw.unitWeightUnit ?? 'g'}`
    : undefined;

  const description = raw.description ? String(raw.description) : undefined;

  return { id, name, category, brand, strain, thc, cbd, price, weight, description };
}
```

- [ ] **Step 5: Run check, verify it passes**

Run: `node server/normalize/check.js`
Expected: `✓ dutchie: 3 rows passed` then `All normalizer checks passed.`

- [ ] **Step 6: Commit**

```bash
git add server/normalize/dutchie.js server/normalize/check.js server/normalize/__fixtures__/dutchie-inventory.json
git commit -m "feat(server): add Dutchie inventory normalizer with fixture check"
```

---

## Task 3: Add Flowhub normalizer (TDD)

**Files:**
- Create: `server/normalize/flowhub.js`
- Create: `server/normalize/__fixtures__/flowhub-inventory-nonzero.json`
- Modify: `server/normalize/check.js` — extend with Flowhub assertions.

- [ ] **Step 1: Create the Flowhub fixture**

Create `server/normalize/__fixtures__/flowhub-inventory-nonzero.json`. Three rows: a flower, a dual-unit vape (covers both mg and % entries — the spec rule says prefer % for UOM=grams), an edible (UOM=each → prefer mg, plus `speciesName: '50/50'` mapping to Hybrid).

```json
[
  {
    "brand": "Premium Gardens",
    "cannabinoidInformation": [
      { "name": "thc", "lowerRange": 22, "upperRange": 24, "unitOfMeasure": "%", "unitOfMeasureToGramsMultiplier": null },
      { "name": "cbd", "lowerRange": 0.1, "upperRange": 0.1, "unitOfMeasure": "%", "unitOfMeasureToGramsMultiplier": null }
    ],
    "category": "Flower",
    "speciesName": "Sativa-dom",
    "productId": "p-flower",
    "variantId": "v-flower",
    "productName": "Blue Dream 3.5g",
    "productDescription": "Sweet berry aroma.",
    "productPictureURL": "https://example.com/blue-dream.jpg",
    "productUnitOfMeasure": "grams",
    "productWeight": 3.5,
    "priceInMinorUnits": 4500,
    "preTaxPriceInPennies": 4000,
    "postTaxPriceInPennies": 4500,
    "quantity": 12,
    "locationId": "loc-1"
  },
  {
    "brand": "Cloud Nine",
    "cannabinoidInformation": [
      { "name": "thc", "lowerRange": 720, "upperRange": 720, "unitOfMeasure": "mg", "unitOfMeasureToGramsMultiplier": "1000" },
      { "name": "thc", "lowerRange": 72, "upperRange": 72, "unitOfMeasure": "%", "unitOfMeasureToGramsMultiplier": null }
    ],
    "category": "Vapes",
    "speciesName": null,
    "productId": "p-vape",
    "variantId": "v-vape",
    "productName": "Super Lemon Sauce Cart 1g",
    "productDescription": "",
    "productPictureURL": null,
    "productUnitOfMeasure": "grams",
    "productWeight": 1,
    "priceInMinorUnits": 4200,
    "postTaxPriceInPennies": 4200,
    "quantity": 5,
    "locationId": "loc-1"
  },
  {
    "brand": "Sweet Relief",
    "cannabinoidInformation": [
      { "name": "thc", "lowerRange": 100, "upperRange": 100, "unitOfMeasure": "mg", "unitOfMeasureToGramsMultiplier": "1000" }
    ],
    "category": "Edibles",
    "speciesName": "50/50",
    "productId": "p-edible",
    "variantId": "v-edible",
    "productName": "Chewy Gummies 100mg",
    "productDescription": "Berry-flavored.",
    "productPictureURL": "https://example.com/gummies.jpg",
    "productUnitOfMeasure": "each",
    "productWeight": 1,
    "priceInMinorUnits": 1000,
    "postTaxPriceInPennies": 1000,
    "quantity": 1000,
    "locationId": "loc-1"
  }
]
```

- [ ] **Step 2: Extend `server/normalize/check.js` with Flowhub assertions**

Add these lines after the Dutchie block, before the final `console.log('All normalizer checks passed.')`:

```js
import { normalizeFlowhubItem } from './flowhub.js';

// --- Flowhub ---
{
  const fixture = readFixture('flowhub-inventory-nonzero.json');
  const items = fixture.map(normalizeFlowhubItem);

  items.forEach((it, i) => assertMenuItem(it, `flowhub[${i}]`));

  // Golden: row 0 — flower, range cannabinoids, speciesName mapping, image present
  assert.equal(items[0].id, 'v-flower');
  assert.equal(items[0].name, 'Blue Dream 3.5g');
  assert.equal(items[0].category, 'Flower');
  assert.equal(items[0].brand, 'Premium Gardens');
  assert.equal(items[0].strain, 'Sativa-dominant');
  assert.equal(items[0].thc, '22-24%');
  assert.equal(items[0].cbd, '0.1%');
  assert.equal(items[0].price, 45);
  assert.equal(items[0].weight, '3.5g');
  assert.equal(items[0].imageUrl, 'https://example.com/blue-dream.jpg');

  // Golden: row 1 — dual-unit vape, UOM=grams → prefer %, no image
  assert.equal(items[1].id, 'v-vape');
  assert.equal(items[1].thc, '72%');
  assert.equal(items[1].weight, '1g');
  assert.equal(items[1].strain, undefined);
  assert.equal(items[1].imageUrl, undefined);

  // Golden: row 2 — edible, UOM=each → prefer mg (only mg present), '50/50' → 'Hybrid', weight '1pk' suppressed because value=1
  assert.equal(items[2].id, 'v-edible');
  assert.equal(items[2].thc, '100mg');
  assert.equal(items[2].cbd, undefined);
  assert.equal(items[2].strain, 'Hybrid');
  assert.equal(items[2].weight, undefined);
  assert.equal(items[2].imageUrl, 'https://example.com/gummies.jpg');
  assert.equal(items[2].price, 10);

  console.log(`✓ flowhub: ${items.length} rows passed`);
}
```

(The `'1grams' === '1grams'` line is a deliberate visual sanity-anchor; it normalizes to the assertion `items[1].weight === '1g'`. Both lines must pass.)

- [ ] **Step 3: Run check, verify it fails because `flowhub.js` doesn't exist**

Run: `node server/normalize/check.js`
Expected: FAIL with `Cannot find module ... flowhub.js`.

- [ ] **Step 4: Implement `server/normalize/flowhub.js`**

```js
/** @typedef {import('./dutchie.js').MenuItem} MenuItem */ // optional cross-ref

const STRAIN_MAP = new Map([
  ['50/50', 'Hybrid'],
  ['sativa-dom', 'Sativa-dominant'],
  ['indica-dom', 'Indica-dominant'],
  ['sativa', 'Sativa'],
  ['indica', 'Indica'],
  ['hybrid', 'Hybrid'],
]);

function mapStrain(raw) {
  if (!raw) return undefined;
  const v = String(raw).trim().toLowerCase();
  return STRAIN_MAP.get(v) ?? String(raw).trim();
}

function formatCannabinoid(arr, name, preferMg) {
  if (!Array.isArray(arr)) return undefined;
  const matches = arr.filter(
    (c) => c && typeof c.name === 'string' && c.name.trim().toLowerCase() === name,
  );
  if (matches.length === 0) return undefined;

  let pick = matches[0];
  if (matches.length > 1) {
    const mg = matches.find((c) => c.unitOfMeasure === 'mg');
    const pct = matches.find((c) => c.unitOfMeasure === '%');
    pick = preferMg ? (mg ?? pct ?? pick) : (pct ?? mg ?? pick);
  }

  const unit = pick.unitOfMeasure ?? '';
  const lower = pick.lowerRange;
  const upper = pick.upperRange;
  if (lower === undefined || upper === undefined) return undefined;
  return lower === upper ? `${upper}${unit}` : `${lower}-${upper}${unit}`;
}

function formatWeight(value, uom) {
  if (value === undefined || value === null || value === 0 || !uom) return undefined;
  switch (uom) {
    case 'each':
      return value === 1 ? undefined : `${value}pk`;
    case 'grams':
      return `${value}g`;
    case 'milligrams':
      return `${value}mg`;
    case 'fluidounces':
      return `${value}fl oz`;
    default:
      return `${value}${uom}`;
  }
}

/** @returns {MenuItem} */
export function normalizeFlowhubItem(raw) {
  const id = String(raw.variantId ?? raw.productId ?? '');
  const name = raw.productName || 'Unknown Product';
  const category = raw.category || raw.customCategoryName || 'Other';
  const brand = raw.brand || undefined;
  const strain = mapStrain(raw.speciesName ?? raw.strainName);

  const isCountable = raw.productUnitOfMeasure === 'each';
  const thc = formatCannabinoid(raw.cannabinoidInformation, 'thc', isCountable);
  const cbd = formatCannabinoid(raw.cannabinoidInformation, 'cbd', isCountable);

  const cents = raw.postTaxPriceInPennies ?? raw.priceInMinorUnits ?? 0;
  const price = Number(cents) / 100;

  const weight = formatWeight(raw.productWeight, raw.productUnitOfMeasure);
  const description = raw.productDescription ? String(raw.productDescription) : undefined;
  const imageUrl = raw.productPictureURL || undefined;

  return { id, name, category, brand, strain, thc, cbd, price, weight, description, imageUrl };
}
```

- [ ] **Step 5: Run check, verify it passes**

Run: `node server/normalize/check.js`
Expected:
```
✓ dutchie: 3 rows passed
✓ flowhub: 3 rows passed
All normalizer checks passed.
```

- [ ] **Step 6: Add `check:normalize` script to `package.json`**

Edit `package.json` — find the `"scripts"` block:

```json
"scripts": {
  "dev": "concurrently -k -n vite,proxy \"vite\" \"node server/index.js\"",
  "dev:client": "vite",
  "dev:server": "node server/index.js",
  "build": "vite build",
  "start": "node server/index.js",
  "preview": "vite preview",
  "lint": "eslint .",
  "check:normalize": "node server/normalize/check.js"
}
```

- [ ] **Step 7: Verify the npm script works**

Run: `npm run check:normalize`
Expected: same passing output as Step 5.

- [ ] **Step 8: Commit**

```bash
git add server/normalize/flowhub.js server/normalize/check.js server/normalize/__fixtures__/flowhub-inventory-nonzero.json package.json
git commit -m "feat(server): add Flowhub inventory normalizer with fixture check"
```

---

## Task 4: Refactor `/api/dutchie/menu` to return normalized data

**Files:**
- Modify: `server/index.js`

The route must continue to return `{ menu: ... }` (key unchanged) but the value is now a `MenuItem[]` instead of raw Dutchie inventory. After this task, the existing frontend will be temporarily broken because `MenuGenerator.tsx` still tries to re-normalize. That's fine — we'll fix it in Task 10. Tasks 4–7 are pure-server.

- [ ] **Step 1: Replace the `/api/dutchie/menu` handler in `server/index.js`**

Find the existing handler (lines ~41-69) and replace with:

```js
import { normalizeDutchieItem } from './normalize/dutchie.js';

// ... (DUTCHIE_BASE constant stays, /api/dutchie/auth stays unchanged) ...

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
    const rawArray = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    const menu = rawArray.map(normalizeDutchieItem);
    return res.json({ menu });
  } catch (e) {
    return res.status(502).json({ error: "Network error", details: e?.message });
  }
});
```

(The `import` line goes near the top of the file, alongside the existing `import express from "express"` etc.)

- [ ] **Step 2: Sanity-start the server to confirm no syntax errors**

Run: `node server/index.js` (in a separate terminal, or with `&`).
Expected: `Dispensary Menu Generator server: http://localhost:3001`. Then Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "refactor(server): normalize Dutchie inventory server-side"
```

---

## Task 5: Add `/api/flowhub/locations` route

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Add the route**

Insert after the Dutchie routes, before the health-check:

```js
const FLOWHUB_BASE = "https://api.flowhub.co";

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
    const data = Array.isArray(body?.data) ? body.data : [];
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
```

(Place `FLOWHUB_BASE` near `DUTCHIE_BASE` at the top.)

- [ ] **Step 2: Smoke-test with real credentials**

Export your Flowhub creds in your shell (do NOT commit them):

```bash
export FLOWHUB_CLIENT_ID="<your client id>"
export FLOWHUB_API_KEY="<your api key>"
```

Start the server: `node server/index.js` (background or separate terminal).

Curl:

```bash
curl -sS -X POST http://localhost:3001/api/flowhub/locations \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$FLOWHUB_CLIENT_ID\",\"apiKey\":\"$FLOWHUB_API_KEY\"}"
```

Expected JSON shape (real values will differ):

```json
{
  "locations": [
    {
      "locationId": "00000000-0000-0000-0000-000000000000",
      "locationName": "Your Store",
      "address": { "city": "Your City", "state": "Your State" }
    }
  ]
}
```

Also verify the failure path with a bad key:

```bash
curl -sS -i -X POST http://localhost:3001/api/flowhub/locations \
  -H "Content-Type: application/json" \
  -d '{"clientId":"00000000-0000-0000-0000-000000000000","apiKey":"00000000-0000-0000-0000-000000000000"}'
```

Expected: HTTP/1.1 401 + `{"error":"Invalid Flowhub credentials"}`.

Stop the server (Ctrl+C). Unset the env vars after the smoke test:

```bash
unset FLOWHUB_CLIENT_ID FLOWHUB_API_KEY
```

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat(server): add Flowhub /api/flowhub/locations endpoint"
```

---

## Task 6: Add `/api/flowhub/menu` route

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Add the route**

Insert just after `/api/flowhub/locations`:

```js
import { normalizeFlowhubItem } from './normalize/flowhub.js';

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
    const data = Array.isArray(body?.data) ? body.data : [];
    const filtered = data.filter(
      (i) => i?.locationId === locationId && (i?.quantity ?? 0) > 0,
    );
    const menu = filtered.map(normalizeFlowhubItem);
    return res.json({ menu });
  } catch (e) {
    return res.status(502).json({ error: "Network error", details: e?.message });
  }
});
```

(Move the `import` line up next to the other imports at the top of the file.)

- [ ] **Step 2: Smoke-test with real credentials**

Re-export creds (or keep them from Task 5):

```bash
export FLOWHUB_CLIENT_ID="<your client id>"
export FLOWHUB_API_KEY="<your api key>"
export FLOWHUB_LOCATION_ID="<your location id>"
```

Start the server, then:

```bash
curl -sS -X POST http://localhost:3001/api/flowhub/menu \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$FLOWHUB_CLIENT_ID\",\"apiKey\":\"$FLOWHUB_API_KEY\",\"locationId\":\"$FLOWHUB_LOCATION_ID\"}" \
  | python -m json.tool | head -40
```

Expected: a JSON object with `menu: [...]` whose first few items have shape `{ id, name, category, brand?, strain?, thc?, cbd?, price, weight?, description?, imageUrl? }`. Spot-check that:

- Prices are dollars (e.g. `45`), not cents (`4500`).
- Vapes have `weight` like `"1g"` and `thc` like `"72%"`.
- Edibles (UOM=each) have `thc` like `"100mg"`.
- Flowers have `thc` like `"22-24%"` (range) or `"24%"` (single).

Verify wrong-locationId returns empty:

```bash
curl -sS -X POST http://localhost:3001/api/flowhub/menu \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$FLOWHUB_CLIENT_ID\",\"apiKey\":\"$FLOWHUB_API_KEY\",\"locationId\":\"00000000-0000-0000-0000-000000000000\"}"
```

Expected: `{"menu":[]}`.

Stop the server, unset env vars.

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat(server): add Flowhub /api/flowhub/menu endpoint"
```

---

## Task 7: Flip Flowhub to available in `POSSelector`

**Files:**
- Modify: `src/components/POSSelector.tsx`

- [ ] **Step 1: Update the `flowhub` entry in `posOptions`**

Find the `flowhub` object in `posOptions` (~line 17) and change:

```ts
{
  id: "flowhub",
  name: "Flowhub",
  description: "Coming soon",
  logoUrl: "https://virtualbudz.com/lovable-uploads/60bd35a3-9aa5-485b-a0bd-44bac5265bc5.png",
  available: false,
},
```

to:

```ts
{
  id: "flowhub",
  name: "Flowhub",
  description: "Cannabis retail POS system",
  logoUrl: "https://virtualbudz.com/lovable-uploads/60bd35a3-9aa5-485b-a0bd-44bac5265bc5.png",
  available: true,
},
```

- [ ] **Step 2: TS check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/POSSelector.tsx
git commit -m "feat(ui): mark Flowhub as available in POS selector"
```

---

## Task 8: Rename `APIKeyInput` → `ConnectAccount` and refactor to POS-aware

**Files:**
- Rename: `src/components/APIKeyInput.tsx` → `src/components/ConnectAccount.tsx`
- The new component fully replaces the old one. The old single-field flow becomes the `dutchie-auth` branch; the new two-step flow is `flowhub-location-picker`.

This task does NOT update `Index.tsx` yet — that's Task 10. The build will be temporarily broken between this task and Task 10. That's intentional: keep tasks atomic and reviewable.

- [ ] **Step 1: Git-rename the file (preserves history)**

```bash
git mv src/components/APIKeyInput.tsx src/components/ConnectAccount.tsx
```

- [ ] **Step 2: Replace the file contents with the POS-aware implementation**

Overwrite `src/components/ConnectAccount.tsx` entirely:

```tsx
import { useState } from "react";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import type { Connection, PosId } from "@/types/connection";

interface ConnectAccountProps {
  posId: PosId;
  posName: string;
  onConnected: (connection: Connection) => void;
  isDark?: boolean;
}

type ConnectFlow = "dutchie-auth" | "flowhub-location-picker";

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  secret: boolean;
}

const POS_CONFIG: Record<PosId, { flow: ConnectFlow; fields: FieldDef[] }> = {
  dutchie: {
    flow: "dutchie-auth",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "Enter your Dutchie API key", secret: true },
    ],
  },
  flowhub: {
    flow: "flowhub-location-picker",
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "Flowhub Client ID (UUID)", secret: false },
      { key: "apiKey", label: "API Key", placeholder: "Flowhub API Key (UUID)", secret: true },
    ],
  },
};

interface FlowhubLocation {
  locationId: string;
  locationName: string;
  address: { city: string | null; state: string | null };
}

type Stage = "entering-creds" | "picking-location" | "connected";

export function ConnectAccount({ posId, posName, onConnected, isDark = false }: ConnectAccountProps) {
  const config = POS_CONFIG[posId];

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(config.fields.map((f) => [f.key, ""])),
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("entering-creds");
  const [locations, setLocations] = useState<FlowhubLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const allFilled = config.fields.every((f) => values[f.key]?.trim());

  async function handleSubmit() {
    if (!allFilled) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      if (config.flow === "dutchie-auth") {
        const r = await fetch("/api/dutchie/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: values.apiKey.trim() }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data?.authCode) {
          throw new Error(data?.error || `Request failed (${r.status})`);
        }
        setStage("connected");
        toast.success(`Successfully authenticated with ${posName}!`);
        onConnected({ pos: "dutchie", authCode: data.authCode });
      } else if (config.flow === "flowhub-location-picker") {
        const r = await fetch("/api/flowhub/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: values.clientId.trim(),
            apiKey: values.apiKey.trim(),
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(data?.error || `Request failed (${r.status})`);
        }
        const list: FlowhubLocation[] = Array.isArray(data?.locations) ? data.locations : [];
        if (list.length === 0) {
          toast.error("No locations found for this client. Confirm your Client ID with Flowhub support.");
          return;
        }
        setLocations(list);
        setSelectedLocationId(list[0].locationId);
        setStage("picking-location");
      }
    } catch (err) {
      console.error("Connect error:", err);
      const msg =
        config.flow === "flowhub-location-picker"
          ? `Invalid ${posName} credentials. Check your Client ID and API Key.`
          : `Failed to authenticate. Please check your API key.`;
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function handleConfirmLocation() {
    const loc = locations.find((l) => l.locationId === selectedLocationId);
    if (!loc) {
      toast.error("Please pick a location");
      return;
    }
    setStage("connected");
    toast.success(`Connected to ${loc.locationName}.`);
    onConnected({
      pos: "flowhub",
      clientId: values.clientId.trim(),
      apiKey: values.apiKey.trim(),
      locationId: loc.locationId,
      locationName: loc.locationName,
    });
  }

  const containerCls = `rounded-[15px] p-6 md:p-8 border ${
    isDark ? "bg-[#111] border-[#222]" : "bg-white border-gray-300"
  }`;
  const labelCls = `block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`;
  const inputCls = `w-full px-4 py-3 rounded-lg border transition-colors ${
    isDark
      ? "bg-[#1a1a1a] border-[#333] text-white placeholder-gray-500 focus:border-gray-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500"
  } focus:outline-none`;
  const helperCls = `text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`;
  const buttonBase =
    "w-full h-12 rounded-md font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 border";
  const buttonEnabled = isDark
    ? "bg-white text-black border-white hover:bg-black hover:text-white hover:border-white"
    : "bg-gray-900 text-white border-gray-900 hover:bg-white hover:text-gray-900 hover:border-gray-900";
  const buttonDisabled = isDark
    ? "bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed"
    : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed";
  const buttonConnected = isDark
    ? "bg-[#222] text-gray-400 border-[#333] cursor-not-allowed"
    : "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed";

  if (stage === "connected") {
    return (
      <div className={containerCls}>
        <button disabled className={`${buttonBase} ${buttonConnected}`}>
          <Check className="w-5 h-5" /> Connected
        </button>
      </div>
    );
  }

  if (stage === "picking-location") {
    return (
      <div className={containerCls}>
        <div className="mb-6">
          <h3 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Choose your {posName} location
          </h3>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            We found {locations.length} location{locations.length === 1 ? "" : "s"} for this client.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="locationId" className={labelCls}>
              Location
            </label>
            <select
              id="locationId"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className={inputCls}
            >
              {locations.map((loc) => {
                const tail = [loc.address?.city, loc.address?.state].filter(Boolean).join(", ");
                return (
                  <option key={loc.locationId} value={loc.locationId}>
                    {loc.locationName}{tail ? ` — ${tail}` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={handleConfirmLocation}
            className={`${buttonBase} ${buttonEnabled}`}
          >
            Use this location
          </button>
        </div>
      </div>
    );
  }

  // stage === 'entering-creds'
  return (
    <div className={containerCls}>
      <div className="mb-6">
        <h3 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
          Connect to {posName}
        </h3>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {config.fields.length === 1
            ? "Enter your API key to connect"
            : "Enter your credentials to connect"}
        </p>
      </div>

      <div className="space-y-4">
        {config.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <label htmlFor={field.key} className={labelCls}>
              {field.label}
            </label>
            <div className="relative">
              <input
                id={field.key}
                type={field.secret && !revealed[field.key] ? "password" : "text"}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className={`${inputCls} ${field.secret ? "pr-12" : ""}`}
              />
              {field.secret && (
                <button
                  type="button"
                  onClick={() => setRevealed((r) => ({ ...r, [field.key]: !r[field.key] }))}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  {revealed[field.key] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        ))}

        <p className={helperCls}>
          Your credentials are never stored. They are used only to connect your account to {posName} and fetch your menu data.
        </p>

        <button
          onClick={handleSubmit}
          disabled={isLoading || !allFilled}
          className={`${buttonBase} ${isLoading || !allFilled ? buttonDisabled : buttonEnabled}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {config.flow === "flowhub-location-picker" ? "Loading locations..." : "Authenticating..."}
            </>
          ) : (
            "Connect"
          )}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ConnectAccount.tsx src/components/APIKeyInput.tsx
git commit -m "refactor(ui): rename APIKeyInput to ConnectAccount, make POS-aware"
```

(`git status` will show `APIKeyInput.tsx` as deleted and `ConnectAccount.tsx` as new — the `git mv` from Step 1 plus the rewrite handles both. Adding both paths in the commit captures the rename + content change correctly.)

---

## Task 9: Refactor `MenuGenerator` for `Connection` prop and remove the in-component normalizer

**Files:**
- Modify: `src/components/MenuGenerator.tsx`

After this task `Index.tsx` still passes `authCode` and the build will fail; Task 10 fixes that.

- [ ] **Step 1: Update imports**

At the top of `src/components/MenuGenerator.tsx`, add:

```tsx
import type { Connection } from "@/types/connection";
import { POS_LABELS } from "@/types/connection";
import type { MenuItem } from "@/types/menu";
```

Delete the existing local `interface MenuItem` block (lines 13–24); use the imported one instead.

- [ ] **Step 2: Replace the `MenuGeneratorProps` interface**

Find:

```tsx
interface MenuGeneratorProps {
  authCode: string;
  ...
}
```

Replace with:

```tsx
interface MenuGeneratorProps {
  connection: Connection;
  logo?: string | null;
  brandColors?: string[];
  storeName?: string;
  onAuthInvalid?: () => void;
  isDark?: boolean;
}
```

- [ ] **Step 3: Update the destructured props in the function signature**

Find `export function MenuGenerator({ authCode, logo, ... })` and change `authCode` to `connection`. Result:

```tsx
export function MenuGenerator({
  connection,
  logo,
  brandColors = [],
  storeName = "Cannabis Menu",
  onAuthInvalid,
  isDark = false,
}: MenuGeneratorProps) {
```

- [ ] **Step 4: Replace the `fetchMenuData` body — drop the in-component normalizer**

Find the current `fetchMenuData` function (it begins ~line 268 with the Dutchie-only fetch and contains the lines 300–328 normalizer block). Replace the entire function body with:

```tsx
const fetchMenuData = async () => {
  setIsLoading(true);
  setErrorMessage(null);

  const url =
    connection.pos === "dutchie" ? "/api/dutchie/menu" : "/api/flowhub/menu";
  const body =
    connection.pos === "dutchie"
      ? { authCode: connection.authCode }
      : {
          clientId: connection.clientId,
          apiKey: connection.apiKey,
          locationId: connection.locationId,
        };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        toast.error(`Invalid credentials. Please reconnect to ${POS_LABELS[connection.pos]}.`);
        onAuthInvalid?.();
        return;
      }
      console.error("Menu fetch error:", data);
      setErrorMessage("Could not load your inventory. Please try again.");
      toast.error("Failed to load inventory.");
      return;
    }

    if (!Array.isArray(data?.menu)) {
      setErrorMessage("No inventory returned.");
      toast.error("No inventory returned.");
      return;
    }

    const items: MenuItem[] = data.menu;

    if (items.length === 0) {
      const where =
        connection.pos === "flowhub" ? ` at ${connection.locationName}` : "";
      setErrorMessage(`No in-stock items${where}.`);
      toast.error("Inventory is empty.");
      return;
    }

    // Merge saved preferences with fresh categories (logic unchanged)
    const freshCategories = Array.from(new Set(items.map((item) => item.category)));

    setCategoryOrder((savedOrder) => {
      if (savedOrder.length === 0) return freshCategories;
      const kept = savedOrder.filter((cat) => freshCategories.includes(cat));
      const newOnes = freshCategories.filter((cat) => !savedOrder.includes(cat));
      return [...kept, ...newOnes];
    });

    setVisibleCategories((savedVisible) => {
      if (savedVisible.size === 0) return new Set(freshCategories);
      const result = new Set<string>();
      const savedOrder = JSON.parse(
        localStorage.getItem("menu-master:category-order") || "[]",
      ) as string[];
      freshCategories.forEach((cat) => {
        const isNewCategory = !savedOrder.includes(cat);
        if (savedVisible.has(cat) || isNewCategory) {
          result.add(cat);
        }
      });
      return result;
    });

    setMenuData(items);
    setShowMenu(true);
    toast.success("Menu loaded.");
  } catch (error) {
    console.error("Error fetching menu:", error);
    setErrorMessage("Could not load your inventory. Please try again.");
    toast.error("Failed to load inventory.");
  } finally {
    setIsLoading(false);
  }
};
```

- [ ] **Step 5: Update the heading copy to be POS-aware**

Find the line (`~line 541`):

```tsx
Create a beautiful, printable menu from your Dutchie inventory
```

Replace with:

```tsx
Create a beautiful, printable menu from your {POS_LABELS[connection.pos]} inventory
```

- [ ] **Step 6: TS check**

Run: `npx tsc --noEmit`
Expected: errors only in `src/pages/Index.tsx` (which still passes `authCode`). That's fine — Task 10 fixes it.

- [ ] **Step 7: Commit**

```bash
git add src/components/MenuGenerator.tsx
git commit -m "refactor(ui): MenuGenerator accepts Connection, server normalizes"
```

---

## Task 10: Wire `Index.tsx` to use `Connection` state

**Files:**
- Modify: `src/pages/Index.tsx`

This task closes the loop and restores a working build.

- [ ] **Step 1: Update imports in `Index.tsx`**

Add at the top:

```tsx
import { ConnectAccount } from "@/components/ConnectAccount";
import type { Connection } from "@/types/connection";
```

Remove the existing import of `APIKeyInput`.

- [ ] **Step 2: Replace `authCode` state with `connection`**

Find:

```tsx
const [authCode, setAuthCode] = useState<string>("");
```

Replace with:

```tsx
const [connection, setConnection] = useState<Connection | null>(null);
```

- [ ] **Step 3: Update the auth callback**

Find:

```tsx
const handleAuthenticated = (code: string) => {
  setAuthCode(code);
  setCurrentStep(3);
};
```

Replace with:

```tsx
const handleConnected = (conn: Connection) => {
  setConnection(conn);
  setCurrentStep(3);
};
```

- [ ] **Step 4: Update the steps array**

Find:

```tsx
{ number: 2, title: "Connect", completed: authCode !== "" },
```

Replace with:

```tsx
{ number: 2, title: "Connect", completed: connection !== null },
```

- [ ] **Step 5: Update the Step 2 section**

Find the section that renders `APIKeyInput`:

```tsx
{selectedPOS && (
  <section className="animate-slide-up no-print">
    <div className="flex items-center gap-3 mb-6">
      <span ... >
        {authCode ? <Check className="w-4 h-4" /> : "2"}
      </span>
      <h2 className="text-2xl font-semibold">Connect Your Account</h2>
    </div>
    <APIKeyInput
      posName={selectedPOS.charAt(0).toUpperCase() + selectedPOS.slice(1)}
      onAuthenticated={handleAuthenticated}
      isDark={isDark}
    />
  </section>
)}
```

Replace with:

```tsx
{selectedPOS && (
  <section className="animate-slide-up no-print">
    <div className="flex items-center gap-3 mb-6">
      <span
        className={`
          w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
          ${
            connection
              ? isDark
                ? "bg-gray-600 text-white"
                : "bg-gray-700 text-white"
              : isDark
                ? "bg-[#222] text-gray-400 border border-[#333]"
                : "bg-gray-200 text-gray-500 border border-gray-300"
          }
        `}
      >
        {connection ? <Check className="w-4 h-4" /> : "2"}
      </span>
      <h2 className="text-2xl font-semibold">Connect Your Account</h2>
    </div>
    <ConnectAccount
      posId={selectedPOS as "dutchie" | "flowhub"}
      posName={selectedPOS.charAt(0).toUpperCase() + selectedPOS.slice(1)}
      onConnected={handleConnected}
      isDark={isDark}
    />
  </section>
)}
```

- [ ] **Step 6: Update Step 3 gating (logo + storeName section)**

Find:

```tsx
{authCode && (
  <section className="animate-slide-up no-print">
```

Replace with:

```tsx
{connection && (
  <section className="animate-slide-up no-print">
```

- [ ] **Step 7: Update Step 4 (MenuGenerator) gating + props**

Find:

```tsx
{authCode && storeName && (
  <section className="animate-slide-up">
    ...
    <MenuGenerator
      authCode={authCode}
      logo={logo}
      brandColors={brandColors}
      storeName={storeName}
      onAuthInvalid={() => {
        setAuthCode("");
        setCurrentStep(2);
      }}
      isDark={isDark}
    />
  </section>
)}
```

Replace with:

```tsx
{connection && storeName && (
  <section className="animate-slide-up">
    ...
    <MenuGenerator
      connection={connection}
      logo={logo}
      brandColors={brandColors}
      storeName={storeName}
      onAuthInvalid={() => {
        setConnection(null);
        setCurrentStep(2);
      }}
      isDark={isDark}
    />
  </section>
)}
```

(The `...` is the unchanged inner content of that section — header span + h2 — keep it as-is.)

- [ ] **Step 8: TS check**

Run: `npx tsc --noEmit`
Expected: PASS, zero errors.

- [ ] **Step 9: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "refactor(ui): Index uses Connection state and ConnectAccount"
```

---

## Task 11: Build verification + manual smoke test

**Files:**
- None modified.

Per the user's `~/.claude/CLAUDE.md` rule: never claim done without `npm run build` (Vite/TSC strict catches errors that `--noEmit` misses).

- [ ] **Step 1: Run the production build**

Run: `npm run build`
Expected: build completes without TS errors. Note: the bundler will warn about chunk size — that's pre-existing, not introduced by this work.

- [ ] **Step 2: Run the normalizer check one more time**

Run: `npm run check:normalize`
Expected:
```
✓ dutchie: 3 rows passed
✓ flowhub: 3 rows passed
All normalizer checks passed.
```

- [ ] **Step 3: Manual smoke — Dutchie regression**

Skip if you don't have a Dutchie test key handy. Otherwise:

```bash
npm run dev
```

In a browser at the Vite URL:
1. Pick **Dutchie**.
2. Enter your existing Dutchie API key. Confirm "Connected ✓".
3. Enter a store name. Click "Generate Printable Menu".
4. Verify menu renders with prices in dollars and THC/CBD displayed correctly. (This is a regression check: server-side normalization should produce the same visible output as the previous frontend normalization.)

- [ ] **Step 4: Manual smoke — Flowhub happy path**

Re-export Flowhub creds (do not commit them anywhere):

```bash
export FLOWHUB_CLIENT_ID="<your client id>"
export FLOWHUB_API_KEY="<your api key>"
```

With `npm run dev` running:

1. Pick **Flowhub** in the POS selector.
2. Paste `clientId` and `apiKey`. Click Connect.
3. Verify the location dropdown shows "Your Store — Your City, Your State" (or the equivalent for your client).
4. Confirm "Use this location".
5. Customize → enter a store name.
6. Click "Generate Printable Menu".
7. Verify:
   - Heading copy reads "Create a beautiful, printable menu from your Flowhub inventory".
   - Menu renders. Prices look like dollars (`$45`), not cents.
   - Flower category items show THC like `"22-24%"` or `"22%"`.
   - Edibles show THC in mg (e.g. `"100mg"`).
   - Vapes (1g carts) show weight `"1g"` and THC in `%`.
   - Categories include the in-store ones (Flower, Pre-Roll, Vapes, Edibles, Beverage, etc.).
   - In CategoryManager, toggle off "Accessories" — non-cannabis items disappear.
8. Try the Print preview — confirm the printable layout still renders.

- [ ] **Step 5: Manual smoke — Flowhub failure paths**

1. Click "Back to Generator" (or refresh) and re-select Flowhub.
2. Enter obviously-wrong credentials. Click Connect.
3. Verify a toast: `"Invalid Flowhub credentials. Check your Client ID and API Key."` and the form remains.
4. Enter correct credentials but immediately after the location picker shows, edit the URL bar / refresh — confirm the flow restarts cleanly.

- [ ] **Step 6: Stop the dev server, unset secrets**

Stop `npm run dev`. Then:

```bash
unset FLOWHUB_CLIENT_ID FLOWHUB_API_KEY FLOWHUB_LOCATION_ID
```

- [ ] **Step 7: Final commit (if any in-build fixes were needed)**

If the build pass introduced no fixups, skip. Otherwise:

```bash
git add -A
git commit -m "fix: address build warnings from Flowhub integration"
```

- [ ] **Step 8: Optional — push**

This is a public OSS repo. Only push when you're satisfied with the smoke results.

```bash
git push origin main
```

---

## Self-review (performed at plan completion)

- **Spec coverage:**
  - Server endpoints (`/api/flowhub/locations`, `/api/flowhub/menu`, refactored `/api/dutchie/menu`) → Tasks 4, 5, 6.
  - Unified `MenuItem` type → Task 1 (frontend), Task 2 (server JSDoc inline).
  - `Connection` discriminated union → Task 1.
  - Server-side normalization for Dutchie → Task 2. For Flowhub → Task 3.
  - `POSSelector` flip → Task 7.
  - `APIKeyInput` → `ConnectAccount` rename + POS-aware refactor → Task 8.
  - `MenuGenerator` accepts `Connection`, drops normalizer, POS-aware copy → Task 9.
  - `Index.tsx` `Connection` state → Task 10.
  - Error handling cases (401 on locations, 401 on menu, empty locations, empty inventory, network) → handled across Tasks 5, 6, 8, 9.
  - Credential hygiene (no logging, stateless proxy) → enforced in Tasks 5 and 6 (no logging added).
  - Test approach (`check.js` + manual smoke) → Tasks 2, 3, 11.
  - File plan matches Task list.
- **Placeholder scan:** no TBD/TODO/"add appropriate"/"similar to" patterns — every step contains the actual code or command.
- **Type consistency:** `Connection`, `MenuItem`, `PosId`, `POS_LABELS`, `normalizeDutchieItem`, `normalizeFlowhubItem`, `ConnectAccount` — all referenced consistently across tasks.
- **Spec consistency note:** the spec's file plan listed `connection.ts` as holding both `Connection` and `MenuItem`, while a separate sentence earlier said `MenuItem` lives in `src/types/menu.ts`. The plan resolves this in favor of two files (Task 1) — single responsibility per file. Pure cleanup of a minor spec inconsistency, no behavioral impact.
