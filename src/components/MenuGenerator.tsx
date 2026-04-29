import { useState, useCallback, useMemo } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PrintableMenu } from "./PrintableMenu";
import { MenuVersionSelector, MenuVersion } from "./MenuVersionSelector";
import { SlimMenu, SlimRowsMenu, CatalogMenu, CatalogFixedMenu, DispensaryMenu } from "./menus";
import { CategoryManager, CategorySettings } from "./CategoryManager";
import { SortingOptions, SortCriterion } from "./SortingOptions";
import { HeadingOptions } from "./HeadingOptions";
import { FeatureInfo } from "./FeatureInfo";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  strain?: string;
  thc?: string;
  cbd?: string;
  price: number;
  weight?: string;
  description?: string;
}

interface MenuGeneratorProps {
  authCode: string;
  logo?: string | null;
  brandColors?: string[];
  storeName?: string;
  onAuthInvalid?: () => void;
  isDark?: boolean;
}

// Demo data for when API doesn't return data or for testing
const demoMenuData: MenuItem[] = [
  {
    id: "1",
    name: "Blue Dream",
    category: "Flower",
    brand: "Premium Gardens",
    strain: "Hybrid",
    thc: "22%",
    cbd: "0.1%",
    price: 45,
    weight: "3.5g",
    description: "Sweet berry aroma with calming effects",
  },
  {
    id: "2",
    name: "OG Kush",
    category: "Flower",
    brand: "Local Farms",
    strain: "Indica",
    thc: "24%",
    cbd: "0.2%",
    price: 50,
    weight: "3.5g",
    description: "Classic earthy pine with powerful relaxation",
  },
  {
    id: "3",
    name: "Sour Diesel",
    category: "Flower",
    brand: "Premium Gardens",
    strain: "Sativa",
    thc: "20%",
    cbd: "0.1%",
    price: 42,
    weight: "3.5g",
    description: "Energizing diesel aroma for daytime use",
  },
  {
    id: "4",
    name: "Girl Scout Cookies",
    category: "Flower",
    brand: "Artisan Collective",
    strain: "Hybrid",
    thc: "25%",
    cbd: "0.3%",
    price: 55,
    weight: "3.5g",
    description: "Sweet and earthy with euphoric effects",
  },
  {
    id: "5",
    name: "Gelato Live Resin",
    category: "Concentrates",
    brand: "Extract Labs",
    strain: "Hybrid",
    thc: "78%",
    cbd: "0.5%",
    price: 65,
    weight: "1g",
    description: "Full spectrum live resin with dessert notes",
  },
  {
    id: "6",
    name: "Shatter - Jack Herer",
    category: "Concentrates",
    brand: "Pure Extracts",
    strain: "Sativa",
    thc: "82%",
    cbd: "0.2%",
    price: 45,
    weight: "1g",
    description: "Clean glass-like extract for precise dosing",
  },
  {
    id: "7",
    name: "Indica Gummies",
    category: "Edibles",
    brand: "Sweet Relief",
    thc: "10mg",
    cbd: "0mg",
    price: 25,
    weight: "10pk",
    description: "Relaxing nighttime gummies with berry flavor",
  },
  {
    id: "8",
    name: "Sativa Chocolates",
    category: "Edibles",
    brand: "Canna Confections",
    thc: "5mg",
    cbd: "5mg",
    price: 18,
    weight: "6pk",
    description: "Balanced chocolate squares for microdosing",
  },
  {
    id: "9",
    name: "1:1 Tincture",
    category: "Tinctures",
    brand: "Wellness Co",
    thc: "500mg",
    cbd: "500mg",
    price: 60,
    weight: "30ml",
    description: "Balanced formula for therapeutic use",
  },
  {
    id: "10",
    name: "Relief Balm",
    category: "Topicals",
    brand: "Body Care",
    thc: "100mg",
    cbd: "200mg",
    price: 35,
    weight: "2oz",
    description: "Soothing topical for localized relief",
  },
  {
    id: "11",
    name: "Disposable Vape - Mango",
    category: "Vapes",
    brand: "Cloud Nine",
    strain: "Sativa",
    thc: "85%",
    cbd: "0%",
    price: 40,
    weight: "0.5g",
    description: "Tropical mango flavor, ready to use",
  },
  {
    id: "12",
    name: "510 Cart - Northern Lights",
    category: "Vapes",
    brand: "Pure Vapor",
    strain: "Indica",
    thc: "90%",
    cbd: "0%",
    price: 55,
    weight: "1g",
    description: "Premium distillate with relaxing terpenes",
  },
];

export function MenuGenerator({
  authCode,
  logo,
  brandColors = [],
  storeName = "Cannabis Menu",
  onAuthInvalid,
  isDark = false,
}: MenuGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [menuData, setMenuData] = useState<MenuItem[] | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Persisted preferences
  const [selectedVersion, setSelectedVersion] = useLocalStorage<MenuVersion>("style", "slim-rows");
  const [categoryOrder, setCategoryOrder] = useLocalStorage<string[]>("category-order", []);
  const [visibleCategories, setVisibleCategories] = useLocalStorage<Set<string>>("visible-categories", new Set());
  const [categorySettings, setCategorySettings] = useLocalStorage<Record<string, CategorySettings>>(
    "category-settings",
    {},
  );
  const [sortCriteria, setSortCriteria] = useLocalStorage<SortCriterion[]>("sort-criteria", []);
  const [repeatHeader, setRepeatHeader] = useLocalStorage<boolean>("repeat-header", false);

  // Get unique categories from menu data
  const allCategories = useMemo(() => {
    if (!menuData) return [];
    const cats = new Set(menuData.map((item) => item.category));
    // If we have a custom order, use it; otherwise use the natural order
    if (categoryOrder.length > 0) {
      return categoryOrder.filter((cat) => cats.has(cat));
    }
    return Array.from(cats);
  }, [menuData, categoryOrder]);

  // Calculate item counts per category
  const itemCounts = useMemo(() => {
    if (!menuData) return {};
    const counts: Record<string, number> = {};
    menuData.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [menuData]);

  // Filter items based on visible categories
  const filteredMenuData = useMemo(() => {
    if (!menuData) return null;
    if (visibleCategories.size === 0) return menuData;
    return menuData.filter((item) => visibleCategories.has(item.category));
  }, [menuData, visibleCategories]);

  // Sort filtered items with multi-criteria sorting
  const sortedMenuData = useMemo(() => {
    if (!filteredMenuData || sortCriteria.length === 0) return filteredMenuData;

    const parseThcValue = (thc: string | undefined): number => {
      if (!thc) return 0;
      const match = thc.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
    };

    return [...filteredMenuData].sort((a, b) => {
      for (const criterion of sortCriteria) {
        let comparison = 0;

        switch (criterion.field) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "brand":
            comparison = (a.brand || "").localeCompare(b.brand || "");
            break;
          case "price":
            comparison = a.price - b.price;
            break;
          case "thc":
            comparison = parseThcValue(a.thc) - parseThcValue(b.thc);
            break;
        }

        if (comparison !== 0) {
          return criterion.direction === "asc" ? comparison : -comparison;
        }
      }
      return 0;
    });
  }, [filteredMenuData, sortCriteria]);

  const fetchMenuData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dutchie/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authCode }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Invalid API key. Please reconnect with a valid Dutchie key.");
          onAuthInvalid?.();
          return;
        }

        console.error("Menu fetch error:", data);
        setErrorMessage("Could not load your inventory. Please try again.");
        toast.error("Failed to load inventory.");
        return;
      }

      if (!data?.menu || !Array.isArray(data.menu)) {
        setErrorMessage("No inventory returned.");
        toast.error("No inventory returned.");
        return;
      }

      const items: MenuItem[] = data.menu.map((item: any) => {
        let thcValue = "";
        let cbdValue = "";
        if (item.labResults && Array.isArray(item.labResults)) {
          const thcResult = item.labResults.find((r: any) => r.labTest === "THC");
          const cbdResult = item.labResults.find((r: any) => r.labTest === "CBD");
          if (thcResult) {
            thcValue = thcResult.labResultUnit === "Milligrams" ? `${thcResult.value}mg` : `${thcResult.value}%`;
          }
          if (cbdResult) {
            cbdValue = cbdResult.labResultUnit === "Milligrams" ? `${cbdResult.value}mg` : `${cbdResult.value}%`;
          }
        }

        const strainType = item.strainType || (item.strain !== "No Strain" ? item.strain : undefined);

        return {
          id: String(item.inventoryId || item.productId),
          name: item.productName || "Unknown Product",
          category: item.category || item.masterCategory || "Other",
          brand: item.brandName || item.vendor,
          strain: strainType,
          thc: thcValue,
          cbd: cbdValue,
          price: item.unitPrice || item.recUnitPrice || 0,
          weight: item.unitWeight ? `${item.unitWeight}${item.unitWeightUnit || "g"}` : undefined,
          description: item.description,
        };
      });

      // Merge saved preferences with fresh categories
      const freshCategories = Array.from(new Set(items.map((item) => item.category)));

      setCategoryOrder((savedOrder) => {
        if (savedOrder.length === 0) return freshCategories;
        // Keep saved order for categories that still exist, append new ones
        const kept = savedOrder.filter((cat) => freshCategories.includes(cat));
        const newOnes = freshCategories.filter((cat) => !savedOrder.includes(cat));
        return [...kept, ...newOnes];
      });

      setVisibleCategories((savedVisible) => {
        if (savedVisible.size === 0) return new Set(freshCategories);
        // Keep saved visibility, add new categories as visible by default
        const result = new Set<string>();
        const savedOrder = JSON.parse(localStorage.getItem("menu-master:category-order") || "[]") as string[];
        freshCategories.forEach((cat) => {
          const isNewCategory = !savedOrder.includes(cat);
          if (savedVisible.has(cat) || isNewCategory) {
            result.add(cat);
          }
        });
        return result;
      });

      setMenuData(items);
      setShowMenu(true);
      toast.success("Menu loaded.");
    } catch (error) {
      console.error("Error fetching menu:", error);
      setErrorMessage("Could not load your inventory. Please try again.");
      toast.error("Failed to load inventory.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.success("Preparing PDF download...");
    window.print();
  };

  const handleItemUpdate = useCallback((id: string, field: keyof MenuItem, value: string | number) => {
    setMenuData((prevData) => {
      if (!prevData) return prevData;
      return prevData.map((item) => (item.id === id ? { ...item, [field]: value } : item));
    });
  }, []);

  const handleItemDelete = useCallback((id: string) => {
    setMenuData((prevData) => {
      if (!prevData) return prevData;
      return prevData.filter((item) => item.id !== id);
    });
    toast.success("Item removed from menu");
  }, []);

  const handleToggleCategory = useCallback((category: string) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleDeleteCategory = useCallback((category: string) => {
    setMenuData((prevData) => {
      if (!prevData) return prevData;
      return prevData.filter((item) => item.category !== category);
    });
    setCategoryOrder((prev) => prev.filter((c) => c !== category));
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      next.delete(category);
      return next;
    });
    toast.success(`"${category}" category removed`);
  }, []);

  const handleReorderCategory = useCallback((category: string, direction: "up" | "down") => {
    setCategoryOrder((prev) => {
      const index = prev.indexOf(category);
      if (index === -1) return prev;
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }, []);

  const handleReorderCategories = useCallback((newOrder: string[]) => {
    setCategoryOrder(newOrder);
  }, []);

  const handleUpdateCategorySettings = useCallback((category: string, settings: Partial<CategorySettings>) => {
    setCategorySettings((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || { pageBreakAfter: false, itemsPerPage: null }),
        ...settings,
      },
    }));
  }, []);

  if (showMenu && menuData && sortedMenuData) {
    return (
      <div className="space-y-4">
        <div className="no-print mb-4">
          <h3 className={`text-sm font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>Select Menu Style</h3>
          <MenuVersionSelector selected={selectedVersion} onSelect={setSelectedVersion} isDark={isDark} />
        </div>
        <div className="flex flex-wrap gap-4 no-print">
          <button
            onClick={handlePrint}
            className={`h-10 px-4 rounded-md font-medium text-sm flex items-center gap-2 border transition-all ${
              isDark
                ? "bg-white text-black border-white hover:bg-black hover:text-white"
                : "bg-gray-900 text-white border-gray-900 hover:bg-white hover:text-gray-900"
            }`}
          >
            Print Menu
          </button>
          <button
            onClick={handleDownload}
            className={`h-10 px-4 rounded-md font-medium text-sm flex items-center gap-2 border transition-all ${
              isDark
                ? "border-[#333] text-white hover:bg-white hover:text-black hover:border-white"
                : "border-gray-300 text-gray-900 hover:bg-gray-900 hover:text-white hover:border-gray-900"
            }`}
          >
            <Download className="w-4 h-4" />
            Save as PDF
          </button>
          <button
            onClick={() => setShowMenu(false)}
            className={`h-10 px-4 rounded-md font-medium text-sm transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
          >
            Back to Generator
          </button>
        </div>

        <CategoryManager
          categories={categoryOrder}
          visibleCategories={visibleCategories}
          categorySettings={categorySettings}
          itemCounts={itemCounts}
          onToggleCategory={handleToggleCategory}
          onDeleteCategory={handleDeleteCategory}
          onReorderCategory={handleReorderCategory}
          onReorderCategories={handleReorderCategories}
          onUpdateCategorySettings={handleUpdateCategorySettings}
          isDark={isDark}
        />

        <SortingOptions sortCriteria={sortCriteria} onSortCriteriaChange={setSortCriteria} isDark={isDark} />

        <HeadingOptions repeatHeader={repeatHeader} onRepeatHeaderChange={setRepeatHeader} isDark={isDark} />

        <div
          className={`no-print flex items-center gap-2 p-3 rounded-lg text-sm ${isDark ? "bg-[rgba(100,100,100,0.15)] border border-[rgba(100,100,100,0.3)] text-gray-300" : "bg-gray-100 border border-gray-200 text-gray-600"}`}
        >
          <span>Click on any text to edit. Hover over items and click the X to delete.</span>
        </div>

        {(() => {
          const props = {
            items: sortedMenuData,
            storeName,
            logo,
            brandColors,
            onItemUpdate: handleItemUpdate,
            onItemDelete: handleItemDelete,
            categoryOrder: categoryOrder.filter((c) => visibleCategories.has(c)),
            categorySettings,
            repeatHeader,
          };
          switch (selectedVersion) {
            case "dispensary":
              return <DispensaryMenu {...props} />;
            case "slim":
              return <SlimMenu {...props} />;
            case "slim-rows":
              return <SlimRowsMenu {...props} />;
            case "catalog":
              return <CatalogMenu {...props} />;
            case "catalog-fixed":
              return <CatalogFixedMenu {...props} />;
            default:
              return <DispensaryMenu {...props} />;
          }
        })()}
      </div>
    );
  }

  return (
    <div
      className={`rounded-[15px] p-6 md:p-8 border ${isDark ? "bg-[#111] border-[#222]" : "bg-white border-gray-300"}`}
    >
      <div className="text-center">
        <h3 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Generate Your Menu</h3>
        <p className={`text-base max-w-md mx-auto ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Create a beautiful, printable menu from your Dutchie inventory
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 mt-8">
        {errorMessage && (
          <div
            className={`w-full rounded-xl border p-4 text-sm ${isDark ? "border-[#333] bg-[rgba(255,255,255,0.04)] text-gray-300" : "border-gray-300 bg-gray-50 text-gray-600"}`}
          >
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="space-y-2">
            <div
              className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center ${isDark ? "bg-[#222]" : "bg-gray-100"}`}
            >
              <span className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-700"}`}>4</span>
            </div>
            <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Menu Styles</p>
          </div>
          <div className="space-y-2">
            <div
              className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center ${isDark ? "bg-[#222]" : "bg-gray-100"}`}
            >
              <span className={`text-lg ${isDark ? "text-white" : "text-gray-700"}`}>🖨</span>
            </div>
            <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Print Ready</p>
          </div>
          <div className="space-y-2">
            <div
              className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center ${isDark ? "bg-[#222]" : "bg-gray-100"}`}
            >
              <Download className={`w-6 h-6 ${isDark ? "text-white" : "text-gray-700"}`} />
            </div>
            <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Download PDF</p>
          </div>
        </div>

        <FeatureInfo isDark={isDark} />

        <button
          onClick={fetchMenuData}
          disabled={isLoading}
          className={`
            h-14 px-8 text-lg font-medium rounded-md transition-all duration-300 border
            flex items-center justify-center gap-2
            ${
              isLoading
                ? isDark
                  ? "bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed"
                  : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                : isDark
                  ? "bg-white text-black border-white hover:bg-black hover:text-white"
                  : "bg-gray-900 text-white border-gray-900 hover:bg-white hover:text-gray-900"
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading inventory...
            </>
          ) : (
            "Generate Printable Menu"
          )}
        </button>

        <p className={`text-sm text-center max-w-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Exclusive April deal for 4/20: dispensary digital signage menu screens are $30/month per screen per store.
          Guaranteed price for life.{" "}
          <a
            href="https://www.dopecast.net/"
            target="_blank"
            rel="noopener noreferrer"
            className={`underline transition-colors ${isDark ? "text-white hover:text-gray-300" : "text-gray-900 hover:text-gray-600"}`}
          >
            Learn more
          </a>
        </p>
      </div>
    </div>
  );
}
