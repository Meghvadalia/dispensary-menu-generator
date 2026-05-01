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
