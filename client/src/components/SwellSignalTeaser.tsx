import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bell,
  MessageSquare,
  Waves,
  BarChart3,
  Target,
  X,
  CheckCircle,
  Radio
} from "lucide-react";

type SwellSignalTeaserProps = {
  className?: string;
};

export function SwellSignalTeaser({ className }: SwellSignalTeaserProps) {
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Notify email:", email);
    setIsSubmitted(true);
    setTimeout(() => {
      setShowNotifyModal(false);
      setIsSubmitted(false);
      setEmail("");
    }, 2000);
  };

  const handleFeedback = () => {
    window.location.href = "mailto:feedback@nycsurf.co?subject=Swell Signal Feedback&body=I'd like to share my thoughts on The Swell Signal feature...";
  };

  // Generate mock chart data points for the ghosted preview
  const chartPoints = [
    { day: 1, height: 2 },
    { day: 2, height: 2.5 },
    { day: 3, height: 4 },
    { day: 4, height: 5.5 },
    { day: 5, height: 4.5 },
    { day: 6, height: 3 },
    { day: 7, height: 3.5 },
    { day: 8, height: 6 },
    { day: 9, height: 7 },
    { day: 10, height: 5 },
  ];

  const maxHeight = 8;
  const chartHeight = 60;
  const chartWidth = 200;

  const pathPoints = chartPoints.map((point, index) => {
    const x = (index / (chartPoints.length - 1)) * chartWidth;
    const y = chartHeight - (point.height / maxHeight) * chartHeight;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const areaPath = `${pathPoints} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <>
      <div className={cn("bg-white border-2 border-black shadow-lg", className)}>
        {/* Header */}
        <div className="px-5 pt-4 pb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black flex items-center justify-center flex-shrink-0">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <span
                className="text-[10px] font-medium tracking-widest text-gray-500 uppercase"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                LONG RANGE FORECAST
              </span>
            </div>
            <div className="px-2 py-1 bg-black text-white">
              <span
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Coming Soon
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pt-2 pb-5">
          <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
            {/* Left: Header + Value Props */}
            <div className="flex-1">
              {/* Title */}
              <div className="mb-4">
                <h2
                  className="text-3xl font-black text-black uppercase tracking-tight"
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}
                >
                  THE SWELL SIGNAL
                </h2>
                <p
                  className="text-sm text-gray-600 mt-1"
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  6-10 day forecast. Plan your sick days with precision.
                </p>
              </div>

              {/* Value Props - Horizontal on desktop */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-black flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span
                    className="text-xs text-gray-700"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                    <strong>Ensemble Modeling</strong> — GFS & ECMWF
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-black flex items-center justify-center flex-shrink-0">
                    <Target className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span
                    className="text-xs text-gray-700"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                    <strong>Probability Scores</strong> — No phantom swells
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-black flex items-center justify-center flex-shrink-0">
                    <Waves className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span
                    className="text-xs text-gray-700"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                    <strong>WLI Optimized</strong> — Hudson Canyon effect
                  </span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowNotifyModal(true)}
                  size="sm"
                  className={cn(
                    "gap-1.5",
                    "bg-black hover:bg-gray-800 text-white",
                    "border-2 border-black",
                    "rounded-none",
                    "font-bold uppercase tracking-wide text-xs"
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Bell className="w-3 h-3" />
                  Notify Me
                </Button>
                <Button
                  onClick={handleFeedback}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1.5",
                    "bg-white hover:bg-gray-50 text-black",
                    "border-2 border-black",
                    "rounded-none",
                    "font-bold uppercase tracking-wide text-xs"
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <MessageSquare className="w-3 h-3" />
                  Feedback
                </Button>
              </div>
            </div>

            {/* Right: Ghosted Chart Preview */}
            <div className="relative w-full md:w-64 flex-shrink-0 border-2 border-dashed border-gray-300 bg-gray-50 p-3">
              <div className="opacity-30">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-auto"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <linearGradient id="chartGradientBW" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(0, 0, 0, 0.3)" />
                      <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#chartGradientBW)" />
                  <path
                    d={pathPoints}
                    fill="none"
                    stroke="rgba(0, 0, 0, 0.5)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chartPoints.map((point, index) => {
                    const x = (index / (chartPoints.length - 1)) * chartWidth;
                    const y = chartHeight - (point.height / maxHeight) * chartHeight;
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="2"
                        fill="rgba(0, 0, 0, 0.4)"
                      />
                    );
                  })}
                </svg>
                <div className="flex justify-between mt-1 px-1">
                  {[1, 5, 10].map((day) => (
                    <span
                      key={day}
                      className="text-[8px] text-gray-400 uppercase"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Day {day}
                    </span>
                  ))}
                </div>
              </div>
              {/* Under Development Badge */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="px-3 py-1 bg-white border-2 border-black">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider text-black"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Under Development
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notify Me Modal */}
      {showNotifyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowNotifyModal(false)}
        >
          <div
            className="relative w-full max-w-sm bg-white border-2 border-black p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowNotifyModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-black" />
            </button>

            {isSubmitted ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-black flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h4
                  className="text-2xl font-bold text-black mb-2 uppercase"
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                >
                  You're on the list!
                </h4>
                <p
                  className="text-sm text-gray-600"
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  We'll ping you when The Swell Signal goes live.
                </p>
              </div>
            ) : (
              <>
                <h4
                  className="text-2xl font-bold text-black mb-2 uppercase tracking-wide"
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                >
                  Get Notified
                </h4>
                <p
                  className="text-sm text-gray-600 mb-6"
                  style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                >
                  Drop your email and we'll let you know the moment The Swell Signal goes live.
                </p>

                <form onSubmit={handleNotifySubmit} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className={cn(
                      "w-full px-4 py-3",
                      "bg-white border-2 border-black",
                      "text-black placeholder-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2",
                      "transition-all duration-200"
                    )}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />

                  <Button
                    type="submit"
                    className={cn(
                      "w-full gap-2",
                      "bg-black hover:bg-gray-800 text-white",
                      "border-2 border-black",
                      "rounded-none",
                      "font-bold uppercase tracking-wide"
                    )}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <Bell className="w-4 h-4" />
                    Notify Me
                  </Button>
                </form>

                <p
                  className="text-[10px] text-gray-400 text-center mt-4 uppercase tracking-wider"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  No spam. Just one email when we launch.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
