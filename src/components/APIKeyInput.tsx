import { useState } from "react";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface APIKeyInputProps {
  onAuthenticated: (authCode: string) => void;
  posName: string;
  isDark?: boolean;
}

export function APIKeyInput({ onAuthenticated, posName, isDark = false }: APIKeyInputProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAuthenticate = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your API key");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/dutchie/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || `Request failed with status ${response.status}`);
      }

      if (data?.authCode) {
        setIsAuthenticated(true);
        toast.success("Successfully authenticated with Dutchie!");
        onAuthenticated(data.authCode);
      } else {
        throw new Error("No auth code received");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Failed to authenticate. Please check your API key.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`rounded-[15px] p-6 md:p-8 border ${isDark ? "bg-[#111] border-[#222]" : "bg-white border-gray-300"}`}>
      <div className="mb-6">
        <h3 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Connect to {posName}</h3>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Enter your API key to connect</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="apiKey" className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            API Key
          </label>
          <div className="relative">
            <input
              id="apiKey"
              type={showKey ? "text" : "password"}
              placeholder="Enter your Dutchie API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                isDark 
                  ? "bg-[#1a1a1a] border-[#333] text-white placeholder-gray-500 focus:border-gray-500" 
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500"
              } focus:outline-none pr-12`}
              disabled={isAuthenticated}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-700"}`}
            >
              {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            Your API key is never stored. It is used only to connect your account to Dutchie and fetch your menu data.
          </p>
        </div>

        <button
          onClick={handleAuthenticate}
          disabled={isLoading || isAuthenticated || !apiKey.trim()}
          className={`
            w-full h-12 rounded-md font-medium text-sm transition-all duration-300
            flex items-center justify-center gap-2 border
            ${isAuthenticated
              ? isDark 
                ? "bg-[#222] text-gray-400 border-[#333] cursor-not-allowed"
                : "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
              : isLoading || !apiKey.trim()
                ? isDark
                  ? "bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed"
                  : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                : isDark
                  ? "bg-white text-black border-white hover:bg-black hover:text-white hover:border-white"
                  : "bg-gray-900 text-white border-gray-900 hover:bg-white hover:text-gray-900 hover:border-gray-900"
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Authenticating...
            </>
          ) : isAuthenticated ? (
            <>
              <Check className="w-5 h-5" />
              Connected
            </>
          ) : (
            "Connect"
          )}
        </button>
      </div>
    </div>
  );
}
