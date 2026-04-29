import { FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface HeadingOptionsProps {
  repeatHeader: boolean;
  onRepeatHeaderChange: (repeat: boolean) => void;
  isDark?: boolean;
}

export function HeadingOptions({
  repeatHeader,
  onRepeatHeaderChange,
  isDark = false,
}: HeadingOptionsProps) {
  return (
    <div className={`no-print border rounded-lg p-4 ${isDark ? "border-[#333] bg-[#111]" : "border-gray-300 bg-white"}`}>
      <div className="flex items-center gap-2 mb-3">
        <FileText className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
        <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Manage Headings</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Repeat header on each page
          </p>
          <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            Show the menu header (logo & store name) after every page break (page breaks can be managed in Manage Categories & Page Breaks above)
          </p>
        </div>
        <Switch
          checked={repeatHeader}
          onCheckedChange={onRepeatHeaderChange}
        />
      </div>
    </div>
  );
}
