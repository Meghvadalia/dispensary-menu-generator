import { useMemo } from "react";

interface MenuItem {
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
}

interface PrintableMenuProps {
  items: MenuItem[];
  storeName?: string;
  logo?: string | null;
  brandColors?: string[];
}

const categoryIcons: Record<string, string> = {
  Flower: "🌿",
  Concentrates: "💎",
  Edibles: "🍪",
  Vapes: "💨",
  Tinctures: "💧",
  Topicals: "✨",
  Prerolls: "🚬",
  Accessories: "🛠️",
  Other: "📦",
};

function normalizeForCompare(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanProductName(name: string, brand?: string): string {
  if (!brand) return name;

  const brandNorm = normalizeForCompare(brand);
  if (!brandNorm) return name;

  const parts = name
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const pNorm = normalizeForCompare(p);

      // Drop segments that are exactly the brand
      if (pNorm === brandNorm) return "";

      // Remove brand prefix inside a segment (e.g. "High Branch - Sparkling ...")
      if (pNorm.startsWith(brandNorm + " ")) {
        const without = p.slice(pNorm.indexOf(brandNorm) + brandNorm.length).trim();
        return without.replace(/^[\-\:]+\s*/, "");
      }

      return p;
    })
    .filter(Boolean);

  const cleaned = parts.join(" | ").trim();
  return cleaned || name;
}

function hexToHslTuple(hex: string): { h: number; s: number; l: number } | null {
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length !== 6) return null;

  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function fallbackHsl(): { h: number; s: number; l: number } {
  // matches current theme-ish green
  return { h: 150, s: 45, l: 22 };
}

export function PrintableMenu({ items, storeName = "Cannabis Menu", logo, brandColors = [] }: PrintableMenuProps) {
  const { groupedItems, categoryOrder } = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    const order: string[] = [];

    items.forEach((item) => {
      const category = item.category || "Other";
      if (!groups[category]) {
        groups[category] = [];
        order.push(category);
      }
      groups[category].push(item);
    });

    return { groupedItems: groups, categoryOrder: order };
  }, [items]);

  const primaryHex = brandColors[0];
  const primary = (primaryHex && hexToHslTuple(primaryHex)) || fallbackHsl();

  return (
    <article
      id="printable-menu"
      className="print-menu bg-card text-card-foreground border border-border overflow-hidden"
      style={{
        // Use HSL-only dynamic styling via CSS vars
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        "--menu-primary": `${primary.h} ${primary.s}% ${primary.l}%`,
      }}
    >
      {/* Printed repeated header */}
      <div className="print-menu__header">
        <div className="flex items-center gap-3 px-4 py-3">
          {logo ? (
            <img
              src={logo}
              alt="Dispensary logo"
              className="h-9 w-9 object-contain rounded-md border border-border bg-background"
            />
          ) : (
            <div
              className="h-9 w-9 rounded-md border border-border bg-muted"
              aria-hidden="true"
            />
          )}

          <div className="min-w-0">
            <h1 className="font-display text-base md:text-lg font-semibold leading-tight truncate">
              {storeName}
            </h1>
            <p className="text-xs text-muted-foreground leading-tight">Cannabis menu</p>
          </div>

          <div className="ml-auto text-xs text-muted-foreground">
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="print-menu__body p-4 md:p-6 space-y-5">
        {categoryOrder.map((category) => (
          <section key={category} className="menu-category">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
              <span className="text-lg" aria-hidden="true">
                {categoryIcons[category] || "📦"}
              </span>
              <h2 className="font-display text-lg font-semibold">{category}</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {groupedItems[category].length} items
              </span>
            </div>

            <div className="print-grid grid grid-cols-2 gap-3">
              {groupedItems[category].map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold leading-snug">
                        {cleanProductName(item.name, item.brand)}
                      </h3>
                      {item.brand && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.brand}</p>
                      )}
                      {item.strain && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.strain}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold" style={{ color: "hsl(var(--menu-primary))" }}>
                        ${item.price.toFixed(2)}
                      </div>
                      {item.weight && (
                        <div className="text-xs text-muted-foreground">{item.weight}</div>
                      )}
                    </div>
                  </div>

                  {(item.thc || item.cbd) && (
                    <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      {item.thc && <span className="text-foreground">THC: {item.thc}</span>}
                      {item.cbd && <span className="text-foreground">CBD: {item.cbd}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <footer className="pt-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Prices and availability subject to change • Must be 21+ to purchase
          </p>
        </footer>
      </div>
    </article>
  );
}
