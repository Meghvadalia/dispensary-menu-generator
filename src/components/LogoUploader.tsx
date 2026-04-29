import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface LogoUploaderProps {
  onLogoChange: (logo: string | null, colors: string[]) => void;
  onStoreNameChange: (name: string) => void;
  storeName: string;
  isDark?: boolean;
}

function hexToHslString(hex: string): string {
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length !== 6) return "hsl(var(--muted))";

  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  return `hsl(${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

// Extract dominant colors from image
function extractColorsFromImage(img: HTMLImageElement): Promise<string[]> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(["#2d5016", "#1a3009", "#4a7c23"]); // fallback
      return;
    }

    const size = 100;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const pixels = imageData.data;

    // Simple color frequency analysis
    const colorCounts: Record<string, number> = {};

    for (let i = 0; i < pixels.length; i += 4) {
      const r = Math.round(pixels[i] / 32) * 32;
      const g = Math.round(pixels[i + 1] / 32) * 32;
      const b = Math.round(pixels[i + 2] / 32) * 32;
      const a = pixels[i + 3];

      // Skip transparent/white/black pixels
      if (a < 128) continue;
      if (r > 240 && g > 240 && b > 240) continue;
      if (r < 15 && g < 15 && b < 15) continue;

      const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }

    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([color]) => color);

    if (sortedColors.length === 0) {
      resolve(["#2d5016", "#1a3009", "#4a7c23"]);
    } else if (sortedColors.length === 1) {
      resolve([sortedColors[0], darkenColor(sortedColors[0]), lightenColor(sortedColors[0])]);
    } else if (sortedColors.length === 2) {
      resolve([sortedColors[0], sortedColors[1], darkenColor(sortedColors[0])]);
    } else {
      resolve(sortedColors);
    }
  });
}

function darkenColor(hex: string): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (num >> 16) - 40);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - 40);
  const b = Math.max(0, (num & 0x0000ff) - 40);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}

function lightenColor(hex: string): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + 60);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + 60);
  const b = Math.min(255, (num & 0x0000ff) + 60);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}

export function LogoUploader({ onLogoChange, onStoreNameChange, storeName, isDark = false }: LogoUploaderProps) {
  const [logo, setLogo] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setLogo(dataUrl);

      // Extract colors from image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        const extractedColors = await extractColorsFromImage(img);
        setColors(extractedColors);
        onLogoChange(dataUrl, extractedColors);
        toast.success("Logo uploaded! Colors extracted for your menu.");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogo(null);
    setColors([]);
    onLogoChange(null, []);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`rounded-[15px] p-6 md:p-8 border ${isDark ? "bg-[#111] border-[#222]" : "bg-white border-gray-300"}`}>
      <div className="mb-6">
        <h3 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Customize Your Menu</h3>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Add your logo and store name for a personalized menu</p>
      </div>

      <div className="space-y-6">
        {/* Store Name Input */}
        <div className="space-y-2">
          <label htmlFor="storeName" className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Store Name
          </label>
          <input
            id="storeName"
            placeholder="Your Dispensary Name"
            value={storeName}
            onChange={(e) => onStoreNameChange(e.target.value)}
            className={`w-full px-4 py-3 rounded-lg text-lg border transition-colors ${
              isDark 
                ? "bg-[#1a1a1a] border-[#333] text-white placeholder-gray-500 focus:border-gray-500" 
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500"
            } focus:outline-none`}
          />
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <label className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Store Logo (optional)</label>
          {logo ? (
            <div className="relative">
              <div className={`flex items-center gap-4 p-4 border rounded-xl ${isDark ? "border-[#333] bg-[rgba(255,255,255,0.04)]" : "border-gray-300 bg-gray-50"}`}>
                <img src={logo} alt="Store logo" className="w-20 h-20 object-contain rounded-lg bg-white p-2" />
                <div className="flex-1">
                  <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>Logo uploaded</p>
                  {colors.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Extracted colors:</span>
                      <div className="flex gap-1">
                        {colors.map((color, i) => (
                          <div
                            key={i}
                            className={`w-5 h-5 rounded-full border ${isDark ? "border-[#444]" : "border-gray-300"}`}
                            style={{ backgroundColor: hexToHslString(color) }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={removeLogo}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-[rgba(255,255,255,0.1)] text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-500 hover:text-gray-700"}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDark 
                  ? "border-[#333] hover:border-[#555] hover:bg-[rgba(255,255,255,0.04)]" 
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              <Upload className={`w-10 h-10 mx-auto mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Click to upload your logo
              </p>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                Colors will be extracted to theme your menu
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
