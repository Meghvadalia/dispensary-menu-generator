import { useState } from "react";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import type { Connection, PosId } from "@/types/connection";

interface ConnectAccountProps {
  posId: PosId;
  posName: string;
  onConnected: (connection: Connection) => void;
  isDark?: boolean;
}

type ConnectFlow = "dutchie-auth" | "flowhub-location-picker";

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  secret: boolean;
}

const POS_CONFIG: Record<PosId, { flow: ConnectFlow; fields: FieldDef[] }> = {
  dutchie: {
    flow: "dutchie-auth",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "Enter your Dutchie API key", secret: true },
    ],
  },
  flowhub: {
    flow: "flowhub-location-picker",
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "Flowhub Client ID (UUID)", secret: false },
      { key: "apiKey", label: "API Key", placeholder: "Flowhub API Key (UUID)", secret: true },
    ],
  },
};

interface FlowhubLocation {
  locationId: string;
  locationName: string;
  address: { city: string | null; state: string | null };
}

type Stage = "entering-creds" | "picking-location" | "connected";

export function ConnectAccount({ posId, posName, onConnected, isDark = false }: ConnectAccountProps) {
  const config = POS_CONFIG[posId];

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(config.fields.map((f) => [f.key, ""])),
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("entering-creds");
  const [locations, setLocations] = useState<FlowhubLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const allFilled = config.fields.every((f) => values[f.key]?.trim());

  async function handleSubmit() {
    if (!allFilled) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      if (config.flow === "dutchie-auth") {
        const r = await fetch("/api/dutchie/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: values.apiKey.trim() }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data?.authCode) {
          throw new Error(data?.error || `Request failed (${r.status})`);
        }
        setStage("connected");
        toast.success(`Successfully authenticated with ${posName}!`);
        onConnected({ pos: "dutchie", authCode: data.authCode });
      } else if (config.flow === "flowhub-location-picker") {
        const r = await fetch("/api/flowhub/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: values.clientId.trim(),
            apiKey: values.apiKey.trim(),
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(data?.error || `Request failed (${r.status})`);
        }
        const list: FlowhubLocation[] = Array.isArray(data?.locations) ? data.locations : [];
        if (list.length === 0) {
          toast.error("No locations found for this client. Confirm your Client ID with Flowhub support.");
          return;
        }
        setLocations(list);
        setSelectedLocationId(list[0].locationId);
        setStage("picking-location");
      }
    } catch (err) {
      console.error("Connect error:", err);
      const msg =
        config.flow === "flowhub-location-picker"
          ? `Invalid ${posName} credentials. Check your Client ID and API Key.`
          : `Failed to authenticate. Please check your API key.`;
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function handleConfirmLocation() {
    const loc = locations.find((l) => l.locationId === selectedLocationId);
    if (!loc) {
      toast.error("Please pick a location");
      return;
    }
    setStage("connected");
    toast.success(`Connected to ${loc.locationName}.`);
    onConnected({
      pos: "flowhub",
      clientId: values.clientId.trim(),
      apiKey: values.apiKey.trim(),
      locationId: loc.locationId,
      locationName: loc.locationName,
    });
  }

  const containerCls = `rounded-[15px] p-6 md:p-8 border ${
    isDark ? "bg-[#111] border-[#222]" : "bg-white border-gray-300"
  }`;
  const labelCls = `block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`;
  const inputCls = `w-full px-4 py-3 rounded-lg border transition-colors ${
    isDark
      ? "bg-[#1a1a1a] border-[#333] text-white placeholder-gray-500 focus:border-gray-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500"
  } focus:outline-none`;
  const helperCls = `text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`;
  const buttonBase =
    "w-full h-12 rounded-md font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 border";
  const buttonEnabled = isDark
    ? "bg-white text-black border-white hover:bg-black hover:text-white hover:border-white"
    : "bg-gray-900 text-white border-gray-900 hover:bg-white hover:text-gray-900 hover:border-gray-900";
  const buttonDisabled = isDark
    ? "bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed"
    : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed";
  const buttonConnected = isDark
    ? "bg-[#222] text-gray-400 border-[#333] cursor-not-allowed"
    : "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed";

  if (stage === "connected") {
    return (
      <div className={containerCls}>
        <button disabled className={`${buttonBase} ${buttonConnected}`}>
          <Check className="w-5 h-5" /> Connected
        </button>
      </div>
    );
  }

  if (stage === "picking-location") {
    return (
      <div className={containerCls}>
        <div className="mb-6">
          <h3 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Choose your {posName} location
          </h3>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            We found {locations.length} location{locations.length === 1 ? "" : "s"} for this client.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="locationId" className={labelCls}>
              Location
            </label>
            <select
              id="locationId"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className={inputCls}
            >
              {locations.map((loc) => {
                const tail = [loc.address?.city, loc.address?.state].filter(Boolean).join(", ");
                return (
                  <option key={loc.locationId} value={loc.locationId}>
                    {loc.locationName}{tail ? ` — ${tail}` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={handleConfirmLocation}
            className={`${buttonBase} ${buttonEnabled}`}
          >
            Use this location
          </button>
        </div>
      </div>
    );
  }

  // stage === 'entering-creds'
  return (
    <div className={containerCls}>
      <div className="mb-6">
        <h3 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
          Connect to {posName}
        </h3>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {config.fields.length === 1
            ? "Enter your API key to connect"
            : "Enter your credentials to connect"}
        </p>
      </div>

      <div className="space-y-4">
        {config.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <label htmlFor={field.key} className={labelCls}>
              {field.label}
            </label>
            <div className="relative">
              <input
                id={field.key}
                type={field.secret && !revealed[field.key] ? "password" : "text"}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className={`${inputCls} ${field.secret ? "pr-12" : ""}`}
              />
              {field.secret && (
                <button
                  type="button"
                  onClick={() => setRevealed((r) => ({ ...r, [field.key]: !r[field.key] }))}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  {revealed[field.key] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        ))}

        <p className={helperCls}>
          Your credentials are never stored. They are used only to connect your account to {posName} and fetch your menu data.
        </p>

        <button
          onClick={handleSubmit}
          disabled={isLoading || !allFilled}
          className={`${buttonBase} ${isLoading || !allFilled ? buttonDisabled : buttonEnabled}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {config.flow === "flowhub-location-picker" ? "Loading locations..." : "Authenticating..."}
            </>
          ) : (
            "Connect"
          )}
        </button>
      </div>
    </div>
  );
}
