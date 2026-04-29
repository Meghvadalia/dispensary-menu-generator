import { Check } from "lucide-react";

interface POSSelectorProps {
  selected: string;
  onSelect: (pos: string) => void;
  isDark?: boolean;
}

const posOptions = [
  {
    id: "dutchie",
    name: "Dutchie",
    description: "Cannabis retail POS system",
    logoUrl: "https://virtualbudz.com/lovable-uploads/babaf2f9-8c6e-45f7-b635-2020d1825638.png",
    available: true,
  },
  {
    id: "flowhub",
    name: "Flowhub",
    description: "Coming soon",
    logoUrl: "https://virtualbudz.com/lovable-uploads/60bd35a3-9aa5-485b-a0bd-44bac5265bc5.png",
    available: false,
  },
  {
    id: "treez",
    name: "Treez",
    description: "Coming soon",
    logoUrl: "https://virtualbudz.com/lovable-uploads/9ca242ff-499b-45df-9e34-b51203a9525f.png",
    available: false,
  },
];

export function POSSelector({ selected, onSelect, isDark = false }: POSSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {posOptions.map((pos) => (
        <div
          key={pos.id}
          className={`
            relative rounded-xl p-6 transition-all duration-300 cursor-pointer
            ${pos.available
              ? isDark 
                ? "bg-[#111] border border-[#333] hover:bg-[#1a1a1a] hover:border-[#444]"
                : "bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              : isDark
                ? "bg-[#0a0a0a] border border-[#222] opacity-50 cursor-not-allowed"
                : "bg-gray-50 border border-gray-200 opacity-50 cursor-not-allowed"
            }
            ${selected === pos.id 
              ? "animated-gradient-border ring-0" 
              : ""}
          `}
          onClick={() => pos.available && onSelect(pos.id)}
        >
          {selected === pos.id && (
            <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center ${isDark ? "bg-gray-600" : "bg-gray-700"}`}>
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
          <img 
            src={pos.logoUrl} 
            alt={`${pos.name} logo`} 
            className="h-12 w-auto object-contain mb-3 grayscale brightness-75" 
          />
          <h3 className={`font-display text-xl font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
            {pos.name}
          </h3>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{pos.description}</p>
          {!pos.available && (
            <span className={`inline-block mt-3 px-2 py-1 text-xs font-medium rounded ${isDark ? "bg-[#222] text-gray-500" : "bg-gray-200 text-gray-500"}`}>
              Coming Soon
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
