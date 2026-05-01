# Flowhub POS integration — design

**Date:** 2026-05-01
**Status:** approved (awaiting user review of spec)
**Repo:** `Meghvadalia/dispensary-menu-generator`
**Author:** Megh + Claude

## Goal

Add Flowhub as a supported POS in the dispensary menu generator, with the same end-user experience as the existing Dutchie integration: pick POS → enter credentials → menu loads → render in any of the 5 layouts.

A side requirement: making Flowhub work "seamlessly" alongside Dutchie. To deliver that without proliferating vendor-specific branches in the React layer, normalization moves from the frontend into the Express proxy. After this work, every POS returns the same `MenuItem` shape over the same `/api/{pos}/menu` contract, and the frontend never reads a vendor-specific field again.

## Scope

In:

- New Express routes: `POST /api/flowhub/locations`, `POST /api/flowhub/menu`.
- Server-side normalizer for Flowhub `/v0/inventoryNonZero` → `MenuItem[]`.
- Refactor of existing `/api/dutchie/menu` to also return normalized `MenuItem[]` (the normalizer logic moves out of `MenuGenerator.tsx`).
- POS-aware credential UI: rename `APIKeyInput.tsx` → `ConnectAccount.tsx`, drive fields and flow from a `POS_CONFIG` map.
- Two-step Flowhub auth UX: `clientId` + `apiKey` → `/v0/clientsLocations` → location dropdown → location selection → connection complete.
- Widen the connection contract from `authCode: string` to a `Connection` discriminated union threaded through `Index.tsx` and `MenuGenerator.tsx`.
- Fixture-based normalizer self-check (`server/normalize/check.js`) and an `npm run check:normalize` script.

Out:

- Treez integration (still "Coming soon" tile).
- Persisting Flowhub credentials (the README/UI promise non-persistence).
- Per-room or analytics endpoints from the Flowhub OAS.
- Image rendering in the existing 5 menu layouts. The unified `MenuItem` carries `imageUrl` for future use; layouts continue to ignore it.
- Touching the 4/20 promo copy.
- Adding a test framework (Jest/Vitest). The fixture-driven Node script is intentionally framework-free.

## Architecture

```
┌─────────────────────┐          ┌──────────────────────────────┐          ┌─────────────────────┐
│  React frontend     │          │  Express proxy (server/)     │          │  Vendor APIs        │
│  ─────────────      │          │  ─────────────────────       │          │  ─────────────      │
│  POSSelector        │          │                              │          │                     │
│  ConnectAccount ────┼─POST────▶│  /api/dutchie/auth           │ ─GET───▶ │  Dutchie            │
│  MenuGenerator  ────┼─POST────▶│  /api/dutchie/menu      ◀────┼──json─── │                     │
│                     │          │     normalize → MenuItem[]   │          │                     │
│                     │          │                              │          │                     │
│                     │          │  /api/flowhub/locations  ───▶│ ─GET───▶ │  Flowhub            │
│                     │          │  /api/flowhub/menu      ◀────┼──json─── │  (clientId + key    │
│                     │          │     filter by locationId,    │          │   headers)          │
│                     │          │     normalize → MenuItem[]   │          │                     │
└─────────────────────┘          └──────────────────────────────┘          └─────────────────────┘

The seam is /api/{pos}/menu. Above it the frontend never sees a vendor-specific field.
```

## The unified `MenuItem` shape

Defined in `src/types/menu.ts` (TS source of truth) and mirrored in `server/menuItem.js` as JSDoc:

```ts
export type MenuItem = {
  id: string;            // stable per-variant
  name: string;
  category: string;
  brand?: string;
  strain?: string;       // 'Sativa' | 'Indica' | 'Hybrid' | 'Sativa-dominant' | 'Indica-dominant' | passthrough
  thc?: string;          // formatted, e.g. "22%", "10mg", "20-24%"
  cbd?: string;
  price: number;         // dollars, post-tax preferred
  weight?: string;       // e.g. "3.5g", "10pk", "1fl oz"
  description?: string;
  imageUrl?: string;     // populated for Flowhub items that have one; undefined for Dutchie
};
```

## Connection contract

```ts
// src/types/connection.ts
export type Connection =
  | { pos: 'dutchie'; authCode: string }
  | { pos: 'flowhub';
      clientId: string;
      apiKey: string;
      locationId: string;
      locationName: string };
```

`Index.tsx` holds `useState<Connection | null>(null)`. Step gating uses `connection !== null`. Single source of truth.

## Server endpoints

### `POST /api/flowhub/locations`

```
body: { clientId: string, apiKey: string }

→ Flowhub GET https://api.flowhub.co/v0/clientsLocations
    headers: { clientId, key }

200 { locations: [{ locationId, locationName, address: { city, state } }] }
401 { error: "Invalid Flowhub credentials" }
502 { error: "Network error", details }
```

The server returns only the four fields the UI needs (`locationId`, `locationName`, `address.city`, `address.state`) — passing the entire Flowhub object through would leak fields the frontend doesn't need.

### `POST /api/flowhub/menu`

```
body: { clientId: string, apiKey: string, locationId: string }

→ Flowhub GET https://api.flowhub.co/v0/inventoryNonZero
    headers: { clientId, key }

server-side:
  1. filter data → only rows where row.locationId === locationId
  2. defensive filter → only rows where (row.quantity ?? 0) > 0
  3. map each row through normalizeFlowhubItem → MenuItem[]

200 { menu: MenuItem[] }
401 { error: "Invalid Flowhub credentials" }
502 { error: "Network error", details }
```

### `POST /api/dutchie/menu` (refactor only)

Signature unchanged. Behavior change: normalizer runs server-side now. Returns `{ menu: MenuItem[] }` instead of `{ menu: <raw Dutchie inventory> }`. The frontend's normalizer block in `MenuGenerator.tsx:300-328` is deleted.

### `POST /api/dutchie/auth` (no change)

Stays as-is.

## Normalizer logic

### Flowhub: `server/normalize/flowhub.js`

```
normalizeFlowhubItem(raw) → MenuItem
  id          = raw.variantId ?? raw.productId
  name        = raw.productName ?? 'Unknown Product'
  category    = raw.category ?? raw.customCategoryName ?? 'Other'
  brand       = raw.brand || undefined
  strain      = mapStrain(raw.speciesName ?? raw.strainName)
  isCountable = raw.productUnitOfMeasure === 'each'
  thc         = formatCannabinoid(raw.cannabinoidInformation, 'thc', isCountable)
  cbd         = formatCannabinoid(raw.cannabinoidInformation, 'cbd', isCountable)
  price       = (raw.postTaxPriceInPennies ?? raw.priceInMinorUnits ?? 0) / 100
  weight      = formatWeight(raw.productWeight, raw.productUnitOfMeasure)
  description = raw.productDescription || undefined
  imageUrl    = raw.productPictureURL || undefined

mapStrain(s):
  if !s: undefined
  v = lowercase(trim(s))
  '50/50'      → 'Hybrid'
  'sativa-dom' → 'Sativa-dominant'
  'indica-dom' → 'Indica-dominant'
  'sativa'     → 'Sativa'
  'indica'     → 'Indica'
  'hybrid'     → 'Hybrid'
  default      → s (passthrough)

formatCannabinoid(arr, name, preferMg):
  if !Array.isArray(arr): undefined
  matches = arr.filter(c => c.name?.toLowerCase().trim() === name)
  if matches.length === 0: undefined
  pick = matches[0]
  if matches.length > 1:
    mg  = matches.find(c => c.unitOfMeasure === 'mg')
    pct = matches.find(c => c.unitOfMeasure === '%')
    pick = preferMg ? (mg ?? pct ?? pick) : (pct ?? mg ?? pick)
  unit = pick.unitOfMeasure ?? ''
  if pick.lowerRange === pick.upperRange: `${pick.upperRange}${unit}`
  else: `${pick.lowerRange}-${pick.upperRange}${unit}`

formatWeight(value, uom):
  if !value || !uom: undefined
  'each'        → value === 1 ? undefined : `${value}pk`
  'grams'       → `${value}g`
  'milligrams'  → `${value}mg`
  'fluidounces' → `${value}fl oz`
  default       → `${value}${uom}`
```

### Dutchie: `server/normalize/dutchie.js`

Logic moved verbatim from `MenuGenerator.tsx:300-328`:

```
normalizeDutchieItem(raw) → MenuItem
  id          = String(raw.inventoryId ?? raw.productId)
  name        = raw.productName ?? 'Unknown Product'
  category    = raw.category ?? raw.masterCategory ?? 'Other'
  brand       = raw.brandName || raw.vendor || undefined
  strain      = raw.strainType ?? (raw.strain !== 'No Strain' ? raw.strain : undefined)
  thc         = pickFromLabResults(raw.labResults, 'THC')
  cbd         = pickFromLabResults(raw.labResults, 'CBD')
  price       = raw.unitPrice ?? raw.recUnitPrice ?? 0
  weight      = raw.unitWeight ? `${raw.unitWeight}${raw.unitWeightUnit ?? 'g'}` : undefined
  description = raw.description || undefined
  imageUrl    = undefined

pickFromLabResults(arr, target):
  if !Array.isArray(arr): undefined
  hit = arr.find(r => r.labTest === target)
  if !hit: undefined
  return hit.labResultUnit === 'Milligrams' ? `${hit.value}mg` : `${hit.value}%`
```

## Frontend changes

### `src/components/POSSelector.tsx`

Set Flowhub `available: true`. Description → `"Cannabis retail POS system"`.

### `src/components/APIKeyInput.tsx` → renamed `ConnectAccount.tsx`

Renamed because "APIKeyInput" describes the Dutchie single-field flow only; Flowhub uses two fields plus a location picker. Rename is justified targeted cleanup.

POS-aware config:

```ts
type ConnectFlow = 'dutchie-auth' | 'flowhub-location-picker';

const POS_CONFIG: Record<string, {
  flow: ConnectFlow;
  fields: { key: string; label: string; placeholder: string; secret: boolean }[];
}> = {
  dutchie: {
    flow: 'dutchie-auth',
    fields: [{ key: 'apiKey', label: 'API Key',
               placeholder: 'Enter your Dutchie API key', secret: true }],
  },
  flowhub: {
    flow: 'flowhub-location-picker',
    fields: [
      { key: 'clientId', label: 'Client ID',
        placeholder: 'Flowhub Client ID (UUID)', secret: false },
      { key: 'apiKey', label: 'API Key',
        placeholder: 'Flowhub API Key (UUID)', secret: true },
    ],
  },
};
```

Render logic:

1. Render fields per `POS_CONFIG[posId].fields`. Existing eye/eye-off toggle applies to `secret: true` fields.
2. On submit, dispatch on `flow`:
   - `dutchie-auth`: POST `/api/dutchie/auth` → emit `{ pos: 'dutchie', authCode }` via `onConnected(connection: Connection)`.
   - `flowhub-location-picker`:
     - POST `/api/flowhub/locations` → render a `<select>` with returned locations. Label: `"{locationName} — {city}, {state}"`. If only one location, pre-select it.
     - "Use this location" button → emit `{ pos: 'flowhub', clientId, apiKey, locationId, locationName }`.
3. On success, the existing "Connected ✓" disabled state.

Internal sub-states for the Flowhub flow: `'entering-creds'` and `'picking-location'`. The whole component is one file, ~180 lines.

### `src/components/MenuGenerator.tsx`

Three changes:

1. `authCode: string` prop → `connection: Connection` prop.
2. Replace lines 300-328 (Dutchie normalizer) with a single dispatch:
   ```ts
   const url = connection.pos === 'dutchie'
     ? '/api/dutchie/menu'
     : '/api/flowhub/menu';
   const body = connection.pos === 'dutchie'
     ? { authCode: connection.authCode }
     : {
         clientId:   connection.clientId,
         apiKey:     connection.apiKey,
         locationId: connection.locationId,
       };
   const r = await fetch(url, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(body),
   });
   const { menu } = await r.json();   // already MenuItem[]
   setMenuData(menu);                  // no transform — server already did it
   ```
3. Replace hardcoded "Dutchie" in the heading copy: `"...from your {posLabel} inventory"`. `posLabel` derived from `connection.pos` via `{ dutchie: 'Dutchie', flowhub: 'Flowhub' }`.

### `src/pages/Index.tsx`

- `useState<string>("")` for authCode → `useState<Connection | null>(null)` for connection.
- Pass `posId={selectedPOS}` (lowercase) and `posName={Capitalized}` to `ConnectAccount`. Rename callback `onAuthenticated` → `onConnected(connection: Connection)`.
- Pass `connection={connection}` to `MenuGenerator`. Drop `authCode`.
- `onAuthInvalid` clears the connection (`setConnection(null)`) and returns to step 2.

## Error handling

| Trigger                                              | Surface                       | UX                                                                                                                          |
| ---------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 401 from `/api/flowhub/locations`                    | `ConnectAccount` toast        | "Invalid Flowhub credentials. Check your Client ID and API Key." Stay on the form; clear nothing.                           |
| Network error on `/locations`                        | `ConnectAccount` toast        | "Couldn't reach Flowhub. Check your connection."                                                                            |
| Empty `locations: []`                                | `ConnectAccount` inline       | "No locations found for this client. Confirm your Client ID with Flowhub support."                                          |
| 401 from `/api/flowhub/menu` (creds revoked mid-flow) | `MenuGenerator` → `onAuthInvalid()` | Mirrors current Dutchie behavior: clear connection, kick back to step 2 with toast.                                         |
| Empty inventory after `locationId` filter            | `MenuGenerator` inline        | "No in-stock items at {locationName}."                                                                                      |
| Vendor 5xx                                            | `MenuGenerator`               | "Couldn't load your inventory. Please try again."                                                                           |

All 401 paths are owned by the server proxy. Frontend reacts to HTTP status only — no vendor-specific error parsing in the React layer.

## Credential hygiene

- Both Dutchie and Flowhub routes are stateless. Credentials arrive in the POST body, are forwarded as headers to the vendor API, and are never written to disk or logged.
- Server uses Express's default error logging only; we explicitly do not log request bodies.
- The README/UI claim "your API key is never stored" remains true. Update copy to clarify credentials in plural for Flowhub: `"Your credentials are never stored. They are used only to connect your account to {posName} and fetch your menu data."`

## Testing approach

The repo has no test infrastructure today. Adding Jest/Vitest just for this is over-scoped. Two complementary verifications instead:

1. **Normalizer fixture self-check (new).**
   - Fixtures: `server/normalize/__fixtures__/dutchie-inventory.json` and `flowhub-inventory-nonzero.json`, derived from the OAS public examples (not from the live probe — keeps the repo free of real customer inventory data).
   - Script: `server/normalize/check.js` — runs both normalizers against every fixture row and asserts: `id` non-empty string, `name` non-empty, `category` non-empty, `price` finite non-negative number, all defined optional fields are correct types.
   - `package.json`: `"check:normalize": "node server/normalize/check.js"`.

2. **Manual smoke test (mandatory before claiming done).**
   - `npm run dev` (Vite) + `node server/index.js` (proxy).
   - **Dutchie regression:** existing key → menu renders → confirm prices, THC/CBD, strain still correct.
   - **Flowhub path:** Client ID + API Key → location dropdown populates with "Your Store — Your City, Your State" → confirm → menu renders. Spot-check: `priceInMinorUnits / 100` matches displayed price; ranges format (`32%`, `720mg`); `mg` chosen for vapes/edibles, `%` for flower; categories include Accessories (toggleable in CategoryManager).
   - `npm run build` passes (memory rule: never claim done without `npm run build` — tsc strict mode catches errors `--noEmit` misses).

## File plan

```
server/
  index.js                                    MODIFIED  + flowhub routes; dutchie /menu now returns normalized
  menuItem.js                                 NEW       JSDoc-typed shape, exports default factory
  normalize/
    dutchie.js                                NEW       logic moved from MenuGenerator.tsx:300-328
    flowhub.js                                NEW
    check.js                                  NEW       fixture-driven assertions
    __fixtures__/
      dutchie-inventory.json                  NEW       from Dutchie OAS / known-good response shape
      flowhub-inventory-nonzero.json          NEW       from Flowhub OAS examples (NOT live probe)

src/
  types/
    connection.ts                             NEW       Connection union, MenuItem type
  components/
    APIKeyInput.tsx                           RENAMED → ConnectAccount.tsx (POS-driven)
    POSSelector.tsx                           MODIFIED  flowhub.available = true
    MenuGenerator.tsx                         MODIFIED  connection prop, dispatch, normalizer removed
  pages/
    Index.tsx                                 MODIFIED  Connection state

docs/superpowers/specs/
  2026-05-01-flowhub-integration-design.md    NEW       this document

package.json                                  MODIFIED  + "check:normalize" script
```

Approx. impact: ~250 lines added (mostly server normalizers + ConnectAccount), ~30 lines removed (frontend normalizer), 6 files modified, 7 files added.

## Approach considered and rejected

- **Approach 1 — verbatim Dutchie port, frontend normalization.** Lower upfront effort but two parallel normalizers in `MenuGenerator.tsx` plus POS branches sprinkled through copy strings. Adding Treez later means a third copy of normalization. Rejected because user explicitly asked for "seamless across POSes".
- **Approach 3 — full plugin/adapter architecture (Pos interface, registry, dynamic dispatch).** YAGNI for 3 POSes total. Rejected.

## Live API verification (probe results, 2026-05-01)

Performed before finalizing this spec to validate normalizer assumptions against real Flowhub data:

- Auth (clientId + key headers): ✓ 200 OK.
- `/v0/clientsLocations`: 1 location (the test client). Confirms shape.
- `/v0/inventoryNonZero`: 341 items, all 12 distinct categories listed in Scope. Confirms field names.
- Surprises folded into normalizer logic: dual-unit cannabinoidInformation entries (mg + %); messy `speciesName` values (`'50/50'`, `'Sativa-dom'`, `'Indica-dom'`); `fluidounces` as a real `productUnitOfMeasure`.

Probe response files were kept in `%TEMP%/flowhub-probe/` and excluded from the repo and from the test fixtures (which use OAS public-example data instead).
