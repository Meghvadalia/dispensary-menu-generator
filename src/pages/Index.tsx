import { useState, useEffect } from "react";
import { POSSelector } from "@/components/POSSelector";
import { APIKeyInput } from "@/components/APIKeyInput";
import { MenuGenerator } from "@/components/MenuGenerator";
import { LogoUploader } from "@/components/LogoUploader";
import { ChevronRight, Check, Moon, Sun } from "lucide-react";
import dopecastLogoWhite from "@/assets/dopecast-logo-white.png";
import dopecastLogoGradient from "@/assets/dopecast-logo-gradient.png";

const Index = () => {
  const [selectedPOS, setSelectedPOS] = useState<string>("");
  const [authCode, setAuthCode] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const [logo, setLogo] = useState<string | null>(null);
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [storeName, setStoreName] = useState<string>("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  const handlePOSSelect = (pos: string) => {
    setSelectedPOS(pos);
    setCurrentStep(2);
  };

  const handleAuthenticated = (code: string) => {
    setAuthCode(code);
    setCurrentStep(3);
  };

  const handleLogoChange = (newLogo: string | null, colors: string[]) => {
    setLogo(newLogo);
    setBrandColors(colors);
  };

  const steps = [
    { number: 1, title: "Select POS", completed: selectedPOS !== "" },
    { number: 2, title: "Connect", completed: authCode !== "" },
    { number: 3, title: "Customize", completed: storeName !== "" },
    { number: 4, title: "Generate", completed: false },
  ];

  return (
    <div className={`min-h-screen transition-colors ${isDark ? "bg-black text-white" : "bg-white text-gray-900"}`}>
      {/* Header with Logo */}
      <header className={`no-print border-b ${isDark ? "border-[#222]" : "border-gray-200"}`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a
            href="https://www.dopecast.net/"
            className="h-10 flex items-center gap-3"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={isDark ? dopecastLogoWhite : dopecastLogoGradient} alt="DopeCast" className="h-8 w-auto" />
            <span className={`font-normal text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Menu Generator</span>
          </a>
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-lg border transition-colors ${isDark ? "bg-[#111] border-[#333] hover:bg-[#222]" : "bg-gray-100 border-gray-300 hover:bg-gray-200"}`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-gray-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="no-print py-16 md:py-24 relative overflow-hidden">
        {/* Gradient line accent */}
        <div className="absolute top-0 left-0 right-0 h-[3px] gradient-rainbow"></div>

        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Create Beautiful Menus
            <br />
            <span className={isDark ? "text-white" : "text-black"}>In Seconds</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Generate print-ready dispensary menus from your POS system. Professional designs, instant export, zero
            hassle.
          </p>

          {/* Progress Steps */}
          <div className="flex justify-center items-center gap-2 md:gap-4 mt-10 flex-wrap">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                    ${
                      currentStep === step.number
                        ? isDark
                          ? "bg-white text-black"
                          : "bg-gray-900 text-white"
                        : step.completed
                          ? isDark
                            ? "bg-[#222] text-white border border-[#333]"
                            : "bg-gray-200 text-gray-800 border border-gray-300"
                          : isDark
                            ? "bg-[#111] text-gray-500 border border-[#222]"
                            : "bg-gray-100 text-gray-400 border border-gray-200"
                    }
                  `}
                >
                  <span
                    className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold
                    ${
                      step.completed && currentStep !== step.number
                        ? isDark
                          ? "bg-gray-600"
                          : "bg-gray-700 text-white"
                        : ""
                    }
                  `}
                  >
                    {step.completed && currentStep !== step.number ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      step.number
                    )}
                  </span>
                  <span className="font-medium text-sm hidden sm:inline">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className={`w-5 h-5 mx-1 md:mx-2 ${isDark ? "text-[#333]" : "text-gray-300"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Step 1: POS Selection */}
          <section className="animate-fade-in no-print">
            <div className="flex items-center gap-3 mb-6">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${isDark ? "bg-gray-700 text-white" : "bg-gray-800 text-white"}`}
              >
                1
              </span>
              <h2 className="text-2xl font-semibold">Select Your POS System</h2>
            </div>
            <POSSelector selected={selectedPOS} onSelect={handlePOSSelect} isDark={isDark} />
          </section>

          {/* Step 2: API Key Input */}
          {selectedPOS && (
            <section className="animate-slide-up no-print">
              <div className="flex items-center gap-3 mb-6">
                <span
                  className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                  ${
                    authCode
                      ? isDark
                        ? "bg-gray-600 text-white"
                        : "bg-gray-700 text-white"
                      : isDark
                        ? "bg-[#222] text-gray-400 border border-[#333]"
                        : "bg-gray-200 text-gray-500 border border-gray-300"
                  }
                `}
                >
                  {authCode ? <Check className="w-4 h-4" /> : "2"}
                </span>
                <h2 className="text-2xl font-semibold">Connect Your Account</h2>
              </div>
              <APIKeyInput
                posName={selectedPOS.charAt(0).toUpperCase() + selectedPOS.slice(1)}
                onAuthenticated={handleAuthenticated}
                isDark={isDark}
              />
            </section>
          )}

          {/* Step 3: Logo & Store Name */}
          {authCode && (
            <section className="animate-slide-up no-print">
              <div className="flex items-center gap-3 mb-6">
                <span
                  className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                  ${
                    storeName
                      ? isDark
                        ? "bg-gray-600 text-white"
                        : "bg-gray-700 text-white"
                      : isDark
                        ? "bg-[#222] text-gray-400 border border-[#333]"
                        : "bg-gray-200 text-gray-500 border border-gray-300"
                  }
                `}
                >
                  {storeName ? <Check className="w-4 h-4" /> : "3"}
                </span>
                <h2 className="text-2xl font-semibold">Customize Your Menu</h2>
              </div>
              <LogoUploader
                onLogoChange={handleLogoChange}
                onStoreNameChange={(name) => {
                  setStoreName(name);
                  if (name && currentStep === 3) setCurrentStep(4);
                }}
                storeName={storeName}
                isDark={isDark}
              />
            </section>
          )}

          {/* Step 4: Menu Generator */}
          {authCode && storeName && (
            <section className="animate-slide-up">
              <div className="flex items-center gap-3 mb-6 no-print">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${isDark ? "bg-[#222] text-gray-400 border border-[#333]" : "bg-gray-200 text-gray-500 border border-gray-300"}`}
                >
                  4
                </span>
                <h2 className="text-2xl font-semibold">Generate Your Menu</h2>
              </div>
              <MenuGenerator
                authCode={authCode}
                logo={logo}
                brandColors={brandColors}
                storeName={storeName}
                onAuthInvalid={() => {
                  setAuthCode("");
                  setCurrentStep(2);
                }}
                isDark={isDark}
              />
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`border-t py-16 mt-16 no-print ${isDark ? "border-[#222] bg-black" : "border-gray-200 bg-gray-50"}`}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <a
              href="https://www.dopecast.net/"
              className="h-12 flex items-center"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={dopecastLogoGradient} alt="DopeCast" className="h-10 w-auto" />
            </a>

            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a
                href="https://www.dopecast.net/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
              >
                Privacy Policy
              </a>
              <a
                href="https://www.dopecast.net/contact"
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
              >
                Contact
              </a>
            </div>
          </div>

          {/* Gradient divider */}
          <div className="h-[1px] gradient-rainbow my-8 opacity-50"></div>

          <p className={`text-center text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Exclusive April deal for 4/20: dispensary digital signage menu screens are $30/month per screen per store.
            Guaranteed price for life.
          </p>

          <p className={`text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            © {new Date().getFullYear()} DopeCast. Built for cannabis retailers.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
