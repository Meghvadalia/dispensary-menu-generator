import { useMemo, useState } from "react";
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

export function DispensaryMenu({ items, storeName = "Cannabis Menu", logo, brandColors = [], onItemUpdate, onItemDelete, categoryOrder: propCategoryOrder, categorySettings, repeatHeader }: MenuProps) {
  const [footerNotes, setFooterNotes] = useState<string[]>(["Veterans 10% discount", "Teachers 10% discount"]);

  const primaryHex = brandColors[0] || "#1a4d2e";
  const primary = hexToHslTuple(primaryHex) || fallbackHsl();
  const primaryColor = `hsl(${primary.h}, ${primary.s}%, ${primary.l}%)`;

  // Reusable header component for repeat functionality
  const renderHeader = (isRepeat = false) => (
    <header className={`dispensary-header ${isRepeat ? "dispensary-header-repeat" : ""}`}>
      <div className="dispensary-header-content">
        <div className="dispensary-header-left">
          {logo ? (
            <img src={logo} alt="Logo" className="dispensary-logo" />
          ) : (
            <div className="dispensary-logo-placeholder" style={{ background: primaryColor }}>
              <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
          )}
          <div className="dispensary-header-text">
            <h1 className="dispensary-title" style={{ color: primaryColor }}>{storeName}</h1>
            <p className="dispensary-tagline">Premium Cannabis Products</p>
          </div>
        </div>
        {logo ? (
          <img src={logo} alt="Logo" className="dispensary-logo-right" />
        ) : (
          <div className="dispensary-logo-placeholder dispensary-logo-right" style={{ background: primaryColor }}>
            <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
        )}
      </div>
    </header>
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

  const primaryLight = `hsl(${primary.h}, ${primary.s}%, ${Math.min(primary.l + 40, 95)}%)`;

  return (
    <article
      id="printable-menu"
      className="print-menu dispensary-menu"
      style={{
        // @ts-ignore
        "--menu-primary": `${primary.h} ${primary.s}% ${primary.l}%`,
        "--primary-color": primaryColor,
        "--primary-light": primaryLight,
      }}
    >
      {/* Header */}
      {renderHeader()}

      {/* Menu Body */}
      <div className="print-menu__body dispensary-body">
        {categoryOrder.map((category, catIndex) => {
          const settings = getCategorySettings(category, categorySettings);
          const prevCategory = catIndex > 0 ? categoryOrder[catIndex - 1] : null;
          const prevSettings = prevCategory ? getCategorySettings(prevCategory, categorySettings) : null;
          const needsPageBreak = prevSettings?.pageBreakAfter || false;
          const itemChunks = chunkItems(groupedItems[category], settings.itemsPerPage);

          return itemChunks.map((chunkItems, chunkIndex) => {
            const hasPageBreak = (needsPageBreak && chunkIndex === 0) || chunkIndex > 0;
            return (
            <section
              key={`${category}-${chunkIndex}`}
              className={`dispensary-category ${hasPageBreak ? "page-break-before" : ""}`}
            >
              {/* Repeat header after page break if enabled */}
              {repeatHeader && hasPageBreak && renderHeader(true)}
              {/* Category Header */}
              <div className="dispensary-category-header">
                <span className="dispensary-category-line" style={{ background: primaryColor }}></span>
                <span className="dispensary-category-dot" style={{ color: primaryColor }}>•</span>
                <h2 className="dispensary-category-title" style={{ color: primaryColor }}>
                  {category.toUpperCase()}{itemChunks.length > 1 ? ` (${chunkIndex + 1}/${itemChunks.length})` : ""}
                </h2>
                <span className="dispensary-category-dot" style={{ color: primaryColor }}>•</span>
                <span className="dispensary-category-line" style={{ background: primaryColor }}></span>
              </div>

              {/* Items */}
              <div className="dispensary-items">
                {chunkItems.map((item) => (
                  <div key={item.id} className="dispensary-item">
                    {onItemDelete && (
                      <button
                        onClick={() => onItemDelete(item.id)}
                        className="dispensary-item-delete no-print"
                        title="Remove item"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <div className="dispensary-item-main">
                      <div className="dispensary-item-info">
                        <EditableField
                          as="h3"
                          className="dispensary-item-name"
                          value={cleanProductName(item.name, item.brand)}
                          itemId={item.id}
                          field="name"
                          onUpdate={onItemUpdate}
                        />
                        <div className="dispensary-item-meta">
                          {item.strain && (
                            <EditableField
                              className="dispensary-strain"
                              style={{ color: getStrainColor(item.strain), fontWeight: 600 }}
                              value={item.strain}
                              itemId={item.id}
                              field="strain"
                              onUpdate={onItemUpdate}
                            />
                          )}
                          {item.thc && (
                            <EditableField
                              className="dispensary-thc"
                              value={item.thc}
                              itemId={item.id}
                              field="thc"
                              onUpdate={onItemUpdate}
                              prefix="THC "
                            />
                          )}
                          {item.cbd && (
                            <EditableField
                              className="dispensary-cbd"
                              value={item.cbd}
                              itemId={item.id}
                              field="cbd"
                              onUpdate={onItemUpdate}
                              prefix="CBD "
                            />
                          )}
                        </div>
                      </div>
                      <div className="dispensary-item-price">
                        <EditableField
                          className="dispensary-price"
                          style={{ color: primaryColor }}
                          value={item.price.toFixed(2)}
                          itemId={item.id}
                          field="price"
                          onUpdate={onItemUpdate}
                          prefix="$"
                        />
                        {item.weight && (
                          <EditableField
                            className="dispensary-weight"
                            value={item.weight}
                            itemId={item.id}
                            field="weight"
                            onUpdate={onItemUpdate}
                            prefix=" / "
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
          });
        })}

        {/* Decorative Wave */}
        <div className="dispensary-wave">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" style={{ fill: primaryColor }}>
            <path d="M0,30 Q300,60 600,30 T1200,30 L1200,60 L0,60 Z" />
          </svg>
        </div>

        {/* Footer with Notes */}
        <footer className="dispensary-footer">
          <div className="dispensary-footer-notes no-print-hidden">
            <h4 className="dispensary-notes-title" style={{ color: primaryColor }}>Discounts & Notes</h4>
            <div className="dispensary-notes-list">
              {footerNotes.map((note, index) => (
                <div key={index} className="dispensary-note-item">
                  <span className="dispensary-note-bullet" style={{ color: primaryColor }}>★</span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => {
                      const newNotes = [...footerNotes];
                      newNotes[index] = e.target.value;
                      setFooterNotes(newNotes);
                    }}
                    className="dispensary-note-input"
                    placeholder="Add note..."
                  />
                  <button
                    onClick={() => setFooterNotes(footerNotes.filter((_, i) => i !== index))}
                    className="dispensary-note-remove no-print"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => setFooterNotes([...footerNotes, ""])}
                className="dispensary-add-note no-print"
                style={{ color: primaryColor }}
              >
                + Add Note
              </button>
            </div>
          </div>
          <div className="dispensary-footer-info">
            <p>Tax not included • ID required • 21+</p>
            <p className="dispensary-date">{new Date().toLocaleDateString()}</p>
          </div>
        </footer>
      </div>
    </article>
  );
}
