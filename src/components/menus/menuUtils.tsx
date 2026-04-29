import React from "react";

export interface MenuItem {
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

export interface CategorySettings {
  pageBreakAfter: boolean;
  itemsPerPage: number | null; // null = all items
}

export interface MenuProps {
  items: MenuItem[];
  storeName?: string;
  logo?: string | null;
  brandColors?: string[];
  onItemUpdate?: (id: string, field: keyof MenuItem, value: string | number) => void;
  onItemDelete?: (id: string) => void;
  categoryOrder?: string[];
  categorySettings?: Record<string, CategorySettings>;
  repeatHeader?: boolean;
}

export const categoryIcons: Record<string, string> = {
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

export function normalizeForCompare(input: string): string {
  return input.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function cleanProductName(name: string, brand?: string): string {
  if (!brand) return name;
  const brandNorm = normalizeForCompare(brand);
  if (!brandNorm) return name;
  const parts = name.split("|").map((p) => p.trim()).filter(Boolean).map((p) => {
    const pNorm = normalizeForCompare(p);
    if (pNorm === brandNorm) return "";
    if (pNorm.startsWith(brandNorm + " ")) {
      const without = p.slice(pNorm.indexOf(brandNorm) + brandNorm.length).trim();
      return without.replace(/^[-:]+s*/, "");
    }
    return p;
  }).filter(Boolean);
  const cleaned = parts.join(" | ").trim();
  return cleaned || name;
}

export function hexToHslTuple(hex: string): { h: number; s: number; l: number } | null {
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

export function fallbackHsl(): { h: number; s: number; l: number } {
  return { h: 150, s: 45, l: 22 };
}

// Menu type configurations for height estimation (in approximate pixels)
export type MenuType = "dispensary" | "slim" | "slim-rows" | "catalog";

interface MenuHeightConfig {
  headerHeight: number;      // Menu header height
  categoryHeaderHeight: number;  // Category title/divider height
  itemHeight: number;        // Height per item
  itemsPerRow: number;       // For grid layouts (1 = single column)
  footerHeight: number;      // Footer area height
  pageHeight: number;        // Usable page height (after margins)
}

const menuConfigs: Record<MenuType, MenuHeightConfig> = {
  dispensary: {
    headerHeight: 120,
    categoryHeaderHeight: 50,
    itemHeight: 40,
    itemsPerRow: 1,
    footerHeight: 150,
    pageHeight: 950,
  },
  slim: {
    headerHeight: 60,
    categoryHeaderHeight: 30,
    itemHeight: 22,
    itemsPerRow: 1, // Column flow, so treat as single
    footerHeight: 40,
    pageHeight: 950,
  },
  "slim-rows": {
    headerHeight: 70,
    categoryHeaderHeight: 35,
    itemHeight: 20,
    itemsPerRow: 2,
    footerHeight: 40,
    pageHeight: 950,
  },
  catalog: {
    headerHeight: 100,
    categoryHeaderHeight: 50,
    itemHeight: 90,
    itemsPerRow: 2,
    footerHeight: 50,
    pageHeight: 950,
  },
};

interface CategorySize {
  category: string;
  itemCount: number;
  estimatedHeight: number;
}

/**
 * Estimate the height of a category based on menu type and item count
 */
function estimateCategoryHeight(
  itemCount: number,
  config: MenuHeightConfig
): number {
  const rows = Math.ceil(itemCount / config.itemsPerRow);
  return config.categoryHeaderHeight + rows * config.itemHeight;
}

/**
 * Calculate how many pages are needed and how much space is wasted
 */
function calculatePageWaste(
  categoryOrder: CategorySize[],
  config: MenuHeightConfig
): { pages: number; wastedSpace: number } {
  let currentPageHeight = config.headerHeight;
  let pages = 1;
  let wastedSpace = 0;

  for (const cat of categoryOrder) {
    // Check if this category fits on current page
    if (currentPageHeight + cat.estimatedHeight > config.pageHeight) {
      // Add wasted space from current page
      wastedSpace += config.pageHeight - currentPageHeight;
      // Start new page
      pages++;
      currentPageHeight = cat.estimatedHeight;
    } else {
      currentPageHeight += cat.estimatedHeight;
    }
  }

  // Add footer to last page consideration
  if (currentPageHeight + config.footerHeight > config.pageHeight) {
    wastedSpace += config.pageHeight - currentPageHeight;
    pages++;
  }

  return { pages, wastedSpace };
}

/**
 * First Fit Decreasing bin packing algorithm adapted for page optimization
 * Tries to order categories to minimize wasted page space
 */
export function optimizeCategoryOrder(
  categories: string[],
  itemCounts: Record<string, number>,
  menuType: MenuType
): string[] {
  const config = menuConfigs[menuType];

  // Calculate sizes for all categories
  const categorySizes: CategorySize[] = categories.map((category) => ({
    category,
    itemCount: itemCounts[category] || 0,
    estimatedHeight: estimateCategoryHeight(itemCounts[category] || 0, config),
  }));

  // Try multiple strategies and pick the best one
  const strategies: CategorySize[][] = [];

  // Strategy 1: Sort by size descending (First Fit Decreasing)
  strategies.push([...categorySizes].sort((a, b) => b.estimatedHeight - a.estimatedHeight));

  // Strategy 2: Sort by size ascending
  strategies.push([...categorySizes].sort((a, b) => a.estimatedHeight - b.estimatedHeight));

  // Strategy 3: Alternating large/small to fill gaps
  const sorted = [...categorySizes].sort((a, b) => b.estimatedHeight - a.estimatedHeight);
  const alternating: CategorySize[] = [];
  let left = 0;
  let right = sorted.length - 1;
  while (left <= right) {
    if (left === right) {
      alternating.push(sorted[left]);
    } else {
      alternating.push(sorted[left]);
      alternating.push(sorted[right]);
    }
    left++;
    right--;
  }
  strategies.push(alternating);

  // Strategy 4: Greedy bin packing - fit categories into pages optimally
  const greedyOrder = greedyBinPack(categorySizes, config);
  strategies.push(greedyOrder);

  // Strategy 5: Original order (for comparison)
  strategies.push(categorySizes);

  // Evaluate each strategy and pick the best
  let bestStrategy = strategies[0];
  let bestScore = Infinity;

  for (const strategy of strategies) {
    const { pages, wastedSpace } = calculatePageWaste(strategy, config);
    // Score: prioritize fewer pages, then less wasted space
    const score = pages * 10000 + wastedSpace;
    if (score < bestScore) {
      bestScore = score;
      bestStrategy = strategy;
    }
  }

  return bestStrategy.map((s) => s.category);
}

/**
 * Greedy bin packing: try to fill each page as much as possible
 */
function greedyBinPack(
  categories: CategorySize[],
  config: MenuHeightConfig
): CategorySize[] {
  const remaining = [...categories].sort((a, b) => b.estimatedHeight - a.estimatedHeight);
  const result: CategorySize[] = [];
  let currentPageSpace = config.pageHeight - config.headerHeight;

  while (remaining.length > 0) {
    // Find the largest category that fits
    let foundIndex = -1;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].estimatedHeight <= currentPageSpace) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex >= 0) {
      // Add it to result and reduce available space
      const cat = remaining.splice(foundIndex, 1)[0];
      result.push(cat);
      currentPageSpace -= cat.estimatedHeight;
    } else {
      // No category fits, start new page
      currentPageSpace = config.pageHeight;
      // Take the largest remaining
      if (remaining.length > 0) {
        const cat = remaining.shift()!;
        result.push(cat);
        currentPageSpace -= cat.estimatedHeight;
      }
    }
  }

  return result;
}

/**
 * Get estimated page count for current category order
 */
export function estimatePageCount(
  categories: string[],
  itemCounts: Record<string, number>,
  menuType: MenuType
): { pages: number; wastedSpace: number } {
  const config = menuConfigs[menuType];
  const categorySizes: CategorySize[] = categories.map((category) => ({
    category,
    itemCount: itemCounts[category] || 0,
    estimatedHeight: estimateCategoryHeight(itemCounts[category] || 0, config),
  }));
  return calculatePageWaste(categorySizes, config);
}

/**
 * Split items into chunks based on itemsPerPage setting
 */
export function chunkItems<T>(items: T[], itemsPerPage: number | null): T[][] {
  if (!itemsPerPage || itemsPerPage <= 0) {
    return [items];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    chunks.push(items.slice(i, i + itemsPerPage));
  }
  return chunks;
}

/**
 * Get the settings for a category with defaults
 */
export function getCategorySettings(
  category: string,
  settings?: Record<string, CategorySettings>
): CategorySettings {
  return settings?.[category] || { pageBreakAfter: false, itemsPerPage: null };
}

interface EditableFieldProps {
  value: string;
  itemId: string;
  field: keyof MenuItem;
  onUpdate?: (id: string, field: keyof MenuItem, value: string | number) => void;
  className?: string;
  style?: React.CSSProperties;
  as?: "span" | "h3" | "p";
  prefix?: string;
  suffix?: string;
}

export function EditableField({
  value,
  itemId,
  field,
  onUpdate,
  className,
  style,
  as: Tag = "span",
  prefix = "",
  suffix = "",
}: EditableFieldProps) {
  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    const newValue = e.currentTarget.textContent || "";
    const cleanValue = newValue.replace(prefix, "").replace(suffix, "").trim();
    if (cleanValue !== value && onUpdate) {
      if (field === "price") {
        const numValue = parseFloat(cleanValue.replace(/[^0-9.]/g, ""));
        if (!isNaN(numValue)) {
          onUpdate(itemId, field, numValue);
        }
      } else {
        onUpdate(itemId, field, cleanValue);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <Tag
      className={className}
      style={style}
      contentEditable={!!onUpdate}
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      spellCheck={false}
    >
      {prefix}{value}{suffix}
    </Tag>
  );
}
