import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Arrow, TrendArrow, SwellArrow, WindArrowBadge, ExpandArrow } from "@/components/ui/arrow";
import {
  RefreshCw,
  Waves,
  Wind,
  Lock,
  Clock,
  Users,
  ArrowLeft,
  Compass,
  MapPin,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Droplet,
  Sun,
  ArrowUp,
  ArrowDown,
  Car,
  Train,
  ShoppingBag,
  ChevronRight,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { useState, useMemo, useEffect, Fragment } from "react";
import { ChevronDown, ChevronUp, Bell } from "lucide-react";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/Footer";
import { CURRENT_CONDITIONS_MAX_AGE_MS, formatSurfHeight } from "@/lib/forecastUtils";
import { WaveForecastChart } from "@/components/WaveForecastChart";
import { SpotContextHeader, SPOT_CONTEXT } from "@/components/SpotContextHeader";
import { GateOverlay } from "@/components/GateOverlay";
import { getScoreBadgeColors } from "@/lib/ratingColors";
import { isNighttime } from "@/lib/sunTimes";
import { useCurrentConditions } from "@/hooks/useCurrentConditions";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { ModelConfidenceBadge } from "@/components/ModelConfidenceBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReportDatePicker } from "@/components/ReportDatePicker";
import { useLocation } from "wouter";
import { LidoBeachTabs } from "@/components/spot-tabs/LidoBeachTabs";
import { RockawayBeachTabs } from "@/components/spot-tabs/RockawayBeachTabs";
import { LongBeachTabs } from "@/components/spot-tabs/LongBeachTabs";
import { SpotInfoCard } from "@/components/SpotInfoCard";

// Ideal conditions data for each spot
const idealConditionsMap: Record<string, {
  swellDirection: string;
  waveHeight: string;
  windDirection: string;
  tide: string;
}> = {
  "Lido Beach": {
    swellDirection: "ESE - SSE (120-160°)",
    waveHeight: "4-6ft+ at 8-12s swell period",
    windDirection: "NNW - NNE (offshore)",
    tide: "Incoming Low-Mid",
  },
  "Rockaway Beach": {
    swellDirection: "ESE - SE (100-135°)",
    waveHeight: "4-6ft at 7-10s swell period",
    windDirection: "NW - N (offshore, light W also works)",
    tide: "Mid-High to High (avoid low unless pumping)",
  },
  "Long Beach": {
    swellDirection: "E - SE (90-135°)",
    waveHeight: "3-5ft at 8-10s swell period",
    windDirection: "N (offshore)",
    tide: "Incoming Low-Mid",
  },
};

// Component for displaying ideal conditions
function SpotIdealConditions({ spotName }: { spotName: string }) {
  const idealConditions = idealConditionsMap[spotName];

  if (!idealConditions) {
    return null; // Don't show if no data for this spot
  }

  return (
    <div className="bg-white border-2 border-black">
      {/* Header */}
      <div className="border-b-2 border-black p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[9px] sm:text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>CONDITIONS GUIDE</span>
        </div>
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
          WHAT GOOD LOOKS LIKE
        </h3>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
          According to the locals...
        </p>
      </div>

      {/* Conditions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x-2 divide-y-2 md:divide-y-0 divide-black border-b-2 border-black">
        {/* Ideal Swell */}
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-black flex items-center justify-center">
              <Compass className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SWELL</span>
          </div>
          <h4 className="text-sm sm:text-base md:text-lg font-black text-black uppercase mb-1 sm:mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>IDEAL DIRECTION</h4>
          <p className="text-xs sm:text-sm text-gray-800 font-semibold" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
            {idealConditions.swellDirection}
          </p>
        </div>

        {/* Ideal Size */}
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-black flex items-center justify-center">
              <Waves className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SIZE</span>
          </div>
          <h4 className="text-sm sm:text-base md:text-lg font-black text-black uppercase mb-1 sm:mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>IDEAL HEIGHT</h4>
          <p className="text-xs sm:text-sm text-gray-800 font-semibold" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
            {idealConditions.waveHeight}
          </p>
        </div>

        {/* Ideal Wind */}
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-black flex items-center justify-center">
              <Wind className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WIND</span>
          </div>
          <h4 className="text-sm sm:text-base md:text-lg font-black text-black uppercase mb-1 sm:mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>IDEAL DIRECTION</h4>
          <p className="text-xs sm:text-sm text-gray-800 font-semibold" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
            {idealConditions.windDirection}
          </p>
        </div>

        {/* Ideal Tide */}
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-black flex items-center justify-center">
              <Droplet className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TIDE</span>
          </div>
          <h4 className="text-sm sm:text-base md:text-lg font-black text-black uppercase mb-1 sm:mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>IDEAL PHASE</h4>
          <p className="text-xs sm:text-sm text-gray-800 font-semibold" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
            {idealConditions.tide}
          </p>
        </div>
      </div>

      {/* Note */}
      <div className="p-3 sm:p-4 bg-gray-50">
        <p className="text-[9px] sm:text-[10px] text-gray-500 text-center tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Based on top 100 days at {spotName} over the last 5 years.
        </p>
      </div>
    </div>
  );
}

/**
 * Get background color class for Timeline cards based on quality score
 * Matches the verdict badge color using a light -50 tint variant
 *
 * @param score - Quality score (0-100)
 * @returns Tailwind background color class
 */
function getCardBackgroundColor(score: number): string {
  const s = Math.round(score);

  if (s > 90) {
    return "bg-emerald-50"; // All-Time
  } else if (s >= 76) {
    return "bg-green-50"; // Firing
  } else if (s >= 60) {
    return "bg-lime-50"; // Go Surf
  } else if (s >= 40) {
    return "bg-yellow-50"; // Worth a Look
  } else {
    return "bg-red-50"; // Don't Bother (0-39)
  }
}

export default function SpotDetail() {
  const params = useParams<{ id: string }>();
  const spotId = parseInt(params.id || "0", 10);

  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [crowdLevel, setCrowdLevel] = useState(3);
  const [showCrowdReport, setShowCrowdReport] = useState(false);
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [extendedForecastTooltip, setExtendedForecastTooltip] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ideal-conditions");
  const [forecastView, setForecastView] = useState<"timeline" | "chart">("timeline");

  // Surf plan popup state
  const [showSurfPlanPopup, setShowSurfPlanPopup] = useState(false);
  const [popupCheckDone, setPopupCheckDone] = useState(false);
  const [hourlyModel, setHourlyModel] = useState<'euro' | 'om'>('euro');
  const [dayCardModel, setDayCardModel] = useState<'euro' | 'om'>('euro');

  // Surf plan popup: utils for imperative fetch, mutations for show/record
  const utils = trpc.useUtils();
  const markPopupShownMutation = trpc.reports.markSurfPlanPopupShown.useMutation();
  const recordResponseMutation = trpc.reports.recordSurfPlanResponse.useMutation();

  // Handle hash navigation (e.g., /spot/3#guide) or scroll to top
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // Wait for content to render, then scroll to anchor
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // Scroll to top when no hash
      window.scrollTo(0, 0);
    }
  }, [spotId]); // Re-run when spotId changes (new spot page loaded)

  // Close extended forecast tooltip when clicking outside
  useEffect(() => {
    if (!extendedForecastTooltip) return;

    const handleClickOutside = () => {
      setExtendedForecastTooltip(null);
    };

    // Add slight delay to prevent immediate close on the same tap
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [extendedForecastTooltip]);


  // Auto-refresh interval: 30 minutes
  const refetchInterval = 30 * 60 * 1000;

  // Use unified hook for current conditions (same logic as landing page)
  const currentData = useCurrentConditions(spotId, { refetchInterval });
  
  // Extract queries from hook for compatibility with existing code
  const spotQuery = currentData.queries.spot;
  const timelineQuery = currentData.queries.timeline;
  const forecastQuery = currentData.queries.forecast;
  const buoyQuery = currentData.queries.buoy;
  const buoyBreakingHeightsQuery = currentData.queries.buoyBreakingHeights;

  // Crowd from surf reports (post-session reports that included crowd level)
  const crowdFromSurfReportsQuery = trpc.reports.getCrowdFromSurfReports.useQuery(
    { spotId, daysBack: 30 },
    { refetchInterval }
  );

  // Dynamic SEO meta tags for spot pages
  useDocumentMeta({
    title: spotQuery.data?.name
      ? `${spotQuery.data.name} Surf Forecast - Live Conditions & Report | NYC Surf Co`
      : "NYC Surf Co - Real-Time Surf Forecast for Rockaway, Lido & Long Beach",
    description: spotQuery.data?.name
      ? `Current ${spotQuery.data.name} surf forecast: live wave height, wind, tide, and conditions. Real-time surf report updated hourly. Best times to surf ${spotQuery.data.name} today.`
      : "NYC Surf Co provides hyper-local surf forecasts for NYC and Long Island beaches. Get hourly surf conditions, swell data, wind, and tide forecasts.",
    ogTitle: spotQuery.data?.name
      ? `${spotQuery.data.name} Surf Forecast - NYC Surf Co`
      : "NYC Surf Co - Real-Time Surf Forecast for Rockaway, Lido & Long Beach",
    ogDescription: spotQuery.data?.name
      ? `Live ${spotQuery.data.name} surf conditions: wave height, wind, tide, and quality rating updated hourly.`
      : "NYC Surf Co provides hyper-local surf forecasts for NYC and Long Island beaches. Get hourly surf conditions, swell data, wind, and tide forecasts.",
    ogImage: "https://www.nycsurfco.com/og-image.png",
  });

  // Handle surf plan popup response
  const handleSurfPlanResponse = async (response: 'yes' | 'no' | 'dismissed') => {
    try {
      await recordResponseMutation.mutateAsync({
        spotId,
        response,
      });

      setShowSurfPlanPopup(false);

      // Show success toast for "yes" response
      if (response === 'yes') {
        toast.success("Great! We'll send you a reminder to share how it went.");
      }
    } catch (error) {
      console.error('Failed to record surf plan response:', error);
      toast.error('Failed to save your response. Please try again.');
    }
  };

  // Group timeline by day
  const groupedTimeline = useMemo(() => {
    if (!timelineQuery.data?.timeline || timelineQuery.data.timeline.length === 0) {
      return [];
    }

    const groupedByDay = new Map<string, typeof timelineQuery.data.timeline>();
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter out past forecast points (older than max age threshold)
    // Only show future or very recent forecasts
    const cutoffTime = new Date(now.getTime() - CURRENT_CONDITIONS_MAX_AGE_MS);
    
    timelineQuery.data.timeline.forEach((point, index) => {
      // Create date from timestamp
      const date = new Date(point.forecastTimestamp);

      // For "Today", show full day regardless of time
      // For other days, filter out points older than 1 hour
      const pointDate = new Date(date);
      pointDate.setHours(0, 0, 0, 0);
      const isPointFromToday = pointDate.getTime() === today.getTime();

      if (!isPointFromToday && date.getTime() < cutoffTime.getTime()) {
        return;
      }
      
      // Debug: Log first few timestamps to diagnose timezone issues
      if (index < 3) {
        console.log('[Date Debug]', {
          original: point.forecastTimestamp,
          parsed: date.toString(),
          localDate: date.getDate(),
          localMonth: date.getMonth() + 1,
          localYear: date.getFullYear(),
          today: today.getDate(),
          todayMonth: today.getMonth() + 1,
          todayYear: today.getFullYear(),
          isPast: date.getTime() < cutoffTime.getTime(),
        });
      }
      
      // Use local date components to get the correct day in user's timezone
      // This ensures forecasts show the correct local day
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dayKey = `${year}-${month}-${day}`;
      
      if (!groupedByDay.has(dayKey)) {
        groupedByDay.set(dayKey, []);
      }
      groupedByDay.get(dayKey)!.push(point);
    });
    
    // Sort days chronologically
    const sortedDays = Array.from(groupedByDay.entries()).sort(([a], [b]) => {
      return a.localeCompare(b); // ISO date strings sort correctly
    });
    
    // Debug: Log grouping results
    console.log('[Timeline Grouping]', {
      totalPoints: timelineQuery.data?.timeline.length,
      afterFilter: timelineQuery.data?.timeline.filter(p => new Date(p.forecastTimestamp).getTime() >= cutoffTime.getTime()).length,
      daysGrouped: sortedDays.length,
      days: sortedDays.map(([day, points]) => ({ day, count: points.length })),
    });
    
    return sortedDays;
  }, [timelineQuery.data?.timeline]);

  const refreshMutation = trpc.forecasts.refresh.useMutation({
    onSuccess: () => {
      toast.success("Forecast refreshed!");
      forecastQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to refresh: ${error.message}`);
    },
  });

  const refreshTimelineMutation = trpc.forecasts.refreshTimeline.useMutation({
    onSuccess: () => {
      toast.success("Timeline forecast fetched!");
      timelineQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to fetch timeline: ${error.message}`);
    },
  });

  const submitCrowdMutation = trpc.crowd.submit.useMutation({
    onSuccess: () => {
      toast.success("Crowd report submitted!");
      crowdFromSurfReportsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to submit: ${error.message}`);
    },
  });

  const handleSubmitReport = () => {
    if (!spot) return;

    const sessionDate = new Date(reportDate);
    sessionDate.setHours(12, 0, 0, 0);

    setLocation(`/report/submit?spotId=${spot.id}&sessionDate=${sessionDate.toISOString()}`);
  };

  // Track forecast view for post-surf report prompts
  const trackViewMutation = trpc.reports.trackView.useMutation();

  // Track view only after 10+ seconds of engagement
  useEffect(() => {
    if (!spotId || !user) return;

    const arrivalTime = Date.now();
    const forecastTime = new Date();
    let tracked = false;

    // Track after 10 seconds of engagement
    const engagementTimer = setTimeout(() => {
      tracked = true;
      const duration = Math.floor((Date.now() - arrivalTime) / 1000);

      trackViewMutation.mutate({
        spotId,
        forecastTime: forecastTime.toISOString(),
        sessionDuration: duration,
      });
    }, 10000); // 10 seconds

    // Also track if user switches away after 10s
    const handleVisibilityChange = () => {
      if (document.hidden && !tracked) {
        const duration = Math.floor((Date.now() - arrivalTime) / 1000);
        if (duration >= 10) {
          tracked = true;
          trackViewMutation.mutate({
            spotId,
            forecastTime: forecastTime.toISOString(),
            sessionDuration: duration,
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(engagementTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [spotId, user]); // Only run once per spot

  const spot = spotQuery.data;
  const forecast = forecastQuery.data?.forecast;
  const openMeteoPoint = forecastQuery.data?.openMeteoPoint;
  const isLoading = currentData.isLoading;
  const isError = currentData.error;

  // Surf plan popup: check immediately on mount for authenticated users
  useEffect(() => {
    console.log('[SurfPlanPopup] Effect fired:', { popupCheckDone, isAuthenticated, spotId });
    if (popupCheckDone || !isAuthenticated || !spotId) return;

    let cancelled = false;

    (async () => {
      try {
        console.log('[SurfPlanPopup] Fetching shouldShow for spotId:', spotId);
        const shouldShow = await utils.reports.shouldShowSurfPlanPopup.fetch({ spotId });
        console.log('[SurfPlanPopup] shouldShow result:', shouldShow);
        if (!cancelled && shouldShow) {
          setShowSurfPlanPopup(true);
          markPopupShownMutation.mutate({ spotId });
        }
      } catch (error) {
        console.error('[SurfPlanPopup] Failed to check surf plan popup:', error);
      } finally {
        if (!cancelled) setPopupCheckDone(true);
      }
    })();

    return () => { cancelled = true; };
  }, [spotId, isAuthenticated]);

  // Current conditions from unified hook (same logic as landing page)
  const currentConditions = currentData.currentPoint;

  // Helper functions
  const formatPeriod = (periodDs: number | null) => {
    if (periodDs === null) return "N/A";
    const seconds = periodDs / 10;
    return `${seconds.toFixed(0)}s`;
  };

  const formatPeriodFromSeconds = (periodSec: number | null) => {
    if (periodSec === null) return "N/A";
    return `${periodSec.toFixed(0)}s`;
  };

  const formatSwellDirection = (deg: number): string => {
    const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(deg / 22.5) % 16;
    const cardinal = cardinals[index];
    
    return `${cardinal} ${Math.round(deg)}°`;
  };

  const getSwellDirectionLabel = (deg: number): string => {
    const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(deg / 22.5) % 16;
    return cardinals[index];
  };

  /**
   * Validates Open-Meteo forecast components against NOAA buoy observations
   * Uses RSS (Root Sum Square: sqrt(h1² + h2² + h3²)) to calculate total wave height
   * Returns true if forecast is reasonable (within 30% of observed total)
   */
  const validateForecastAgainstBuoy = (
    forecastComponents: Array<{ height: number }>,
    buoyTotalHeight: number
  ): { isValid: boolean; ratio: number } => {
    if (buoyTotalHeight <= 0 || forecastComponents.length === 0) {
      return { isValid: false, ratio: 0 };
    }

    // Calculate total wave height from forecast components using RSS
    const forecastTotal = Math.sqrt(
      forecastComponents.reduce((sum, comp) => sum + (comp.height ** 2), 0)
    );

    const ratio = forecastTotal / buoyTotalHeight;

    // Valid if within 70-130% of buoy observation (30% tolerance)
    const isValid = ratio >= 0.7 && ratio <= 1.3;

    return { isValid, ratio };
  };


  // Get wind type for badge coloring
  const getWindBadgeType = (windType: string | null): "offshore" | "onshore" | "cross" | "unknown" => {
    if (!windType) return "unknown";
    const lower = windType.toLowerCase();
    if (lower === "side-offshore") return "cross"; // Treat side-offshore as cross for badge
    if (lower.includes("offshore")) return "offshore";
    if (lower.includes("onshore")) return "onshore";
    if (lower.includes("cross") || lower.includes("side")) return "cross";
    return "unknown";
  };

  // Format wind type for display
  const formatWindType = (windType: string | null): string => {
    if (!windType) return '';
    if (windType === 'side-offshore') return 'Side-Off';
    const capitalized = windType.charAt(0).toUpperCase() + windType.slice(1);
    return capitalized.replace('-', '-');
  };

  const formatSwellInfo = (forecast: typeof currentConditions): string => {
    if (!forecast) return 'N/A';
    
    // Get swell height (offshore, from waveHeightTenthsFt converted to feet)
    const swellHeight = forecast.waveHeightTenthsFt 
      ? (forecast.waveHeightTenthsFt / 10).toFixed(1) 
      : null;
    
    // Get swell period
    const swellPeriod = forecast.wavePeriodSec !== null && forecast.wavePeriodSec !== undefined
      ? forecast.wavePeriodSec.toFixed(0)
      : null;
    
    // Get swell direction
    const swellDirection = forecast.waveDirectionDeg !== null && forecast.waveDirectionDeg !== undefined
      ? formatSwellDirection(forecast.waveDirectionDeg)
      : null;
    
    // Build the string - need at least height and period
    if (!swellHeight || !swellPeriod) {
      return 'N/A';
    }
    
    const directionStr = swellDirection || '';
    return `${swellHeight}ft ${swellPeriod}s ${directionStr}`.trim();
  };

  const formatWindSpeed = (windSpeedMph: number | null) => {
    if (windSpeedMph === null) return "N/A";
    return `${windSpeedMph.toFixed(0)} mph`;
  };

  const formatDirection = (degrees: number | null) => {
    if (degrees === null) return null;
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(degrees / 22.5) % 16;
    return {
      cardinal: directions[index],
      degrees: Math.round(degrees)
    };
  };

  const formatWindInfo = (windSpeedMph: number | null, windDirectionDeg: number | null): { speed: string; direction: string | null } => {
    const speed = windSpeedMph !== null 
      ? `${Math.round(windSpeedMph)}kt`
      : null;
    
    const direction = formatDirection(windDirectionDeg);
    
    return {
      speed: speed || "N/A",
      direction: direction ? `${direction.cardinal} ${direction.degrees}°` : null
    };
  };

  const DirectionArrow = ({ degrees }: { degrees: number }) => {
    // Swell direction is where it comes FROM, add 180 to show direction of travel
    return <SwellArrow directionDeg={degrees} size={14} />;
  };

  const getCrowdLabel = (level: number) => {
    const labels = ["", "Empty", "Light", "Moderate", "Crowded", "Packed"];
    return labels[level] || "Unknown";
  };

  const getCrowdColor = (level: number) => {
    if (level <= 1) return "bg-emerald-600";
    if (level === 2) return "bg-emerald-500";
    if (level === 3) return "bg-amber-500";
    if (level === 4) return "bg-orange-500";
    return "bg-red-600";
  };

  const getWaveHeightDescription = (heightFt: number | null): string => {
    if (heightFt === null || heightFt <= 0) return "Flat";

    if (heightFt < 1.5) return "Shin to Knee";

    if (heightFt < 2.5) return "Knee to Waist";

    if (heightFt < 3.5) return "Waist to Chest";

    if (heightFt < 4.5) return "Chest to Shoulder";

    if (heightFt < 5.5) return "Head High";

    if (heightFt < 7.0) return "Overhead";

    if (heightFt < 9.0) return "Well Overhead";

    return "Double Overhead +";
  };

  // Get rating label from quality score (0-100)
  const getRatingLabel = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return "N/A";
    const s = Math.round(score);
    if (s <= 39) return "Don't Bother";
    if (s <= 59) return "Worth a Look";
    if (s <= 75) return "Go Surf";
    if (s <= 90) return "Firing";
    return "All-Time";
  };

  // Get effective quality score based on active model toggle
  const getEffectiveQualityScore = (
    point: NonNullable<typeof timelineQuery.data>['timeline'][number],
    model: 'euro' | 'om'
  ): number => {
    if (model === 'euro' && point.euroQualityScore != null) return point.euroQualityScore;
    return point.quality_score ?? point.probabilityScore ?? 0;
  };

  const getEffectiveQualityRating = (
    point: NonNullable<typeof timelineQuery.data>['timeline'][number],
    model: 'euro' | 'om'
  ): string | null => {
    if (model === 'euro' && point.euroQualityRating != null) return point.euroQualityRating;
    return point.quality_rating ?? null;
  };

  // Helper functions for 7-day forecast UI
  const getFullDayName = (date: Date): string => {
    return date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  };

  const getVerdictLabel = (rating: string): string => {
    if (rating === "Go Surf") {
      return "GO SURF";
    }
    if (rating === "Firing") {
      return "FIRING";
    }
    if (rating === "All-Time") {
      return "ALL-TIME";
    }
    return rating.toUpperCase();
  };

  const formatWindDescription = (windType: string | null, windSpeedMph: number | null): string => {
    if (windType === null) return "N/A";
    if (windSpeedMph === null) return windType;
    
    if (windSpeedMph < 10) {
      if (windType === "offshore") return "light offshore";
      if (windType === "onshore") return "light onshore";
      if (windType === "cross") return "light cross-shore";
      return "light winds";
    }
    
    return `${windType} ${Math.round(windSpeedMph)}mph`;
  };

  const formatTideDescription = (tidePhase: string | null): string => {
    if (tidePhase === null) return "N/A";
    if (tidePhase === "rising") return "rising tide";
    if (tidePhase === "falling") return "falling tide";
    if (tidePhase === "high") return "high tide";
    if (tidePhase === "low") return "low tide";
    return tidePhase;
  };

  const getWindowLabel = (hour: number): { label: string; emoji: string } => {
    if (hour >= 5 && hour < 8) {
      return { label: "DAWN PATROL", emoji: "🌅" };
    } else if (hour >= 8 && hour < 12) {
      return { label: "MORNING", emoji: "🌊" };
    } else if (hour >= 12 && hour < 14) {
      return { label: "MIDDAY", emoji: "⚡" };
    } else if (hour >= 14 && hour < 18) {
      return { label: "AFTERNOON", emoji: "🌊" };
    } else {
      return { label: "EVENING", emoji: "🌊" };
    }
  };

  const formatTimeRange = (startHour: number, endHour: number): string => {
    const formatHour = (hour: number, includePeriod: boolean = true): string => {
      if (hour === 0) return includePeriod ? "12am" : "12";
      if (hour < 12) return includePeriod ? `${hour}am` : `${hour}`;
      if (hour === 12) return includePeriod ? "12pm" : "12";
      return includePeriod ? `${hour - 12}pm` : `${hour - 12}`;
    };
    
    // Check if both are in the same period (am/pm)
    const startIsAM = startHour < 12;
    const endIsAM = endHour < 12;
    
    if (startIsAM === endIsAM) {
      // Same period, simplify format: "6-8am" instead of "6am-8am"
      const period = startIsAM ? "am" : "pm";
      return `${formatHour(startHour, false)}-${formatHour(endHour, false)}${period}`;
    }
    
    // Different periods, show full format: "11am-1pm"
    return `${formatHour(startHour, true)}-${formatHour(endHour, true)}`;
  };

  interface Window {
    timeRange: string;
    label: string;
    emoji: string;
    avgScore: number;
    waveHeight: string;
    windDesc: string;
    tideDesc: string;
    startHour: number;
    endHour: number;
  }

  const analyzeBestWindows = (points: Array<NonNullable<typeof timelineQuery.data>['timeline'][number]>): Window[] => {
    if (!points || points.length === 0) return [];
    
    // Filter out nighttime hours - only consider daylight hours for best windows
    const daylightPoints = spot ? points.filter(p => {
      return !isNighttime(p.forecastTimestamp, parseFloat(String(spot.latitude)), parseFloat(String(spot.longitude)));
    }) : points;

    if (daylightPoints.length === 0) return [];

    // Sort points by timestamp
    const sortedPoints = [...daylightPoints].sort((a, b) => {
      return new Date(a.forecastTimestamp).getTime() - new Date(b.forecastTimestamp).getTime();
    });

    // Try to find windows with score > 60 first (high quality)
    // If none found, fall back to score >= 40 (surfable conditions)
    const findWindowsWithThreshold = (threshold: number): Window[] => {
    const windows: Window[] = [];
    let currentWindow: typeof sortedPoints = [];
    
    for (let i = 0; i < sortedPoints.length; i++) {
      const point = sortedPoints[i];
      const score = getEffectiveQualityScore(point, dayCardModel);
      const date = new Date(point.forecastTimestamp);
      const hour = date.getHours();

        if (score > threshold) {
        // Check if this hour is consecutive with the last point in current window
        if (currentWindow.length > 0) {
          const lastPoint = currentWindow[currentWindow.length - 1];
          const lastDate = new Date(lastPoint.forecastTimestamp);
          const lastHour = lastDate.getHours();
          const hoursDiff = hour - lastHour;
          
          // Allow up to 1 hour gap (in case of missing data)
          if (hoursDiff <= 1) {
            currentWindow.push(point);
          } else {
            // Save current window if it has at least 2 hours
            if (currentWindow.length >= 2) {
              const window = createWindowFromPoints(currentWindow);
              if (window) windows.push(window);
            }
            currentWindow = [point];
          }
        } else {
          currentWindow = [point];
        }
      } else {
        // Save current window if it has at least 2 hours
        if (currentWindow.length >= 2) {
          const window = createWindowFromPoints(currentWindow);
          if (window) windows.push(window);
        }
        currentWindow = [];
      }
    }
    
    // Save final window if it has at least 2 hours
    if (currentWindow.length >= 2) {
      const window = createWindowFromPoints(currentWindow);
      if (window) windows.push(window);
      }
      
      return windows;
    };

    // First try high-quality windows (score > 60)
    let windows = findWindowsWithThreshold(60);
    
    // If no high-quality windows, fall back to surfable windows (score >= 40)
    if (windows.length === 0) {
      windows = findWindowsWithThreshold(39); // 39 so score >= 40 passes
    }
    
    // Sort by average score (highest first) and take top 3
    windows.sort((a, b) => b.avgScore - a.avgScore);
    return windows.slice(0, 3);
  };

  const createWindowFromPoints = (points: Array<NonNullable<typeof timelineQuery.data>['timeline'][number]>): Window | null => {
    if (points.length === 0) return null;
    
    // Calculate average score
    const scores = points.map(p => getEffectiveQualityScore(p, dayCardModel));
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    // Get time range
    const firstDate = new Date(points[0].forecastTimestamp);
    const lastDate = new Date(points[points.length - 1].forecastTimestamp);
    const startHour = firstDate.getHours();
    const endHour = lastDate.getHours();
    
    // Get window label from middle hour
    const middleIndex = Math.floor(points.length / 2);
    const middlePoint = points[middleIndex];
    const middleDate = new Date(middlePoint.forecastTimestamp);
    const middleHour = middleDate.getHours();
    const { label, emoji } = getWindowLabel(middleHour);
    
    // Get representative conditions from middle point
    const waveHeightFt = dayCardModel === 'euro' && middlePoint.ecmwfWaveHeightFt != null
      ? Number(middlePoint.ecmwfWaveHeightFt)
      : (middlePoint.dominantSwellHeightFt ?? middlePoint.waveHeightFt ?? null);
    const waveHeight = formatSurfHeight(waveHeightFt);
    const windDesc = formatWindDescription(middlePoint.windType ?? null, middlePoint.windSpeedMph ?? null);
    const tideDesc = formatTideDescription(middlePoint.tidePhase ?? null);
    
    return {
      timeRange: formatTimeRange(startHour, endHour),
      label,
      emoji,
      avgScore,
      waveHeight,
      windDesc,
      tideDesc,
      startHour,
      endHour,
    };
  };

  const findAvoidWindows = (points: Array<NonNullable<typeof timelineQuery.data>['timeline'][number]>): Array<{ timeRange: string; reason: string }> => {
    if (!points || points.length === 0) return [];

    const sortedPoints = [...points].sort((a, b) => {
      return new Date(a.forecastTimestamp).getTime() - new Date(b.forecastTimestamp).getTime();
    });

    const avoidWindows: Array<{ timeRange: string; reason: string }> = [];
    let currentWindow: typeof sortedPoints = [];
    
    for (let i = 0; i < sortedPoints.length; i++) {
      const point = sortedPoints[i];
      const score = getEffectiveQualityScore(point, dayCardModel);
      const windType = point.windType ?? null;
      const windSpeed = point.windSpeedMph ?? null;
      const date = new Date(point.forecastTimestamp);
      const hour = date.getHours();
      
      // Check if this is a poor window (quality < 50 AND strong onshore winds > 15mph)
      if (score < 50 && windType === "onshore" && windSpeed !== null && windSpeed > 15) {
        if (currentWindow.length > 0) {
          const lastPoint = currentWindow[currentWindow.length - 1];
          const lastDate = new Date(lastPoint.forecastTimestamp);
          const lastHour = lastDate.getHours();
          const hoursDiff = hour - lastHour;
          
          if (hoursDiff <= 1) {
            currentWindow.push(point);
          } else {
            if (currentWindow.length >= 2) {
              const window = createAvoidWindow(currentWindow);
              if (window) avoidWindows.push(window);
            }
            currentWindow = [point];
          }
        } else {
          currentWindow = [point];
        }
      } else {
        if (currentWindow.length >= 2) {
          const window = createAvoidWindow(currentWindow);
          if (window) avoidWindows.push(window);
        }
        currentWindow = [];
      }
    }
    
    if (currentWindow.length >= 2) {
      const window = createAvoidWindow(currentWindow);
      if (window) avoidWindows.push(window);
    }
    
    return avoidWindows;
  };

  const createAvoidWindow = (points: Array<NonNullable<typeof timelineQuery.data>['timeline'][number]>): { timeRange: string; reason: string } | null => {
    if (points.length === 0) return null;
    
    const firstDate = new Date(points[0].forecastTimestamp);
    const lastDate = new Date(points[points.length - 1].forecastTimestamp);
    const startHour = firstDate.getHours();
    const endHour = lastDate.getHours();
    
    // Get representative conditions for reason
    const middleIndex = Math.floor(points.length / 2);
    const middlePoint = points[middleIndex];
    const windSpeed = middlePoint.windSpeedMph ?? null;
    const windType = middlePoint.windType ?? null;
    
    let reason = "blown out";
    if (windType === "onshore" && windSpeed !== null) {
      reason = `blown out, onshore ${Math.round(windSpeed)}mph`;
    }
    
    return {
      timeRange: formatTimeRange(startHour, endHour),
      reason,
    };
  };


  // Wetsuit recommendation logic
  const getWetsuitRecommendation = (waterTempF: number | null): { thickness: string; color: string } => {
    if (waterTempF === null) return { thickness: "N/A", color: "text-black" };
    
    if (waterTempF < 42) {
      return { thickness: "6/5MM HOODED", color: "text-red-600" };
    } else if (waterTempF >= 42 && waterTempF <= 51) {
      return { thickness: "5/4MM HOODED", color: "text-orange-600" };
    } else if (waterTempF >= 52 && waterTempF <= 57) {
      return { thickness: "4/3MM", color: "text-yellow-600" };
    } else if (waterTempF >= 58 && waterTempF <= 64) {
      return { thickness: "4/3MM or 3/2MM", color: "text-yellow-500" };
    } else {
      return { thickness: "3/2MM or SPRING SUIT", color: "text-green-600" };
    }
  };

  // Accessories recommendation logic
  const getWetsuitAccessories = (waterTempF: number | null, airTempF: number | null): string => {
    if (waterTempF === null) return "";

    // Extreme cold: water below 45°F AND air below 30°F
    if (waterTempF < 45 && airTempF !== null && airTempF < 30) {
      return "+ Boots · Gloves · Hood";
    }
    // Very cold: water below 42°F (but not extreme air)
    if (waterTempF < 42) {
      return "+ Boots · Gloves · Hood";
    }
    // Cold: 42-51°F water
    if (waterTempF >= 42 && waterTempF <= 51) {
      return "+ Boots · Gloves · Hood";
    }
    // Cool: 52-57°F water
    if (waterTempF >= 52 && waterTempF <= 57) {
      return "+ Boots optional";
    }
    // Moderate: 58-64°F water
    if (waterTempF >= 58 && waterTempF <= 64) {
      return "Boots optional";
    }
    // Warm: 65°F+ water
    return "";
  };

  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Format absolute time
  const formatAbsoluteTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };


  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-black bg-white backdrop-blur-sm sticky top-0 z-10">
          <div className="container py-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="text-black hover:text-black">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <Skeleton className="h-8 w-48 bg-gray-100" />
            </div>
          </div>
        </header>
        <main className="container max-w-5xl py-4 sm:py-6 md:py-8 px-3 sm:px-4">
          <div className="space-y-4 sm:space-y-6">
            <Card className="bg-white border-black">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Loader2 className="h-5 w-5 animate-spin text-black" />
                  <p className="text-black">Loading forecast...</p>
                </div>
              </CardContent>
            </Card>
            <Skeleton className="h-48 sm:h-64 w-full bg-gray-100" />
            <Skeleton className="h-36 sm:h-48 w-full bg-gray-100" />
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-black bg-white backdrop-blur-sm sticky top-0 z-10">
          <div className="container py-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="text-black hover:text-black">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <Skeleton className="h-8 w-48 bg-gray-100" />
            </div>
        </div>
        </header>
        <main className="container max-w-5xl py-4 sm:py-6 md:py-8 px-3 sm:px-4">
          <Card className="bg-white border-black">
            <CardContent className="py-8 sm:py-12 text-center">
              <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-black mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Error Loading Forecast</h3>
              <p className="text-black mb-6">
                {spotQuery.error?.message || forecastQuery.error?.message || "Failed to load forecast data"}
              </p>
              <Button
                onClick={() => {
                  spotQuery.refetch();
                  forecastQuery.refetch();
                }}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Spot not found
  if (!spot) {
    return (
      <div className="min-h-screen bg-white">
        <main className="container max-w-5xl py-4 sm:py-6 md:py-8 px-3 sm:px-4">
          <div className="text-center">
            <Waves className="h-12 w-12 sm:h-16 sm:w-16 text-black mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Spot Not Found</h1>
            <p className="text-sm sm:text-base text-black mb-6">The surf spot you're looking for doesn't exist.</p>
            <Link href="/dashboard">
              <Button variant="outline" className="border-black text-black">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        </main>
      </div>
    );
  }

  // For header: use forecast createdAt to show when data was last refreshed
  const headerLastUpdated = forecast?.createdAt ? new Date(forecast.createdAt) : null;

  // For conditions card: use timeline timestamp to show what time the conditions are for
  const conditionsAsOf = currentConditions?.forecastTimestamp
    ? new Date(currentConditions.forecastTimestamp)
    : null;
  const unlockRedirectPath = typeof window === "undefined"
    ? `/spot/${spotId}`
    : `${window.location.pathname}${window.location.hash || ""}`;
  const showGuideIntelGate =
    !isAuthenticated &&
    (activeTab === "offshore-bathymetry" ||
      activeTab === "getting-there" ||
      activeTab === "location" ||
      activeTab === "wave-mechanics" ||
      activeTab === "surf-culture");

  const handleUnlockSpot = () => {
    setLocation(`/login?redirect=${encodeURIComponent(unlockRedirectPath)}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      {spot.name === "Lido Beach" ? (
        <header className="relative w-full h-64 overflow-hidden">
          {/* Full-width surf image */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url('/Lido%20Winter.webp')`
            }}
          />
          
          {/* Heavy fade at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          
          {/* Content overlay */}
          <div className="relative h-full flex flex-col justify-end pb-8 px-8">
            <div className="container max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-white/20">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => refreshMutation.mutate({ spotId })}
                    disabled={refreshMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="border-white text-white hover:bg-white/20"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>
              
              {/* Spot name and coordinates */}
              <div>
                <h1 className="text-5xl md:text-6xl font-black text-white mb-3 uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  LIDO BEACH
                </h1>
                <p className="text-lg text-white/90" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  40.5892° N • -73.6265° W
                </p>
              </div>
            </div>
          </div>
        </header>
      ) : spot.name === "Long Beach" ? (
        <header className="relative w-full h-64 overflow-hidden">
          {/* Full-width surf image */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url('/Long Beach.jpg')`
            }}
          />
          
          {/* Heavy fade at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          
          {/* Content overlay */}
          <div className="relative h-full flex flex-col justify-end pb-8 px-8">
            <div className="container max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-white/20">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => refreshMutation.mutate({ spotId })}
                    disabled={refreshMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="border-white text-white hover:bg-white/20"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>
              
              {/* Spot name and coordinates */}
              <div>
                <h1 className="text-5xl md:text-6xl font-black text-white mb-3 uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  LONG BEACH
                </h1>
                <p className="text-lg text-white/90" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  40.5884° N • -73.6579° W
                </p>
              </div>
            </div>
          </div>
        </header>
      ) : spot.name === "Rockaway Beach" ? (
        <header className="relative w-full h-64 overflow-hidden">
          {/* Full-width surf image */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url('/Rockaway1.jpg')`
            }}
          />
          
          {/* Heavy fade at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          
          {/* Content overlay */}
          <div className="relative h-full flex flex-col justify-end pb-8 px-8">
            <div className="container max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-white/20">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => refreshMutation.mutate({ spotId })}
                    disabled={refreshMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="border-white text-white hover:bg-white/20"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>
              
              {/* Spot name and coordinates */}
              <div>
                <h1 className="text-5xl md:text-6xl font-black text-white mb-3 uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  ROCKAWAY BEACH
                </h1>
                <p className="text-lg text-white/90" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  40.5834° N • -73.8168° W
                </p>
              </div>
            </div>
          </div>
        </header>
      ) : (
        <header className="border-b border-black bg-white backdrop-blur-sm sticky top-0 z-10">
          <div className="container max-w-5xl py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon" className="text-black hover:text-black">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>{spot.name}</h1>
                  <div className="flex items-center gap-2 text-sm text-black">
                    <MapPin className="h-4 w-4" />
                    <span>{spot.latitude}, {spot.longitude}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => refreshMutation.mutate({ spotId })}
                  disabled={refreshMutation.isPending}
                  variant="outline"
                    size="sm"
                    className="border-black text-black hover:bg-gray-50"
              >
                  <RefreshCw className={`h-3 w-3 mr-1.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="container max-w-5xl py-4 sm:py-6 md:py-8 px-3 sm:px-4">
        {forecast ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Spot Context Header */}
            {spot?.name && SPOT_CONTEXT[spot.name] && (
              <SpotContextHeader
                headline={SPOT_CONTEXT[spot.name].headline}
                description={SPOT_CONTEXT[spot.name].description}
              />
            )}

            {/* Conditions - NYC Style 3-Column Stat Row */}
            <div className="bg-white border-2 border-black rounded-none">
              <div className="px-4 sm:px-5 py-2 sm:py-3 border-b-2 border-black">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Current Conditions
                  </h2>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {currentData.modelConfidence?.overall && (
                      <ModelConfidenceBadge confidence={currentData.modelConfidence.overall} size="sm" />
                    )}
                    {conditionsAsOf && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-black uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span>As of {formatAbsoluteTime(conditionsAsOf)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-3 sm:p-4">
                {currentConditions ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {/* Surf Height - calculated from buoy data using spot-specific algorithm */}
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Surf Height
                        </p>
                        {(() => {
                          // Use wave height from unified hook (same priority as landing page)
                          const displayHeight = currentData.waveHeight;
                          const description = getWaveHeightDescription(displayHeight);

                          return (
                            <>
                              <p className="text-5xl sm:text-6xl font-black text-black mb-1 leading-none uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                                {formatSurfHeight(displayHeight)}
                              </p>
                              {description && (
                                <p className="text-[11px] text-gray-500 uppercase tracking-widest mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                  {description}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* Swell */}
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Swell
                        </p>
                        {(() => {
                          const buoyData = buoyQuery.data;

                          // Build swells array with validation against buoy observations
                          const swells: Array<{
                            label: string;
                            height: string;
                            period: string;
                            direction: string | null;
                            directionDeg: number | null | undefined;
                            isPrimary: boolean;
                          }> = [];

                          // VALIDATION MODE: Use buoy to validate Open-Meteo forecast
                          const useBuoyValidation = buoyData && !buoyData.isStale;

                          if (useBuoyValidation) {
                            // Collect Open-Meteo components for current conditions
                            const forecastComponents: Array<{
                              label: string;
                              height: number;
                              heightStr: string;
                              period: string;
                              direction: string | null;
                              directionDeg: number | null | undefined;
                              isPrimary: boolean;
                            }> = [];

                            // Primary swell from forecast
                            if (currentConditions.waveHeightFt !== null && currentConditions.waveHeightFt > 0 &&
                                currentConditions.wavePeriodSec !== null) {
                              const heightNum = typeof currentConditions.waveHeightFt === 'string'
                                ? parseFloat(currentConditions.waveHeightFt)
                                : currentConditions.waveHeightFt;
                              const periodNum = typeof currentConditions.wavePeriodSec === 'string'
                                ? parseFloat(currentConditions.wavePeriodSec)
                                : currentConditions.wavePeriodSec;

                              if (!isNaN(heightNum) && !isNaN(periodNum) && heightNum > 0) {
                                forecastComponents.push({
                                  label: 'PRIMARY',
                                  height: heightNum,
                                  heightStr: heightNum.toFixed(1),
                                  period: periodNum.toFixed(0),
                                  direction: currentConditions.waveDirectionDeg !== null
                                    ? formatSwellDirection(currentConditions.waveDirectionDeg)
                                    : null,
                                  directionDeg: currentConditions.waveDirectionDeg,
                                  isPrimary: true,
                                });
                              }
                            }

                            // Secondary swell from forecast
                            if (currentConditions.secondarySwellHeightFt !== null &&
                                currentConditions.secondarySwellPeriodS !== null) {
                              const heightNum = typeof currentConditions.secondarySwellHeightFt === 'string'
                                ? parseFloat(currentConditions.secondarySwellHeightFt)
                                : currentConditions.secondarySwellHeightFt;
                              const periodNum = typeof currentConditions.secondarySwellPeriodS === 'string'
                                ? parseFloat(currentConditions.secondarySwellPeriodS)
                                : currentConditions.secondarySwellPeriodS;

                              if (!isNaN(heightNum) && !isNaN(periodNum) && heightNum > 0) {
                                forecastComponents.push({
                                  label: 'SECONDARY',
                                  height: heightNum,
                                  heightStr: heightNum.toFixed(1),
                                  period: periodNum.toFixed(0),
                                  direction: currentConditions.secondarySwellDirectionDeg !== null
                                    ? formatSwellDirection(currentConditions.secondarySwellDirectionDeg)
                                    : null,
                                  directionDeg: currentConditions.secondarySwellDirectionDeg,
                                  isPrimary: false,
                                });
                              }
                            }

                            // Wind waves from forecast
                            if (currentConditions.windWaveHeightFt !== null &&
                                currentConditions.windWavePeriodS !== null) {
                              const heightNum = typeof currentConditions.windWaveHeightFt === 'string'
                                ? parseFloat(currentConditions.windWaveHeightFt)
                                : currentConditions.windWaveHeightFt;
                              const periodNum = typeof currentConditions.windWavePeriodS === 'string'
                                ? parseFloat(currentConditions.windWavePeriodS)
                                : currentConditions.windWavePeriodS;

                              if (!isNaN(heightNum) && !isNaN(periodNum) && heightNum > 0) {
                                forecastComponents.push({
                                  label: 'WIND',
                                  height: heightNum,
                                  heightStr: heightNum.toFixed(1),
                                  period: periodNum.toFixed(0),
                                  direction: currentConditions.windWaveDirectionDeg !== null
                                    ? formatSwellDirection(currentConditions.windWaveDirectionDeg)
                                    : null,
                                  directionDeg: currentConditions.windWaveDirectionDeg,
                                  isPrimary: false,
                                });
                              }
                            }

                            // Validate against buoy
                            const validation = validateForecastAgainstBuoy(
                              forecastComponents,
                              buoyData.waveHeight
                            );

                            if (validation.isValid) {
                              // Forecast matches observations - use Open-Meteo breakdown
                              swells.push(...forecastComponents.map(c => ({
                                label: c.label,
                                height: c.heightStr,
                                period: c.period,
                                direction: c.direction,
                                directionDeg: c.directionDeg,
                                isPrimary: c.isPrimary,
                              })));

                              const forecastTotal = Math.sqrt(
                                forecastComponents.reduce((sum, c) => sum + (c.height ** 2), 0)
                              );
                              console.log(`[Validation] Forecast valid: ${(validation.ratio * 100).toFixed(0)}% of buoy (${forecastTotal.toFixed(1)}ft forecast RSS vs ${buoyData.waveHeight.toFixed(1)}ft observed)`);
                            } else {
                              // Forecast diverges from observations - fall back to buoy-only
                              const forecastTotal = Math.sqrt(
                                forecastComponents.reduce((sum, c) => sum + (c.height ** 2), 0)
                              );
                              console.warn(`[Validation] Forecast invalid: ${(validation.ratio * 100).toFixed(0)}% of buoy (${forecastTotal.toFixed(1)}ft forecast RSS vs ${buoyData.waveHeight.toFixed(1)}ft observed). Falling back to buoy data.`);

                              // Show buoy swell component
                              if (buoyData.swellHeight !== null && buoyData.swellPeriod !== null) {
                                swells.push({
                                  label: 'PRIMARY',
                                  height: buoyData.swellHeight.toFixed(1),
                                  period: buoyData.swellPeriod.toFixed(0),
                                  direction: buoyData.swellDirectionDeg !== null
                                    ? formatSwellDirection(buoyData.swellDirectionDeg)
                                    : null,
                                  directionDeg: buoyData.swellDirectionDeg,
                                  isPrimary: true,
                                });
                              }

                              // Show buoy wind wave component if available
                              if (buoyData.windWaveHeight !== null && buoyData.windWavePeriod !== null) {
                                swells.push({
                                  label: 'WIND',
                                  height: buoyData.windWaveHeight.toFixed(1),
                                  period: buoyData.windWavePeriod.toFixed(0),
                                  direction: buoyData.windWaveDirectionDeg !== null
                                    ? formatSwellDirection(buoyData.windWaveDirectionDeg)
                                    : null,
                                  directionDeg: buoyData.windWaveDirectionDeg,
                                  isPrimary: false,
                                });
                              }
                            }
                          } else {
                            // No buoy data available or buoy data is stale - use forecast without validation
                            console.log('[Validation] Buoy data unavailable or stale - using forecast without validation');

                            // Primary swell
                            if (currentConditions.waveHeightFt !== null && currentConditions.waveHeightFt > 0 &&
                                currentConditions.wavePeriodSec !== null) {
                              const heightNum = typeof currentConditions.waveHeightFt === 'string'
                                ? parseFloat(currentConditions.waveHeightFt)
                                : currentConditions.waveHeightFt;
                              const periodNum = typeof currentConditions.wavePeriodSec === 'string'
                                ? parseFloat(currentConditions.wavePeriodSec)
                                : currentConditions.wavePeriodSec;

                              if (!isNaN(heightNum) && !isNaN(periodNum)) {
                                swells.push({
                                  label: 'PRIMARY',
                                  height: heightNum.toFixed(1),
                                  period: periodNum.toFixed(0),
                                  direction: currentConditions.waveDirectionDeg !== null
                                    ? formatSwellDirection(currentConditions.waveDirectionDeg)
                                    : null,
                                  directionDeg: currentConditions.waveDirectionDeg,
                                  isPrimary: true,
                                });
                              }
                            }

                            // Secondary swell
                            if (currentConditions.secondarySwellHeightFt !== null && currentConditions.secondarySwellPeriodS !== null) {
                              const heightNum = typeof currentConditions.secondarySwellHeightFt === 'string'
                                ? parseFloat(currentConditions.secondarySwellHeightFt)
                                : currentConditions.secondarySwellHeightFt;
                              const periodNum = typeof currentConditions.secondarySwellPeriodS === 'string'
                                ? parseFloat(currentConditions.secondarySwellPeriodS)
                                : currentConditions.secondarySwellPeriodS;

                              if (!isNaN(heightNum) && !isNaN(periodNum)) {
                                swells.push({
                                  label: 'SECONDARY',
                                  height: heightNum.toFixed(1),
                                  period: periodNum.toFixed(0),
                                  direction: currentConditions.secondarySwellDirectionDeg !== null
                                    ? formatSwellDirection(currentConditions.secondarySwellDirectionDeg)
                                    : null,
                                  directionDeg: currentConditions.secondarySwellDirectionDeg,
                                  isPrimary: false,
                                });
                              }
                            }

                            // Wind swell
                            if (currentConditions.windWaveHeightFt !== null && currentConditions.windWavePeriodS !== null) {
                              const heightNum = typeof currentConditions.windWaveHeightFt === 'string'
                                ? parseFloat(currentConditions.windWaveHeightFt)
                                : currentConditions.windWaveHeightFt;
                              const periodNum = typeof currentConditions.windWavePeriodS === 'string'
                                ? parseFloat(currentConditions.windWavePeriodS)
                                : currentConditions.windWavePeriodS;

                              if (!isNaN(heightNum) && !isNaN(periodNum)) {
                                swells.push({
                                  label: 'WIND',
                                  height: heightNum.toFixed(1),
                                  period: periodNum.toFixed(0),
                                  direction: currentConditions.windWaveDirectionDeg !== null
                                    ? formatSwellDirection(currentConditions.windWaveDirectionDeg)
                                    : null,
                                  directionDeg: currentConditions.windWaveDirectionDeg,
                                  isPrimary: false,
                                });
                              }
                            }
                          }

                          if (swells.length === 0) {
                            return <p className="text-sm text-black uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>No swell data</p>;
                          }

                          return (
                            <div className="space-y-2 sm:space-y-3">
                              {swells.map((swell, i) => (
                                <div
                                  key={i}
                                  className={`${swell.isPrimary
                                    ? 'border-l-4 border-blue-500 pl-3 py-1'
                                    : 'border-l-2 border-gray-200 pl-3 py-0.5'}`}
                                >
                                  <div className="flex items-baseline gap-2">
                                    <span
                                      className={`text-2xl sm:text-3xl font-black uppercase tracking-tight ${swell.isPrimary ? 'text-black' : 'text-gray-700'}`}
                                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                                    >
                                      {swell.height}FT
                                    </span>
                                    <span
                                      className={`text-sm sm:text-base font-medium ${swell.isPrimary ? 'text-gray-600' : 'text-gray-500'}`}
                                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                    >
                                      {swell.period}s
                                    </span>
                                    {swell.directionDeg !== null && swell.directionDeg !== undefined && (
                                      <div className="flex items-center gap-1">
                                        <DirectionArrow degrees={swell.directionDeg} />
                                        {swell.direction && (
                                          <span
                                            className={`text-xs sm:text-sm ${swell.isPrimary ? 'text-gray-600' : 'text-gray-500'}`}
                                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                          >
                                            {swell.direction}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div
                                    className={`text-[9px] uppercase tracking-widest mt-0.5 ${swell.isPrimary ? 'text-blue-600' : 'text-gray-400'}`}
                                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                  >
                                    {swell.label}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Additional Sections: Wind, Tide, Temperature, Wetsuit */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 mt-3 border-t-2 border-b-2 border-black">
                      {/* Wind */}
                      <div className="bg-white p-2 sm:p-3">
                        <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Wind
                        </p>
                        {currentConditions.windSpeedMph !== null && currentConditions.windDirectionDeg !== null ? (
                          <div>
                            <p className="text-xl sm:text-2xl font-black text-black leading-none uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                              {Math.round(currentConditions.windSpeedMph)}{currentConditions.windGustsMph !== null && currentConditions.windGustsMph > currentConditions.windSpeedMph && (
                                <sup className="text-sm sm:text-base font-bold ml-0.5">{Math.round(currentConditions.windGustsMph)}</sup>
                              )}<span className="text-base sm:text-lg">mph</span> {(() => {
                                const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
                                const index = Math.round(currentConditions.windDirectionDeg / 22.5) % 16;
                                return directions[index];
                              })()}
                            </p>
                            {currentConditions.windType && (
                              <span className={`inline-block mt-1 text-[9px] uppercase tracking-wider px-2 py-0.5 border ${
                                currentConditions.windType === 'offshore' || currentConditions.windType === 'side-offshore'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : currentConditions.windType === 'cross'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : 'bg-red-50 text-red-700 border-red-300'
                              }`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {currentConditions.windType.replace('-', ' ')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 uppercase" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>—</p>
                        )}
                      </div>

                      {/* Tide */}
                      <div className="bg-white p-2 sm:p-3">
                        <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Tide
                        </p>
                        {currentConditions.tideHeightFt !== null ? (
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-xl sm:text-2xl font-black text-black leading-none uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                                {(currentConditions.tideHeightFt / 10).toFixed(1)}<span className="text-base sm:text-lg">FT</span>
                              </p>
                              {currentConditions.tidePhase === "rising" && (
                                <ArrowUp className="h-4 w-4 text-black" />
                              )}
                              {currentConditions.tidePhase === "falling" && (
                                <ArrowDown className="h-4 w-4 text-black" />
                              )}
                            </div>
                            {currentConditions.tidePhase && (
                              <p className="text-[9px] uppercase tracking-widest text-gray-500 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {currentConditions.tidePhase}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 uppercase" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>—</p>
                        )}
                      </div>

                      {/* Temperature */}
                      <div className="bg-white p-2 sm:p-3">
                        <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Temp
                        </p>
                        {currentConditions.waterTempF !== null || currentConditions.airTempF !== null ? (
                          <div>
                            <p className="text-xl sm:text-2xl font-black text-black leading-none uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                              {currentConditions.waterTempF !== null ? `${Math.round(currentConditions.waterTempF)}°` : '—'}
                              <span className="text-[10px] sm:text-xs font-normal text-gray-500 ml-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>water</span>
                            </p>
                            <p className="text-sm sm:text-base font-black text-gray-600 leading-none uppercase tracking-tight mt-1" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                              {currentConditions.airTempF !== null ? `${Math.round(currentConditions.airTempF)}°` : '—'}
                              <span className="text-[10px] sm:text-xs font-normal text-gray-400 ml-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>air</span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 uppercase" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>—</p>
                        )}
                      </div>

                      {/* Wetsuit */}
                      <div className="bg-white p-2 sm:p-3">
                        <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Wetsuit
                        </p>
                        {currentConditions.waterTempF !== null ? (
                          <div>
                            {(() => {
                              const { thickness, color } = getWetsuitRecommendation(currentConditions.waterTempF);
                              return (
                                <p className={`text-lg sm:text-xl font-black leading-none uppercase tracking-tight ${color}`} style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                                  {thickness}
                                </p>
                              );
                            })()}
                            <p className="text-[9px] sm:text-[10px] font-normal text-gray-500 uppercase tracking-wider mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {getWetsuitAccessories(currentConditions.waterTempF, currentConditions.airTempF)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 uppercase" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>—</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Loading conditions...</p>
                    {timelineQuery.isLoading && (
                      <Loader2 className="h-6 w-6 animate-spin text-black mx-auto mt-4" />
                    )}
                  </div>
                )}
              </div>
              
              {/* Quality Bar with Color Zones */}
              {forecast && (
                <div className="px-4 pb-3">
                  <div className="relative w-full h-4 rounded-full overflow-hidden">
                    {/* Multi-zone gradient background */}
                    <div className="absolute inset-0 flex">
                      <div className="w-[40%] bg-gradient-to-r from-red-500 to-red-400" /> {/* 0-39: Don't Bother */}
                      <div className="w-[20%] bg-gradient-to-r from-red-400 to-yellow-500" /> {/* 40-59: Worth a Look */}
                      <div className="w-[16%] bg-gradient-to-r from-yellow-500 to-lime-500" /> {/* 60-75: Go Surf */}
                      <div className="w-[15%] bg-gradient-to-r from-lime-500 to-green-600" /> {/* 76-90: Firing */}
                      <div className="w-[9%] bg-gradient-to-r from-green-600 to-emerald-600" /> {/* 91-100: All-Time */}
                    </div>
                    
                    {/* Diamond indicator */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 z-10"
                      style={{
                        left: `${Math.min(100, Math.max(0, currentData.score))}%`,
                        transform: `translate(-50%, -50%) rotate(45deg)`,
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#000000',
                        border: '2px solid #ffffff',
                      }}
                    />
                  </div>
                  
                  {/* Rating label - clickable to show breakdown */}
                  <button
                    onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
                    className="w-full text-center mt-2 group cursor-pointer"
                  >
                    <span className="text-sm font-bold text-black uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {getRatingLabel(currentData.score)}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 group-hover:text-black transition-colors flex items-center gap-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <ExpandArrow expanded={showScoreBreakdown} size={10} />
                      {showScoreBreakdown
                        ? (isAuthenticated ? 'Hide breakdown' : 'Hide preview')
                        : (isAuthenticated ? 'Why this rating?' : 'Unlock breakdown')}
                    </span>
                  </button>

                  {/* Score Breakdown - Expandable */}
                  {showScoreBreakdown && currentConditions && (
                    <div className="mt-4 pt-4 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
                      <GateOverlay
                        locked={!isAuthenticated}
                        title="FULL SCORE BREAKDOWN"
                        description="Sign in to unlock the full factor breakdown."
                        ctaLabel="SIGN IN TO UNLOCK"
                        onUnlock={handleUnlockSpot}
                        compact={true}
                        cardClassName="max-w-lg"
                        overlayClassName="items-center"
                      >
                        <div className="flex justify-center gap-8">
                        {/* Swell Score - uses NOAA buoy data when available */}
                        <div className="text-center">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Swell</div>
                          {(() => {
                            const buoyData = buoyQuery.data;
                            const swellHeight = buoyData?.waveHeight ?? currentConditions.dominantSwellHeightFt ?? 0;
                            const swellPeriod = buoyData?.dominantPeriod ?? currentConditions.dominantSwellPeriodS;
                            return (
                              <>
                                <div className={`text-2xl font-black ${
                                  swellHeight >= 3 ? 'text-emerald-600' :
                                  swellHeight >= 2 ? 'text-amber-500' :
                                  'text-red-500'
                                }`} style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                                  {swellHeight > 0 ? `${Number(swellHeight).toFixed(1)}ft` : '—'}
                                </div>
                                <div className="text-[10px] text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                  {swellPeriod ? `${Math.round(swellPeriod)}s period` : ''}
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Wind Score */}
                        <div className="text-center">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Wind</div>
                          <div className={`text-2xl font-black ${
                            currentConditions.windType === 'offshore' ? 'text-emerald-600' :
                            currentConditions.windType === 'onshore' ? 'text-red-500' :
                            currentConditions.windType === 'side-offshore' ? 'text-gray-500' :
                            'text-amber-500'
                          }`} style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                            {currentConditions.windType === 'offshore' ? '✓' :
                             currentConditions.windType === 'onshore' ? '✗' :
                             currentConditions.windType === 'side-offshore' ? '~' : '~'}
                          </div>
                          <div className="text-[10px] text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {currentConditions.windSpeedMph ? (
                              <>
                                {Math.round(currentConditions.windSpeedMph)}
                                {currentConditions.windGustsMph && currentConditions.windGustsMph > currentConditions.windSpeedMph && (
                                  <sup className="text-[8px]">{Math.round(currentConditions.windGustsMph)}</sup>
                                )}
                                mph {currentConditions.windType ?? ''}
                              </>
                            ) : '—'}
                          </div>
                        </div>

                        {/* Tide Score */}
                        <div className="text-center">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Tide</div>
                          <div className={`text-2xl font-black ${
                            currentConditions.tidePhase === 'rising' || currentConditions.tidePhase === 'falling' ? 'text-emerald-600' :
                            'text-amber-500'
                          }`} style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                            <TrendArrow
                              rising={currentConditions.tidePhase === 'rising' || currentConditions.tidePhase === 'high'}
                              size={20}
                            />
                          </div>
                          <div className="text-[10px] text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {currentConditions.tideHeightFt ? `${(currentConditions.tideHeightFt / 10).toFixed(1)}ft ${currentConditions.tidePhase ?? ''}` : '—'}
                          </div>
                        </div>

                        {/* Overall Score */}
                        <div className="text-center">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Score</div>
                          <div className="text-2xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                            {Math.round(currentData.score)}
                          </div>
                          <div className="text-[10px] text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            out of 100
                          </div>
                        </div>
                      </div>
                      </GateOverlay>
                    </div>
                  )}
                </div>
              )}

              {/* Share Your Session - Full Width */}
              {isAuthenticated && (
                <div className="border-t-2 border-gray-200 bg-white p-2 sm:p-3">
                  <div className="border-2 border-black bg-white max-w-4xl mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex-shrink-0">
                        <span className="text-[9px] uppercase tracking-widest text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Share Your Session
                        </span>
                      </div>
                      <div className="flex flex-1 items-center gap-2">
                        <div className="flex-1">
                          <ReportDatePicker
                            selectedDate={reportDate}
                            onDateChange={setReportDate}
                          />
                        </div>
                        <Button
                          onClick={handleSubmitReport}
                          className="w-auto bg-black text-white hover:bg-gray-800 border-2 border-black px-4 py-1.5 text-xs font-bold uppercase whitespace-nowrap"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          Submit Report →
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Forecast Timeline - Multi-Day Forecast - NYC Grit Style */}
            <div className="bg-white border border-black">
              <div className="p-3 md:p-4 border-b border-black">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-2xl md:text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                      7-DAY FORECAST
                    </h2>
                    <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Quality scores and conditions for the next 7 days
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-gray-400 uppercase tracking-wide hidden md:block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Wave Heights:</span>
                    <div className="flex border border-black overflow-hidden" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <button
                        onClick={() => setDayCardModel('euro')}
                        className={`px-2 py-1 text-[9px] uppercase tracking-wider transition-colors ${dayCardModel === 'euro' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                      >
                        Euro
                      </button>
                      <button
                        onClick={() => setDayCardModel('om')}
                        className={`px-2 py-1 text-[9px] uppercase tracking-wider transition-colors ${dayCardModel === 'om' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                      >
                        OM
                      </button>
                    </div>
                  </div>
                  {(!timelineQuery.data?.timeline || timelineQuery.data.timeline.length === 0) && (
                    <Button
                      onClick={() => refreshTimelineMutation.mutate({ spotId })}
                      disabled={refreshTimelineMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="border-black text-black hover:bg-gray-50 font-bold uppercase tracking-wide"
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                    >
                      {refreshTimelineMutation.isPending ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          FETCHING...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1.5" />
                          FETCH FORECAST
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {/* Tab Navigation */}
                {timelineQuery.data?.timeline && timelineQuery.data.timeline.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setForecastView("timeline")}
                      className={cn(
                        "px-3 py-2 md:px-6 md:py-3 text-xs md:text-sm font-bold uppercase tracking-wide transition-all duration-200 border-2",
                        forecastView === "timeline"
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-100"
                      )}
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                    >
                      Timeline
                    </button>
                    <button
                      onClick={() => setForecastView("chart")}
                      className={cn(
                        "px-3 py-2 md:px-6 md:py-3 text-xs md:text-sm font-bold uppercase tracking-wide transition-all duration-200 border-2",
                        forecastView === "chart"
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-100"
                      )}
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                    >
                      Chart
                    </button>
                  </div>
                )}
              </div>
              {timelineQuery.isLoading ? (
                <div className="p-4 md:p-6">
                  <div className="flex items-center justify-center py-8 md:py-12">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-black" />
                      <span className="text-[8px] md:text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        LOADING FORECAST DATA...
                      </span>
                    </div>
                  </div>
                </div>
              ) : timelineQuery.data?.timeline && timelineQuery.data.timeline.length > 0 ? (
                forecastView === "chart" ? (
                  <div className="relative">
                    <div style={!isAuthenticated ? { filter: "blur(4px)", userSelect: "none", pointerEvents: "none" } : undefined}>
                      <WaveForecastChart spotId={spotId} />
                    </div>
                    {!isAuthenticated && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                        <Lock className="h-5 w-5 text-black" />
                        <div className="text-[10px] uppercase tracking-widest text-black font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Members Only
                        </div>
                        <a
                          href="/sign-in"
                          className="border border-black px-3 py-1.5 text-[10px] uppercase tracking-wider bg-white hover:bg-black hover:text-white transition-colors"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          Join NYC Surf Co →
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                <div className="divide-y-2 divide-black">
                    {(() => {
                      const gatedStartIndex = 2;
                      const gateOverlayIndex =
                        groupedTimeline.length > gatedStartIndex
                          ? Math.floor((gatedStartIndex + groupedTimeline.length - 1) / 2)
                          : -1;

                      return groupedTimeline.map(([dayKey, points], dayIndex) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      // Parse ISO date string (YYYY-MM-DD) to create date in local timezone
                      const [year, month, day] = dayKey.split('-').map(Number);
                      const dayDate = new Date(year, month - 1, day);
                      dayDate.setHours(0, 0, 0, 0);
                      
                      const isToday = dayDate.getTime() === today.getTime();
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const isTomorrow = dayDate.getTime() === tomorrow.getTime();
                        
                        // Calculate day summary stats (prefer Day 1 MVP fields if available)
                        // New logic: Prioritize daylight hours if at least 50% are surfable
                        const spot = spotQuery.data;
                        
                        // Calculate validScores for all hours (used by bestScore calculation)
                        const validScores = points.map(p => getEffectiveQualityScore(p, dayCardModel));
                        let avgScore: number;

                        if (spot) {
                          // Filter points to daylight hours only
                          const daylightPoints = points.filter(p => {
                            return !isNighttime(p.forecastTimestamp, parseFloat(String(spot.latitude)), parseFloat(String(spot.longitude)));
                          });

                          // Get scores for daylight hours
                          const daylightScores = daylightPoints.map(p => getEffectiveQualityScore(p, dayCardModel));
                          
                          // Check if at least 50% of daylight hours are surfable (score >= 40)
                          const surfableDaylightHours = daylightScores.filter(s => s >= 40).length;
                          const daylightSurfablePercentage = daylightScores.length > 0 ? surfableDaylightHours / daylightScores.length : 0;
                          
                          // Need at least 2 daylight hours to apply the 50% rule
                          if (daylightScores.length >= 2 && daylightSurfablePercentage >= 0.5) {
                            // Use average of all daylight hours
                            avgScore = daylightScores.length > 0 
                              ? Math.round(daylightScores.reduce((a, b) => a + b, 0) / daylightScores.length)
                              : 0;
                          } else {
                            // Fall back to all hours average (current logic)
                            avgScore = validScores.length > 0 
                          ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
                          : 0;
                          }
                        } else {
                          // Fall back to all hours average if spot data not available
                          avgScore = validScores.length > 0 
                            ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
                            : 0;
                        }
                        const bestScore = validScores.length > 0 ? Math.max(...validScores) : 0;
                        
                        // Use breakingWaveHeightFt which accounts for period (3s wind chop != surfable waves)
                        // 0 is a valid value meaning flat conditions, so we use explicit null check
                        const validHeights = points.map(p => p.breakingWaveHeightFt !== null ? p.breakingWaveHeightFt : (p.dominantSwellHeightFt ?? p.waveHeightFt)).filter(h => h !== null) as number[];
                        const avgHeight = validHeights.length > 0
                          ? validHeights.reduce((a, b) => a + b, 0) / validHeights.length
                          : null;
                        const heightRange = avgHeight !== null ? `${avgHeight.toFixed(1)}ft` : "N/A";

                        // Euro avg height for day card toggle
                        const euroHeights = points.map(p => p.ecmwfWaveHeightFt != null ? Number(p.ecmwfWaveHeightFt) : null).filter(h => h !== null) as number[];
                        const avgEuroHeight = euroHeights.length > 0
                          ? euroHeights.reduce((a, b) => a + b, 0) / euroHeights.length
                          : null;

                        const validPeriods = points.map(p => p.dominantSwellPeriodS ?? p.wavePeriodSec).filter(p => p !== null && p > 0) as number[];
                        const avgPeriod = validPeriods.length > 0
                          ? (validPeriods.reduce((a, b) => a + b, 0) / validPeriods.length).toFixed(1)
                          : "N/A";
                        
                        // Determine confidence based on day
                        // Today and Tomorrow: High Confidence
                        // Day 3 (index 2): Medium Confidence
                        // Beyond that: use calculated confidence
                        let displayConfidence: "High" | "Medium" | "Low";
                        let confidenceLabel: string;
                        
                        if (isToday || isTomorrow) {
                          displayConfidence = "High";
                          confidenceLabel = "High Confidence";
                        } else if (dayIndex === 2) {
                          // Day 3 (0-indexed, so index 2)
                          displayConfidence = "Medium";
                          confidenceLabel = "Medium Confidence";
                        } else {
                          // Get most common confidence band for days beyond day 3
                          const confidenceCounts = { High: 0, Medium: 0, Low: 0 };
                          points.forEach(p => {
                            if (p.confidenceBand) confidenceCounts[p.confidenceBand]++;
                          });
                          const dominantConfidence = Object.entries(confidenceCounts)
                            .sort(([, a], [, b]) => b - a)[0]?.[0] as "High" | "Medium" | "Low" | undefined;
                          displayConfidence = dominantConfidence || "Medium";
                          confidenceLabel = displayConfidence === "High" ? "High Confidence" 
                            : displayConfidence === "Medium" ? "Medium Confidence" 
                            : "Low Confidence";
                        }
                        
                        // Day label - uppercase format
                        let dayLabel = "";
                        let fullDayName = "";
                        if (isToday) {
                          fullDayName = "TODAY";
                          dayLabel = `TODAY (${dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()})`;
                        } else if (isTomorrow) {
                          fullDayName = "TOMORROW";
                          dayLabel = `TOMORROW (${dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()})`;
                        } else {
                          fullDayName = getFullDayName(dayDate);
                          dayLabel = `${fullDayName} (${dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()})`;
                        }
                        
                        // Calculate average quality rating for the day
                        let avgQualityRating = getRatingLabel(avgScore);
                        let verdictLabel = getVerdictLabel(avgQualityRating);
                        
                        // Calculate surfable daylight hours for callout with quality differentiation
                        let surfableDaylightHoursCount = 0;
                        let bestQualityRating: string | null = null;
                        if (spot) {
                          const daylightPoints = points.filter(p => {
                            return !isNighttime(p.forecastTimestamp, parseFloat(String(spot.latitude)), parseFloat(String(spot.longitude)));
                          });
                          const daylightScores = daylightPoints.map(p => getEffectiveQualityScore(p, dayCardModel));
                          const surfableScores = daylightScores.filter(s => s >= 40);
                          surfableDaylightHoursCount = surfableScores.length;

                          // Determine best quality rating among surfable hours
                          if (surfableScores.length > 0) {
                            const maxScore = Math.max(...surfableScores);
                            if (maxScore >= 91) {
                              bestQualityRating = "All-Time";
                            } else if (maxScore >= 76) {
                              bestQualityRating = "Firing";
                            } else if (maxScore >= 60) {
                              bestQualityRating = "Go Surf";
                            } else {
                              bestQualityRating = "Worth a Look";
                            }
                          }
                        } else {
                          // Fallback: count all hours if spot data unavailable
                          const allScores = points.map(p => getEffectiveQualityScore(p, dayCardModel));
                          const surfableScores = allScores.filter(s => s >= 40);
                          surfableDaylightHoursCount = surfableScores.length;
                          
                          if (surfableScores.length > 0) {
                            const maxScore = Math.max(...surfableScores);
                            if (maxScore >= 91) {
                              bestQualityRating = "All-Time";
                            } else if (maxScore >= 76) {
                              bestQualityRating = "Firing";
                            } else if (maxScore >= 60) {
                              bestQualityRating = "Go Surf";
                            } else {
                              bestQualityRating = "Worth a Look";
                            }
                          }
                        }
                        
                        // Override day badge by surfable hours: 2-4 hr → Worth a Look, 5+ hr → Go Surf
                        // Cap at best single-hour rating — can't show "Go Surf" if no hour actually hits 60
                        let displayScore = avgScore;
                        if (surfableDaylightHoursCount >= 5) {
                          if (bestScore >= 60) {
                            verdictLabel = "GO SURF";
                            displayScore = 65;
                          } else {
                            verdictLabel = "WORTH A LOOK";
                            displayScore = 50;
                          }
                        } else if (surfableDaylightHoursCount >= 2) {
                          verdictLabel = "WORTH A LOOK";
                          displayScore = 50;
                        }
                        
                        // Show callout if verdict is "Don't Bother" but there are surfable hours (1 hr only after override)
                        const showSurfableHoursCallout = verdictLabel === "DON'T BOTHER" && surfableDaylightHoursCount > 0;
                        
                        // Calculate wave height range (min-max) for AM and PM separately
                        const amPoints = points.filter(p => {
                          const date = new Date(p.forecastTimestamp);
                          return date.getHours() < 12;
                        });
                        const pmPoints = points.filter(p => {
                          const date = new Date(p.forecastTimestamp);
                          return date.getHours() >= 12;
                        });
                        
                        const calculateConditions = (pointSet: typeof points) => {
                          const heights = pointSet.map(p => {
                            if (dayCardModel === 'euro' && p.ecmwfWaveHeightFt != null) return Number(p.ecmwfWaveHeightFt);
                            return p.breakingWaveHeightFt !== null ? p.breakingWaveHeightFt : (p.dominantSwellHeightFt ?? p.waveHeightFt);
                          }).filter(h => h !== null) as number[];
                          const periods = pointSet.map(p => p.dominantSwellPeriodS ?? p.wavePeriodSec).filter(p => p !== null && p > 0) as number[];
                          const windSpeeds = pointSet.map(p => p.windSpeedMph).filter(s => s !== null) as number[];
                          const windDirs = pointSet.map(p => p.windDirectionDeg).filter(d => d !== null) as number[];

                          if (heights.length === 0 || periods.length === 0) {
                            return { heightStr: "N/A", periodStr: "N/A", windStr: "N/A" };
                          }

                          // Use average height - formatSurfHeight already returns a range label like "3-4ft"
                          const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
                          const avgPeriod = (periods.reduce((a, b) => a + b, 0) / periods.length).toFixed(0);

                          // Calculate average wind
                          let windStr = "N/A";
                          if (windSpeeds.length > 0 && windDirs.length > 0) {
                            const avgWindSpeed = Math.round(windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length);
                            // Average wind direction (handle 360° wrap-around)
                            const sinSum = windDirs.reduce((sum, dir) => sum + Math.sin(dir * Math.PI / 180), 0);
                            const cosSum = windDirs.reduce((sum, dir) => sum + Math.cos(dir * Math.PI / 180), 0);
                            const avgWindDir = Math.round((Math.atan2(sinSum / windDirs.length, cosSum / windDirs.length) * 180 / Math.PI + 360) % 360);
                            const windCardinal = formatDirection(avgWindDir);
                            windStr = `${windCardinal?.cardinal || ''} ${avgWindSpeed}mph`;
                          }

                          return { heightStr: formatSurfHeight(avgHeight), periodStr: `${avgPeriod}s`, windStr };
                        };
                        
                        const amConditions = calculateConditions(amPoints);
                        const pmConditions = calculateConditions(pmPoints);

                        const amScores = amPoints.map(p => getEffectiveQualityScore(p, dayCardModel));
                        const amAvgScore = amScores.length > 0
                          ? Math.round(amScores.reduce((a, b) => a + b, 0) / amScores.length)
                          : 0;
                        const pmScores = pmPoints.map(p => getEffectiveQualityScore(p, dayCardModel));
                        const pmAvgScore = pmScores.length > 0
                          ? Math.round(pmScores.reduce((a, b) => a + b, 0) / pmScores.length)
                          : 0;

                        let conditionsStr = "CONDITIONS";
                        if (amConditions.heightStr !== "N/A" && pmConditions.heightStr !== "N/A") {
                          conditionsStr = `CONDITIONS AM: ${amConditions.heightStr} ${amConditions.periodStr} PM: ${pmConditions.heightStr} ${pmConditions.periodStr}`;
                        } else if (amConditions.heightStr !== "N/A") {
                          conditionsStr = `CONDITIONS AM: ${amConditions.heightStr} ${amConditions.periodStr}`;
                        } else if (pmConditions.heightStr !== "N/A") {
                          conditionsStr = `CONDITIONS PM: ${pmConditions.heightStr} ${pmConditions.periodStr}`;
                        } else {
                          conditionsStr = "CONDITIONS: N/A";
                        }
                        
                        // Calculate average wind for the day
                        const validWindSpeeds = points.map(p => p.windSpeedMph).filter(s => s !== null) as number[];
                        const validWindDirs = points.map(p => p.windDirectionDeg).filter(d => d !== null) as number[];
                        const avgWindSpeed = validWindSpeeds.length > 0 
                          ? Math.round(validWindSpeeds.reduce((a, b) => a + b, 0) / validWindSpeeds.length)
                          : null;
                        // Average wind direction (handle 360° wrap-around)
                        let avgWindDir: number | null = null;
                        if (validWindDirs.length > 0) {
                          const sinSum = validWindDirs.reduce((sum, dir) => sum + Math.sin(dir * Math.PI / 180), 0);
                          const cosSum = validWindDirs.reduce((sum, dir) => sum + Math.cos(dir * Math.PI / 180), 0);
                          avgWindDir = Math.round((Math.atan2(sinSum / validWindDirs.length, cosSum / validWindDirs.length) * 180 / Math.PI + 360) % 360);
                        }
                        const windDirCardinal = avgWindDir !== null ? formatDirection(avgWindDir) : null;
                        
                        // Calculate confidence percentage (High = 95%, Medium = 75%, Low = 50%)
                        // Days 6-7 (dayIndex >= 5) always show 25% due to extended forecast uncertainty
                        const confidencePercentage = dayIndex >= 5 ? 25 : (displayConfidence === "High" ? 95 : displayConfidence === "Medium" ? 75 : 50);
                        
                        const isExpanded = expandedDays.has(dayKey);
                        
                        // Calculate best windows for use in expanded section
                        const bestWindows = analyzeBestWindows(points);
                        const avoidWindows = findAvoidWindows(points);

                        // Format average height for display (Euro or OM based on toggle)
                        const displayAvgHeight = dayCardModel === 'euro' && avgEuroHeight !== null
                          ? formatSurfHeight(avgEuroHeight)
                          : (avgHeight !== null ? formatSurfHeight(avgHeight) : "N/A");

                        // Get accent color based on score
                        const getAccentColor = (score: number) => {
                          if (score >= 91) return 'border-l-emerald-500';
                          if (score >= 76) return 'border-l-green-500';
                          if (score >= 60) return 'border-l-lime-500';
                          if (score >= 40) return 'border-l-yellow-400';
                          return 'border-l-red-400';
                        };

                        const dayNeedsGate = !isAuthenticated && dayIndex >= 2;

                        const dayCard = (
                          <div
                            key={dayKey}
                            className={`${showSurfableHoursCallout ? 'bg-white' : getCardBackgroundColor(displayScore)} border-l-4 ${getAccentColor(displayScore)} transition-all`}
                          >
                            {/* Day Summary Card */}
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedDays);
                                if (isExpanded) {
                                  newExpanded.delete(dayKey);
                                } else {
                                  newExpanded.add(dayKey);
                                }
                                setExpandedDays(newExpanded);
                              }}
                              className="w-full px-3 py-2 md:px-4 md:py-2.5 text-left"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  {/* Top line: Day name + Badge + Confidence */}
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-lg md:text-2xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                                      {fullDayName}
                                    </h4>
                                    <span className={`${getScoreBadgeColors(displayScore).bg} ${getScoreBadgeColors(displayScore).text} px-1.5 py-0.5 text-[7px] md:text-[9px] font-bold tracking-wider uppercase`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                      {verdictLabel}
                                    </span>
                                    <span className="text-gray-400 text-[9px] md:text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                      {confidencePercentage}% Confidence
                                    </span>
                                  </div>

                                  {/* Surfable hours callout */}
                                  {showSurfableHoursCallout && (
                                    <div className="mb-1">
                                      <span className="inline-flex items-center gap-1 text-[8px] md:text-[10px] font-medium tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                        <Clock className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
                                        {surfableDaylightHoursCount}hr surfable{bestQualityRating && (bestQualityRating === "Go Surf" || bestQualityRating === "Firing" || bestQualityRating === "All-Time") ? ` • ${bestQualityRating}` : ''}
                                      </span>
                                    </div>
                                  )}

                                  {/* Extended forecast warning for days 6-7 */}
                                  {dayIndex >= 5 && (
                                    <div className="relative group mb-1">
                                      <span
                                        className="inline-flex items-center gap-1 text-[8px] md:text-[10px] font-medium tracking-wide text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 cursor-help"
                                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExtendedForecastTooltip(extendedForecastTooltip === dayKey ? null : dayKey);
                                        }}
                                      >
                                        <AlertTriangle className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
                                        Extended forecast
                                      </span>
                                      {/* Tooltip on hover (desktop) or tap (mobile) */}
                                      <div className={cn(
                                        "absolute left-0 bottom-full mb-1 z-50 w-48 p-2 text-xs bg-gray-900 text-white rounded shadow-lg",
                                        extendedForecastTooltip === dayKey ? "block" : "hidden group-hover:block"
                                      )}>
                                        East Coast forecasts are less accurate 6+ days out. Use as a swell indicator only—local winds are difficult to predict.
                                      </div>
                                    </div>
                                  )}

                                  {/* Stats: AM/PM rows */}
                                  <div className="space-y-0.5">
                                    {amConditions.heightStr !== "N/A" && (
                                      <div className="flex items-center gap-1.5 text-[10px] md:text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                        <span className="font-bold text-gray-400 w-5 text-[9px]">AM</span>
                                        <span className="font-black text-black text-sm md:text-base" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                                          {amConditions.heightStr}
                                        </span>
                                        <span className="text-gray-500">{amConditions.windStr}</span>
                                      </div>
                                    )}
                                    {pmConditions.heightStr !== "N/A" && (
                                      <div className="flex items-center gap-1.5 text-[10px] md:text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                        <span className="font-bold text-gray-400 w-5 text-[9px]">PM</span>
                                        <span className="font-black text-black text-sm md:text-base" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                                          {pmConditions.heightStr}
                                        </span>
                                        <span className="text-gray-500">{pmConditions.windStr}</span>
                                      </div>
                                    )}
                                    {amConditions.heightStr === "N/A" && pmConditions.heightStr === "N/A" && (
                                      <span className="text-gray-400 text-[10px]">No data</span>
                                    )}
                                  </div>

                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {verdictLabel === "GO SURF" && dayIndex >= 2 && (
                                    <a
                                      href="/members"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1 px-2 py-1 text-[9px] uppercase tracking-wider border border-black text-black bg-white hover:bg-black hover:text-white transition-colors whitespace-nowrap"
                                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                    >
                                      <Bell className="h-2.5 w-2.5" />
                                      Set up an alert
                                    </a>
                                  )}
                                  <ChevronDown className={`h-5 w-5 md:h-6 md:w-6 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                            </button>

                            {/* Expandable Section - Two White Boxes + Hourly Breakdown */}
                            <div
                              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                              }`}
                            >
                              <div className="px-3 pb-3 md:px-4 md:pb-4">
                                {/* BEST WINDOWS Box */}
                                <div className="mb-2 md:mb-2">
                                  <div className="bg-white border-2 border-black p-2 md:p-2.5">
                                    <span className="text-[8px] md:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BEST WINDOWS</span>
                                    {bestWindows.length === 0 ? (
                                      <p className="text-[10px] text-gray-600 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                        {(() => {
                                          const allScores = points.map(p => getEffectiveQualityScore(p, dayCardModel));
                                          const allBelow50 = allScores.every(s => s < 50);

                                          if (allBelow50) {
                                            const avgWindType = points.filter(p => p.windType === "onshore").length > points.length / 2 ? "onshore" : null;
                                            const avgPeriodNum = validPeriods.length > 0 ? validPeriods.reduce((a, b) => a + b, 0) / validPeriods.length : 0;
                                            const avgHeightNum = validHeights.length > 0 ? validHeights.reduce((a, b) => a + b, 0) / validHeights.length : 0;

                                            if (avgHeightNum < 2 && avgPeriodNum < 6 && avgWindType === "onshore") {
                                              return "None – small waves, short period, onshore winds all day";
                                            } else if (avgHeightNum < 2) {
                                              return "None – small waves all day";
                                            } else if (avgPeriodNum < 6) {
                                              return "None – short period all day";
                                            } else if (avgWindType === "onshore") {
                                              return "None – onshore winds all day";
                                            }
                                          }
                                          return "None – poor conditions all day";
                                        })()}
                                      </p>
                                    ) : (
                                      <div className="space-y-1.5 md:space-y-2">
                                        {bestWindows.map((window, idx) => (
                                          <div key={idx} className="text-xs md:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                            <p className="font-semibold">{window.label.toUpperCase()}: {window.timeRange}</p>
                                            <p className="text-[10px] md:text-xs text-gray-600">Quality: {window.avgScore}/100 · {window.waveHeight}, {window.windDesc}, {window.tideDesc}</p>
                                          </div>
                                        ))}
                                        {avoidWindows.length > 0 && avoidWindows.map((avoid, idx) => (
                                          <p key={`avoid-${idx}`} className="text-[9px] md:text-xs text-red-600 font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                            AVOID: {avoid.timeRange} ({avoid.reason})
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Hourly Breakdown Section */}
                                <div className="bg-white border-2 border-black">
                                  <div className="px-4 py-3 md:px-6 md:py-4 border-b-2 border-black flex items-center justify-between">
                                    <span className="text-[9px] md:text-[11px] font-bold tracking-wide text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>HOURLY BREAKDOWN</span>
                                    {/* Model toggle */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-[8px] text-gray-400 uppercase tracking-wide hidden md:block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Surf Heights:</span>
                                      <div className="flex border border-black overflow-hidden" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                        <button
                                          onClick={() => setHourlyModel('euro')}
                                          className={`px-2.5 py-1 text-[8px] md:text-[9px] font-bold tracking-wider uppercase transition-colors ${hourlyModel === 'euro' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                        >
                                          Euro
                                        </button>
                                        <button
                                          onClick={() => setHourlyModel('om')}
                                          className={`px-2.5 py-1 text-[8px] md:text-[9px] font-bold tracking-wider uppercase transition-colors border-l border-black ${hourlyModel === 'om' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                        >
                                          OM
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Mobile header */}
                                  <div className="md:hidden grid gap-x-2 px-2 py-2 bg-gray-50 border-b border-gray-200 text-[8px] font-bold tracking-wide text-gray-500 uppercase" style={{ gridTemplateColumns: '44px 68px 1fr 40px', fontFamily: "'JetBrains Mono', monospace" }}>
                                    <div></div>
                                    <div className="flex items-center gap-1">
                                      Surf
                                      <span className={`text-[7px] px-1 py-0.5 font-bold rounded ${hourlyModel === 'euro' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                                        {hourlyModel === 'euro' ? 'EURO' : 'OM'}
                                      </span>
                                    </div>
                                    <div>Wind</div>
                                    <div className="text-right">Pts</div>
                                  </div>

                                  {/* Desktop header */}
                                  <div className="hidden md:grid gap-x-3 px-4 py-3 bg-gray-50 border-b border-gray-200 text-[10px] font-bold tracking-wide text-gray-500 uppercase" style={{ gridTemplateColumns: '52px 88px 1.6fr 1.2fr 1.1fr 1.2fr 56px', fontFamily: "'JetBrains Mono', monospace" }}>
                                    <div></div>
                                    <div className="flex items-center gap-1.5">
                                      Surf
                                      <span className={`text-[7px] px-1 py-0.5 font-bold rounded ${hourlyModel === 'euro' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                                        {hourlyModel === 'euro' ? 'EURO' : 'OM'}
                                      </span>
                                    </div>
                                    <div>Primary Swell</div>
                                    <div>Secondary</div>
                                    <div>Wind</div>
                                    <div>Tide</div>
                                    <div className="text-right">Quality</div>
                                  </div>

                                  <div>
                                    {(() => {

                                      // Helper function to get quality border color (matches rating labels)
                                      // Don't Bother (0-39): red, Worth a Look (40-59): yellow
                                      // Go Surf (60-75): lime, Firing (76-90): green-600, All-Time (>90): emerald
                                      const getQualityBorderColor = (score: number): string => {
                                        const s = Math.round(score);
                                        if (s > 90) return 'bg-emerald-600';
                                        if (s >= 76) return 'bg-green-600';
                                        if (s >= 60) return 'bg-lime-500';
                                        if (s >= 40) return 'bg-yellow-500';
                                        return 'bg-red-500';
                                      };

                                      // Helper function to get star count (1-5 based on score 0-100)
                                      const getStarCount = (score: number): number => {
                                        if (score >= 90) return 5;
                                        if (score >= 70) return 4;
                                        if (score >= 49) return 3;
                                        if (score >= 30) return 2;
                                        return 1;
                                      };

                                      // Helper function to get tide info
                                      // Determines if current point is at high/low by comparing with adjacent points
                                      const getTideInfo = (point: typeof points[0], pointIndex: number, allPoints: typeof points): { 
                                        height: number | null; 
                                        state: 'rising' | 'dropping' | 'high' | 'low' | null;
                                      } => {
                                        const tideHeightFt = point.tideHeightFt !== null ? point.tideHeightFt / 10 : null;
                                        
                                        if (tideHeightFt === null) {
                                          return { height: null, state: null };
                                        }
                                        
                                        // Check if we're at a local maximum (HIGH) or minimum (LOW)
                                        const prevPoint = pointIndex > 0 ? allPoints[pointIndex - 1] : null;
                                        const nextPoint = pointIndex < allPoints.length - 1 ? allPoints[pointIndex + 1] : null;
                                        
                                        const prevHeight = prevPoint?.tideHeightFt != null ? prevPoint.tideHeightFt / 10 : null;
                                        const nextHeight = nextPoint?.tideHeightFt != null ? nextPoint.tideHeightFt / 10 : null;
                                        
                                        // Determine if this is a local maximum (HIGH) or minimum (LOW)
                                        if (prevHeight !== null && nextHeight !== null) {
                                          // Local maximum: current height is higher than both neighbors
                                          if (tideHeightFt > prevHeight && tideHeightFt > nextHeight) {
                                            return { height: tideHeightFt, state: 'high' };
                                          }
                                          // Local minimum: current height is lower than both neighbors
                                          if (tideHeightFt < prevHeight && tideHeightFt < nextHeight) {
                                            return { height: tideHeightFt, state: 'low' };
                                          }
                                        }
                                        
                                        // If we can't determine local max/min, determine direction from height comparison
                                        // If we have previous point, compare with it
                                        if (prevHeight !== null) {
                                          if (tideHeightFt > prevHeight) {
                                            return { height: tideHeightFt, state: 'rising' };
                                          } else if (tideHeightFt < prevHeight) {
                                            return { height: tideHeightFt, state: 'dropping' };
                                          }
                                        }
                                        
                                        // If we have next point but no previous, compare with next
                                        if (nextHeight !== null && prevHeight === null) {
                                          if (tideHeightFt < nextHeight) {
                                            return { height: tideHeightFt, state: 'rising' };
                                          } else if (tideHeightFt > nextHeight) {
                                            return { height: tideHeightFt, state: 'dropping' };
                                          }
                                        }
                                        
                                        // Fallback: use backend phase directly (no swapping)
                                        const tidePhase = point.tidePhase;
                                        let state: 'rising' | 'dropping' | 'high' | 'low' | null = null;
                                        if (tidePhase === 'rising') state = 'rising';
                                        else if (tidePhase === 'falling') state = 'dropping';
                                        else if (tidePhase === 'high') state = 'high';
                                        else if (tidePhase === 'low') state = 'low';
                                        
                                        return { height: tideHeightFt, state };
                                      };

                                      // Deduplicate points by time slot
                                      const seenTimes = new Set<string>();
                                      const uniquePoints = points.filter((point) => {
                                        const date = new Date(point.forecastTimestamp);
                                        const hour = date.getHours();
                                        const minute = date.getMinutes();
                                        const timeKey = `${hour}:${minute}`;

                                        if (seenTimes.has(timeKey)) {
                                          return false;
                                        }
                                        seenTimes.add(timeKey);
                                        return true;
                                      });

                                      // Sort by timestamp
                                      uniquePoints.sort((a, b) => {
                                        return new Date(a.forecastTimestamp).getTime() - new Date(b.forecastTimestamp).getTime();
                                      });

                                      return uniquePoints.map((point, index) => {
                                        const date = new Date(point.forecastTimestamp);
                                        const hour = date.getHours();
                                        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                        const period = hour < 12 ? 'am' : 'pm';
                                        const qualityScore = getEffectiveQualityScore(point, hourlyModel);

                                        // Check if this hour is during nighttime
                                        const isNight = spot ? isNighttime(point.forecastTimestamp, parseFloat(String(spot.latitude)), parseFloat(String(spot.longitude))) : false;

                                        // Wind data
                                        const windSpeed = point.windSpeedMph !== null ? Math.round(point.windSpeedMph) : null;
                                        const windGust = point.windGustsMph !== null ? Math.round(point.windGustsMph) : null;
                                        const windDir = point.windDirectionDeg !== null ? formatDirection(point.windDirectionDeg) : null;

                                        // Primary swell data (dominant swell or fallback to primary)
                                        // Note: decimal fields from database come as strings, convert to numbers
                                        const primarySwellHeight = point.dominantSwellHeightFt != null ? Number(point.dominantSwellHeightFt) : (point.waveHeightFt ?? null);
                                        const primarySwellPeriod = point.dominantSwellPeriodS ?? point.wavePeriodSec ?? null;
                                        const primarySwellDeg = point.dominantSwellDirectionDeg ?? point.waveDirectionDeg ?? null;
                                        const primarySwellDir = primarySwellDeg !== null ? formatDirection(primarySwellDeg) : null;

                                        // Secondary swell data (secondary swell or wind wave)
                                        // Note: decimal fields from database come as strings, convert to numbers
                                        const hasSecondarySwell = (Number(point.secondarySwellHeightFt) ?? 0) > 0;
                                        const secondaryHeight = hasSecondarySwell
                                          ? Number(point.secondarySwellHeightFt)
                                          : (point.windWaveHeightFt != null ? Number(point.windWaveHeightFt) : null);
                                        const secondaryPeriod = hasSecondarySwell
                                          ? point.secondarySwellPeriodS
                                          : (point.windWavePeriodS ?? null);
                                        const secondaryDeg = hasSecondarySwell
                                          ? point.secondarySwellDirectionDeg
                                          : (point.windWaveDirectionDeg ?? null);
                                        const secondaryDir = secondaryDeg !== null ? formatDirection(secondaryDeg) : null;

                                        const starCount = getStarCount(qualityScore);
                                        const tideInfo = getTideInfo(point, index, uniquePoints);

                                        // Calculate surf height for display
                                        const surfHeight = point.breakingWaveHeightFt !== null
                                          ? point.breakingWaveHeightFt
                                          : (primarySwellHeight ?? 0);
                                        // Format surf height range:
                                        // - At integer boundary (e.g., 4.0) → show range ending at that value (3-4ft)
                                        // - Slightly above (.1-.4) → add "+" modifier (3-4ft+)
                                        // - Near next range (.5+) → show next range (4-5ft)
                                        const formatSurfRange = (height: number): string => {
                                          if (height < 0.5) return 'Flat';
                                          if (height < 1) return '1ft';
                                          if (height <= 1.4) return '1ft+';
                                          if (height <= 2) return '1-2ft';
                                          if (height <= 2.4) return '1-2ft+';
                                          if (height <= 3) return '2-3ft';
                                          if (height <= 3.4) return '2-3ft+';
                                          if (height <= 4) return '3-4ft';
                                          if (height <= 4.4) return '3-4ft+';
                                          if (height <= 5) return '4-5ft';
                                          if (height <= 5.4) return '4-5ft+';
                                          if (height <= 6) return '5-6ft';
                                          if (height <= 6.4) return '5-6ft+';
                                          if (height <= 7) return '6-7ft';
                                          if (height <= 8) return '7-8ft';
                                          if (height <= 10) return '8-10ft';
                                          return '10ft+';
                                        };

                                        // Wind type for color coding
                                        const windType = point.windType ?? null;
                                        const windColor = windType === 'offshore' ? '#059669' : windType === 'onshore' ? '#ef4444' : windType === 'side-offshore' ? '#6b7280' : '#64748b';

                                        // Quality score color for pill
                                        const getScorePillStyle = (score: number) => {
                                          const s = Math.round(score);
                                          if (s > 90) return { bg: 'bg-emerald-600', text: 'text-white' };
                                          if (s >= 76) return { bg: 'bg-green-600', text: 'text-white' };
                                          if (s >= 60) return { bg: 'bg-lime-500', text: 'text-white' };
                                          if (s >= 40) return { bg: 'bg-yellow-400', text: 'text-gray-900' };
                                          return { bg: 'bg-red-400', text: 'text-white' };
                                        };
                                        const scorePill = getScorePillStyle(qualityScore);

                                        const euroAvailable = point.ecmwfWaveHeightFt != null;
                                        const showEuro = hourlyModel === 'euro' && euroAvailable;
                                        const displayHeight = showEuro
                                          ? formatSurfHeight(Number(point.ecmwfWaveHeightFt))
                                          : formatSurfRange(surfHeight);

                                        return (
                                          <Fragment key={`${point.forecastTimestamp}-${index}`}>
                                            {/* Mobile row — 4 columns: time | surf | wind | score */}
                                            <div
                                              className={cn(
                                                "md:hidden grid gap-x-2 px-2 py-2.5 border-b border-gray-100 relative items-center",
                                                isNight ? "bg-gray-100" : ""
                                              )}
                                              style={{ gridTemplateColumns: '44px 68px 1fr 40px' }}
                                            >
                                              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${getQualityBorderColor(qualityScore)}`} />
                                              {/* Time */}
                                              <span className="text-[11px] font-bold text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{hour12}<span className="text-gray-400 font-medium">{period}</span></span>
                                              {/* Surf height pill */}
                                              <div className="flex">
                                                <div className={`rounded-lg px-1.5 py-0.5 text-center ${showEuro ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-gray-100'}`}>
                                                  <span className={`text-xs font-bold ${showEuro ? 'text-blue-900' : 'text-gray-900'}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                    {displayHeight}
                                                  </span>
                                                </div>
                                              </div>
                                              {/* Wind */}
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[11px] font-bold text-gray-900 leading-none truncate" style={{ fontFamily: "'JetBrains Mono', monospace", color: windColor }}>
                                                  {windSpeed !== null ? `${windSpeed}mph` : '—'}
                                                  {windDir && <span className="text-gray-400 font-medium ml-1">{windDir.cardinal}</span>}
                                                </span>
                                                {point.windDirectionDeg !== null && (
                                                  <WindArrowBadge directionDeg={point.windDirectionDeg} windType={getWindBadgeType(windType)} />
                                                )}
                                              </div>
                                              {/* Score */}
                                              <div className="flex items-center justify-end">
                                                <div className={`${scorePill.bg} ${scorePill.text} rounded px-1 py-0.5 text-[11px] font-black tabular-nums leading-none`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                  {Math.round(qualityScore)}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Desktop row — full 7 columns */}
                                            <div
                                              className={cn(
                                                "hidden md:grid gap-x-3 px-4 py-2.5 border-b border-gray-100 relative transition-colors items-center",
                                                isNight ? "bg-gray-100 hover:bg-gray-200" : "hover:bg-gray-50"
                                              )}
                                              style={{ gridTemplateColumns: '52px 88px 1.6fr 1.2fr 1.1fr 1.2fr 56px' }}
                                            >
                                              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${getQualityBorderColor(qualityScore)}`} />
                                              {/* Time */}
                                              <div>
                                                <span className="text-[13px] font-bold text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{hour12}<span className="text-gray-400 font-medium">{period}</span></span>
                                              </div>
                                              {/* Surf height pill */}
                                              <div className="flex">
                                                <div className={`rounded-lg px-2.5 py-1 text-center ${showEuro ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-gray-100'}`}>
                                                  <span className={`text-sm font-bold ${showEuro ? 'text-blue-900' : 'text-gray-900'}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                    {displayHeight}
                                                  </span>
                                                </div>
                                              </div>
                                              {/* Primary Swell */}
                                              <div className="flex flex-col gap-0.5">
                                                <div className="flex items-baseline gap-1.5">
                                                  <span className="text-[14px] font-bold text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                    {primarySwellHeight !== null ? `${primarySwellHeight.toFixed(1)}ft` : '—'}
                                                  </span>
                                                  {primarySwellPeriod !== null && (
                                                    <span className="text-[11px] font-medium text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                      {Math.round(primarySwellPeriod)}s
                                                    </span>
                                                  )}
                                                </div>
                                                {primarySwellDir !== null && (
                                                  <div className="flex items-center gap-1">
                                                    {primarySwellDeg !== null && <SwellArrow directionDeg={primarySwellDeg} size={11} />}
                                                    <span className="text-[9px] text-gray-400 font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{primarySwellDir?.cardinal}</span>
                                                  </div>
                                                )}
                                              </div>
                                              {/* Secondary Swell */}
                                              <div className="flex flex-col gap-0.5">
                                                {secondaryHeight !== null && secondaryHeight > 0 ? (
                                                  <>
                                                    <div className="flex items-baseline gap-1.5">
                                                      <span className="text-[13px] font-semibold text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                        {secondaryHeight.toFixed(1)}ft
                                                      </span>
                                                      {secondaryPeriod !== null && (
                                                        <span className="text-[10px] font-medium text-gray-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                          {Math.round(secondaryPeriod)}s
                                                        </span>
                                                      )}
                                                    </div>
                                                    {secondaryDir !== null && (
                                                      <div className="flex items-center gap-1">
                                                        {secondaryDeg !== null && <SwellArrow directionDeg={secondaryDeg} size={10} secondary />}
                                                        <span className="text-[9px] text-gray-300 font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{secondaryDir?.cardinal}</span>
                                                      </div>
                                                    )}
                                                  </>
                                                ) : (
                                                  <span className="text-[11px] text-gray-200">—</span>
                                                )}
                                              </div>
                                              {/* Wind */}
                                              <div className="flex items-center gap-1.5">
                                                <div className="flex flex-col">
                                                  <span className="text-[13px] font-bold text-gray-900 leading-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                    {windSpeed !== null ? windSpeed : '—'}
                                                    {windGust !== null && windSpeed !== null && windGust > windSpeed && (
                                                      <sup className="text-[8px] font-bold text-gray-500 ml-0.5">{windGust}</sup>
                                                    )}
                                                    <span className="text-[9px] font-medium text-gray-400 ml-0.5">mph</span>
                                                  </span>
                                                  {windDir && <span className="text-[8px] text-gray-400 font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{windDir?.cardinal}</span>}
                                                </div>
                                                {point.windDirectionDeg !== null && (
                                                  <WindArrowBadge directionDeg={point.windDirectionDeg} windType={getWindBadgeType(windType)} />
                                                )}
                                              </div>
                                              {/* Tide */}
                                              <div className="flex flex-col gap-0.5">
                                                {tideInfo.height !== null && tideInfo.state && (
                                                  <>
                                                    <span className="text-[13px] font-bold text-gray-900 leading-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                      {tideInfo.height.toFixed(1)}ft
                                                    </span>
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider leading-none ${
                                                      tideInfo.state === 'high' ? 'text-blue-600' :
                                                      tideInfo.state === 'low' ? 'text-orange-500' :
                                                      'text-gray-400'
                                                    }`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                      {tideInfo.state === 'high' ? 'HIGH' :
                                                       tideInfo.state === 'low' ? 'LOW' :
                                                       tideInfo.state === 'rising' ? '↑ rising' : '↓ falling'}
                                                    </span>
                                                  </>
                                                )}
                                              </div>
                                              {/* Quality score */}
                                              <div className="flex items-center justify-end">
                                                <div className={`${scorePill.bg} ${scorePill.text} rounded px-1.5 py-0.5 text-[12px] font-black tabular-nums leading-none`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                  {Math.round(qualityScore)}
                                                </div>
                                              </div>
                                            </div>
                                          </Fragment>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );

                        if (dayNeedsGate) {
                          return (
                            <GateOverlay
                              key={dayKey}
                              locked={true}
                              showOverlay={dayIndex === gateOverlayIndex}
                              title="PROPRIETARY 7-DAY OUTLOOK"
                              description="Join the local lineup for free to view the detected swell windows."
                              ctaLabel="ACCESS FOR FREE"
                              onUnlock={handleUnlockSpot}
                              cardClassName="max-w-2xl"
                              overlayClassName="items-center justify-center"
                            >
                              {dayCard}
                            </GateOverlay>
                          );
                        }

                        return dayCard;
                      });
                    })()}
                </div>
                )
              ) : (
                <div className="p-4 md:p-6">
                  <div className="bg-gray-50 border-2 border-black p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-black flex items-center justify-center">
                        <AlertCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                      </div>
                      <span className="text-[8px] md:text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        NO DATA
                      </span>
                    </div>
                    <h4 className="text-xl font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                      FORECAST UNAVAILABLE
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                      No forecast timeline available yet. Fetch the latest marine data from Open-Meteo.
                    </p>
                    <button
                      onClick={() => refreshTimelineMutation.mutate({ spotId })}
                      disabled={refreshTimelineMutation.isPending}
                      className="bg-black text-white px-6 py-3 font-bold uppercase tracking-wide text-sm border-2 border-black hover:bg-gray-900 transition-colors disabled:opacity-50"
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                    >
                      {refreshTimelineMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          FETCHING...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          FETCH 7-DAY FORECAST
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Confidence Intervals Footnote */}
            {timelineQuery.data?.timeline && timelineQuery.data.timeline.length > 0 && (
              <div className="-mt-4 px-4 md:px-0">
                <p className="text-[10px] md:text-xs text-gray-600" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  Note: Confidence intervals indicate the reliability of the forecast
                </p>
              </div>
            )}

            {/* Tabbed Content Interface */}
            {spot && (spot.name === "Lido Beach" || spot.name === "Rockaway Beach" || spot.name === "Long Beach") && (
              <div id="guide" className="mt-8 sm:mt-12">

                {/* Unified nav: header + tab strip. border-b-0 so content below shares the border line */}
                <div className="border-2 border-b-0 border-black">

                  {/* Black header strip */}
                  <div className="bg-black px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-white/40 text-[10px] tracking-[0.25em] uppercase hidden sm:inline" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        LOCAL INTEL /
                      </span>
                      <h2 className="text-white text-2xl sm:text-3xl font-bold uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                        SPOT GUIDE
                      </h2>
                    </div>
                    <span className="text-white/30 text-[10px] tracking-widest uppercase hidden sm:block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {spot.name}
                    </span>
                  </div>

                  {/* Tab strip — scrollable on mobile, no bottom border (content provides it) */}
                  <div className="flex overflow-x-auto scrollbar-none bg-white">
                    {[
                      { id: "ideal-conditions", label: "Ideal Conditions" },
                      { id: "when-to-go", label: "When to Go" },
                      {
                        id: spot.name === "Lido Beach" ? "offshore-bathymetry" : "getting-there",
                        label: spot.name === "Lido Beach" ? "Bathymetry" : "Getting There",
                      },
                      { id: "wave-mechanics", label: "Wave Mechanics" },
                      { id: "surf-culture", label: spot.name === "Lido Beach" ? "Culture & Etiquette" : "Surf Culture" },
                    ].map((tab, i, arr) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex-1 min-w-[100px] sm:min-w-[120px] px-3 py-3 sm:px-5 sm:py-3.5 text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] transition-colors duration-150 whitespace-nowrap border-b-2 border-black",
                          i < arr.length - 1 ? "border-r-2 border-black" : "",
                          activeTab === tab.id
                            ? "bg-black text-white border-b-black"
                            : "bg-white text-gray-600 hover:text-black hover:bg-gray-50"
                        )}
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                </div>

                {/* Tab Content — each component already has border-2 border-black; connects with nav's border-b-0 */}
                <GateOverlay
                  locked={showGuideIntelGate}
                  title="Member-Only Intel: Access local sandbar data and wind-block guides."
                  description="NYC Surf Co. Intel unlocks detailed bathymetry, wave mechanics, and culture notes from verified locals."
                  ctaLabel="Unlock Member-Only Intel"
                  onUnlock={handleUnlockSpot}
                  cardClassName="max-w-2xl"
                  overlayClassName="items-start pt-4 sm:pt-6"
                >
                  <div className="min-h-[400px]">
                    {activeTab === "ideal-conditions" && spot && (
                      <SpotIdealConditions spotName={spot.name} />
                    )}
                    {spot.name === "Lido Beach" && <LidoBeachTabs activeTab={activeTab} />}
                    {spot.name === "Rockaway Beach" && <RockawayBeachTabs activeTab={activeTab} />}
                    {spot.name === "Long Beach" && <LongBeachTabs activeTab={activeTab} />}
                  </div>
                </GateOverlay>

              </div>
            )}

          </div>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <Waves className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>No Forecast Data</h3>
              <p className="text-slate-400 mb-6">Click refresh to generate a forecast for this spot.</p>
              <Button
                onClick={() => refreshMutation.mutate({ spotId })}
                disabled={refreshMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                Generate Forecast
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />

      {/* Surf Plan Popup */}
      <Dialog
        open={showSurfPlanPopup}
        onOpenChange={(open) => {
          if (!open && showSurfPlanPopup) {
            // User dismissed by clicking outside or pressing Esc
            handleSurfPlanResponse('dismissed');
          }
          setShowSurfPlanPopup(open);
        }}
      >
        <DialogContent className="border-2 border-black max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bebas text-2xl uppercase">
              DO YOU PLAN ON SURFING THIS WEEK?
            </DialogTitle>
            <DialogDescription className="text-base">
              We'll send you a reminder to share how the conditions were after your session.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => handleSurfPlanResponse('yes')}
              className="flex-1 bg-black text-white border-2 border-black hover:bg-gray-800"
            >
              YES
            </Button>
            <Button
              onClick={() => handleSurfPlanResponse('no')}
              variant="outline"
              className="flex-1 border-2 border-black hover:bg-gray-100"
            >
              NO
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
