import { useMemo } from "react";
import { MenuItem, MenuProps, hexToHslTuple, fallbackHsl, cleanProductName, EditableField, chunkItems, getCategorySettings } from "./menuUtils";
import { X } from "lucide-react";

// Cannabis type to color mapping
const getStrainColor = (strain?: string): string => {
  if (!strain) return "#888888";
  const normalized = strain.toLowerCase();
  if (normalized.includes("indica")) return "#a855f7"; // Purple
  if (normalized.includes("sativa")) return "#f97316"; // Orange
  if (normalized.includes("hybrid")) return "#22c55e"; // Green
  return "#888888";
};

export function CatalogFixedMenu({ items, storeName = "Cannabis Menu", logo, brandColors = [], onItemUpdate, onItemDelete, categoryOrder: propCategoryOrder, categorySettings, repeatHeader }: MenuProps) {
  const primaryHex = brandColors[0];
  const primary = (primaryHex && hexToHslTuple(primaryHex)) || fallbackHsl();

  // Reusable header component for repeat functionality
  const renderHeader = (isRepeat = false) => (
    <div className={`catalog-fixed-header ${isRepeat ? "catalog-fixed-header-repeat" : ""}`}>
      <div className="catalog-fixed-header-content">
        {logo && <img src={logo} alt="Logo" className="catalog-fixed-logo" />}
        <div className="catalog-fixed-header-text">
          <h1 className="catalog-fixed-title">{storeName}</h1>
          <p className="catalog-fixed-subtitle">Product Catalog</p>
        </div>
      </div>
      <div className="catalog-fixed-header-line" style={{ background: `hsl(${primary.h} ${primary.s}% ${primary.l}%)` }}></div>
    </div>
  );

  const { groupedItems, categoryOrder } = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    const order: string[] = [];
    items.forEach((item) => {
      const category = item.category || "Other";
      if (!groups[category]) { groups[category] = []; order.push(category); }
      groups[category].push(item);
    });
    const finalOrder = propCategoryOrder && propCategoryOrder.length > 0
      ? propCategoryOrder.filter((cat) => groups[cat])
      : order;
    return { groupedItems: groups, categoryOrder: finalOrder };
  }, [items, propCategoryOrder]);

  return (
    <article
      id="printable-menu"
      className="print-menu catalog-fixed-menu"
      style={{
        // @ts-ignore
        "--menu-primary": `${primary.h} ${primary.s}% ${primary.l}%`,
      }}
    >
      {/* Header */}
      {renderHeader()}

      {/* Categories - flows continuously without forcing page breaks */}
      <div className="catalog-fixed-body">
        {categoryOrder.map((category, catIndex) => {
          const settings = getCategorySettings(category, categorySettings);
          const prevCategory = catIndex > 0 ? categoryOrder[catIndex - 1] : null;
          const prevSettings = prevCategory ? getCategorySettings(prevCategory, categorySettings) : null;
          const needsPageBreak = prevSettings?.pageBreakAfter || false;
          const itemChunks = chunkItems(groupedItems[category], settings.itemsPerPage);

          return itemChunks.map((chunkItemsList, chunkIndex) => {
            const hasPageBreak = (needsPageBreak && chunkIndex === 0) || chunkIndex > 0;
            return (
            <section
              key={`${category}-${chunkIndex}`}
              className={`catalog-fixed-category ${hasPageBreak ? "page-break-before" : ""}`}
            >
              {/* Repeat header after page break if enabled */}
              {repeatHeader && hasPageBreak && renderHeader(true)}
              <div className="catalog-fixed-category-header">
                <h2 className="catalog-fixed-category-title" style={{ color: `hsl(${primary.h} ${primary.s}% ${primary.l}%)` }}>
                  {category}{itemChunks.length > 1 ? ` (${chunkIndex + 1}/${itemChunks.length})` : ""}
                </h2>
                <div className="catalog-fixed-category-line" style={{ background: `hsl(${primary.h} ${primary.s}% ${primary.l}% / 0.3)` }}></div>
              </div>

              {/* Items grid - 2 columns within the category */}
              <div className="catalog-fixed-items-grid">
                {chunkItemsList.map((item) => (
                  <div key={item.id} className="catalog-fixed-item">
                    {onItemDelete && (
                      <button
                        onClick={() => onItemDelete(item.id)}
                        className="catalog-fixed-item-delete no-print"
                        title="Remove item"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <div className="catalog-fixed-item-top">
                      <EditableField
                        as="h3"
                        className="catalog-fixed-item-name"
                        value={cleanProductName(item.name, item.brand)}
                        itemId={item.id}
                        field="name"
                        onUpdate={onItemUpdate}
                      />
                      <EditableField
                        className="catalog-fixed-item-price"
                        style={{ color: "hsl(var(--menu-primary))" }}
                        value={item.price.toFixed(2)}
                        itemId={item.id}
                        field="price"
                        onUpdate={onItemUpdate}
                        prefix="$"
                      />
                    </div>
                    <div className="catalog-fixed-item-details">
                      {item.brand && (
                        <EditableField
                          className="catalog-fixed-detail"
                          value={item.brand}
                          itemId={item.id}
                          field="brand"
                          onUpdate={onItemUpdate}
                        />
                      )}
                      {item.strain && (
                        <EditableField
                          className="catalog-fixed-detail catalog-fixed-strain"
                          style={{ color: getStrainColor(item.strain), fontWeight: 600 }}
                          value={item.strain}
                          itemId={item.id}
                          field="strain"
                          onUpdate={onItemUpdate}
                        />
                      )}
                      {item.weight && (
                        <EditableField
                          className="catalog-fixed-detail"
                          value={item.weight}
                          itemId={item.id}
                          field="weight"
                          onUpdate={onItemUpdate}
                        />
                      )}
                    </div>
                    {(item.thc || item.cbd) && (
                      <div className="catalog-fixed-item-lab">
                        {item.thc && (
                          <EditableField
                            className="catalog-fixed-thc"
                            value={item.thc}
                            itemId={item.id}
                            field="thc"
                            onUpdate={onItemUpdate}
                            prefix="THC "
                          />
                        )}
                        {item.cbd && (
                          <EditableField
                            className="catalog-fixed-cbd"
                            value={item.cbd}
                            itemId={item.id}
                            field="cbd"
                            onUpdate={onItemUpdate}
                            prefix="CBD "
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
          });
        })}
      </div>

      <footer className="catalog-fixed-footer">
        <p>21+ Only | Prices Subject to Change | {new Date().toLocaleDateString()}</p>
      </footer>
    </article>
  );
}
