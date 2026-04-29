import { useMemo } from "react";
import { MenuItem, MenuProps, hexToHslTuple, fallbackHsl, cleanProductName, EditableField, chunkItems, getCategorySettings } from "./menuUtils";
import { X, Leaf } from "lucide-react";

// Cannabis type to color mapping
const getStrainColor = (strain?: string): { color: string; label: string } => {
  if (!strain) return { color: "#888888", label: "Unknown" };
  const normalized = strain.toLowerCase();
  if (normalized.includes("indica")) return { color: "#a855f7", label: "Indica" }; // Purple
  if (normalized.includes("sativa")) return { color: "#f97316", label: "Sativa" }; // Orange
  if (normalized.includes("hybrid")) return { color: "#22c55e", label: "Hybrid" }; // Green
  return { color: "#888888", label: strain };
};

export function SlimMenu({ items, storeName = "Cannabis Menu", logo, brandColors = [], onItemUpdate, onItemDelete, categoryOrder: propCategoryOrder, categorySettings, repeatHeader }: MenuProps) {
  const primaryHex = brandColors[0];
  const primary = (primaryHex && hexToHslTuple(primaryHex)) || fallbackHsl();

  // Reusable header component for repeat functionality
  const renderHeader = (isRepeat = false) => (
    <div className={`print-menu__header slim-header ${isRepeat ? "slim-header-repeat" : ""}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-black">
        <div className="flex items-center gap-2">
          {logo && <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />}
          <h1 className="font-bold text-lg uppercase tracking-wide">{storeName}</h1>
        </div>
        {/* Strain Type Legend */}
        <div className="slim-legend flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Leaf className="w-3 h-3" style={{ color: "#a855f7" }} />
            <span>Indica</span>
          </div>
          <div className="flex items-center gap-1">
            <Leaf className="w-3 h-3" style={{ color: "#f97316" }} />
            <span>Sativa</span>
          </div>
          <div className="flex items-center gap-1">
            <Leaf className="w-3 h-3" style={{ color: "#22c55e" }} />
            <span>Hybrid</span>
          </div>
        </div>
        <div className="text-xs">{new Date().toLocaleDateString()}</div>
      </div>
    </div>
  );

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

    // Use prop order if provided, otherwise use natural order
    const finalOrder = propCategoryOrder && propCategoryOrder.length > 0
      ? propCategoryOrder.filter((cat) => groups[cat])
      : order;

    return { groupedItems: groups, categoryOrder: finalOrder };
  }, [items, propCategoryOrder]);

  return (
    <article
      id="printable-menu"
      className="print-menu slim-menu bg-white text-black"
      style={{
        // @ts-ignore
        "--menu-primary": `${primary.h} ${primary.s}% ${primary.l}%`,
      }}
    >
      {renderHeader()}

      <div className="print-menu__body slim-body">
        <div className="slim-columns">
          {categoryOrder.map((category, catIndex) => {
            const settings = getCategorySettings(category, categorySettings);
            const prevCategory = catIndex > 0 ? categoryOrder[catIndex - 1] : null;
            const prevSettings = prevCategory ? getCategorySettings(prevCategory, categorySettings) : null;
            const needsPageBreak = prevSettings?.pageBreakAfter || false;
            const itemChunks = chunkItems(groupedItems[category], settings.itemsPerPage);

            return itemChunks.map((chunkItemsList, chunkIndex) => {
              const hasPageBreak = (needsPageBreak && chunkIndex === 0) || chunkIndex > 0;
              return (
              <div
                key={`${category}-${chunkIndex}`}
                className={`slim-category ${hasPageBreak ? "page-break-before" : ""}`}
              >
                {/* Repeat header after page break if enabled */}
                {repeatHeader && hasPageBreak && renderHeader(true)}
                <div className="slim-category-header">
                  <span className="font-bold text-sm uppercase tracking-wider">
                    {category}{itemChunks.length > 1 ? ` (${chunkIndex + 1}/${itemChunks.length})` : ""}
                  </span>
                  <span className="slim-divider"></span>
                </div>

                <div className="slim-items">
                  {chunkItemsList.map((item, index) => {
                    const strainInfo = getStrainColor(item.strain);
                    return (
                      <div key={item.id} className={`slim-item ${index % 2 === 1 ? "slim-item-alt" : ""}`}>
                        {onItemDelete && (
                          <button
                            onClick={() => onItemDelete(item.id)}
                            className="slim-item-delete no-print"
                            title="Remove item"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {/* Strain Type Leaf Icon */}
                        <span title={strainInfo.label}>
                          <Leaf
                            className="slim-strain-leaf w-3 h-3 flex-shrink-0"
                            style={{ color: strainInfo.color }}
                          />
                        </span>
                        <div className="slim-item-left">
                          <EditableField
                            className="slim-item-name"
                            value={cleanProductName(item.name, item.brand)}
                            itemId={item.id}
                            field="name"
                            onUpdate={onItemUpdate}
                          />
                          {item.brand && (
                            <EditableField
                              className="slim-item-brand"
                              value={item.brand}
                              itemId={item.id}
                              field="brand"
                              onUpdate={onItemUpdate}
                              prefix=" - "
                            />
                          )}
                        </div>
                        <div className="slim-item-right">
                          {item.thc && (
                            <EditableField
                              className="slim-item-thc"
                              value={item.thc}
                              itemId={item.id}
                              field="thc"
                              onUpdate={onItemUpdate}
                              prefix="THC: "
                            />
                          )}
                          <EditableField
                            className="slim-item-price"
                            style={{ color: "hsl(var(--menu-primary))" }}
                            value={item.price.toFixed(2)}
                            itemId={item.id}
                            field="price"
                            onUpdate={onItemUpdate}
                            prefix="$"
                          />
                          {item.weight && (
                            <EditableField
                              className="slim-item-weight"
                              value={item.weight}
                              itemId={item.id}
                              field="weight"
                              onUpdate={onItemUpdate}
                              prefix="/"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
            });
          })}
        </div>

        <div className="slim-footer">21+ Only | Prices subject to change</div>
      </div>
    </article>
  );
}
