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

export function SlimRowsMenu({ items, storeName = "Cannabis Menu", logo, brandColors = [], onItemUpdate, onItemDelete, categoryOrder: propCategoryOrder, categorySettings, repeatHeader }: MenuProps) {
  const primaryHex = brandColors[0];
  const primary = (primaryHex && hexToHslTuple(primaryHex)) || fallbackHsl();

  // Reusable header component for repeat functionality
  const renderHeader = (isRepeat = false) => (
    <>
      <div className={`slim-rows-header ${isRepeat ? "slim-rows-header-repeat" : ""}`}>
        <div className="slim-rows-header-content">
          {logo && <img src={logo} alt="Logo" className="slim-rows-logo" />}
          <h1 className="slim-rows-title">{storeName}</h1>
          {logo && <img src={logo} alt="Logo" className="slim-rows-logo" />}
        </div>
        {/* Strain Type Legend */}
        <div className="slim-rows-legend">
          <div className="slim-rows-legend-item">
            <Leaf className="w-4 h-4" style={{ color: "#a855f7" }} />
            <span>Indica</span>
          </div>
          <div className="slim-rows-legend-item">
            <Leaf className="w-4 h-4" style={{ color: "#f97316" }} />
            <span>Sativa</span>
          </div>
          <div className="slim-rows-legend-item">
            <Leaf className="w-4 h-4" style={{ color: "#22c55e" }} />
            <span>Hybrid</span>
          </div>
        </div>
        <div className="slim-rows-date">{new Date().toLocaleDateString()}</div>
      </div>
    </>
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
      className="print-menu slim-rows-menu bg-white text-black"
      style={{
        // @ts-ignore
        "--menu-primary": `${primary.h} ${primary.s}% ${primary.l}%`,
      }}
    >
      {/* Header */}
      {renderHeader()}

      {/* Body - Each category flows top to bottom, items in 2-column grid */}
      <div className="slim-rows-body">
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
              className={`slim-rows-category ${hasPageBreak ? "page-break-before" : ""}`}
            >
              {/* Repeat header after page break if enabled */}
              {repeatHeader && hasPageBreak && renderHeader(true)}
              {/* Category Header - Full Width */}
              <div className="slim-rows-category-header">
                <span className="slim-rows-category-line" style={{ background: `hsl(${primary.h} ${primary.s}% ${primary.l}%)` }}></span>
                <h2 className="slim-rows-category-title">
                  {category}{itemChunks.length > 1 ? ` (${chunkIndex + 1}/${itemChunks.length})` : ""}
                </h2>
                <span className="slim-rows-category-line" style={{ background: `hsl(${primary.h} ${primary.s}% ${primary.l}%)` }}></span>
              </div>

              {/* Items in 2-column grid - row by row */}
              <div className="slim-rows-items">
                {chunkItemsList.map((item, index) => {
                  const strainInfo = getStrainColor(item.strain);
                  return (
                    <div key={item.id} className={`slim-rows-item ${index % 4 < 2 ? "" : "slim-rows-item-alt"}`}>
                      {onItemDelete && (
                        <button
                          onClick={() => onItemDelete(item.id)}
                          className="slim-rows-item-delete no-print"
                          title="Remove item"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {/* Strain Type Leaf Icon */}
                      <span title={strainInfo.label}>
                        <Leaf
                          className="slim-rows-strain-leaf"
                          style={{ color: strainInfo.color }}
                        />
                      </span>
                      <div className="slim-rows-item-left">
                        <EditableField
                          className="slim-rows-item-name"
                          value={cleanProductName(item.name, item.brand)}
                          itemId={item.id}
                          field="name"
                          onUpdate={onItemUpdate}
                        />
                        {item.brand && (
                          <EditableField
                            className="slim-rows-item-brand"
                            value={item.brand}
                            itemId={item.id}
                            field="brand"
                            onUpdate={onItemUpdate}
                            prefix=" - "
                          />
                        )}
                      </div>
                      <div className="slim-rows-item-right">
                        {item.thc && (
                          <EditableField
                            className="slim-rows-item-thc"
                            value={item.thc}
                            itemId={item.id}
                            field="thc"
                            onUpdate={onItemUpdate}
                            prefix="THC: "
                          />
                        )}
                        <EditableField
                          className="slim-rows-item-price"
                          style={{ color: `hsl(${primary.h} ${primary.s}% ${primary.l}%)` }}
                          value={item.price.toFixed(2)}
                          itemId={item.id}
                          field="price"
                          onUpdate={onItemUpdate}
                          prefix="$"
                        />
                        {item.weight && (
                          <EditableField
                            className="slim-rows-item-weight"
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

        <div className="slim-rows-footer">21+ Only | Prices subject to change</div>
      </div>
    </article>
  );
}
