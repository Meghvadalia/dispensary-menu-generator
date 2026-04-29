import { useState } from "react";
import { Lightbulb, Sparkles, ExternalLink, X } from "lucide-react";

interface FeatureInfoProps {
  isDark?: boolean;
}

export function FeatureInfo({ isDark = false }: FeatureInfoProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={`no-print border rounded-lg p-2.5 text-xs ${isDark ? "border-[#333] bg-[#111]" : "border-gray-300 bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {/* Upcoming Features */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className={`w-3 h-3 ${isDark ? "text-yellow-400" : "text-yellow-500"}`} />
            <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Upcoming Features</span>
          </div>

          <ul className={`ml-4 list-disc space-y-0.5 mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            <li>User-wise settings saved to your account</li>
            <li>Custom menu templates</li>
          </ul>

          {/* Request Feature */}
          <a
            href="https://www.dopecast.net/contact"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 hover:underline ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
          >
            <Lightbulb className="w-3 h-3" />
            <span>Request a Feature</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className={`p-0.5 rounded hover:bg-opacity-20 ${isDark ? "text-gray-500 hover:text-gray-300 hover:bg-gray-500" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"}`}
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
