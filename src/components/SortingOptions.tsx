import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export type SortField = "name" | "brand" | "price" | "thc";
export type SortDirection = "asc" | "desc";

export interface SortCriterion {
  field: SortField;
  direction: SortDirection;
}

interface SortingOptionsProps {
  sortCriteria: SortCriterion[];
  onSortCriteriaChange: (criteria: SortCriterion[]) => void;
  isDark?: boolean;
}

const sortFields: { id: SortField; label: string }[] = [
  { id: "name", label: "Product Name" },
  { id: "brand", label: "Brand" },
  { id: "price", label: "Price" },
  { id: "thc", label: "THC" },
];

export function SortingOptions({
  sortCriteria,
  onSortCriteriaChange,
  isDark = false,
}: SortingOptionsProps) {

  const getFieldState = (field: SortField): { active: boolean; direction: SortDirection | null; priority: number | null } => {
    const index = sortCriteria.findIndex(c => c.field === field);
    if (index === -1) {
      return { active: false, direction: null, priority: null };
    }
    return { active: true, direction: sortCriteria[index].direction, priority: index + 1 };
  };

  const handleFieldClick = (field: SortField) => {
    const state = getFieldState(field);

    if (!state.active) {
      // Not active → Add as ascending
      onSortCriteriaChange([...sortCriteria, { field, direction: "asc" }]);
    } else if (state.direction === "asc") {
      // Ascending → Change to descending
      onSortCriteriaChange(
        sortCriteria.map(c => c.field === field ? { ...c, direction: "desc" as SortDirection } : c)
      );
    } else {
      // Descending → Remove from sort
      onSortCriteriaChange(sortCriteria.filter(c => c.field !== field));
    }
  };

  const clearAllSorting = () => {
    onSortCriteriaChange([]);
  };

  const getSortDescription = (): string => {
    if (sortCriteria.length === 0) return "";

    return sortCriteria.map(c => {
      const fieldLabel = sortFields.find(f => f.id === c.field)?.label || c.field;
      const dirLabel = c.field === "price" || c.field === "thc"
        ? (c.direction === "asc" ? "Low→High" : "High→Low")
        : (c.direction === "asc" ? "A→Z" : "Z→A");
      return `${fieldLabel} (${dirLabel})`;
    }).join(", then ");
  };

  return (
    <div className={`no-print border rounded-lg p-4 ${isDark ? "border-[#333] bg-[#111]" : "border-gray-300 bg-white"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ArrowUpDown className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
          <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Sort Menu Items</span>
          <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>(click to cycle: off → ↑ → ↓)</span>
        </div>
        {sortCriteria.length > 0 && (
          <button
            onClick={clearAllSorting}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              isDark
                ? "text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)]"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {sortFields.map((option) => {
          const state = getFieldState(option.id);

          return (
            <button
              key={option.id}
              onClick={() => handleFieldClick(option.id)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-all flex items-center gap-1.5 ${
                state.active
                  ? isDark
                    ? "bg-white text-black border-white"
                    : "bg-gray-900 text-white border-gray-900"
                  : isDark
                    ? "bg-transparent text-gray-400 border-[#333] hover:border-gray-500 hover:text-white"
                    : "bg-transparent text-gray-600 border-gray-300 hover:border-gray-400 hover:text-gray-900"
              }`}
            >
              {state.active && (
                <span className={`text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center ${
                  isDark ? "bg-black text-white" : "bg-white text-gray-900"
                }`}>
                  {state.priority}
                </span>
              )}
              <span>{option.label}</span>
              {state.active && (
                state.direction === "asc"
                  ? <ArrowUp className="w-3.5 h-3.5" />
                  : <ArrowDown className="w-3.5 h-3.5" />
              )}
            </button>
          );
        })}
      </div>

      {sortCriteria.length > 0 && (
        <p className={`text-xs mt-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          Sorting: {getSortDescription()}
        </p>
      )}
    </div>
  );
}
