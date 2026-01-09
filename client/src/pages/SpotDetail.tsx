import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Arrow, TrendArrow, SwellArrow, WindArrowBadge, ExpandArrow } from "@/components/ui/arrow";
import {
  RefreshCw,
  Waves,
  Wind,
  Clock,
  Users,
  ArrowLeft,
  Compass,
  MapPin,
  Loader2,
  AlertCircle,
  Droplet,
  Sun,
  ArrowUp,
  ArrowDown,
  Car,
  Train,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/Footer";
import { selectCurrentTimelinePoint, CURRENT_CONDITIONS_MAX_AGE_MS, formatSurfHeight, processTimelineForAreaChart, type ExtendedTimelinePoint, type AreaChartDataPoint } from "@/lib/forecastUtils";
import { WaveHeightChart } from "@/components/WaveHeightChart";
import { SpotContextHeader, SPOT_CONTEXT } from "@/components/SpotContextHeader";
import { SwellSignalTeaser } from "@/components/SwellSignalTeaser";
import { getScoreBadgeColors } from "@/lib/ratingColors";
import { isNighttime } from "@/lib/sunTimes";

// Reusable component for spot info cards
function SpotInfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-none shadow-sm border-2 border-black relative overflow-hidden transition-all duration-200" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`,
    }}>
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b-2 border-black">
        <h3 className="text-2xl sm:text-3xl font-semibold text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>{title.toUpperCase()}</h3>
      </div>
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
        <div className="text-sm sm:text-base text-black leading-relaxed space-y-3 sm:space-y-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>{children}</div>
      </div>
    </div>
  );
}

// Helper function to get condition from score (matches WaveHeightChart colors)
function getConditionFromScore(score: number | null): string {
  if (score === null || score === undefined) return "dontBother";
  const s = Math.round(score);
  if (s <= 39) return "dontBother";
  if (s <= 59) return "worthALook";
  if (s <= 75) return "goSurf";
  if (s <= 90) return "firing";
  return "allTime";
}

// Helper function to get banner color based on condition (matches WaveHeightChart colors exactly)
function getBannerColor(condition: string): { bg: string; text: string } {
  switch (condition) {
    case "allTime":
      return { bg: "#059669", text: "text-white" }; // Emerald - All-Time (91-100)
    case "firing":
      return { bg: "#16a34a", text: "text-white" }; // Green - Firing (76-90)
    case "goSurf":
      return { bg: "#84cc16", text: "text-black" }; // Lime - Go Surf (60-75)
    case "worthALook":
      return { bg: "#eab308", text: "text-black" }; // Yellow - Worth a Look (40-59)
    case "dontBother":
      return { bg: "#ef4444", text: "text-white" }; // Red - Don't Bother (0-39)
    default:
      return { bg: "#ef4444", text: "text-white" }; // Red fallback
  }
}

// Helper function to format condition for banner sentence (Poor/Fair/Good)
function formatConditionLabel(condition: string): string {
  switch (condition) {
    case "allTime": return "Good";
    case "firing": return "Good";
    case "goSurf": return "Good";
    case "worthALook": return "Fair";
    case "dontBother": return "Poor";
    default: return "Poor";
  }
}

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
          Based on analysis of the 100 best days at {spotName} over the last 10 years.
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
  const [crowdLevel, setCrowdLevel] = useState(3);
  const [showCrowdReport, setShowCrowdReport] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("ideal-conditions");
  const [forecastView, setForecastView] = useState<"timeline" | "chart">("timeline");
  const [selectedChartPoint, setSelectedChartPoint] = useState<{
    index: number;
    timelinePoint: ExtendedTimelinePoint | null;
    chartPoint: AreaChartDataPoint | null;
  } | null>(null);

  // Auto-refresh interval: 30 minutes
  const refetchInterval = 30 * 60 * 1000;

  const spotQuery = trpc.spots.get.useQuery({ id: spotId });
  const forecastQuery = trpc.forecasts.getForSpot.useQuery(
    { spotId },
    { refetchInterval }
  );
  const timelineQuery = trpc.forecasts.getTimeline.useQuery(
    { spotId, hours: 120 },
    { refetchInterval }
  );
  const crowdQuery = trpc.crowd.getForSpot.useQuery(
    { spotId },
    { refetchInterval }
  );
  // Fetch raw NOAA Buoy 44065 data for dominant swell display
  const buoyQuery = trpc.buoy.get44065.useQuery(undefined, {
    refetchInterval,
    staleTime: 15 * 60 * 1000, // Consider fresh for 15 minutes
  });
  // Fetch breaking wave heights calculated from NOAA Buoy 44065 using the spot-specific algorithm
  const buoyBreakingHeightsQuery = trpc.buoy.getBreakingHeightsForSpots.useQuery(undefined, {
    refetchInterval,
    staleTime: 15 * 60 * 1000,
  });
  // const debugQuery = trpc.forecasts.debugWaveCalculation.useQuery(
  //   { spotId: spotId },
  //   { enabled: false }
  // );

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
      crowdQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to submit: ${error.message}`);
    },
  });

  const spot = spotQuery.data;
  const forecast = forecastQuery.data?.forecast;
  const openMeteoPoint = forecastQuery.data?.openMeteoPoint;
  const isLoading = spotQuery.isLoading || forecastQuery.isLoading;
  const isError = spotQuery.error || forecastQuery.error;

  // Get current conditions from Open-Meteo - find nearest point to now using shared utility
  const currentConditions = useMemo(() => {
    return selectCurrentTimelinePoint(timelineQuery.data?.timeline) ?? null;
  }, [timelineQuery.data?.timeline]);
  
  // Temporary debug logging
  useEffect(() => {
    if (currentConditions) {
      console.log('🖥️ FRONTEND DISPLAY DEBUG:');
      console.log('Current forecast object:', currentConditions);
      console.log('What UI is showing:', {
        displayed_wave_height: formatSurfHeight(currentConditions.breakingWaveHeightFt ?? currentConditions.dominantSwellHeightFt ?? currentConditions.waveHeightFt ?? null),
        breakingWaveHeightFt_from_api: currentConditions.breakingWaveHeightFt,
        dominantSwellHeightFt: currentConditions.dominantSwellHeightFt,
        raw_wave_height: currentConditions.waveHeightFt,
        direction: currentConditions.waveDirectionDeg
      });
      
      // Check if UI is using the right field
      console.log('Which field is the UI displaying?');
      console.log('Is it using breakingWaveHeightFt?', !!currentConditions.breakingWaveHeightFt);
      console.log('Is it using waveHeightFt?', !!currentConditions.waveHeightFt);
    }
  }, [currentConditions]);
  
  // 🖥️ STEP 6: Frontend Received
  if (currentConditions) {
    console.log('🖥️ STEP 6: Frontend Received');
    console.log('🖥️ Frontend received forecast:', {
      breakingWaveHeightFt: currentConditions.breakingWaveHeightFt,
      raw_swell_height: currentConditions.waveHeightFt,
      direction: currentConditions.waveDirectionDeg,
      secondarySwellHeightFt: currentConditions.secondarySwellHeightFt,
      secondarySwellPeriodS: currentConditions.secondarySwellPeriodS,
      secondarySwellDirectionDeg: currentConditions.secondarySwellDirectionDeg,
      windWaveHeightFt: currentConditions.windWaveHeightFt,
      windWavePeriodS: currentConditions.windWavePeriodS,
      windWaveDirectionDeg: currentConditions.windWaveDirectionDeg,
    });
  }

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

  // Calculate energy percentage (H² × T formula, normalized to 0-100)
  const calculateEnergyPercentage = (heightFt: number | null, periodS: number | null): number => {
    if (heightFt === null || periodS === null || heightFt <= 0 || periodS <= 0) return 0;
    // Energy = H² × T, normalize assuming max reasonable energy is ~300 (e.g., 5ft @ 12s = 300)
    // This is more realistic for Long Island conditions where 10ft @ 10s is extremely rare
    const energy = heightFt * heightFt * periodS;
    return Math.min(100, Math.round((energy / 300) * 100));
  };

  // Get wind type for badge coloring
  const getWindBadgeType = (windType: string | null): "offshore" | "onshore" | "cross" | "unknown" => {
    if (!windType) return "unknown";
    const lower = windType.toLowerCase();
    if (lower === "cross-offshore") return "cross"; // Treat cross-offshore as cross for badge
    if (lower.includes("offshore")) return "offshore";
    if (lower.includes("onshore")) return "onshore";
    if (lower.includes("cross") || lower.includes("side")) return "cross";
    return "unknown";
  };

  // Format wind type for display
  const formatWindType = (windType: string | null): string => {
    if (!windType) return '';
    if (windType === 'cross-offshore') return 'Cross-Offshore';
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

  // Helper functions for 5-day forecast UI
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
      const score = point.quality_score ?? point.probabilityScore ?? 0;
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
    const scores = points.map(p => p.quality_score ?? p.probabilityScore ?? 0);
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
    const waveHeight = formatSurfHeight(
      middlePoint.dominantSwellHeightFt ?? middlePoint.waveHeightFt ?? null
    );
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
      const score = point.quality_score ?? point.probabilityScore ?? 0;
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
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-black">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Current Conditions
                  </h2>
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
              <div className="p-4 sm:p-6 md:p-8">
                {currentConditions ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                      {/* Surf Height - calculated from buoy data using spot-specific algorithm */}
                      <div>
                        <p className="text-[10px] sm:text-xs font-medium text-black uppercase tracking-wider mb-1.5 sm:mb-2" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                          Surf Height
                        </p>
                        {(() => {
                          // Use NOAA-based breaking height from currentConditions if available
                          // This comes from getCurrentConditionsForAll which uses buoy data
                          // Fallback to buoyBreakingHeightsQuery if currentConditions doesn't have it
                          const buoyBasedHeight = spot?.name ? buoyBreakingHeightsQuery.data?.[spot.name] : null;
                          const displayHeight = currentConditions?.breakingWaveHeightFt ??
                            buoyBasedHeight ??
                            currentConditions?.dominantSwellHeightFt ??
                            currentConditions?.waveHeightFt ??
                            (forecast?.waveHeightTenthsFt ? forecast.waveHeightTenthsFt / 10 : null);
                          const description = getWaveHeightDescription(displayHeight);

                          return (
                            <>
                              <p className="text-4xl sm:text-5xl md:text-6xl font-black text-black mb-1 sm:mb-2 leading-none uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                                {formatSurfHeight(displayHeight)}
                              </p>
                              {description && (
                                <p className="text-xs sm:text-sm font-normal text-black uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  {description}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* Swell */}
                      <div>
                        <p className="text-[10px] sm:text-xs font-medium text-black uppercase tracking-wider mb-2 sm:mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
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
                                    className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${swell.isPrimary ? 'text-blue-600' : 'text-gray-400'}`}
                                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 mt-6 sm:mt-8 border-t-2 border-b-2 border-black">
                      {/* Wind */}
                      <div className="bg-white p-3 sm:p-4">
                        <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                          Wind
                        </p>
                        {currentConditions.windSpeedMph !== null && currentConditions.windDirectionDeg !== null ? (
                          <div>
                            <p className="text-xl sm:text-2xl font-black text-black leading-none uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                              {Math.round(currentConditions.windSpeedMph)}<span className="text-base sm:text-lg">MPH</span> {(() => {
                                const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
                                const index = Math.round(currentConditions.windDirectionDeg / 22.5) % 16;
                                return directions[index];
                              })()}
                            </p>
                            {currentConditions.windType && (
                              <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider mt-1 ${
                                currentConditions.windType === 'offshore' ? 'text-emerald-600' :
                                currentConditions.windType === 'onshore' ? 'text-red-500' :
                                currentConditions.windType === 'cross-offshore' ? 'text-gray-500' :
                                'text-amber-500'
                              }`} style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                {currentConditions.windType === 'cross-offshore' ? 'Cross-Off' : currentConditions.windType}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 uppercase" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>—</p>
                        )}
                      </div>

                      {/* Tide */}
                      <div className="bg-white p-3 sm:p-4">
                        <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
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
                              <p className="text-[10px] sm:text-xs font-normal text-gray-600 uppercase tracking-wider mt-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                {currentConditions.tidePhase}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 uppercase" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>—</p>
                        )}
                      </div>

                      {/* Temperature */}
                      <div className="bg-white p-3 sm:p-4">
                        <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
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
                      <div className="bg-white p-3 sm:p-4">
                        <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
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

                    {/* Crowd Level - Full width row */}
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                          Crowd
                        </span>
                        {crowdQuery.data?.averageLevel ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                              {getCrowdLabel(crowdQuery.data.averageLevel)}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${getCrowdColor(crowdQuery.data.averageLevel)}`} />
                            <span className="text-[9px] text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              ({crowdQuery.data.reports.length})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 uppercase" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                            No reports
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => isAuthenticated && setShowCrowdReport(!showCrowdReport)}
                        disabled={!isAuthenticated}
                        className="text-[10px] sm:text-xs font-semibold text-blue-600 uppercase tracking-wider hover:underline disabled:text-gray-400 disabled:no-underline"
                        style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                      >
                        {!isAuthenticated ? 'Sign in' : showCrowdReport ? 'Hide' : 'Report'}
                      </button>
                    </div>

                    {/* Expandable Crowd Report Section */}
                    {showCrowdReport && (
                      <div className="mt-6 pt-6 border-t-2 border-black">
                        {isAuthenticated ? (
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between mb-3">
                                <span className="text-sm font-bold text-black uppercase tracking-wide" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>How crowded is it?</span>
                                <span className="text-sm font-bold text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>{getCrowdLabel(crowdLevel).toUpperCase()}</span>
                              </div>
                              <Slider
                                value={[crowdLevel]}
                                onValueChange={(v) => setCrowdLevel(v[0])}
                                min={1}
                                max={5}
                                step={1}
                                className="w-full"
                              />
                              <div className="flex justify-between mt-2 text-xs font-semibold text-black uppercase tracking-wide" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                <span>Empty</span>
                                <span>Packed</span>
                              </div>
                            </div>
                            <Button
                              onClick={() => {
                                submitCrowdMutation.mutate({ spotId, crowdLevel });
                                setShowCrowdReport(false);
                              }}
                              disabled={submitCrowdMutation.isPending}
                              className="w-full bg-black hover:bg-gray-900 text-white border-2 border-black font-bold uppercase tracking-wide py-3"
                              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                            >
                              {submitCrowdMutation.isPending ? "Submitting..." : "Submit Report"}
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-black mb-4 font-semibold uppercase tracking-wide" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Sign in to submit crowd reports</p>
                            <a href={getLoginUrl()}>
                              <Button variant="outline" className="border-2 border-black text-black hover:bg-gray-100 font-bold uppercase tracking-wide" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                                Sign In
                              </Button>
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-black uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Loading conditions...</p>
                    {timelineQuery.isLoading && (
                      <Loader2 className="h-6 w-6 animate-spin text-black mx-auto mt-4" />
                    )}
                  </div>
                )}
              </div>
              
              {/* Quality Bar with Color Zones */}
              {forecast && (
                <div className="px-6 pb-6">
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
                        left: `${Math.min(100, Math.max(0, currentConditions?.quality_score ?? forecast.qualityScore ?? 0))}%`,
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
                    <span className="text-sm font-medium text-black uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                      {getRatingLabel(currentConditions?.quality_score ?? forecast.qualityScore ?? 0)}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 group-hover:text-black transition-colors flex items-center gap-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <ExpandArrow expanded={showScoreBreakdown} size={10} />
                      {showScoreBreakdown ? 'Hide breakdown' : 'Why this rating?'}
                    </span>
                  </button>

                  {/* Score Breakdown - Expandable */}
                  {showScoreBreakdown && currentConditions && (
                    <div className="mt-4 pt-4 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
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
                            currentConditions.windType === 'cross-offshore' ? 'text-gray-500' :
                            'text-amber-500'
                          }`} style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                            {currentConditions.windType === 'offshore' ? '✓' :
                             currentConditions.windType === 'onshore' ? '✗' : 
                             currentConditions.windType === 'cross-offshore' ? '~' : '~'}
                          </div>
                          <div className="text-[10px] text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {currentConditions.windSpeedMph ? `${Math.round(currentConditions.windSpeedMph)}mph ${currentConditions.windType ?? ''}` : '—'}
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
                            {Math.round(currentConditions.quality_score ?? forecast.qualityScore ?? 0)}
                          </div>
                          <div className="text-[10px] text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            out of 100
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Forecast Timeline - Multi-Day Forecast - NYC Grit Style */}
            <div className="bg-white border border-black">
              <div className="p-4 md:p-6 border-b border-black">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl md:text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                      5-DAY FORECAST
                    </h2>
                    <p className="mt-2 md:mt-3 text-sm md:text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                      Quality scores and conditions for the next 5 days
                    </p>
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
                  (() => {
                    // Debug: Log timeline data structure
                    if (timelineQuery.data.timeline.length > 0) {
                      const samplePoint = timelineQuery.data.timeline[0];
                      console.log('[Chart Debug] Timeline point sample:', {
                        forecastTimestamp: samplePoint.forecastTimestamp,
                        dominantSwellLabel: samplePoint.dominantSwellLabel,
                        dominantSwellPeriodS: samplePoint.dominantSwellPeriodS,
                        dominantSwellHeightFt: samplePoint.dominantSwellHeightFt,
                        breakingWaveHeightFt: samplePoint.breakingWaveHeightFt,
                        waveHeightFt: samplePoint.waveHeightFt,
                        quality_score: samplePoint.quality_score,
                        hasAllFields: {
                          dominantSwellLabel: 'dominantSwellLabel' in samplePoint,
                          dominantSwellPeriodS: 'dominantSwellPeriodS' in samplePoint,
                        },
                        // Check all swell-related fields
                        allSwellFields: {
                          dominantSwellLabel: (samplePoint as any).dominantSwellLabel,
                          dominantSwellPeriodS: (samplePoint as any).dominantSwellPeriodS,
                          dominantSwellHeightFt: (samplePoint as any).dominantSwellHeightFt,
                          dominantSwellType: (samplePoint as any).dominantSwellType,
                        }
                      });
                    }
                    const chartData = processTimelineForAreaChart(timelineQuery.data.timeline);
                    if (chartData.length > 0) {
                      console.log('[Chart Debug] Chart data sample:', {
                        swellLabel: chartData[0].swellLabel,
                        waveHeight: chartData[0].waveHeight,
                        timestamp: chartData[0].timestamp,
                      });
                      // Log multiple points to see if labels vary
                      console.log('[Chart Debug] First 5 chart points swell labels:', 
                        chartData.slice(0, 5).map(p => ({ 
                          time: p.timeLabel, 
                          swellLabel: p.swellLabel,
                          waveHeight: p.waveHeight 
                        }))
                      );
                    }
                    return (
                      <>
                        <WaveHeightChart 
                          key={`chart-${timelineQuery.dataUpdatedAt || Date.now()}`} 
                          data={chartData}
                          selectedIndex={selectedChartPoint?.index}
                          onPointSelect={(index, chartPoint) => {
                            // Find the corresponding timeline point
                            const timelinePoint = timelineQuery.data?.timeline?.find(p => {
                              const chartTime = new Date(chartPoint.timestamp);
                              const timelineTime = new Date(p.forecastTimestamp);
                              return Math.abs(chartTime.getTime() - timelineTime.getTime()) < 30 * 60 * 1000; // Within 30 min
                            });
                            
                            if (timelinePoint) {
                              setSelectedChartPoint({ index, timelinePoint, chartPoint });
                            }
                          }}
                        />
                        {/* Bottom Section - Conditions Summary and Details */}
                        {selectedChartPoint?.timelinePoint && (() => {
                          // Use chart point's condition if available (already calculated), otherwise calculate from score
                          const condition = selectedChartPoint.chartPoint?.condition ?? getConditionFromScore(selectedChartPoint.timelinePoint.quality_score ?? 0);
                          const bannerColors = getBannerColor(condition);
                          
                          return (
                            <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
                              {/* Conditions Summary Banner */}
                              <div className={`${bannerColors.text} p-3 md:p-4 border border-black`} style={{ backgroundColor: bannerColors.bg }}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs md:text-sm font-medium uppercase tracking-wider break-words" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                      Conditions are {formatSurfHeight(selectedChartPoint.timelinePoint.dominantSwellHeightFt ?? selectedChartPoint.timelinePoint.waveHeightFt ?? 0)} and {formatConditionLabel(condition)} at {new Date(selectedChartPoint.timelinePoint.forecastTimestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} on {new Date(selectedChartPoint.timelinePoint.forecastTimestamp).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => setSelectedChartPoint(null)}
                                    className="text-white hover:text-gray-200 text-lg md:text-xl font-bold flex-shrink-0"
                                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>

                            {/* Detailed Forecast Panel - Two Row Grid */}
                            {(() => {
                              const point = selectedChartPoint.timelinePoint;
                              
                              // Calculate energy percentages
                              const primaryEnergy = calculateEnergyPercentage(
                                point.dominantSwellHeightFt ?? point.waveHeightFt,
                                point.dominantSwellPeriodS ?? point.wavePeriodSec ?? null
                              );
                              const secondaryEnergy = calculateEnergyPercentage(
                                point.secondarySwellHeightFt ?? null,
                                point.secondarySwellPeriodS ?? null
                              );
                              const windSwellEnergy = calculateEnergyPercentage(
                                point.windWaveHeightFt ?? null,
                                point.windWavePeriodS ?? null
                              );

                              // Get swell data
                              const primaryDir = point.dominantSwellDirectionDeg ?? point.waveDirectionDeg ?? 0;
                              const secondaryDir = point.secondarySwellDirectionDeg ?? 0;
                              const windSwellDir = point.windWaveDirectionDeg ?? 0;

                              // Wind data
                              const windDir = point.windDirectionDeg ?? 0;
                              const windSpeed = point.windSpeedMph ?? null;
                              const windType = point.windType ?? null;

                              // Tide data
                              const tideHeight = point.tideHeightFt !== null && point.tideHeightFt !== undefined ? point.tideHeightFt / 10 : null;
                              const tidePhase = point.tidePhase;
                              const tideIsRising = tidePhase === 'rising' || tidePhase === 'high';
                              
                              // Find next tide event
                              const currentTime = new Date(point.forecastTimestamp);
                              const futureTides = timelineQuery.data?.timeline?.filter(p => {
                                const time = new Date(p.forecastTimestamp);
                                return time > currentTime && (p.tidePhase === 'high' || p.tidePhase === 'low');
                              }) || [];
                              const nextTide = futureTides[0];
                              const nextTideTime = nextTide ? new Date(nextTide.forecastTimestamp) : null;
                              const nextTideHeight = nextTide && nextTide.tideHeightFt !== null ? nextTide.tideHeightFt / 10 : null;
                              const nextTidePhase = nextTide?.tidePhase;

                              return (
                                <div className="border border-black bg-white">
                                  {/* Mobile: Compact 2x2 Grid Layout */}
                                  <div className="md:hidden">
                                    {/* Swell Section */}
                                    <div className="grid grid-cols-3 gap-px bg-gray-200 border-b border-black">
                                      {/* Primary */}
                                      <div className="bg-white p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Primary</span>
                                          {point.dominantSwellHeightFt && <span className="text-[9px] font-semibold text-blue-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{primaryEnergy}%</span>}
                                        </div>
                                        {point.dominantSwellHeightFt && point.dominantSwellPeriodS ? (
                                          <>
                                            <div className="h-1 bg-gray-200 mb-1.5 rounded-full overflow-hidden">
                                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${primaryEnergy}%` }} />
                                            </div>
                                            <div className="text-[11px] font-bold text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                                              {Number(point.dominantSwellHeightFt).toFixed(1)}FT @ {Number(point.dominantSwellPeriodS).toFixed(0)}S
                                            </div>
                                            <div className="text-[9px] text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                              {getSwellDirectionLabel(primaryDir)} {Math.round(primaryDir)}°
                                            </div>
                                          </>
                                        ) : (
                                          <div className="text-[10px] text-gray-400">—</div>
                                        )}
                                      </div>
                                      {/* Secondary */}
                                      <div className="bg-white p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Secondary</span>
                                          {point.secondarySwellHeightFt && <span className="text-[9px] font-semibold text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{secondaryEnergy}%</span>}
                                        </div>
                                        {point.secondarySwellHeightFt && point.secondarySwellPeriodS ? (
                                          <>
                                            <div className="h-1 bg-gray-200 mb-1.5 rounded-full overflow-hidden">
                                              <div className="h-full bg-gray-400 rounded-full" style={{ width: `${secondaryEnergy}%` }} />
                                            </div>
                                            <div className="text-[11px] font-bold text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                                              {Number(point.secondarySwellHeightFt).toFixed(1)}FT @ {Number(point.secondarySwellPeriodS).toFixed(0)}S
                                            </div>
                                            <div className="text-[9px] text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                              {getSwellDirectionLabel(secondaryDir)} {Math.round(secondaryDir)}°
                                            </div>
                                          </>
                                        ) : (
                                          <div className="text-[10px] text-gray-400">—</div>
                                        )}
                                      </div>
                                      {/* Wind Swell */}
                                      <div className="bg-white p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Wind</span>
                                          {point.windWaveHeightFt && <span className="text-[9px] font-semibold text-orange-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{windSwellEnergy}%</span>}
                                        </div>
                                        {point.windWaveHeightFt && point.windWavePeriodS ? (
                                          <>
                                            <div className="h-1 bg-gray-200 mb-1.5 rounded-full overflow-hidden">
                                              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${windSwellEnergy}%` }} />
                                            </div>
                                            <div className="text-[11px] font-bold text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                                              {Number(point.windWaveHeightFt).toFixed(1)}FT @ {Number(point.windWavePeriodS).toFixed(0)}S
                                            </div>
                                            <div className="text-[9px] text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                              {getSwellDirectionLabel(windSwellDir)} {Math.round(windSwellDir)}°
                                            </div>
                                          </>
                                        ) : (
                                          <div className="text-[10px] text-gray-400">—</div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Wind & Tide Row */}
                                    <div className="grid grid-cols-2 gap-px bg-gray-200">
                                      {/* Wind */}
                                      <div className="bg-white p-2.5">
                                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Wind</span>
                                        {windDir !== null && windSpeed !== null ? (
                                          <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 relative flex-shrink-0">
                                              <svg viewBox="0 0 40 40" className="w-full h-full">
                                                <circle cx="20" cy="20" r="18" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                                                <g transform={`rotate(${windDir + 180}, 20, 20)`}>
                                                  <line x1="20" y1="28" x2="20" y2="8" stroke={windType === 'offshore' ? '#059669' : windType === 'onshore' ? '#ef4444' : '#6b7280'} strokeWidth="2" strokeLinecap="round" />
                                                  <polygon points="20,6 16,12 24,12" fill={windType === 'offshore' ? '#059669' : windType === 'onshore' ? '#ef4444' : '#6b7280'} />
                                                </g>
                                                <circle cx="20" cy="20" r="2" fill={windType === 'offshore' ? '#059669' : windType === 'onshore' ? '#ef4444' : '#6b7280'} />
                                              </svg>
                                            </div>
                                            <div>
                                              <div className="text-sm font-bold text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                                                {getSwellDirectionLabel(windDir)} {Math.round(windSpeed)}MPH
                                              </div>
                                              {windType && (
                                                <div className={`text-[10px] font-semibold ${windType === 'offshore' ? 'text-emerald-600' : windType === 'onshore' ? 'text-red-500' : 'text-gray-500'}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                  {formatWindType(windType)}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-[10px] text-gray-400">—</div>
                                        )}
                                      </div>
                                      {/* Tide */}
                                      <div className="bg-white p-2.5">
                                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Tide</span>
                                        {tideHeight !== null ? (
                                          <div>
                                            <div className="text-sm font-bold text-black flex items-center gap-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                                              {tideHeight.toFixed(1)}FT
                                              {(tidePhase === 'rising' || tidePhase === 'falling') && (
                                                <TrendArrow rising={tidePhase === 'rising'} size={12} />
                                              )}
                                              <span className="text-[10px] font-normal text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                {tidePhase}
                                              </span>
                                            </div>
                                            {nextTideTime && nextTideHeight !== null && (
                                              <div className="text-[10px] text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                {nextTidePhase === 'high' ? 'High' : 'Low'} @ {nextTideTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-[10px] text-gray-400">—</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Desktop: Original Layout */}
                                  <div className="hidden md:block">
                                  {/* Row 1: Three Swell Columns */}
                                  <div className="grid grid-cols-3 border-b border-black">
                                    {/* Primary Swell */}
                                    <div className="p-5 border-r border-black">
                                      <div className="uppercase mb-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>
                                        PRIMARY
                                      </div>
                                      {point.dominantSwellHeightFt && point.dominantSwellPeriodS ? (
                                        <>
                                          {/* Energy Bar */}
                                          <div className="flex items-center gap-2 mb-3">
                                            <div className="flex-1 h-2 bg-[#e2e8f0] relative" style={{ height: '8px' }}>
                                              <div
                                                className="h-full bg-[#3b82f6]"
                                                style={{ width: `${primaryEnergy}%` }}
                                              />
                                            </div>
                                            <span className="text-xs font-semibold text-black" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                                              {primaryEnergy}%
                                            </span>
                                          </div>
                                          {/* Swell Info */}
                                          <div className="text-[#1e293b] text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                                            {getSwellDirectionLabel(primaryDir)} {Math.round(primaryDir)}° | {Number(point.dominantSwellHeightFt).toFixed(1)}ft @ {Number(point.dominantSwellPeriodS).toFixed(0)}s
                                          </div>
                                        </>
                                      ) : (
                                        <div className="text-sm text-gray-500">—</div>
                                      )}
                                    </div>

                                    {/* Secondary Swell */}
                                    <div className="p-5 border-r border-black">
                                      <div className="uppercase mb-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>
                                        SECONDARY
                                      </div>
                                      {point.secondarySwellHeightFt && point.secondarySwellPeriodS ? (
                                        <>
                                          {/* Energy Bar */}
                                          <div className="flex items-center gap-2 mb-3">
                                            <div className="flex-1 h-2 bg-[#e2e8f0] relative" style={{ height: '8px' }}>
                                              <div
                                                className="h-full bg-[#94a3b8]"
                                                style={{ width: `${secondaryEnergy}%` }}
                                              />
                                            </div>
                                            <span className="text-xs font-semibold text-black" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                                              {secondaryEnergy}%
                                            </span>
                                          </div>
                                          {/* Swell Info */}
                                          <div className="text-[#1e293b] text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                                            {getSwellDirectionLabel(secondaryDir)} {Math.round(secondaryDir)}° | {Number(point.secondarySwellHeightFt).toFixed(1)}ft @ {Number(point.secondarySwellPeriodS).toFixed(0)}s
                                          </div>
                                        </>
                                      ) : (
                                        <div className="text-sm text-gray-500">—</div>
                                      )}
                                    </div>

                                    {/* Wind Swell */}
                                    <div className="p-5">
                                      <div className="uppercase mb-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>
                                        WIND SWELL
                                      </div>
                                      {point.windWaveHeightFt && point.windWavePeriodS ? (
                                        <>
                                          {/* Energy Bar */}
                                          <div className="flex items-center gap-2 mb-3">
                                            <div className="flex-1 h-2 bg-[#e2e8f0] relative" style={{ height: '8px' }}>
                                              <div
                                                className="h-full bg-[#f97316]"
                                                style={{ width: `${windSwellEnergy}%` }}
                                              />
                                            </div>
                                            <span className="text-xs font-semibold text-black" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                                              {windSwellEnergy}%
                                            </span>
                                          </div>
                                          {/* Swell Info */}
                                          <div className="text-[#1e293b] text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                                            {getSwellDirectionLabel(windSwellDir)} {Math.round(windSwellDir)}° | {Number(point.windWaveHeightFt).toFixed(1)}ft @ {Number(point.windWavePeriodS).toFixed(0)}s
                                          </div>
                                        </>
                                      ) : (
                                        <div className="text-sm text-gray-500">—</div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Row 2: Wind and Tide */}
                                  <div className="grid grid-cols-[40%_60%]">
                                    {/* Wind Column */}
                                    <div className="p-5 border-r border-black">
                                      <div className="uppercase mb-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>
                                        WIND
                                      </div>
                                      {windDir !== null && windSpeed !== null ? (
                                        <div className="flex items-start gap-4">
                                          {/* Wind Compass Rose */}
                                          <div className="flex-shrink-0">
                                            <svg className="w-14 h-14" viewBox="0 0 56 56">
                                              {/* Outer circle */}
                                              <circle cx="28" cy="28" r="26" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
                                              {/* Inner circle */}
                                              <circle cx="28" cy="28" r="18" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
                                              {/* Cardinal direction markers */}
                                              <text x="28" y="8" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>N</text>
                                              <text x="50" y="31" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>E</text>
                                              <text x="28" y="54" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>S</text>
                                              <text x="6" y="31" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>W</text>
                                              {/* Wind direction arrow - points FROM where wind is coming */}
                                              <g transform={`rotate(${windDir + 180}, 28, 28)`}>
                                                <line x1="28" y1="38" x2="28" y2="14" stroke={windType === 'offshore' ? '#059669' : windType === 'onshore' ? '#ef4444' : windType === 'cross-offshore' ? '#6b7280' : '#64748b'} strokeWidth="2.5" strokeLinecap="round" />
                                                <polygon
                                                  points="28,10 23,18 33,18"
                                                  fill={windType === 'offshore' ? '#059669' : windType === 'onshore' ? '#ef4444' : windType === 'cross-offshore' ? '#6b7280' : '#64748b'}
                                                />
                                              </g>
                                              {/* Center dot */}
                                              <circle cx="28" cy="28" r="3" fill={windType === 'offshore' ? '#059669' : windType === 'onshore' ? '#ef4444' : windType === 'cross-offshore' ? '#6b7280' : '#64748b'} />
                                            </svg>
                                          </div>
                                          {/* Wind Info */}
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[#1e293b] mb-1.5 text-base" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                                              {getSwellDirectionLabel(windDir)} {Math.round(windDir)}°
                                            </div>
                                            <div className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                                              <span className="text-[#64748b]">{Math.round(windSpeed)}mph </span>
                                              {windType && (
                                                <span style={{
                                                  color: windType === 'offshore' ? '#059669' : windType === 'onshore' ? '#ef4444' : windType === 'cross-offshore' ? '#6b7280' : '#64748b',
                                                  fontWeight: 700
                                                }}>
                                                  {formatWindType(windType)}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-500">—</div>
                                      )}
                                    </div>

                                    {/* Tide Column with Mini Sparkline */}
                                    <div className="p-5">
                                      <div className="uppercase mb-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>
                                        TIDE
                                      </div>
                                      {tideHeight !== null ? (
                                        <div className="flex items-start gap-4">
                                          {/* Mini Tide Sparkline */}
                                          {(() => {
                                            // Get tide data for the selected day
                                            const selectedDate = new Date(point.forecastTimestamp);
                                            const dayStart = new Date(selectedDate);
                                            dayStart.setHours(0, 0, 0, 0);
                                            const dayEnd = new Date(selectedDate);
                                            dayEnd.setHours(23, 59, 59, 999);

                                            const dayTideData = (timelineQuery.data?.timeline ?? [])
                                              .filter(p => {
                                                const t = new Date(p.forecastTimestamp);
                                                return t >= dayStart && t <= dayEnd && p.tideHeightFt !== null && p.tideHeightFt !== undefined;
                                              })
                                              .map((p, idx) => ({
                                                height: p.tideHeightFt! / 10,
                                                time: new Date(p.forecastTimestamp),
                                                index: idx
                                              }));

                                            if (dayTideData.length < 2) return null;

                                            // Find current point index
                                            const currentIdx = dayTideData.findIndex(d =>
                                              Math.abs(d.time.getTime() - selectedDate.getTime()) < 60 * 60 * 1000
                                            );

                                            // SVG dimensions for sparkline
                                            const sparkWidth = 120;
                                            const sparkHeight = 48;
                                            const padding = { top: 6, bottom: 6, left: 4, right: 4 };
                                            const chartWidth = sparkWidth - padding.left - padding.right;
                                            const chartHeight = sparkHeight - padding.top - padding.bottom;

                                            const heights = dayTideData.map(d => d.height);
                                            const minH = Math.min(...heights);
                                            const maxH = Math.max(...heights);
                                            const rangeH = (maxH - minH) || 1;

                                            const getX = (idx: number) => padding.left + (idx / Math.max(dayTideData.length - 1, 1)) * chartWidth;
                                            const getY = (h: number) => padding.top + chartHeight * (1 - (h - minH) / rangeH);

                                            // Create smooth bezier curve
                                            let pathD = `M ${getX(0)} ${getY(dayTideData[0].height)}`;
                                            for (let i = 1; i < dayTideData.length; i++) {
                                              const x0 = getX(i - 1);
                                              const y0 = getY(dayTideData[i - 1].height);
                                              const x1 = getX(i);
                                              const y1 = getY(dayTideData[i].height);
                                              const cpx = (x0 + x1) / 2;
                                              pathD += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
                                            }

                                            // Fill path
                                            const fillPathD = `${pathD} L ${getX(dayTideData.length - 1)} ${sparkHeight - padding.bottom} L ${padding.left} ${sparkHeight - padding.bottom} Z`;

                                            return (
                                              <div className="flex-shrink-0">
                                                <svg width={sparkWidth} height={sparkHeight} viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}>
                                                  <defs>
                                                    <linearGradient id="miniTideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
                                                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
                                                    </linearGradient>
                                                  </defs>
                                                  {/* Fill under curve */}
                                                  <path d={fillPathD} fill="url(#miniTideGradient)" />
                                                  {/* Main curve line */}
                                                  <path d={pathD} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                  {/* Current position marker */}
                                                  {currentIdx >= 0 && (
                                                    <g>
                                                      <circle
                                                        cx={getX(currentIdx)}
                                                        cy={getY(dayTideData[currentIdx].height)}
                                                        r="5"
                                                        fill="#0ea5e9"
                                                        stroke="white"
                                                        strokeWidth="2"
                                                      />
                                                    </g>
                                                  )}
                                                </svg>
                                                {/* Time labels */}
                                                <div className="flex justify-between mt-0.5" style={{ width: sparkWidth }}>
                                                  <span className="text-[8px] text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>6a</span>
                                                  <span className="text-[8px] text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>12p</span>
                                                  <span className="text-[8px] text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>6p</span>
                                                </div>
                                              </div>
                                            );
                                          })()}
                                          {/* Tide Info */}
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[#1e293b] mb-1.5 flex items-center gap-1" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: 700 }}>
                                              {tideHeight.toFixed(1)}ft
                                              {(tidePhase === 'rising' || tidePhase === 'falling') && (
                                                <TrendArrow rising={tideIsRising} size={14} />
                                              )}
                                              {tidePhase ? tidePhase.charAt(0).toUpperCase() + tidePhase.slice(1) : ''}
                                            </div>
                                            {nextTideTime && nextTideHeight !== null && (
                                              <div className="text-[#64748b]" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 600 }}>
                                                {nextTidePhase === 'high' ? 'High' : 'Low'} @ {nextTideTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} ({nextTideHeight.toFixed(1)}ft)
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-500">—</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              );
                            })()}
                          </div>
                          );
                        })()}
                      </>
                    );
                  })()
                ) : (
                <div className="divide-y-2 divide-black">
                    {groupedTimeline.map(([dayKey, points], dayIndex) => {
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
                        const validScores = points.map(p => p.quality_score !== null ? p.quality_score : p.probabilityScore).filter(s => s !== null);
                        let avgScore: number;
                        
                        if (spot) {
                          // Filter points to daylight hours only
                          const daylightPoints = points.filter(p => {
                            return !isNighttime(p.forecastTimestamp, parseFloat(String(spot.latitude)), parseFloat(String(spot.longitude)));
                          });
                          
                          // Get scores for daylight hours
                          const daylightScores = daylightPoints.map(p => p.quality_score !== null ? p.quality_score : p.probabilityScore).filter(s => s !== null);
                          
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
                        const avgQualityRating = getRatingLabel(avgScore);
                        const verdictLabel = getVerdictLabel(avgQualityRating);
                        
                        // Calculate surfable daylight hours for callout with quality differentiation
                        let surfableDaylightHoursCount = 0;
                        let bestQualityRating: string | null = null;
                        if (spot) {
                          const daylightPoints = points.filter(p => {
                            return !isNighttime(p.forecastTimestamp, parseFloat(String(spot.latitude)), parseFloat(String(spot.longitude)));
                          });
                          const daylightScores = daylightPoints.map(p => p.quality_score !== null ? p.quality_score : p.probabilityScore).filter(s => s !== null);
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
                          const allScores = points.map(p => p.quality_score !== null ? p.quality_score : p.probabilityScore).filter(s => s !== null);
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
                        
                        // Show callout if verdict is "Don't Bother" but there are surfable hours
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
                          // Use breakingWaveHeightFt which accounts for period (3s wind chop != surfable waves)
                          // 0 is a valid value meaning flat conditions, so we use explicit null check
                          const heights = pointSet.map(p => p.breakingWaveHeightFt !== null ? p.breakingWaveHeightFt : (p.dominantSwellHeightFt ?? p.waveHeightFt)).filter(h => h !== null) as number[];
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
                        const confidencePercentage = displayConfidence === "High" ? 95 : displayConfidence === "Medium" ? 75 : 50;
                        
                        const isExpanded = expandedDays.has(dayKey);
                        
                        // Calculate best windows for use in expanded section
                        const bestWindows = analyzeBestWindows(points);
                        const avoidWindows = findAvoidWindows(points);

                        // Format average height for display
                        const displayAvgHeight = avgHeight !== null ? formatSurfHeight(avgHeight) : "N/A";

                        // Get accent color based on score
                        const getAccentColor = (score: number) => {
                          if (score >= 91) return 'border-l-emerald-500';
                          if (score >= 76) return 'border-l-green-500';
                          if (score >= 60) return 'border-l-lime-500';
                          if (score >= 40) return 'border-l-yellow-400';
                          return 'border-l-red-400';
                        };

                        return (
                          <div
                            key={dayKey}
                            className={`${showSurfableHoursCallout ? 'bg-white' : getCardBackgroundColor(avgScore)} border-l-4 ${getAccentColor(avgScore)} transition-all`}
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
                              className="w-full px-3 py-2.5 md:p-4 text-left"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  {/* Top line: Day name + Badge */}
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-lg md:text-2xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                                      {fullDayName}
                                    </h4>
                                    <span className={`${getScoreBadgeColors(avgScore).bg} ${getScoreBadgeColors(avgScore).text} px-1.5 py-0.5 text-[7px] md:text-[9px] font-bold tracking-wider uppercase`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                      {verdictLabel.toUpperCase()}
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

                                  {/* Stats line: Height + Wind */}
                                  <div className="flex items-center gap-2 text-[10px] md:text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                    <span className="font-black text-black text-sm md:text-base" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                                      {displayAvgHeight}
                                    </span>
                                    {avgWindSpeed !== null && windDirCardinal && (
                                      <span className="text-gray-500 flex items-center gap-0.5">
                                        {windDirCardinal.cardinal}
                                        <Arrow degrees={(windDirCardinal.degrees + 180) % 360} size={10} color="#6b7280" />
                                        {avgWindSpeed}mph
                                      </span>
                                    )}
                                    <span className="text-gray-400">
                                      {confidencePercentage}% confidence
                                    </span>
                                  </div>
                                </div>

                                {/* Expand/Collapse Chevron */}
                                <ChevronDown className={`h-5 w-5 md:h-6 md:w-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {/* Expandable Section - Two White Boxes + Hourly Breakdown */}
                            <div
                              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                              }`}
                            >
                              <div className="px-3 pb-3 md:px-4 md:pb-4">
                                {/* Two Row Layout - CONDITIONS & BEST WINDOWS on top, TIDE FORECAST below */}
                                {/* Row 1: CONDITIONS and BEST WINDOWS */}
                                <div className="grid md:grid-cols-2 gap-2 md:gap-2 mb-2 md:mb-2">
                                  {/* CONDITIONS Box */}
                                  <div className="bg-white border-2 border-black p-2 md:p-2.5">
                                    <span className="text-[8px] md:text-[10px] font-bold tracking-widest text-gray-500 uppercase block mb-1 md:mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' }}>CONDITIONS</span>
                                    <div className="space-y-1">
                                      {amConditions.heightStr !== "N/A" && (
                                        <div className="flex items-center justify-between text-[11px] md:text-[13px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                          <span className="font-bold text-gray-900 w-6 md:w-8">AM</span>
                                          <span className="text-gray-700 flex-1 text-[10px] md:text-[13px]">{amConditions.heightStr} @ {amConditions.periodStr}</span>
                                          <span className="text-gray-500 text-right text-[9px] md:text-[13px]">{amConditions.windStr}</span>
                                        </div>
                                      )}
                                      {pmConditions.heightStr !== "N/A" && (
                                        <div className="flex items-center justify-between text-[11px] md:text-[13px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                          <span className="font-bold text-gray-900 w-6 md:w-8">PM</span>
                                          <span className="text-gray-700 flex-1 text-[10px] md:text-[13px]">{pmConditions.heightStr} @ {pmConditions.periodStr}</span>
                                          <span className="text-gray-500 text-right text-[9px] md:text-[13px]">{pmConditions.windStr}</span>
                                        </div>
                                      )}
                                      {amConditions.heightStr === "N/A" && pmConditions.heightStr === "N/A" && (
                                        <p className="text-xs md:text-sm text-gray-500">No data available</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* BEST WINDOWS Box */}
                                  <div className="bg-white border-2 border-black p-2 md:p-2.5">
                                    <span className="text-[8px] md:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BEST WINDOWS</span>
                                    {bestWindows.length === 0 ? (
                                      <p className="text-xs md:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                        {(() => {
                                          const allScores = points.map(p => p.quality_score ?? p.probabilityScore ?? 0);
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
                                  <div className="px-4 py-3 md:px-6 md:py-4 border-b-2 border-black">
                                    <span className="text-[9px] md:text-[11px] font-bold tracking-wide text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>HOURLY BREAKDOWN</span>
                                  </div>

                                  {/* Scrollable wrapper for mobile */}
                                  <div className="overflow-x-auto md:overflow-x-visible">
                                  {/* Table Header */}
                                  <div
                                      className="grid px-2 md:px-4 py-2 md:py-3 bg-gray-50 border-b border-gray-200 text-[8px] md:text-[10px] font-bold tracking-wide text-gray-500 uppercase"
                                      style={{ gridTemplateColumns: '6% 9% 22% 22% 15% 15% 11%', width: '100%', minWidth: '640px', fontFamily: "'JetBrains Mono', monospace" }}
                                  >
                                    <div></div>
                                    <div>Surf</div>
                                    <div>Primary Swell</div>
                                    <div>Secondary Swell</div>
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
                                        const qualityScore = point.quality_score ?? point.probabilityScore ?? 0;

                                        // Check if this hour is during nighttime
                                        const isNight = spot ? isNighttime(point.forecastTimestamp, parseFloat(String(spot.latitude)), parseFloat(String(spot.longitude))) : false;

                                        // Wind data
                                        const windSpeed = point.windSpeedMph !== null ? Math.round(point.windSpeedMph) : null;
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

                                        // Calculate surf height range for display
                                        const surfHeight = point.breakingWaveHeightFt !== null
                                          ? point.breakingWaveHeightFt
                                          : (primarySwellHeight ?? 0);
                                        const formatSurfRange = (height: number): string => {
                                          if (height < 0.5) return 'Flat';
                                          if (height < 1) return '0-1';
                                          const low = Math.floor(height);
                                          const high = Math.ceil(height);
                                          if (height >= 4) return `${low}-${high}+`;
                                          return low === high ? `${low}` : `${low}-${high}`;
                                        };


                                        // Wind type for color coding
                                        const windType = point.windType ?? null;
                                        const windColor = windType === 'offshore' ? '#059669' : windType === 'onshore' ? '#ef4444' : windType === 'cross-offshore' ? '#6b7280' : '#64748b';

                                        return (
                                          <div
                                            key={`${point.forecastTimestamp}-${index}`}
                                            className={cn(
                                              "grid px-2 md:px-4 py-2 md:py-3.5 border-b border-gray-100 relative transition-colors items-center",
                                              isNight ? "bg-gray-100 hover:bg-gray-200" : "hover:bg-gray-50"
                                            )}
                                            style={{ gridTemplateColumns: '6% 9% 22% 22% 15% 15% 11%', width: '100%', minWidth: '640px' }}
                                          >
                                            {/* Quality indicator left border */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-[2px] md:w-[3px] ${getQualityBorderColor(qualityScore)}`} />

                                            {/* Time */}
                                            <div className="flex items-center">
                                              <span className="text-xs md:text-sm font-bold text-gray-800">{hour12}{period}</span>
                                            </div>

                                            {/* Surf Height Pill */}
                                            <div className="flex">
                                              <div className="bg-gray-100 rounded-lg px-1.5 md:px-2.5 py-0.5 md:py-1 text-center">
                                                <span className="text-xs md:text-sm font-bold text-gray-900">
                                                  {formatSurfRange(surfHeight)}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Primary Swell with SVG arrow */}
                                            <div className="flex items-center gap-1 md:gap-2">
                                              <span className="text-xs md:text-sm font-bold text-gray-900 min-w-[32px] md:min-w-[42px]">
                                                {primarySwellHeight !== null ? `${primarySwellHeight.toFixed(1)}ft` : '—'}
                                              </span>
                                              <span className="text-[10px] md:text-[13px] font-semibold text-gray-600">
                                                {primarySwellPeriod !== null ? `${Math.round(primarySwellPeriod)}s` : ''}
                                              </span>
                                              {primarySwellDeg !== null && (
                                                <SwellArrow directionDeg={primarySwellDeg} size={14} />
                                              )}
                                            </div>

                                            {/* Secondary Swell with lighter styling */}
                                            <div className="flex items-center gap-1 md:gap-2">
                                              {secondaryHeight !== null && secondaryHeight > 0 ? (
                                                <>
                                                  <span className="text-xs md:text-sm font-semibold text-gray-500 min-w-[32px] md:min-w-[42px]">
                                                    {secondaryHeight.toFixed(1)}ft
                                                  </span>
                                                  <span className="text-[10px] md:text-[13px] font-medium text-gray-400">
                                                    {secondaryPeriod !== null ? `${Math.round(secondaryPeriod)}s` : ''}
                                                  </span>
                                                  {secondaryDeg !== null && (
                                                    <SwellArrow directionDeg={secondaryDeg} size={12} secondary />
                                                  )}
                                                </>
                                              ) : (
                                                <span className="text-[10px] md:text-[13px] text-gray-300">—</span>
                                              )}
                                            </div>

                                            {/* Wind with styled arrow box */}
                                            <div className="flex items-center gap-1 md:gap-2">
                                              <span className="text-xs md:text-sm font-bold text-gray-900">
                                                {windSpeed !== null ? `${windSpeed}` : '—'}
                                                <span className="text-[9px] md:text-[11px] font-medium text-gray-500">mph</span>
                                              </span>
                                              {point.windDirectionDeg !== null && (
                                                <WindArrowBadge
                                                  directionDeg={point.windDirectionDeg}
                                                  windType={getWindBadgeType(windType)}
                                                />
                                              )}
                                            </div>

                                            {/* Tide */}
                                            <div className="flex items-center">
                                              {tideInfo.height !== null && tideInfo.state && (
                                                <span className={`text-[10px] md:text-[13px] inline-flex items-center gap-0.5 ${
                                                  tideInfo.state === 'high' || tideInfo.state === 'low'
                                                    ? 'font-bold text-[#1e293b]'
                                                    : 'font-semibold text-[#64748b]'
                                                }`}>
                                                  {tideInfo.height.toFixed(1)}ft
                                                  {tideInfo.state === 'high' ? ' HIGH' :
                                                   tideInfo.state === 'low' ? ' LOW' :
                                                   (tideInfo.state === 'rising' || tideInfo.state === 'dropping') && (
                                                     <TrendArrow rising={tideInfo.state === 'rising'} size={10} />
                                                   )}
                                                </span>
                                              )}
                                            </div>

                                            {/* Quality - stars */}
                                            <div className="flex items-center justify-end">
                                              <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                  <span
                                                    key={star}
                                                    className={`text-xs md:text-sm ${star <= starCount ? 'text-gray-900' : 'text-gray-200'}`}
                                                  >
                                                    ★
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                    })}
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
                          FETCH 5-DAY FORECAST
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* The Swell Signal - Long Range Forecast Teaser */}
            <div className="mt-12">
              <SwellSignalTeaser />
            </div>

            {/* Tabbed Content Interface */}
            {spot && (spot.name === "Lido Beach" || spot.name === "Rockaway Beach" || spot.name === "Long Beach") && (
              <div className="mt-8 sm:mt-12">
                {/* Tab Navigation */}
                <div className="bg-gray-50 border-2 border-black mb-4 sm:mb-8">
                  <div className="px-3 py-2 sm:p-4 border-b-2 border-black">
                    <h2 className="text-2xl sm:text-3xl font-bold text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                      SPOT GUIDE
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 sm:gap-2 p-2 sm:p-4">
                    <button
                      onClick={() => setActiveTab("ideal-conditions")}
                      className={cn(
                        "px-2 py-2.5 sm:px-4 sm:py-3 text-[11px] sm:text-sm font-bold uppercase tracking-wide transition-all duration-200 border-2",
                        activeTab === "ideal-conditions"
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-100"
                      )}
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                    >
                      Ideal Conditions
                    </button>
                    <button
                      onClick={() => setActiveTab("when-to-go")}
                      className={cn(
                        "px-2 py-2.5 sm:px-4 sm:py-3 text-[11px] sm:text-sm font-bold uppercase tracking-wide transition-all duration-200 border-2",
                        activeTab === "when-to-go"
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-100"
                      )}
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                    >
                      When to Go
                    </button>
                    <button
                      onClick={() => setActiveTab(spot.name === "Lido Beach" ? "offshore-bathymetry" : spot.name === "Rockaway Beach" || spot.name === "Long Beach" ? "getting-there" : "location")}
                      className={cn(
                        "px-2 py-2.5 sm:px-4 sm:py-3 text-[11px] sm:text-sm font-bold uppercase tracking-wide transition-all duration-200 border-2",
                        (spot.name === "Lido Beach" ? activeTab === "offshore-bathymetry" : spot.name === "Rockaway Beach" || spot.name === "Long Beach" ? activeTab === "getting-there" : activeTab === "location")
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-100"
                      )}
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                    >
                      {spot.name === "Lido Beach" ? "Bathymetry" : spot.name === "Rockaway Beach" || spot.name === "Long Beach" ? "Getting There" : "Location"}
                    </button>
                    <button
                      onClick={() => setActiveTab("wave-mechanics")}
                      className={cn(
                        "px-2 py-2.5 sm:px-4 sm:py-3 text-[11px] sm:text-sm font-bold uppercase tracking-wide transition-all duration-200 border-2",
                        activeTab === "wave-mechanics"
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-100"
                      )}
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                    >
                      Wave Mechanics
                    </button>
                    <button
                      onClick={() => setActiveTab("surf-culture")}
                      className={cn(
                        "col-span-2 sm:col-span-1 px-2 py-2.5 sm:px-4 sm:py-3 text-[11px] sm:text-sm font-bold uppercase tracking-wide transition-all duration-200 border-2",
                        activeTab === "surf-culture"
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-100"
                      )}
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                    >
                      {spot.name === "Lido Beach" ? "Culture & Etiquette" : "Surf Culture"}
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                  {/* Ideal Conditions Tab */}
                  {activeTab === "ideal-conditions" && spot && (
                    <SpotIdealConditions spotName={spot.name} />
                  )}

                  {/* Lido Beach Tabs */}
                  {spot.name === "Lido Beach" && (
                    <>
                      {activeTab === "when-to-go" && (
                        <div className="bg-white border-2 border-black">
                          {/* Header */}
                          <div className="border-b-2 border-black p-3 sm:p-6">
                            <div className="flex items-center gap-3 mb-1 sm:mb-2">
                              <span className="text-[8px] sm:text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SEASONAL GUIDE</span>
                            </div>
                            <h3 className="text-2xl sm:text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                              WHEN TO PADDLE OUT
                            </h3>
                          </div>

                          {/* Season Cards */}
                          <div className="divide-y-2 divide-black">
                            {/* Prime Season */}
                            <div className="p-3 sm:p-6 bg-emerald-50">
                              <div className="flex items-start gap-3 sm:gap-4">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-600 flex items-center justify-center shrink-0">
                                  <span className="text-white font-black text-[10px] sm:text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>SEP-OCT</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                    <h4 className="text-lg sm:text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>PRIME SEASON</h4>
                                    <span className="text-[8px] sm:text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-1.5 sm:px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GO</span>
                                  </div>
                                  <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    Fall offers the highest probability of the "Magic Combo": <span className="font-bold">SE Swell + Northern Winds</span>.
                                  </p>
                                  <div className="bg-white border-2 border-black p-2 sm:p-4">
                                    <span className="text-[8px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>HURRICANE TRACKS</span>
                                    <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                      Tropical systems pump in SE swell. Cold fronts provide N/NW winds to groom waves.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Secondary Season */}
                            <div className="p-3 sm:p-6 bg-amber-50">
                              <div className="flex items-start gap-3 sm:gap-4">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500 flex items-center justify-center shrink-0">
                                  <span className="text-white font-black text-[10px] sm:text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>DEC-MAR</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                    <h4 className="text-lg sm:text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>SECONDARY</h4>
                                    <span className="text-[8px] sm:text-[10px] font-medium tracking-widest bg-amber-500 text-white px-1.5 sm:px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAYBE</span>
                                  </div>
                                  <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    For hardcore surfers with 5mm wetsuits. Powerful lows bring potential for all-time barrels.
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                    <div className="bg-white border-2 border-black p-2 sm:p-3">
                                      <span className="text-[8px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-0.5 sm:mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>REALITY</span>
                                      <p className="text-[10px] sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>NJ often gets better westerly winds.</p>
                                    </div>
                                    <div className="bg-white border-2 border-black p-2 sm:p-3">
                                      <span className="text-[8px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-0.5 sm:mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>KEY</span>
                                      <p className="text-[10px] sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Wait for N/NW winds after low passes.</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Off Season */}
                            <div className="p-3 sm:p-6 bg-red-50">
                              <div className="flex items-start gap-3 sm:gap-4">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500 flex items-center justify-center shrink-0">
                                  <span className="text-white font-black text-[10px] sm:text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>JUN-AUG</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                    <h4 className="text-lg sm:text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>OFF-SEASON</h4>
                                    <span className="text-[8px] sm:text-[10px] font-medium tracking-widest bg-red-500 text-white px-1.5 sm:px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SKIP</span>
                                  </div>
                                  <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    Small waves, afternoon sea breezes. Better for longboards.
                                  </p>
                                  <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                                    <div className="bg-white border-2 border-black p-1.5 sm:p-3">
                                      <span className="text-[7px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MOVE</span>
                                      <p className="text-[9px] sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Dawn patrol before 8 AM.</p>
                                    </div>
                                    <div className="bg-white border-2 border-black p-1.5 sm:p-3">
                                      <span className="text-[7px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>CROWDS</span>
                                      <p className="text-[9px] sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>High. Guards 9-6.</p>
                                    </div>
                                    <div className="bg-white border-2 border-black p-1.5 sm:p-3">
                                      <span className="text-[7px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ACCESS</span>
                                      <p className="text-[9px] sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Permits needed.</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "wave-mechanics" && (
                        <div className="bg-white border-2 border-black">
                          {/* Header */}
                          <div className="border-b-2 border-black p-6">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WAVE SCIENCE</span>
                            </div>
                            <h3 className="text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                              THE LIDO BUMP
                            </h3>
                            <p className="mt-3 text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              Lido consistently delivers waves a foot or more bigger than Long Beach down the road. Locals call it the "Lido Bump," and it's all thanks to what's happening beneath the surface.
                            </p>
                          </div>

                          {/* Content Sections */}
                          <div className="divide-y-2 divide-black">
                            {/* The Jones Inlet Lens */}
                            <div className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-black flex items-center justify-center shrink-0">
                                  <span className="text-white font-black text-lg" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>01</span>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-2xl font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>THE JONES INLET LENS</h4>
                                  <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    The massive sand deposit at Jones Inlet acts like a magnifying glass for swell energy. When waves roll in from the southeast, they hit this shallow underwater hill and bend toward Lido, focusing the energy right into the lineup instead of spreading it evenly down the coast.
                                  </p>

                                  {/* Technical Explanation */}
                                  <div className="bg-gray-50 border-2 border-black p-4 mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TECHNICAL</span>
                                    </div>
                                    <p className="text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                      The sand deposit is technically called an <span className="font-bold">ebb-tidal shoal</span>. Because waves move slower in shallow water, the part of a wave hitting the shoal slows down while the part in the deeper channel maintains speed. This causes the wave crest to bend (refraction) and converge toward a focal point—in this case, Lido.
                                    </p>
                                  </div>

                                  <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    While other beaches get the standard swell, Lido gets the concentrated hit. When that fast-moving swell finally hits Lido's steep sandbar close to shore, it jacks up hard and vertical—creating those powerful, hollow A-frames the spot is known for.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Jones Inlet Shoal Visual */}
                            <div className="p-6 bg-gray-50">
                              <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BATHYMETRY VISUAL</span>
                              </div>
                              <div className="border-2 border-black overflow-hidden">
                                <img
                                  src="/Jones Inlet Shoal.png"
                                  alt="Jones Inlet Shoal diagram showing wave refraction and the Lido Bump effect"
                                  className="w-full"
                                  style={{ maxWidth: '100%', height: 'auto' }}
                                />
                              </div>
                            </div>

                            {/* No Jetties, No Problem */}
                            <div className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-black flex items-center justify-center shrink-0">
                                  <span className="text-white font-black text-lg" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>02</span>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-2xl font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>NO JETTIES, NO PROBLEM</h4>
                                  <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    Long Beach and Rockaway's rock groins chop up wave lines and kill momentum. Lido's open beach lets swells maintain clean, uninterrupted crests with maximum power. The natural sand movement builds up a middle bar that amplifies those heavy peaks.
                                  </p>

                                  {/* Bottom Line */}
                                  <div className="bg-black p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-400 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BOTTOM LINE</span>
                                    </div>
                                    <p className="text-sm text-white leading-relaxed font-medium" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                      While other beaches get the leftovers, Lido gets the focused hit. When it's on, it's bigger, hollower, and way less forgiving. Paddle accordingly.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "offshore-bathymetry" && (
                        <SpotInfoCard title="Offshore Bathymetry">
                          <div className="space-y-6">
                            <p className="text-black leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              Content coming soon...
                            </p>
                          </div>
                        </SpotInfoCard>
                      )}


                      {activeTab === "surf-culture" && (
                        <div className="bg-white rounded-none shadow-sm border-2 border-black relative overflow-hidden transition-all duration-200" style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`,
                        }}>
                          <div className="px-8 py-6 border-b-2 border-black">
                            <h3 className="text-3xl font-semibold text-black tracking-tight mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>LOCAL CULTURE & ETIQUETTE</h3>
                            <p className="text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              The surf culture at Lido Beach is more intense than anywhere else in Western Long Island. Because it gets the best surf, it attracts the best surfers.
                            </p>
                          </div>
                          <div className="px-8 py-10">
                            <div className="text-base text-black leading-relaxed space-y-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              <div className="space-y-6">

                            {/* The Lineup */}
                            <div>
                              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>THE LINEUP</h4>
                              <div className="bg-white border-2 border-black p-4">
                                <p className="text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  The lineup is dominated by a dedicated core of Long Beach locals who treat this break as their backyard. This crew is present year-round—from the hurricane swells of September to the freezing, heavy barrels of February—and the hierarchy in the water is established and enforced.
                                </p>
                              </div>
                            </div>

                            {/* A Note on Etiquette */}
                            <div>
                              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>A NOTE ON ETIQUETTE</h4>
                              <div className="space-y-3">
                                <div className="bg-red-50 border-2 border-red-500 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>High-Performance Zone</span>
                                  </div>
                                  <p className="text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    The space between the main jetties (shown below) is not a learning ground. On days when the surf is working, the lineup becomes a high-performance zone.
                                  </p>
                                </div>

                                <div className="bg-amber-50 border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-medium tracking-widest bg-amber-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>KNOW YOUR LEVEL</span>
                                  </div>
                                  <p className="text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  On days with quality surf, we strongly advise beginner surfers to avoid the area between the jetties entirely. Intermediate surfers new to Lido Beach should start their session outside these main zones to acclimate to the lineup.
                                  </p>
                                </div>

                                <div className="bg-red-50 border-2 border-red-500 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-medium tracking-widest bg-red-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>RESPECT THE LINEUP</span>
                                  </div>
                                  <p className="text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    Dropping in on a local or ditching your board in front of a breaking wave is dangerous and will not be tolerated. Breaching etiquette here doesn't just ruin a wave; it ruins your session.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Lido Beach Surfing Zones */}
                            <div>
                              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>LIDO BEACH SURFING ZONES</h4>
                              <div className="space-y-4">
                                <img 
                                  src="/Lido Surf Zones.png" 
                                  alt="Lido Beach surfing zones map showing the main jetties and surf zones"
                                  className="w-full h-auto border-2 border-black"
                                />
                                <div className="bg-gray-50 border-2 border-black p-4">
                                  <p className="text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    The main jetties create distinct zones where the best waves break. Understanding these zones helps you position yourself correctly and respect the established lineup hierarchy.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Local Knowledge Quick Reference */}
                            <div>
                              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>LOCAL KNOWLEDGE</h4>
                              <div className="grid md:grid-cols-2 gap-3">
                                <div className="bg-white border-2 border-black p-4">
                                  <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE VIBE</span>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    High intensity. This is the premier break in Western Long Island, and the local talent reflects that.
                                  </p>
                                </div>
                                <div className="bg-white border-2 border-black p-4">
                                  <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE CROWD</span>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    Dominated by the Long Beach crew. The pecking order is strict and strictly enforced.
                                  </p>
                                </div>
                                <div className="bg-red-50 border-2 border-red-500 p-4">
                                  <span className="text-[10px] font-medium tracking-widest bg-red-500 text-white px-2 py-0.5 block mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE WARNING</span>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    Not for beginners. The surfing between the two main jetties is high-consequence.
                                  </p>
                                </div>
                                <div className="bg-white border-2 border-black p-4">
                                  <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE RULE</span>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    If you drop in or ditch your board, expect a bad day. If you are unsure of your ability, do not paddle out here.
                                  </p>
                                </div>
                              </div>
                            </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Rockaway Beach Tabs */}
                  {spot.name === "Rockaway Beach" && (
                    <>
                      {activeTab === "when-to-go" && (
                        <div className="bg-white border-2 border-black">
                          {/* Header */}
                          <div className="border-b-2 border-black p-6">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SEASONAL GUIDE</span>
                            </div>
                            <h3 className="text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                              WHEN TO PADDLE OUT
                            </h3>
                            <p className="mt-3 text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              Rockaway runs on seasonal rhythms. Time it right, and you'll score. Miss the window, and you'll be fighting crowds for crumbs.
                            </p>
                          </div>

                          {/* Season Cards */}
                          <div className="divide-y-2 divide-black">
                            {/* Prime Season */}
                            <div className="p-6 bg-emerald-50">
                              <div className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-emerald-600 flex items-center justify-center shrink-0">
                                  <span className="text-white font-black text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>SEP-OCT</span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>PRIME SEASON</h4>
                                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GO</span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    Fall is the transition period where summer Southerlies fade and winter patterns emerge. Prime time for the "Magic Combo": <span className="font-bold">SE Swell + Northern Wind</span>.
                                  </p>
                                  <div className="grid md:grid-cols-2 gap-3">
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>HURRICANE TRACKS</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Tropical systems pump SE swell. Cold fronts provide N/NW grooming winds.</p>
                                    </div>
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>IDEAL TRACK</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Cape Verde storm riding Bermuda High, recurving north. Bill '09, Larry '21, Lee '23.</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Secondary Season */}
                            <div className="p-6 bg-amber-50">
                              <div className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-amber-500 flex items-center justify-center shrink-0">
                                  <span className="text-white font-black text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>DEC-MAR</span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>SECONDARY SEASON</h4>
                                    <span className="text-[10px] font-medium tracking-widest bg-amber-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAYBE</span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    For hardcore surfers with 5mm wetsuits. Winter brings powerful lows, nor'easters, and offshore winds. All-time barrel potential, but windows are short-lived.
                                  </p>
                                  <div className="grid md:grid-cols-2 gap-3">
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE REALITY</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>NJ often gets the better end as westerly winds prevail.</p>
                                    </div>
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE KEY</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Wait for the "backside"—N/NW winds after the low passes east.</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Off Season */}
                            <div className="p-6 bg-red-50">
                              <div className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-red-500 flex items-center justify-center shrink-0">
                                  <span className="text-white font-black text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>JUN-AUG</span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>OFF-SEASON</h4>
                                    <span className="text-[10px] font-medium tracking-widest bg-red-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SKIP</span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    North Atlantic goes quiet. Small, weak pulses. S/SW sea breezes dominate afternoons—choppy, crumbly conditions better suited for longboards.
                                  </p>
                                  <div className="grid md:grid-cols-3 gap-3">
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE MOVE</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Dawn patrol before 8 AM when winds are friendliest.</p>
                                    </div>
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>CROWDS</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>High-traffic. Lifeguard restrictions 9 AM – 6 PM.</p>
                                    </div>
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE PERK</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Beach access is free. No tags, no passes.</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "wave-mechanics" && (
                        <SpotInfoCard title="Wave Mechanics">
                          <div className="space-y-8">
                            {/* Map Section */}
                            <div className="space-y-4">
                              <img 
                                src="/Rockaway Lefts.png" 
                                alt="Rockaway Beach surf break map showing groins, sandbars, and famous lefts"
                                className="w-full h-auto border-2 border-black"
                              />
                              <div className="bg-gray-50 border-2 border-black p-4">
                                <h4 className="text-lg font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>SURF BREAK FORMATION</h4>
                                <p className="text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  Nearshore currents moving east to west (green arrows) push sand against groins, creating sandbars at their tips. The groins act as focal points where sand accumulates, forming the sandbars that can produce world-class left-breaking waves.
                                </p>
                              </div>
                            </div>

                            {/* Reference Image */}
                            <div className="space-y-2">
                              <img 
                                src="/Rockaway Lefts.jpg" 
                                alt="Reference photo showing what the left breaking waves at Rockaway Beach actually look like"
                                className="w-full h-auto border-2 border-black object-cover"
                                style={{ maxHeight: '400px' }}
                              />
                              <p className="text-xs text-gray-600 text-center" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                <strong>Reference:</strong> What the famous left-breaking waves at Rockaway actually look like in action.
                              </p>
                            </div>

                            {/* Period Guide */}
                            <div>
                              <h4 className="text-xl font-black text-black uppercase mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>PERIOD GUIDE</h4>
                              <div className="space-y-4">
                                <div className="bg-emerald-50 border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SWEET SPOT</span>
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>7-10s</span>
                                  </div>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    This is when you get fun, peaky surf. The local's focus is always on the period—this range delivers the best shape at Rockaway.
                                  </p>
                                </div>
                                <div className="bg-amber-50 border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-medium tracking-widest bg-amber-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WARNING</span>
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>11-12s+</span>
                                  </div>
                                  <p className="text-sm text-gray-800 mb-2" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    After 11s it starts to get walled up. Loses shape quickly, especially if the swell isn't far enough south. Most long-period days, Rockaway will be dumpy (zero shape; jetty to jetty), while Long Beach will have much better shape.
                                  </p>
                                  <p className="text-xs text-gray-600 italic" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    "If you think about the way Rockaway faces—south and east—if swell is not far enough south, it loses shape. SE angle is where it starts."
                                  </p>
                                </div>
                                <div className="bg-gray-50 border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-medium tracking-widest bg-gray-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ANOMALY</span>
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Hurricane Erin (Aug 2025)</span>
                                  </div>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    Was an exception with 17s period. Typically, there's no way Rockaway can handle a 17s period. The hurricane was more easterly in direction and there were multiple other swells in the water—storm was in the right place at the right time.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Wind Guide */}
                            <div>
                              <h4 className="text-xl font-black text-black uppercase mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>WIND GUIDE</h4>
                              <div className="space-y-3">
                                <div className="bg-white border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Wind className="w-4 h-4 text-black" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>NW (Northwest)</span>
                                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DEAD OFFSHORE</span>
                                  </div>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Best wind direction for Rockaway.</p>
                                </div>
                                <div className="bg-white border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Wind className="w-4 h-4 text-black" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>N (North)</span>
                                  </div>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Can be a little too North, but still works.</p>
                                </div>
                                <div className="bg-white border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Wind className="w-4 h-4 text-black" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>W (West)</span>
                                  </div>
                                  <p className="text-sm text-gray-800 mb-2" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Even west works at Rockaway.</p>
                                  <p className="text-xs text-gray-600 italic" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    "Any day of the year, I'd surf a 10-15 mph W wind over a 10-15 mph east wind"
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Tide Guide */}
                            <div>
                              <h4 className="text-xl font-black text-black uppercase mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>TIDE GUIDE</h4>
                              <div className="space-y-3">
                                <div className="bg-red-50 border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Droplet className="w-4 h-4 text-black" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Low Tide</span>
                                    <span className="text-[10px] font-medium tracking-widest bg-red-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>AVOID</span>
                                  </div>
                                  <p className="text-sm text-gray-800 italic" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    "Low tide at Rockaway sucks unless it's pumping surf." On the average day, low tide has zero shape.
                                  </p>
                                </div>
                                <div className="bg-emerald-50 border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Droplet className="w-4 h-4 text-black" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Mid-High Tide</span>
                                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PREFERRED</span>
                                  </div>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  This is the preferred tide for most sessions. 
                                  </p>
                                </div>
                                <div className="bg-emerald-50 border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Droplet className="w-4 h-4 text-black" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>High Tide</span>
                                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GREAT</span>
                                  </div>
                                  <p className="text-sm text-gray-800 mb-2" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    "At high tide, there are usually really great waves" - if there's actual swell in the water. If it's a 1.2ft swell, no, but if there's actually swell, high tide is good.
                                  </p>
                                  <p className="text-xs text-gray-600" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    Example: 3.2ft @ 8s on November 10th - "Really fun day of waves"
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Reading Conditions */}
                            <div>
                              <h4 className="text-xl font-black text-black uppercase mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>READING CONDITIONS</h4>
                              <div className="bg-gray-50 border-2 border-black p-4 space-y-3">
                                <p className="text-sm text-gray-800 italic" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  "Reading the buoy's here is way more difficult than California"
                                </p>
                                <p className="text-sm text-gray-800 italic" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  "The swell periods are really short. I'm always more focused on the period"
                                </p>
                              </div>
                            </div>
                          </div>
                        </SpotInfoCard>
                      )}

                      {activeTab === "surf-culture" && (
                        <SpotInfoCard title="Surf Culture">
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>WHO IT'S FOR</h4>
                              <div className="space-y-3">
                                <div className="bg-white border-2 border-black p-4">
                                  <p className="text-sm text-gray-800 mb-2" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    <span className="font-bold">Everyone</span> - Beginners often pack the inside, while advanced surfers sit deeper by the jetties and on better sandbars.
                                  </p>
                                  <div className="bg-amber-50 border-2 border-amber-500 p-3 mt-2">
                                    <p className="text-xs text-amber-900 font-semibold" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                      ⚠️ There are certain areas when beginners should not be going out
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>HAZARDS</h4>
                              <div className="space-y-3">
                                <div className="bg-white border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-black" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>General Hazards</span>
                                  </div>
                                  <ul className="text-sm text-gray-800 space-y-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    <li>• Crowds and drop-ins</li>
                                    <li>• Surf schools and beginners on soft tops</li>
                                    <li>• Rips near the jetties</li>
                                    <li>• Boards flying around on busy summer weekends</li>
                                  </ul>
                                </div>
                                <div className="bg-red-50 border-2 border-red-500 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Seasonal Issues</span>
                                  </div>
                                  <div className="space-y-2 text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    <p><span className="font-semibold">Summertime:</span> All rules are out the window</p>
                                    <p><span className="font-semibold">Fall:</span> Water still warm, so you're getting kooks - "People that surf in NYC see 8-10 feet and good, and they just go and are total kooks"</p>
                                    <p><span className="font-semibold">Occasional fist fights</span></p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>OFF-SEASON RESTRICTIONS</h4>
                              <div className="bg-amber-50 border-2 border-black p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="w-4 h-4 text-black" />
                                  <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Summer Hours</span>
                                  <span className="text-[10px] font-medium tracking-widest bg-amber-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BEFORE 10AM</span>
                                </div>
                                <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  Can only surf before 10am - designated. This is when lifeguard restrictions are in effect during the summer months.
                                </p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>STREET/BREAK GUIDE</h4>
                              <div className="space-y-3">
                                <div className="bg-white border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="w-4 h-4 text-black" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>90th Street</span>
                                    <span className="text-[10px] font-medium tracking-widest bg-black text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAIN BREAK</span>
                                  </div>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    The main break, where everyone goes. Has the Surfline cam.
                                  </p>
                                </div>
                                <div className="bg-white border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="w-4 h-4 text-black" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>90-98th Street</span>
                                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BEST SWELLS</span>
                                  </div>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    4 jetties - they get the best of all the swells.
                                  </p>
                                </div>
                                <div className="bg-white border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="w-4 h-4 text-black" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>70s Street</span>
                                  </div>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    Always a little bit smaller than the main breaks.
                                  </p>
                                </div>
                                <div className="bg-white border-2 border-black p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="w-4 h-4 text-black" />
                                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>60s-70s Street</span>
                                  </div>
                                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    Now getting more surfers as the main breaks get more crowded.
                                  </p>
                                </div>
                                <p className="text-xs text-gray-600 italic" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  "The best streets are totally up to opinion"
                                </p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>WAVE DIRECTION</h4>
                              <div className="bg-gray-50 border-2 border-black p-4 space-y-2">
                                <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  "On the right swells, you can get rights and lefts"
                                </p>
                                <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  "If you're surfing right off the jetty, lefts are usually your only option"
                                </p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>VIBE</h4>
                              <div className="bg-emerald-50 border-2 border-black p-4 space-y-2">
                                <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  For the most part it is mellow. Tons of surfers from NY going there, tons of people that want to surf. For the most part the vibes are good.
                                </p>
                              </div>
                            </div>
                          </div>
                        </SpotInfoCard>
                      )}

                      {activeTab === "getting-there" && (
                        <div className="bg-white border-2 border-black">
                          {/* Header */}
                          <div className="border-b-2 border-black p-6">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TRANSIT GUIDE</span>
                            </div>
                            <h3 className="text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                              THE ROCKAWAY PILGRIMAGE
                            </h3>
                            <p className="mt-3 text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              Rockaway is the only place in the world where you'll see a 9-foot longboard on a subway car. Here's how to navigate the trip from the city to the lineup.
                            </p>
                          </div>

                          {/* Transport Options Grid */}
                          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-black border-b-2 border-black">
                            {/* A Train */}
                            <div className="p-6">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-[#0039A6] flex items-center justify-center">
                                  <span className="text-white font-black text-sm" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>A</span>
                                </div>
                                <span className="text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SUBWAY</span>
                              </div>
                              <h4 className="text-xl font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>THE A TRAIN & SHUTTLE</h4>
                              <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                The most iconic way to get here. Cheap, avoids Belt Parkway traffic, drops you blocks from the break.
                              </p>
                              <div className="space-y-2 text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ROUTE</span>
                                  <span className="text-gray-800">Far Rockaway-bound A to Broad Channel, transfer to S shuttle</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>STOPS</span>
                                  <span className="text-gray-800">Beach 90th (the scene), 105th (quieter), 116th (end of line)</span>
                                </div>
                              </div>
                            </div>

                            {/* Ferry */}
                            <div className="p-6">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-black flex items-center justify-center">
                                  <Waves className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>FERRY</span>
                              </div>
                              <h4 className="text-xl font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>NYC FERRY</h4>
                              <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                The fastest way to get your head in the game. 50-minute cruise swaps subway heat for salt-air breeze.
                              </p>
                              <div className="space-y-2 text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>FROM</span>
                                  <span className="text-gray-800">Wall St./Pier 11 or Sunset Park (Brooklyn)</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DROP</span>
                                  <span className="text-gray-800">Beach 108th St. 10-min walk to the 90s</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TIP</span>
                                  <span className="text-gray-800">Bar on board. Makes the ride back even better.</span>
                                </div>
                              </div>
                            </div>

                            {/* Driving */}
                            <div className="p-6">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-black flex items-center justify-center">
                                  <Car className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DRIVING</span>
                              </div>
                              <h4 className="text-xl font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>CAR & PARKING</h4>
                              <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                Great for winter sessions. A nightmare on summer weekends.
                              </p>
                              <div className="space-y-2 text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>RULE</span>
                                  <span className="text-gray-800">Summer: parked by 7:30 AM or you're circling blocks</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>COST</span>
                                  <span className="text-gray-800">Street parking free but limited near breaks</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PERK</span>
                                  <span className="text-gray-800">Beach access is free. No tags, no passes.</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Cheat Sheet */}
                          <div className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE CHEAT SHEET</span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                <thead>
                                  <tr>
                                    <th className="border-2 border-black bg-black text-white px-4 py-3 text-left font-black uppercase tracking-wide text-xs" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>METHOD</th>
                                    <th className="border-2 border-black bg-black text-white px-4 py-3 text-left font-black uppercase tracking-wide text-xs" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>BEST FOR</th>
                                    <th className="border-2 border-black bg-black text-white px-4 py-3 text-left font-black uppercase tracking-wide text-xs" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>THE TRADE-OFF</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border-2 border-black px-4 py-3 font-bold">A Train</td>
                                    <td className="border-2 border-black px-4 py-3">The car-less surfer</td>
                                    <td className="border-2 border-black px-4 py-3 text-gray-600">A long, gritty commute</td>
                                  </tr>
                                  <tr>
                                    <td className="border-2 border-black px-4 py-3 font-bold">Ferry</td>
                                    <td className="border-2 border-black px-4 py-3">Scenic views & vibes</td>
                                    <td className="border-2 border-black px-4 py-3 text-gray-600">Long lines in summer heat</td>
                                  </tr>
                                  <tr>
                                    <td className="border-2 border-black px-4 py-3 font-bold">Car</td>
                                    <td className="border-2 border-black px-4 py-3">Winter / Dawn Patrol</td>
                                    <td className="border-2 border-black px-4 py-3 text-gray-600">Summer parking is a blood sport</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Long Beach Tabs */}
                  {spot.name === "Long Beach" && (
                    <>
                      {activeTab === "when-to-go" && (
                        <div className="bg-white border-2 border-black">
                          {/* Header */}
                          <div className="border-b-2 border-black p-6">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SEASONAL GUIDE</span>
                            </div>
                            <h3 className="text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                              WHEN TO PADDLE OUT
                            </h3>
                            <p className="mt-3 text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              Long Beach follows the same seasonal patterns as the rest of Western Long Island. The difference? Pay-to-play access changes the calculus.
                            </p>
                          </div>

                          {/* Season Cards */}
                          <div className="divide-y-2 divide-black">
                            {/* Prime Season */}
                            <div className="p-6 bg-emerald-50">
                              <div className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-emerald-600 flex items-center justify-center shrink-0">
                                  <span className="text-white font-black text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>SEP-OCT</span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>PRIME SEASON</h4>
                                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GO</span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    Fall is the transition period where summer Southerlies fade and winter patterns emerge. Prime time for the "Magic Combo": <span className="font-bold">SE Swell + Northern Wind</span>.
                                  </p>
                                  <div className="grid md:grid-cols-2 gap-3">
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>HURRICANE TRACKS</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Tropical systems pump SE swell. Cold fronts provide N/NW grooming winds.</p>
                                    </div>
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>IDEAL TRACK</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Cape Verde storm riding Bermuda High, recurving north. Bill '09, Larry '21, Lee '23.</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Secondary Season */}
                            <div className="p-6 bg-amber-50">
                              <div className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-amber-500 flex items-center justify-center shrink-0">
                                  <span className="text-white font-black text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>DEC-MAR</span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>SECONDARY SEASON</h4>
                                    <span className="text-[10px] font-medium tracking-widest bg-amber-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAYBE</span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    For hardcore surfers with 5mm wetsuits. Winter brings powerful lows, nor'easters, and offshore winds. All-time barrel potential, but windows are short-lived.
                                  </p>
                                  <div className="grid md:grid-cols-2 gap-3">
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE REALITY</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>NJ often gets the better end as westerly winds prevail.</p>
                                    </div>
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE KEY</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Wait for the "backside"—N/NW winds after the low passes east.</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Off Season */}
                            <div className="p-6 bg-red-50">
                              <div className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-red-500 flex items-center justify-center shrink-0">
                                  <span className="text-white font-black text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>JUN-AUG</span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>OFF-SEASON</h4>
                                    <span className="text-[10px] font-medium tracking-widest bg-red-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SKIP</span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    North Atlantic goes quiet. Small, weak pulses. S/SW sea breezes dominate afternoons—choppy, crumbly conditions better suited for longboards.
                                  </p>
                                  <div className="grid md:grid-cols-3 gap-3">
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE MOVE</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Dawn patrol before 8 AM when winds are friendliest.</p>
                                    </div>
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>CROWDS</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>High-traffic. Lifeguard restrictions 9 AM – 6 PM.</p>
                                    </div>
                                    <div className="bg-white border-2 border-black p-3">
                                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ACCESS</span>
                                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>~$15/day pass or seasonal permit required.</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "getting-there" && (
                        <div className="bg-white border-2 border-black">
                          {/* Header */}
                          <div className="border-b-2 border-black p-6">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TRANSIT GUIDE</span>
                            </div>
                            <h3 className="text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                              THE COMMUTER RAIL WAVE
                            </h3>
                            <p className="mt-3 text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              Long Beach is the "middle ground" of NY surfing. More refined than the Rockaway crawl but requires a bit more logistical planning. Here's how you get there.
                            </p>
                          </div>

                          {/* Transport Options Grid */}
                          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black border-b-2 border-black">
                            {/* LIRR */}
                            <div className="p-6">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-[#0039A6] flex items-center justify-center">
                                  <Train className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LIRR</span>
                              </div>
                              <h4 className="text-xl font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>THE STRESS-FREE STRIKE</h4>
                              <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                Unlike the subway-accessible Rockaways, Long Beach is serviced by the LIRR. Faster, cleaner, more reliable—but comes with a ticket price.
                              </p>
                              <div className="space-y-2 text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>FROM</span>
                                  <span className="text-gray-800">Penn Station, Grand Central, or Atlantic Terminal</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TIME</span>
                                  <span className="text-gray-800">~50 minutes. Beats Belt Parkway traffic every time.</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WALK</span>
                                  <span className="text-gray-800">Few blocks from station to boardwalk. Straight shot to sand.</span>
                                </div>
                              </div>
                            </div>

                            {/* Driving */}
                            <div className="p-6">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-black flex items-center justify-center">
                                  <Car className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DRIVING</span>
                              </div>
                              <h4 className="text-xl font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>THE PARKING PUZZLE</h4>
                              <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                ~45 minutes from the city on a perfect day. But the parking logistics are the real hurdle.
                              </p>
                              <div className="space-y-2 text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TRAP</span>
                                  <span className="text-gray-800">Street parking near beach is residents-only. Enforcement is aggressive.</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LOTS</span>
                                  <span className="text-gray-800">Municipal lots fill by 8 AM in summer.</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TIP</span>
                                  <span className="text-gray-800">Not doing dawn patrol? Take the train.</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Beach Pass Info */}
                          <div className="p-6 bg-amber-50 border-t-0">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-black flex items-center justify-center shrink-0">
                                <span className="text-white font-black text-xl" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>$</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>THE "HIDDEN" COST</h4>
                                  <span className="text-[10px] font-medium tracking-widest bg-black text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BEACH PASS</span>
                                </div>
                                <p className="text-sm text-gray-700 mb-3 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  The biggest shift for Rockaway locals: Long Beach is "pay-to-play" during the season.
                                </p>
                                <div className="grid md:grid-cols-3 gap-4 text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  <div>
                                    <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE FEE</span>
                                    <span className="text-gray-800">Memorial Day – Labor Day: ~$15/day for non-residents</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ENFORCEMENT</span>
                                    <span className="text-gray-800">Checked strictly at every entrance during lifeguard hours</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE WORKAROUND</span>
                                    <span className="text-gray-800">Dawn Patrol before checkers arrive, or post-6 PM after they leave</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "wave-mechanics" && (
                        <SpotInfoCard title="Wave Mechanics">
                          <p className="text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                            Content coming soon...
                          </p>
                        </SpotInfoCard>
                      )}

                      {activeTab === "surf-culture" && (
                        <SpotInfoCard title="Surf Culture">
                          <p className="text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                            Content coming soon...
                          </p>
                        </SpotInfoCard>
                      )}
                    </>
                  )}
                </div>
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
    </div>
  );
}
