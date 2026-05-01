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
  if (raw === undefined || raw === null) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;
  const v = trimmed.toLowerCase();
  return STRAIN_MAP.get(v) ?? trimmed;
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
  const priceRaw = Number(cents);
  const price = Number.isFinite(priceRaw) ? priceRaw / 100 : 0;

  const weight = formatWeight(raw.productWeight, raw.productUnitOfMeasure);
  const description = raw.productDescription ? String(raw.productDescription) : undefined;
  const imageUrl = raw.productPictureURL || undefined;

  return { id, name, category, brand, strain, thc, cbd, price, weight, description, imageUrl };
}
