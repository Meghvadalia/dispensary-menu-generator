import { useState, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { ChevronUp, ChevronDown, Trash2, GripVertical, FileText } from "lucide-react";

export interface CategorySettings {
  pageBreakAfter: boolean;
  itemsPerPage: number | null; // null = all items
}

interface CategoryManagerProps {
  categories: string[];
  visibleCategories: Set<string>;
  categorySettings: Record<string, CategorySettings>;
  itemCounts: Record<string, number>;
  onToggleCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  onReorderCategory: (category: string, direction: "up" | "down") => void;
  onReorderCategories?: (newOrder: string[]) => void;
  onUpdateCategorySettings: (category: string, settings: Partial<CategorySettings>) => void;
  isDark?: boolean;
}

const ITEMS_PER_PAGE_OPTIONS = [
  { value: null, label: "All" },
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 15, label: "15" },
  { value: 20, label: "20" },
  { value: 25, label: "25" },
];

export function CategoryManager({
  categories,
  visibleCategories,
  categorySettings,
  itemCounts,
  onToggleCategory,
  onDeleteCategory,
  onReorderCategory,
  onReorderCategories,
  onUpdateCategorySettings,
  isDark = false,
}: CategoryManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.currentTarget as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = "0.5";
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    const newOrder = [...categories];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);

    if (onReorderCategories) {
      onReorderCategories(newOrder);
    }

    handleDragEnd();
  };

  const getSettings = (category: string): CategorySettings => {
    return categorySettings[category] || { pageBreakAfter: false, itemsPerPage: null };
  };

  return (
    <div className={`no-print border rounded-lg ${isDark ? "border-[#333] bg-[#111]" : "border-gray-300 bg-white"}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-3 text-sm font-medium rounded-lg transition-colors ${
          isDark ? "text-white hover:bg-[rgba(255,255,255,0.05)]" : "text-gray-900 hover:bg-gray-50"
        }`}
      >
        <span>Manage Categories & Page Breaks ({visibleCategories.size} of {categories.length} visible)</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className={`border-t p-3 space-y-2 ${isDark ? "border-[#333]" : "border-gray-200"}`}>
          <p className={`text-xs mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            Toggle visibility, set items per page, add page breaks, drag to reorder.
          </p>
          {categories.map((category, index) => {
            const settings = getSettings(category);
            const itemCount = itemCounts[category] || 0;
            const isLastCategory = index === categories.length - 1;

            return (
              <div key={category}>
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex flex-col gap-2 p-3 rounded border transition-all ${
                    visibleCategories.has(category)
                      ? isDark ? "bg-[#1a1a1a] border-[#333]" : "bg-gray-50 border-gray-200"
                      : isDark ? "bg-[#0a0a0a] border-[#222] opacity-60" : "bg-gray-100 border-gray-200 opacity-60"
                  } ${dragOverIndex === index ? "border-gray-500 border-2" : ""} ${
                    draggedIndex === index ? "opacity-50" : ""
                  }`}
                >
                  {/* Top row: visibility, name, reorder, delete */}
                  <div className="flex items-center gap-3">
                    <GripVertical className={`w-4 h-4 cursor-grab active:cursor-grabbing ${isDark ? "text-gray-500" : "text-gray-400"}`} />

                    <Switch
                      checked={visibleCategories.has(category)}
                      onCheckedChange={() => onToggleCategory(category)}
                    />

                    <span className={`flex-1 text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      {category}
                      <span className={`ml-2 text-xs font-normal ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        ({itemCount} items)
                      </span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        className={`h-7 w-7 p-0 flex items-center justify-center rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                          isDark ? "hover:bg-[rgba(255,255,255,0.1)] text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                        }`}
                        onClick={() => onReorderCategory(category, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        className={`h-7 w-7 p-0 flex items-center justify-center rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                          isDark ? "hover:bg-[rgba(255,255,255,0.1)] text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                        }`}
                        onClick={() => onReorderCategory(category, "down")}
                        disabled={index === categories.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        className="h-7 w-7 p-0 flex items-center justify-center rounded text-red-400 hover:text-red-300 hover:bg-[rgba(255,0,0,0.1)] transition-colors"
                        onClick={() => onDeleteCategory(category)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom row: items per page + page break toggle */}
                  {visibleCategories.has(category) && (
                    <div className={`flex items-center gap-4 pl-7 pt-1 border-t ${isDark ? "border-[#333]" : "border-gray-200"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Per page:</span>
                        <select
                          value={settings.itemsPerPage ?? "all"}
                          onChange={(e) => {
                            const value = e.target.value === "all" ? null : Number(e.target.value);
                            onUpdateCategorySettings(category, { itemsPerPage: value });
                          }}
                          className={`text-xs px-2 py-1 rounded border ${
                            isDark
                              ? "bg-[#222] border-[#444] text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        >
                          {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                            <option key={opt.label} value={opt.value ?? "all"}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {!isLastCategory && (
                        <button
                          onClick={() => onUpdateCategorySettings(category, { pageBreakAfter: !settings.pageBreakAfter })}
                          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-all ${
                            settings.pageBreakAfter
                              ? isDark
                                ? "bg-blue-600 border-blue-500 text-white"
                                : "bg-blue-500 border-blue-400 text-white"
                              : isDark
                                ? "bg-transparent border-[#444] text-gray-400 hover:border-gray-500 hover:text-white"
                                : "bg-transparent border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          Page break after
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Page break indicator */}
                {settings.pageBreakAfter && !isLastCategory && visibleCategories.has(category) && (
                  <div className={`flex items-center gap-2 py-2 px-4 my-1 ${isDark ? "text-blue-400" : "text-blue-500"}`}>
                    <div className={`flex-1 border-t-2 border-dashed ${isDark ? "border-blue-500/50" : "border-blue-400/50"}`} />
                    <span className="text-xs font-medium">PAGE BREAK</span>
                    <div className={`flex-1 border-t-2 border-dashed ${isDark ? "border-blue-500/50" : "border-blue-400/50"}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
