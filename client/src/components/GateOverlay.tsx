import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GateOverlayProps = {
  locked: boolean;
  title: string;
  description: string;
  ctaLabel: string;
  onUnlock: () => void;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  cardClassName?: string;
  blurClassName?: string;
  showOverlay?: boolean;
  compact?: boolean;
};

export function GateOverlay({
  locked,
  title,
  description,
  ctaLabel,
  onUnlock,
  children,
  className,
  overlayClassName,
  cardClassName,
  blurClassName,
  showOverlay = true,
  compact = false,
}: GateOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {locked && (
        <>
          <div
            className={cn(
              "absolute inset-0 z-20 bg-white/10 backdrop-blur-[10px]",
              blurClassName
            )}
          />
          {showOverlay && (
            <div
              className={cn(
                "absolute inset-0 z-30 flex items-start justify-center px-3 sm:px-4 md:px-6 py-6 sm:py-8",
                overlayClassName
              )}
            >
              <div
                className={cn(
                  "w-full max-w-xl border-2 border-black bg-white shadow-2xl text-center",
                  compact ? "p-3 sm:p-4" : "p-5 sm:p-6",
                  cardClassName
                )}
              >
                <div
                  className={cn(
                    "inline-flex items-center border border-black px-2.5 py-1 text-[10px] tracking-wider uppercase",
                    compact ? "mb-2" : "mb-3"
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  NYC Surf Co. Intel
                </div>
                <h3
                  className={cn(
                    "font-black text-black uppercase tracking-tight",
                    compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl md:text-3xl"
                  )}
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                >
                  {title}
                </h3>
                <p
                  className={cn(
                    "text-gray-700",
                    compact ? "mt-2 text-xs sm:text-sm" : "mt-3 text-sm sm:text-base"
                  )}
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  {description}
                </p>
                <Button
                  onClick={onUnlock}
                  className={cn(
                    "w-full sm:w-auto bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none uppercase tracking-wide",
                    compact
                      ? "mt-3 px-4 sm:px-5 py-2.5 sm:py-3 text-[10px] sm:text-xs"
                      : "mt-5 px-5 sm:px-7 py-5 sm:py-6 text-xs sm:text-sm"
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {ctaLabel}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <div className={cn(locked && "pointer-events-none")} aria-hidden={locked}>
        {children}
      </div>
    </div>
  );
}
