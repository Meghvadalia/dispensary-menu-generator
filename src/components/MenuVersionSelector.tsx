import { Check, List, LayoutGrid, Leaf, Rows, CheckCircle } from "lucide-react";

export type MenuVersion = "slim" | "slim-rows" | "catalog" | "catalog-fixed" | "dispensary";

const menuVersions: { id: MenuVersion; name: string; description: string; icon: JSX.Element; badge?: string }[] = [
  { id: "dispensary" as const, name: "Dispensary", description: "Creative cannabis menu style", icon: <Leaf className="w-6 h-6" /> },
  { id: "slim" as const, name: "Slim", description: "Column-flow list format", icon: <List className="w-6 h-6" /> },
  { id: "slim-rows" as const, name: "Slim Rows", description: "Row-by-row grid format", icon: <Rows className="w-6 h-6" />, badge: "Most Used" },
  { id: "catalog" as const, name: "Catalog", description: "Full-width category pages", icon: <LayoutGrid className="w-6 h-6" /> },
  { id: "catalog-fixed" as const, name: "Catalog Fixed", description: "Catalog with print fix", icon: <CheckCircle className="w-6 h-6" /> },
];

interface Props { selected: MenuVersion; onSelect: (v: MenuVersion) => void; isDark?: boolean; }

export function MenuVersionSelector({ selected, onSelect, isDark = false }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {menuVersions.map((v) => (
        <div
          key={v.id}
          className={`
            relative cursor-pointer transition-all rounded-[10px] p-4 text-center border
            ${selected === v.id
              ? isDark
                ? "bg-[rgba(255,255,255,0.08)] border-white"
                : "bg-gray-100 border-gray-900"
              : isDark
                ? "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]"
                : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
            }
          `}
          onClick={() => onSelect(v.id)}
        >
          {v.badge && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
              {v.badge}
            </span>
          )}
          <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
            selected === v.id
              ? isDark ? "bg-gray-600 text-white" : "bg-gray-800 text-white"
              : isDark ? "bg-[#222] text-white" : "bg-gray-100 text-gray-700"
          }`}>
            {selected === v.id ? <Check className="w-6 h-6" /> : v.icon}
          </div>
          <h3 className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{v.name}</h3>
          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{v.description}</p>
        </div>
      ))}
    </div>
  );
}
