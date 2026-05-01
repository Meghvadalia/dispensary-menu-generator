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
