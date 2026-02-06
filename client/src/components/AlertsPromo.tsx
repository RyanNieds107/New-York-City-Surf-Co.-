import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bell, Target, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

type AlertsPromoProps = {
  className?: string;
  spotName?: string;
};

export function AlertsPromo({ className, spotName }: AlertsPromoProps) {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const handleSetUpAlerts = () => {
    if (isAuthenticated) {
      setLocation("/members?tab=alerts");
    } else {
      setLocation("/login?redirect=/members?tab=alerts");
    }
  };

  return (
    <div className={cn("bg-white border-2 border-black shadow-lg", className)}>
      {/* Header */}
      <div className="px-3 sm:px-5 pt-3 sm:pt-4 pb-1">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-black flex items-center justify-center flex-shrink-0">
            <Bell className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </div>
          <span
            className="text-[8px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            SURF ALERTS
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 sm:px-5 pt-1 sm:pt-2 pb-3 sm:pb-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
          {/* Left: Header + Value Props */}
          <div className="flex-1">
            {/* Title */}
            <div className="mb-2 sm:mb-4">
              <h2
                className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight"
                style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}
              >
                NEVER MISS A SESSION
              </h2>
              <p
                className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1"
                style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
              >
                Get notified when conditions are firing at your favorite break.
              </p>
            </div>

            {/* Value Props - Compact on mobile */}
            <div className="hidden sm:flex flex-wrap gap-x-6 gap-y-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-black flex items-center justify-center flex-shrink-0">
                  <Target className="w-2.5 h-2.5 text-white" />
                </div>
                <span
                  className="text-xs text-gray-700"
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  <strong>Custom Thresholds</strong> — Set your quality score minimum
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-black flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-2.5 h-2.5 text-white" />
                </div>
                <span
                  className="text-xs text-gray-700"
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  <strong>Spot-Specific</strong> — Choose your home break or best spot
                </span>
              </div>
            </div>

            {/* Mobile: Inline feature tags */}
            <div className="flex sm:hidden flex-wrap gap-1.5 mb-3">
              <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Custom Thresholds
              </span>
              <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Spot-Specific
              </span>
            </div>

            {/* CTA Button */}
            <div>
              <Button
                onClick={handleSetUpAlerts}
                className={cn(
                  "gap-2 h-10 sm:h-11 px-5 sm:px-6",
                  "bg-blue-900 hover:bg-blue-800 text-white",
                  "border-2 border-blue-900 hover:border-blue-800",
                  "rounded-none",
                  "font-bold uppercase tracking-wide text-xs sm:text-sm"
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Bell className="w-4 h-4" />
                Click to Set Up Alerts
              </Button>
            </div>
          </div>

          {/* Right: Example Alert Preview - Hidden on mobile */}
          <div className="hidden md:block relative w-64 flex-shrink-0 border-2 border-black bg-gray-50 p-4">
            <div className="text-center">
              {/* Example Alert Badge */}
              <div className="inline-block px-2 py-1 bg-black text-white mb-3">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Example Alert
                </span>
              </div>

              {/* Alert Details */}
              <div className="space-y-2">
                <p
                  className="text-lg font-black text-black uppercase tracking-tight"
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                >
                  Rockaway Beach
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span
                    className="text-xs text-gray-600"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    72+ Quality
                  </span>
                  <span className="text-gray-400">·</span>
                  <span
                    className="text-xs text-gray-600"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    3-4ft @ 8s
                  </span>
                </div>

                {/* Forecast context */}
                <div className="mt-3 pt-2 border-t border-gray-300">
                  <span
                    className="text-[10px] uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <span className="text-green-600 font-semibold">Good Conditions</span>
                    <span className="text-gray-500"> · 7AM · Saturday</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
