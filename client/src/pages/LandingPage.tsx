import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Clock, Car, Train, ChevronDown, Users, User } from "lucide-react";
import { SwellArrow, WindArrowBadge, Arrow } from "@/components/ui/arrow";
import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/_core/hooks/useAuth";
import { selectCurrentTimelinePoint, formatSurfHeight } from "@/lib/forecastUtils";
import { getScoreBadgeHexColor, getScoreBadgeTextHexColor } from "@/lib/ratingColors";
import { isNighttime, calculateSunset } from "@/lib/sunTimes";
import { useCurrentConditions } from "@/hooks/useCurrentConditions";

// Helper functions for NYC grit forecast display
// Rule: <1ft = Don't Bother (no surf), otherwise score-based labels
const getRatingLabel = (score: number | null | undefined, waveHeightStr?: string): string => {
  if (score === null || score === undefined) return "N/A";

  // If wave height is <1ft, always show Don't Bother regardless of score
  if (waveHeightStr === "<1ft") return "Don't Bother";

  const s = Math.round(score);
  if (s <= 39) return "Don't Bother";
  if (s <= 59) return "Worth a Look";
  if (s <= 75) return "Go Surf";
  if (s <= 90) return "Firing";
  return "All-Time";
};

const formatSwellDirection = (deg: number | null | undefined): string => {
  if (deg === null || deg === undefined) return "N/A";
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(deg / 22.5) % 16;
  const cardinal = cardinals[index];
  return `${cardinal} ${Math.round(deg)}°`;
};

// Convert cardinal direction string to approximate degrees
const cardinalToDegrees = (cardinal: string | null | undefined): number | null => {
  if (!cardinal) return null;
  const cardinalMap: Record<string, number> = {
    'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
    'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
    'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
    'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
  };
  return cardinalMap[cardinal.toUpperCase()] ?? null;
};

// Format cardinal direction with degrees
const formatCardinalWithDegrees = (cardinal: string | null | undefined): string => {
  if (!cardinal) return "N/A";
  const deg = cardinalToDegrees(cardinal);
  if (deg === null) return cardinal;
  return `${cardinal} ${Math.round(deg)}°`;
};

// Helper to determine wind type for arrow badge coloring
const getWindType = (windType: string | null | undefined): "offshore" | "onshore" | "cross" | "unknown" => {
  if (!windType) return "unknown";
  const lower = windType.toLowerCase();
  if (lower.includes("offshore")) return "offshore";
  if (lower.includes("onshore")) return "onshore";
  if (lower.includes("cross") || lower.includes("side")) return "cross";
  return "unknown";
};

const getCrowdLabel = (level: number): string => {
  const labels = ["", "Empty", "Light", "Moderate", "Crowded", "Packed"];
  return labels[level] || "Unknown";
};

const getCrowdColor = (level: number): string => {
  if (level <= 1) return "bg-emerald-600";
  if (level === 2) return "bg-emerald-500";
  if (level === 3) return "bg-amber-500";
  if (level === 4) return "bg-orange-500";
  return "bg-red-600";
};

// Helper function to get background tint color based on score
// Matches the season cards design with tinted backgrounds
// Note: Landing page uses neutral background for low scores (no red tint)
const getScoreBackgroundTint = (score: number, useNeutralForLow: boolean = false): string => {
  const s = Math.round(score);
  if (s > 90) return "bg-emerald-50"; // All-Time
  if (s >= 76) return "bg-green-50"; // Firing
  if (s >= 60) return "bg-lime-50"; // Go Surf
  if (s >= 40) return "bg-yellow-50"; // Worth a Look
  // Use neutral white for low scores on landing page
  return useNeutralForLow ? "bg-white" : "bg-red-50";
};

const getWetsuitRecommendation = (waterTempF: number | null, airTempF: number | null): { thickness: string; color: string } => {
  if (waterTempF === null) return { thickness: "N/A", color: "text-black" };
  
  if (waterTempF < 42) {
    return { thickness: "6/5MM HOODED", color: "text-black" };
  } else if (waterTempF >= 42 && waterTempF <= 51) {
    return { thickness: "5/4MM HOODED", color: "text-black" };
  } else if (waterTempF >= 52 && waterTempF <= 57) {
    return { thickness: "4/3MM", color: "text-black" };
  } else if (waterTempF >= 58 && waterTempF <= 64) {
    return { thickness: "4/3MM or 3/2MM", color: "text-black" };
  } else {
    return { thickness: "3/2MM or SPRING SUIT", color: "text-black" };
  }
};

const getWetsuitAccessories = (waterTempF: number | null, airTempF: number | null): string => {
  if (waterTempF === null) return "N/A";
  
  if (waterTempF < 45 && airTempF !== null && airTempF < 30) {
    return "Boots (7mm), Gloves (6mm), Hood";
  }
  if (waterTempF < 42) {
    return "Boots (7mm), Gloves (5mm), Hood";
  }
  if (waterTempF >= 42 && waterTempF <= 51) {
    return "Boots (5-7mm), Hood, Gloves";
  }
  if (waterTempF >= 52 && waterTempF <= 57) {
    return "Boots (3-5mm) optional";
  }
  if (waterTempF >= 58 && waterTempF <= 64) {
    return "Boots optional";
  }
  return "Optional";
};


// BuoyReading type matching server response (includes spectral swell/wind wave separation)
type BuoyReading = {
  waveHeight: number;
  waveHeightMeters: number;
  dominantPeriod: number;
  dominantWaveHeight: number;           // Height of dominant component (SwH or WWH based on energy)
  dominantWaveHeightMeters: number;     // Dominant height in meters
  dominantDirectionDeg: number | null;  // Direction of dominant component in degrees
  dominantDirectionLabel: string;       // Cardinal direction of dominant component
  waveDirection: number;
  directionLabel: string;
  timestamp: Date | string;
  isStale: boolean;
  // Spectral data - separated swell components from NOAA
  swellHeight: number | null;      // SwH - background groundswell
  swellPeriod: number | null;      // SwP in seconds
  swellDirection: string | null;   // SwD cardinal direction (e.g., "SE")
  swellDirectionDeg: number | null; // SwD in degrees
  windWaveHeight: number | null;   // WWH - local wind chop
  windWavePeriod: number | null;   // WWP in seconds
  windWaveDirection: string | null; // WWD cardinal direction (e.g., "WNW")
  windWaveDirectionDeg: number | null; // WWD in degrees
  steepness: string | null;        // STEEPNESS classification
  // Meteorological wind data
  windSpeedKts: number | null;     // WSPD in knots
  windDirectionDeg: number | null; // WDIR in degrees
} | null;

type LandingCardSwellPoint = {
  secondarySwellHeightFt?: number | null;
  secondarySwellPeriodS?: number | null;
  secondarySwellDirectionDeg?: number | null;
};

type LandingCardPrimarySwell = {
  primaryHeight: number;
  primaryPeriod: number | null;
  primaryDirectionLabel: string | null;
  primaryDirectionDeg: number | null;
  secondaryHeight: number;
  secondaryPeriod: number | null;
  secondaryDirectionLabel: string | null;
};

const getLandingCardPrimarySwell = (
  buoyData: BuoyReading,
  currentPoint: LandingCardSwellPoint | null | undefined
): LandingCardPrimarySwell => {
  const windWaveHeight = buoyData?.windWaveHeight ?? (buoyData?.waveHeight ?? 0);
  const windWavePeriod = buoyData?.windWavePeriod ?? (buoyData?.dominantPeriod ?? null);
  const windWaveDirectionLabel = buoyData?.windWaveDirection
    ? formatCardinalWithDegrees(buoyData.windWaveDirection)
    : (buoyData?.directionLabel ? `${buoyData.directionLabel} ${Math.round(buoyData.waveDirection)}°` : null);
  const windWaveDirectionDeg = buoyData?.windWaveDirectionDeg
    ?? cardinalToDegrees(buoyData?.windWaveDirection)
    ?? buoyData?.waveDirection
    ?? null;

  const swellHeight = buoyData?.swellHeight ?? (currentPoint?.secondarySwellHeightFt ? Number(currentPoint.secondarySwellHeightFt) : 0);
  const swellPeriod = buoyData?.swellPeriod ?? (currentPoint?.secondarySwellPeriodS ?? null);
  const swellDirectionLabel = buoyData?.swellDirection
    ? formatCardinalWithDegrees(buoyData.swellDirection)
    : (currentPoint?.secondarySwellDirectionDeg ? formatSwellDirection(currentPoint.secondarySwellDirectionDeg) : null);
  const swellDirectionDeg = buoyData?.swellDirectionDeg ?? currentPoint?.secondarySwellDirectionDeg ?? null;

  const isSwellPrimary = swellHeight >= windWaveHeight;

  return {
    primaryHeight: isSwellPrimary ? swellHeight : windWaveHeight,
    primaryPeriod: isSwellPrimary ? swellPeriod : windWavePeriod,
    primaryDirectionLabel: isSwellPrimary ? swellDirectionLabel : windWaveDirectionLabel,
    primaryDirectionDeg: isSwellPrimary ? swellDirectionDeg : windWaveDirectionDeg,
    secondaryHeight: isSwellPrimary ? windWaveHeight : swellHeight,
    secondaryPeriod: isSwellPrimary ? windWavePeriod : swellPeriod,
    secondaryDirectionLabel: isSwellPrimary ? windWaveDirectionLabel : swellDirectionLabel,
  };
};

// Format buoy timestamp for display
const formatBuoyTimestamp = (timestamp: Date | string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffMins < 120) return "1 hour ago";

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatRelativeAgeCompact = (timestamp: Date | string): string => {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMins < 1) return "NOW";
  if (diffMins < 60) return `${diffMins}M AGO`;
  if (diffMins < 24 * 60) return `${Math.floor(diffMins / 60)}H AGO`;
  return `${Math.floor(diffMins / (24 * 60))}D AGO`;
};

const degreesToCardinal = (deg: number | null | undefined): string => {
  if (deg === null || deg === undefined) return "N/A";
  const cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(deg / 22.5) % 16;
  return cardinals[index];
};


// SpotForecastCard component - extracted to properly use hooks
type SpotForecastCardProps = {
  spot: { id: number; name: string };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate: (path: string) => void;
  isAuthenticated: boolean;
  travelMode?: "driving" | "transit";
  useNeutralBackground?: boolean;
  // Legacy props for compatibility (unused - hook handles data)
  buoyData?: BuoyReading;
};

function SpotForecastCard({ spot, isExpanded, onToggleExpand, onNavigate, isAuthenticated, travelMode = "driving", useNeutralBackground = false, buoyData }: SpotForecastCardProps) {
  // Use unified hook for current conditions (same logic as spot detail pages and banner)
  const currentData = useCurrentConditions(spot.id);

  // Fetch crowd data (not part of current conditions)
  const crowdQuery = trpc.crowd.getForSpot.useQuery({ spotId: spot.id });
  
  // Get timeline for expanded view (hook provides 120hr timeline)
  const timelineQuery = currentData.queries.timeline;
  
  // Extract data for UI compatibility
  const currentPoint = currentData.currentPoint;
  const buoyLoading = currentData.isLoading;
  const forecast = currentData.queries.forecast.data?.forecast; // Fallback forecast

  // Use data from unified hook
  const score = currentData.score;
  const heightUsed = currentData.waveHeight;
  const surfHeight = formatSurfHeight(heightUsed);
  const ratingLabel = getRatingLabel(score, surfHeight);

  // Shared primary/secondary swell derivation for compact and expanded cards.
  const primarySwellData = getLandingCardPrimarySwell(buoyData, currentPoint);
  const primarySwellHeight = primarySwellData.primaryHeight > 0
    ? `${primarySwellData.primaryHeight.toFixed(1)}ft`
    : '—';
  const primarySwellPeriod = primarySwellData.primaryPeriod !== null && primarySwellData.primaryPeriod !== undefined
    ? `${primarySwellData.primaryPeriod.toFixed(0)}s`
    : '—';
  const primarySwellDirection = primarySwellData.primaryDirectionLabel ?? '—';

  // Wind info from unified hook
  const windSpeed = currentData.wind.speedMph !== null
    ? `${currentData.wind.speedMph.toFixed(0)}mph`
    : '—';
  const windDirectionDeg = currentData.wind.directionDeg;
  const windType = getWindType(currentData.wind.type);

  // Get crowd info
  const crowdLevel = crowdQuery.data?.averageLevel ?? null;
  const crowdLabel = crowdLevel !== null ? getCrowdLabel(crowdLevel) : '—';
  const crowdColor = crowdLevel !== null ? getCrowdColor(crowdLevel) : 'bg-gray-300';

  // Get background tint based on score
  // If useNeutralBackground is true, always use white (no tints)
  const backgroundTint = useNeutralBackground ? "bg-white" : getScoreBackgroundTint(score, false);
  const showVerdictGate = !isAuthenticated;

  return (
    <div
      className={cn(
        "border-2 border-black transition-all duration-300 relative overflow-hidden group",
        backgroundTint, // Apply tinted background based on score
        isExpanded ? "md:col-span-3" : "",
        "hover:shadow-lg hover:-translate-y-1",
        "rounded-none"
      )}
      style={{
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Black top border on hover */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-black transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}></div>

      {/* Compact View */}
      <div
        className="p-4 sm:p-6 md:p-8 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="grid grid-cols-[1fr_auto] gap-3 sm:gap-4 md:gap-6 items-start">
          {/* Left: Spot name + surf height */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-black uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                {spot.name}
              </h3>
              <div className="mt-1">
                <DistanceDisplay spotName={spot.name} mode={travelMode} />
              </div>
            </div>
            <span className="text-4xl sm:text-5xl md:text-6xl font-black text-black leading-none block" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.03em' }}>
              {surfHeight}
            </span>
          </div>

          {/* Right: Score badge + rating */}
          <div className="relative">
            <div className="flex flex-col items-end gap-1 sm:gap-2">
              {/* Clean square score badge with label */}
              <div className="flex flex-col items-center">
                <span className="text-[8px] sm:text-[9px] text-gray-600 uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  SCORE
                </span>
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center transition-all duration-300 border-2 border-black"
                  style={{
                    backgroundColor: getScoreBadgeHexColor(score),
                  }}
                >
                  <span className="text-xl sm:text-2xl font-black leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", color: getScoreBadgeTextHexColor(score) }}>
                    {score}
                  </span>
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-medium text-black uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {ratingLabel}
              </span>
            </div>

            {showVerdictGate && (
              <>
                <div className="absolute inset-0 z-20 bg-white/20 backdrop-blur-[10px]" />
                <div className="absolute inset-0 z-30 flex items-center justify-center px-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(`/login?redirect=${encodeURIComponent("/")}`);
                    }}
                    className="bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none uppercase tracking-wide px-3 sm:px-4 py-2 text-[10px] sm:text-xs"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Unlock Verdict
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* NOAA Buoy Data Section */}
        <div className="mt-4 sm:mt-6">
          {/* Buoy Label with Indicator */}
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping opacity-75"></div>
              <div className="relative w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            </div>
            <span className="text-[9px] sm:text-[10px] text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <span className="hidden sm:inline">BUOY 44065 (15NM OFFSHORE)</span>
              <span className="sm:hidden">BUOY 44065</span>
            </span>
          </div>

          {/* 3-Card Info Grid - Always blue styled */}
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {/* Primary Height */}
            <div className="border-2 border-blue-300 bg-blue-50 p-2 sm:p-3 flex flex-col items-center justify-center gap-1 sm:gap-1.5">
              {buoyLoading ? (
                <div className="h-4 w-12 bg-blue-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-xs sm:text-sm font-bold text-black uppercase tracking-wider text-center leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {primarySwellHeight}
                </p>
              )}
              <p className="text-[8px] sm:text-[10px] text-blue-600 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span className="hidden sm:inline">Primary Height</span>
                <span className="sm:hidden">Height</span>
              </p>
            </div>

            {/* Primary Period */}
            <div className="border-2 border-blue-300 bg-blue-50 p-2 sm:p-3 flex flex-col items-center justify-center gap-1 sm:gap-1.5">
              {buoyLoading ? (
                <div className="h-4 w-16 bg-blue-200 rounded animate-pulse"></div>
              ) : (
                <span className="text-xs sm:text-sm font-bold text-black uppercase tracking-wider text-center leading-tight whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {primarySwellPeriod}
                </span>
              )}
              <p className="text-[8px] sm:text-[10px] text-blue-600 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Period
              </p>
            </div>

            {/* Wind */}
            <div className="border-2 border-blue-300 bg-blue-50 p-2 sm:p-3 flex flex-col items-center justify-center gap-1 sm:gap-1.5">
              {buoyLoading ? (
                <div className="h-4 w-14 bg-blue-200 rounded animate-pulse"></div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-black uppercase tracking-wider text-center leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {windSpeed}
                  </span>
                  {windDirectionDeg !== null && (
                    <WindArrowBadge directionDeg={windDirectionDeg} windType={windType} badgeSize="sm" />
                  )}
                </div>
              )}
              <p className="text-[8px] sm:text-[10px] text-blue-600 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Wind
              </p>
            </div>
          </div>

        </div>

        {/* Click to expand hint */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t-2 border-black flex items-center justify-between">
          <div className="text-[10px] sm:text-xs text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {isExpanded ? 'Click to collapse' : 'Click for details'}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-black transition-transform duration-300",
              isExpanded ? "rotate-180" : ""
            )}
          />
        </div>
      </div>

      {/* Expanded Details */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 border-t-2 border-black",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-8 space-y-6">
          {/* Swell Data Row - uses NOAA Buoy spectral data when available */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Primary Swell - the larger of wind wave or background swell */}
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PRIMARY</div>
              {buoyLoading ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
              ) : primarySwellData.primaryHeight > 0 ? (
                <>
                  <div className="text-2xl text-black font-bold" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>
                    {primarySwellData.primaryHeight.toFixed(1)}ft @ {primarySwellData.primaryPeriod ? primarySwellData.primaryPeriod.toFixed(0) : 'N/A'}s
                  </div>
                  <div className="text-xs text-black mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {primarySwellData.primaryDirectionLabel || 'N/A'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>—</div>
              )}
            </div>

            {/* Secondary Swell - the smaller of wind wave or background swell */}
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SECONDARY</div>
              {buoyLoading ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
              ) : primarySwellData.secondaryHeight > 0 ? (
                <>
                  <div className="text-2xl text-black font-bold" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>
                    {primarySwellData.secondaryHeight.toFixed(1)}ft @ {primarySwellData.secondaryPeriod ? primarySwellData.secondaryPeriod.toFixed(0) : 'N/A'}s
                  </div>
                  <div className="text-xs text-black mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {primarySwellData.secondaryDirectionLabel || 'N/A'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>—</div>
              )}
            </div>

            {/* Wind Swell - wind-generated waves */}
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WIND</div>
              {buoyLoading ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
              ) : currentPoint?.windWaveHeightFt && currentPoint?.windWavePeriodS && currentPoint.windWaveHeightFt > 0 ? (
                <>
                  <div className="text-2xl text-black font-bold" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>
                    {Number(currentPoint.windWaveHeightFt).toFixed(1)}ft @ {currentPoint.windWavePeriodS.toFixed(0)}s
                  </div>
                  <div className="text-xs text-black mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {currentPoint.windWaveDirectionDeg !== null ? formatSwellDirection(currentPoint.windWaveDirectionDeg) : 'N/A'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>—</div>
              )}
            </div>

            {/* Wind Conditions - speed and direction */}
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WIND CONDITIONS</div>
              {currentPoint ? (
                <>
                  <div className="text-2xl text-black font-bold" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>
                    {currentPoint.windSpeedMph || 'N/A'} mph
                  </div>
                  <div className="text-xs text-black mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatSwellDirection(currentPoint.windDirectionDeg)} • {currentPoint.windType || 'N/A'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>—</div>
              )}
            </div>
          </div>

          {/* Tide, Temp, Wetsuit Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t-2 border-black">
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TIDE</div>
              <div className="text-2xl text-black font-bold" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                {currentData.tide.heightFt !== null ? `${(currentData.tide.heightFt / 10).toFixed(1)}ft` : 'N/A'}
              </div>
              <div className="text-xs text-black uppercase mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {currentData.tide.phase || 'N/A'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WATER</div>
              <div className="text-2xl text-black font-bold" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                {currentPoint?.waterTempF ? `${currentPoint.waterTempF}°F` : 'N/A'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>AIR</div>
              <div className="text-2xl text-black font-bold" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                {currentPoint?.airTempF ? `${currentPoint.airTempF}°F` : 'N/A'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WETSUIT</div>
              {currentPoint?.waterTempF ? (
                <>
                  <div className={cn("text-2xl font-bold", getWetsuitRecommendation(Number(currentPoint.waterTempF), currentPoint.airTempF ? Number(currentPoint.airTempF) : null).color)} style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    {getWetsuitRecommendation(Number(currentPoint.waterTempF), currentPoint.airTempF ? Number(currentPoint.airTempF) : null).thickness}
                  </div>
                  <div className="text-xs text-black mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {getWetsuitAccessories(Number(currentPoint.waterTempF), currentPoint.airTempF ? Number(currentPoint.airTempF) : null)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>—</div>
              )}
            </div>
          </div>

          {/* View Full Forecast Button */}
          <div className="pt-6">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(`/spot/${spot.id}`);
              }}
              className="w-full bg-black text-white hover:bg-gray-900 border-2 border-black uppercase text-xs font-bold px-6 py-3"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              View Full Forecast
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// DistanceDisplay component
type DistanceDisplayProps = {
  spotName: string;
  mode: "driving" | "transit";
};

function DistanceDisplay({ spotName, mode }: DistanceDisplayProps) {
  // Get user location from parent or default to NYC
  const [origin, setOrigin] = useState<string>("40.7580,-73.9855");
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setOrigin(`${position.coords.latitude},${position.coords.longitude}`);
        },
        () => {
          setOrigin("40.7580,-73.9855"); // NYC fallback
        }
      );
    }
  }, []);
  
  // Beach coordinates
  const spotCoordinates: Record<string, string> = {
    "Rockaway Beach": "40.5794,-73.8136",
    "Long Beach": "40.5884,-73.6580",
    "Lido Beach": "40.5890,-73.6250",
  };

  const destination = spotCoordinates[spotName];
  const distanceQuery = trpc.distance.getDistance.useQuery(
    {
      origin: origin,
      destination: destination || "",
      mode,
    },
    {
      enabled: !!destination,
      retry: 1,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  if (!destination) return null;

  if (distanceQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {mode === "driving" ? (
          <Car className="h-4 w-4 animate-pulse" />
        ) : (
          <Train className="h-4 w-4 animate-pulse" />
        )}
        <span>Calculating...</span>
      </div>
    );
  }

  if (distanceQuery.isError || !distanceQuery.data) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
        {mode === "driving" ? <Car className="h-3 w-3" /> : <Train className="h-3 w-3" />}
        <span>Distance unavailable</span>
      </div>
    );
  }

  const { duration, distance } = distanceQuery.data;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600 uppercase tracking-wider font-medium" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
      {mode === "driving" ? (
        <Car className="h-3 w-3 text-gray-500" />
      ) : (
        <Train className="h-3 w-3 text-gray-500" />
      )}
      <span>{duration} • {distance}</span>
    </div>
  );
}

// SurfStatusBanner - Big status banner showing current conditions or next window
type SurfStatusBannerProps = {
  featuredSpots: Array<{ id: number; name: string }>;
  travelMode: "driving" | "transit";
};

function SurfStatusBanner({ featuredSpots, travelMode }: SurfStatusBannerProps) {
  // Use unified hook for each spot (same logic as spot detail pages)
  const rockawayId = featuredSpots.find(s => s.name === "Rockaway Beach")?.id ?? 0;
  const longBeachId = featuredSpots.find(s => s.name === "Long Beach")?.id ?? 0;
  const lidoId = featuredSpots.find(s => s.name === "Lido Beach")?.id ?? 0;

  const rockawayData = useCurrentConditions(rockawayId);
  const longBeachData = useCurrentConditions(longBeachId);
  const lidoData = useCurrentConditions(lidoId);

  // Mutation to log conditions for pattern matching
  const logConditionsMutation = trpc.conditions.logSnapshot.useMutation();
  const [hasLoggedThisHour, setHasLoggedThisHour] = useState(false);

  // Get user location for directions
  const [userOrigin, setUserOrigin] = useState<string>("40.7580,-73.9855");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserOrigin(`${position.coords.latitude},${position.coords.longitude}`);
        },
        () => {
          setUserOrigin("40.7580,-73.9855"); // NYC fallback
        }
      );
    }
  }, []);

  const spotCoordinates: Record<string, string> = {
    "Rockaway Beach": "40.5794,-73.8136",
    "Long Beach": "40.5884,-73.6580",
    "Lido Beach": "40.5890,-73.6250",
  };

  // Build currentConditions from unified hook data (same as spot detail pages)
  const currentConditions = [
    {
      name: "Rockaway Beach",
      score: rockawayData.score,
      waveHeight: rockawayData.waveHeight ?? 0,
      windType: rockawayData.wind.type ?? "",
      windSpeed: rockawayData.wind.speedMph ?? 0,
      current: {
        forecastTimestamp: rockawayData.timestamp,
        wavePeriodSec: rockawayData.swell.period,
        waveDirectionDeg: rockawayData.swell.direction,
        windDirectionDeg: rockawayData.wind.directionDeg,
        tideHeightFt: rockawayData.tide.heightFt,
        tidePhase: rockawayData.tide.phase,
      },
      timeline: rockawayData.queries.timeline.data?.timeline,
    },
    {
      name: "Long Beach",
      score: longBeachData.score,
      waveHeight: longBeachData.waveHeight ?? 0,
      windType: longBeachData.wind.type ?? "",
      windSpeed: longBeachData.wind.speedMph ?? 0,
      current: {
        forecastTimestamp: longBeachData.timestamp,
        wavePeriodSec: longBeachData.swell.period,
        waveDirectionDeg: longBeachData.swell.direction,
        windDirectionDeg: longBeachData.wind.directionDeg,
        tideHeightFt: longBeachData.tide.heightFt,
        tidePhase: longBeachData.tide.phase,
      },
      timeline: longBeachData.queries.timeline.data?.timeline,
    },
    {
      name: "Lido Beach",
      score: lidoData.score,
      waveHeight: lidoData.waveHeight ?? 0,
      windType: lidoData.wind.type ?? "",
      windSpeed: lidoData.wind.speedMph ?? 0,
      current: {
        forecastTimestamp: lidoData.timestamp,
        wavePeriodSec: lidoData.swell.period,
        waveDirectionDeg: lidoData.swell.direction,
        windDirectionDeg: lidoData.wind.directionDeg,
        tideHeightFt: lidoData.tide.heightFt,
        tidePhase: lidoData.tide.phase,
      },
      timeline: lidoData.queries.timeline.data?.timeline,
    },
  ];

  // Find all surfable spots (score >= 40)
  const surfableSpots = currentConditions.filter(spot => spot.score >= 40);
  
  // Find the best current spot (for display details and buttons)
  const bestSpot = currentConditions.length > 0
    ? currentConditions.reduce((best, spot) => spot.score > best.score ? spot : best)
    : null;

  const isSurfable = surfableSpots.length > 0;

  // Log conditions for pattern matching (once per hour)
  useEffect(() => {
    // Only log if we have data and haven't logged this hour
    if (!bestSpot || hasLoggedThisHour || logConditionsMutation.isPending) return;

    // Check if we should log (once per hour based on localStorage)
    const lastLogTime = localStorage.getItem('lastConditionsLogTime');
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (lastLogTime && (now - parseInt(lastLogTime)) < oneHour) {
      setHasLoggedThisHour(true);
      return;
    }

    // Get buoy data from the best spot's hook (all spots share same buoy data)
    const buoyData = rockawayData.buoyData;
    const buoyWaveHeight = buoyData?.waveHeight ?? null;
    const buoyPeriod = buoyData?.dominantPeriod ?? null;
    const buoyDirection = buoyData?.waveDirection ?? null;

    // Determine unsurfable reason if not surfable (using buoy data for waves)
    let unsurfableReason: string | null = null;
    if (!isSurfable) {
      const waveHeight = buoyWaveHeight ?? bestSpot.waveHeight;
      const period = buoyPeriod ?? bestSpot.current?.wavePeriodSec ?? null;

      const { windType, windSpeed } = bestSpot;
      const isOnshore = windType?.toLowerCase().includes("onshore");
      const isCrossShore = windType?.toLowerCase().includes("cross");

      if (waveHeight < 1) unsurfableReason = "flat";
      else if (isOnshore && windSpeed >= 15) unsurfableReason = "blown_out";
      else if (isOnshore && windSpeed >= 8) unsurfableReason = "choppy";
      else if (windSpeed >= 30) unsurfableReason = "too_windy";
      else if (isCrossShore && windSpeed > 15) unsurfableReason = "cross_shore";
      else if (waveHeight < 2) unsurfableReason = "too_small";
      else if (period !== null && period < 6) unsurfableReason = "wind_swell";
      else unsurfableReason = "poor";
    }

    logConditionsMutation.mutate({
      bestSpotName: bestSpot.name,
      qualityScore: bestSpot.score,
      waveHeightFt: buoyWaveHeight ?? bestSpot.waveHeight,
      wavePeriodSec: buoyPeriod ?? bestSpot.current?.wavePeriodSec ?? null,
      waveDirectionDeg: buoyDirection ?? bestSpot.current?.waveDirectionDeg ?? null,
      windSpeedMph: bestSpot.windSpeed,
      windDirectionDeg: bestSpot.current?.windDirectionDeg ?? null,
      windType: bestSpot.windType || null,
      buoyWaveHeightFt: buoyWaveHeight,
      buoyPeriodSec: buoyPeriod,
      buoyDirectionDeg: buoyDirection,
      isSurfable: !!isSurfable,
      unsurfableReason,
      tideHeightFt: bestSpot.current?.tideHeightFt ? bestSpot.current.tideHeightFt / 10 : null,
      tidePhase: bestSpot.current?.tidePhase ?? null,
    }, {
      onSuccess: () => {
        localStorage.setItem('lastConditionsLogTime', now.toString());
        setHasLoggedThisHour(true);
        console.log('[Conditions Log] Snapshot logged successfully');
      },
      onError: (error) => {
        console.error('[Conditions Log] Failed to log snapshot:', error);
      }
    });
  }, [bestSpot, isSurfable, rockawayData.buoyData, hasLoggedThisHour, logConditionsMutation]);

  // Helper function to scan for future surf windows at a given score threshold
  const scanForWindows = (minScore: number): Array<{ name: string; time: Date; score: number; endTime?: Date }> => {
    const futureWindows: Array<{ name: string; time: Date; score: number; endTime?: Date }> = [];
    const now = Date.now();

    for (const spot of currentConditions) {
      const timeline = spot.timeline;
      const name = spot.name;
      if (!timeline) continue;

      // Get spot coordinates for nighttime check
      const coords = spotCoordinates[name];
      if (!coords) continue; // Skip if no coordinates
      const [lat, lng] = coords.split(',').map(Number);

      let windowStart: Date | null = null;
      let windowScore = 0;
      let lastDaylightTime: Date | null = null;

      for (const point of timeline) {
        const pointTime = new Date(point.forecastTimestamp);
        if (pointTime.getTime() <= now) continue; // Skip past times

        const isNight = isNighttime(pointTime, lat, lng);

        // If we hit nighttime and have an open window, close it at the last daylight hour
        if (isNight && windowStart && lastDaylightTime) {
          futureWindows.push({ name, time: windowStart, score: windowScore, endTime: lastDaylightTime });
          windowStart = null;
          lastDaylightTime = null;
          continue;
        }

        // Skip nighttime hours
        if (isNight) continue;

        // Track last daylight time for window ending
        lastDaylightTime = pointTime;

        const score = point.quality_score ?? point.probabilityScore ?? 0;

        if (score >= minScore && !windowStart) {
          windowStart = pointTime;
          windowScore = score;
        } else if (score < minScore && windowStart) {
          futureWindows.push({ name, time: windowStart, score: windowScore, endTime: pointTime });
          windowStart = null;
        }
      }

      // If window extends to end of timeline
      if (windowStart) {
        futureWindows.push({ name, time: windowStart, score: windowScore });
      }
    }

    // Sort by time, return earliest
    futureWindows.sort((a, b) => a.time.getTime() - b.time.getTime());
    return futureWindows;
  };

  // Find next surf window with two-tier threshold system
  // Good windows: score >= 50 (Fair/Good conditions)
  // Marginal windows: score >= 40 (Worth a Look conditions)
  const findNextWindowTwoTier = (): {
    type: 'good' | 'marginal' | 'none';
    window: { name: string; time: Date; score: number; endTime?: Date } | null;
  } => {
    if (isSurfable) return { type: 'none', window: null };

    // Scan 1: Look for score >= 50 (good windows)
    const goodWindows = scanForWindows(50);
    if (goodWindows.length > 0) {
      return { type: 'good', window: goodWindows[0] };
    }

    // Scan 2: Look for score >= 40 (marginal windows)
    const marginalWindows = scanForWindows(40);
    if (marginalWindows.length > 0) {
      return { type: 'marginal', window: marginalWindows[0] };
    }

    // No windows found in 7-day forecast
    return { type: 'none', window: null };
  };

  const nextWindowData = findNextWindowTwoTier();

  // Format time for display
  const formatWindowTime = (date: Date, endDate?: Date) => {
    const isToday = date.toDateString() === new Date().toDateString();
    const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString();

    const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : date.toLocaleDateString("en-US", { weekday: "short" });
    const startHour = date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).replace(" ", "").toLowerCase();

    if (endDate) {
      const endHour = endDate.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).replace(" ", "").toLowerCase();
      return `${dayLabel} ${startHour}-${endHour}`;
    }
    return `${dayLabel} ${startHour}`;
  };

  // Loading state
  if (rockawayData.isLoading || longBeachData.isLoading || lidoData.isLoading) {
    return (
      <div className="border-2 border-black bg-gray-100 p-6 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-gray-400 animate-pulse"></div>
          <span className="text-lg font-bold text-gray-500 uppercase tracking-wide" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
            Loading conditions...
          </span>
        </div>
      </div>
    );
  }

  // Format wave height for display
  const formatHeight = (ft: number) => {
    if (ft < 1) return "<1ft";
    const low = Math.floor(ft);
    const high = Math.ceil(ft + 0.5);
    return `${low}-${high}ft`;
  };

  // Format wave height as surf height description
  const formatSurfHeight = (ft: number | null): string => {
    if (ft === null || ft <= 0) return "Flat";

    if (ft < 1.5) return "Shin to Knee";

    if (ft < 2.5) return "Knee to Waist";

    if (ft < 3.5) return "Waist to Chest";

    if (ft < 4.5) return "Chest to Shoulder";

    if (ft < 5.5) return "Head High";

    if (ft < 7.0) return "Overhead";

    if (ft < 9.0) return "Well Overhead";

    return "Double Overhead +";
  };

  // Generate directions URL
  const getDirectionsUrl = (spotName: string) => {
    const destination = spotCoordinates[spotName];
    if (!destination) return "#";
    const mode = travelMode === "driving" ? "driving" : "transit";
    return `https://www.google.com/maps/dir/?api=1&origin=${userOrigin}&destination=${destination}&travelmode=${mode}`;
  };

  // Calculate "get there before" time - when conditions start to degrade
  const getEndTimeLabel = () => {
    if (!bestSpot) return null;

    const spotTimeline = currentConditions.find(s => s.name === bestSpot.name)?.timeline;
    if (!spotTimeline) return null;

    // Get spot coordinates for sunset calculation
    const coords = spotCoordinates[bestSpot.name];
    if (!coords) return null;
    const [lat, lng] = coords.split(',').map(Number);
    
    const now = Date.now();

    // Find when score drops below 40 (Worth a Look threshold)
    for (const point of spotTimeline) {
      const pointTime = new Date(point.forecastTimestamp);
      if (pointTime.getTime() <= now) continue;

      const score = point.quality_score ?? point.probabilityScore ?? 0;
      if (score < 40) {
        // Calculate sunset for the date of the degradation time
        const sunset = calculateSunset(lat, lng, pointTime);
        
        // Get the hour of the degradation time (in local time)
        const degradationHour = pointTime.getHours();
        
        // Check if degradation time is after sunset OR if it's after 6pm (evening/night)
        // If so, return "sunset" instead of the specific time
        if (pointTime.getTime() > sunset.getTime() || degradationHour >= 18) {
          return "sunset";
        }
        return pointTime.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).replace(" ", "").toLowerCase();
      }
    }
    return null;
  };

  const endTimeLabel = isSurfable ? getEndTimeLabel() : null;

  // Get indicator color based on score
  const getIndicatorColor = (score: number): string => {
    const s = Math.round(score);
    if (s > 90) return "bg-emerald-500"; // All-Time
    if (s >= 76) return "bg-green-500"; // Firing
    if (s >= 60) return "bg-lime-500"; // Go Surf
    if (s >= 40) return "bg-yellow-500"; // Worth a Look
    return "bg-red-500"; // Don't Bother
  };

  if (isSurfable && bestSpot) {
    // Good conditions - show tinted banner based on score
    const windLabel = bestSpot.windType?.toLowerCase().includes("offshore")
      ? "offshore"
      : bestSpot.windType?.toLowerCase().includes("onshore")
        ? "onshore"
        : "cross-shore";

    const bannerBackground = getScoreBackgroundTint(bestSpot.score);
    const indicatorColor = getIndicatorColor(bestSpot.score);

    // Tier thresholds: FIRING >= 76, GO SURF >= 60, WORTH A LOOK >= 40
    const bestScore = Math.round(bestSpot.score);
    const tierThreshold = bestScore >= 76 ? 76 : bestScore >= 60 ? 60 : 40;
    const spotsInTier = surfableSpots.filter((spot) => Math.round(spot.score) >= tierThreshold);

    // Determine the banner headline based on number of spots in same tier as best
    // "ALL SPOTS FIRING" only when all spots are actually firing (>= 76), not just surfable (>= 40)
    const getBannerHeadline = (spots: Array<{ name: string; score: number }>, score: number): string => {
      const s = Math.round(score);
      const getStatusText = () => {
        if (s >= 76) return "FIRING";
        if (s >= 60) return "GO SURF";
        return "WORTH A LOOK";
      };

      const statusText = getStatusText();

      if (spots.length === 1) {
        const spotName = spots[0].name.toUpperCase();
        return `${spotName} ${statusText}`;
      } else if (spots.length === 2) {
        const spotNames = spots.map((spot) => spot.name).join(" and ");
        return `${spotNames} ${statusText.toLowerCase()}`;
      } else if (spots.length >= 3) {
        return `ALL SPOTS ${statusText.toLowerCase()}`;
      }

      return statusText;
    };

    const bannerHeadline = getBannerHeadline(spotsInTier, bestSpot.score);
    const shareTitle = bestSpot.score >= 76 ? 'firing' : bestSpot.score >= 60 ? 'good' : 'worth checking';
    const shareText = bestSpot.score >= 76 ? 'firing!' : bestSpot.score >= 60 ? 'good!' : 'worth checking!';

    return (
      <div className={cn("border-2 border-black mb-4", bannerBackground)}>
        <div className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Main status */}
            <div className="flex items-center gap-4">
              <div className={cn("w-4 h-4 flex-shrink-0", indicatorColor)}></div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    {bannerHeadline}
                  </span>
                  <span className="text-xl md:text-2xl text-gray-600" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>•</span>
                  <span className="text-xl md:text-2xl font-bold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    {formatSurfHeight(bestSpot.waveHeight)} {windLabel}
                  </span>
                </div>
                {endTimeLabel && (
                  <p className="text-sm text-gray-700 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Get there before {endTimeLabel}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <a
                href={getDirectionsUrl(bestSpot.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors w-full md:w-auto h-10 md:h-auto"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <MapPin className="h-4 w-4" />
                Directions
              </a>
              <button
                onClick={() => {
                  const spotNames = spotsInTier.length === 1
                    ? bestSpot.name
                    : spotsInTier.map((s) => s.name).join(" and ");
                  if (navigator.share) {
                    navigator.share({
                      title: `${spotNames} ${shareTitle}!`,
                      text: `${formatSurfHeight(bestSpot.waveHeight)} ${windLabel} at ${spotNames} right now!`,
                      url: window.location.href
                    });
                  } else {
                    navigator.clipboard.writeText(`${spotNames} ${shareText} ${formatSurfHeight(bestSpot.waveHeight)} ${windLabel}. ${window.location.href}`);
                    alert("Link copied to clipboard!");
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-black bg-white text-black text-sm font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors w-full md:w-auto h-10 md:h-auto"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Users className="h-4 w-4" />
                Notify Friends
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No surf - determine the specific reason why
  const noSurfScore = bestSpot?.score ?? 0;
  const noSurfBackground = getScoreBackgroundTint(noSurfScore);
  const noSurfIndicator = getIndicatorColor(noSurfScore);

  // Determine the reason for poor conditions using NOAA buoy data for wave info
  const getUnsurfableReason = (): { headline: string; description: string; reason: string } => {
    if (!bestSpot) {
      return {
        headline: "NO DATA",
        description: "Unable to fetch current conditions. Check back soon.",
        reason: "no_data"
      };
    }

    // Use NOAA buoy data for wave conditions, forecast for wind
    const buoyData = rockawayData.buoyData;
    const buoyWaveHeight = buoyData?.waveHeight ?? null;
    const buoyPeriod = buoyData?.dominantPeriod ?? null;

    // Fall back to forecast if buoy unavailable
    const waveHeight = buoyWaveHeight ?? bestSpot.waveHeight;
    const period = buoyPeriod ?? bestSpot.current?.wavePeriodSec ?? null;

    // Wind always from forecast (buoy wind data is unreliable)
    const { windType, windSpeed } = bestSpot;
    const isOnshore = windType?.toLowerCase().includes("onshore");
    const isCrossShore = windType?.toLowerCase().includes("cross");

    // Flat conditions - no swell (using buoy data)
    if (waveHeight < 1) {
      return {
        headline: "FLAT",
        description: buoyData
          ? `Buoy reading ${buoyWaveHeight?.toFixed(1)}ft offshore. Lake Atlantic doing its thing.`
          : "No swell in the water. Lake Atlantic doing its thing.",
        reason: "flat"
      };
    }

    // Blown out - strong onshore winds
    if (isOnshore && windSpeed >= 15) {
      return {
        headline: "BLOWN OUT",
        description: buoyData
          ? `${buoyWaveHeight?.toFixed(1)}ft @ ${buoyPeriod}s offshore but strong onshore winds (${Math.round(windSpeed)}mph) are destroying the surf.`
          : `Strong onshore winds (${Math.round(windSpeed)}mph) are destroying the surf. Check back when winds shift.`,
        reason: "blown_out"
      };
    }

    // Choppy - moderate onshore winds
    if (isOnshore && windSpeed >= 8) {
      return {
        headline: "CHOPPY",
        description: buoyData
          ? `${buoyWaveHeight?.toFixed(1)}ft @ ${buoyPeriod}s offshore but onshore winds (${Math.round(windSpeed)}mph) are making it messy.`
          : `Onshore winds (${Math.round(windSpeed)}mph) are making conditions messy. Not worth the paddle.`,
        reason: "choppy"
      };
    }

    // Too windy - dangerous regardless of direction
    if (windSpeed >= 30) {
      return {
        headline: "TOO WINDY",
        description: `Dangerous wind speeds (${Math.round(windSpeed)}mph). Stay out of the water.`,
        reason: "too_windy"
      };
    }

    // Period too short - wind swell (using buoy period)
    // CHECK THIS BEFORE cross-shore: short period = no real surf regardless of wind
    if (period !== null && period < 6) {
      const windDir = buoyData?.windWaveDirection || buoyData?.directionLabel || 'Wind';
      return {
        headline: "STAY DRY",
        description: `${windDir} chop, short period — check back later`,
        reason: "wind_swell"
      };
    }

    // Cross-shore making it difficult - only when there's actual swell (period >= 6s)
    // Strong cross-shore (> 20 mph) = mess
    if (isCrossShore && windSpeed > 20) {
      return {
        headline: "CROSS-SHORE MESS",
        description: buoyData
          ? `${buoyWaveHeight?.toFixed(1)}ft @ ${buoyPeriod}s but cross-shore winds (${Math.round(windSpeed)}mph) are making lineup conditions difficult.`
          : `Cross-shore winds (${Math.round(windSpeed)}mph) are making lineup conditions difficult.`,
        reason: "cross_shore"
      };
    }

    // Moderate cross-shore (15-20 mph) = less than ideal
    if (isCrossShore && windSpeed > 15) {
      return {
        headline: "CROSS-SHORE CONDITIONS",
        description: buoyData
          ? `${buoyWaveHeight?.toFixed(1)}ft @ ${buoyPeriod}s but cross-shore winds (${Math.round(windSpeed)}mph) are making conditions less than ideal.`
          : `Cross-shore winds (${Math.round(windSpeed)}mph) are making conditions less than ideal.`,
        reason: "cross_shore"
      };
    }

    // Small and weak (using buoy data)
    if (waveHeight < 2) {
      return {
        headline: "TOO SMALL",
        description: buoyData
          ? `Buoy reading ${buoyWaveHeight?.toFixed(1)}ft @ ${buoyPeriod}s. Save your energy for a real swell.`
          : `Barely ankle-high (${waveHeight.toFixed(1)}ft). Save your energy for a real swell.`,
        reason: "too_small"
      };
    }

    // Default poor conditions
    return {
      headline: "POOR CONDITIONS",
      description: "",  // Empty - header and next window are enough
      reason: "poor"
    };
  };

  const unsurfableInfo = getUnsurfableReason();

  return (
    <div className={cn("border-2 border-black mb-4", noSurfBackground)}>
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className={cn("w-4 h-4 flex-shrink-0", noSurfIndicator)}></div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                {unsurfableInfo.headline}
              </span>
              {nextWindowData.type !== 'none' && nextWindowData.window && (
                <>
                  <span className="text-xl md:text-2xl text-gray-400" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>•</span>
                  <span className={`text-xl md:text-2xl ${nextWindowData.type === 'good' ? 'text-green-700' : 'text-yellow-700'}`} style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    {nextWindowData.type === 'good' ? 'Good window: ' : 'Marginal window: '}
                    {formatWindowTime(nextWindowData.window.time, nextWindowData.window.endTime)}
                  </span>
                </>
              )}
              {nextWindowData.type === 'none' && !isSurfable && (
                <>
                  <span className="text-xl md:text-2xl text-gray-400" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>•</span>
                  <span className="text-xl md:text-2xl text-gray-500" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    No improvement in 7-day forecast
                  </span>
                </>
              )}
            </div>
            {unsurfableInfo.description && (
              <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {unsurfableInfo.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [travelMode, setTravelMode] = useState<"driving" | "transit">("driving");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [expandedSpot, setExpandedSpot] = useState<number | null>(null);
  const spotsQuery = trpc.spots.list.useQuery();
  
  // Note: Removed getCurrentConditionsForAll - now using useCurrentConditions hook per spot
  // This unifies the data source between landing page and spot detail pages

  // Fetch breaking wave heights calculated from NOAA Buoy 44065 data
  // This gives us accurate current conditions based on real buoy readings
  const buoyBreakingHeightsQuery = trpc.buoy.getBreakingHeightsForSpots.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000, // Auto-refresh every 30 minutes
    staleTime: 15 * 60 * 1000, // Consider fresh for 15 minutes
  });

  // Fetch raw NOAA Buoy 44065 data for display in blue boxes
  const buoyQuery = trpc.buoy.get44065.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000, // Auto-refresh every 30 minutes
    staleTime: 15 * 60 * 1000, // Consider fresh for 15 minutes
  });

  // Fetch count of surfers with active alerts (for social proof / waitlist counter)
  const surferCountQuery = trpc.alerts.count.useQuery();

  // Carousel slides: images
  const slides = [
    { type: "image", src: "/Lido-beach.jpg" },
    { type: "image", src: "/4365.webp" },
    { type: "image", src: "/Long Beach.webp" },
    { type: "image", src: "/Lido Winter.webp" },
    { type: "image", src: "/NorEaster_October_CoryRansom-56.jpg" }
  ];

  // Auto-advance carousel every 3 seconds
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  // Handle manual slide navigation
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Featured spots: Rockaway Beach, Long Beach, Lido Beach
  const featuredSpotNames = ["Rockaway Beach", "Long Beach", "Lido Beach"];
  
  // Get featured spots (simplified - no forecast data, hooks fetch per spot)
  const featuredSpots = spotsQuery.data
    ?.filter((spot) => featuredSpotNames.includes(spot.name)) || [];
  const rockawayId = featuredSpots.find((s) => s.name === "Rockaway Beach")?.id ?? 0;
  const longBeachId = featuredSpots.find((s) => s.name === "Long Beach")?.id ?? 0;
  const lidoId = featuredSpots.find((s) => s.name === "Lido Beach")?.id ?? 0;
  const rockawayLive = useCurrentConditions(rockawayId);
  const longBeachLive = useCurrentConditions(longBeachId);
  const lidoLive = useCurrentConditions(lidoId);

  const scrollToFeatured = () => {
    document.getElementById("featured-spots")?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const landingLiveStatusLine = useMemo(() => {
    const buoy = buoyQuery.data;
    const rockawayHeight = buoyBreakingHeightsQuery.data?.["Rockaway Beach"]?.height ?? buoy?.waveHeight ?? null;
    const surfLabel = rockawayHeight != null ? formatSurfHeight(rockawayHeight).toUpperCase() : "N/A";
    const windMph = rockawayLive.wind.speedMph != null ? Math.round(rockawayLive.wind.speedMph) : null;
    const windDirection = degreesToCardinal(rockawayLive.wind.directionDeg ?? null);
    const ageLabel = buoy?.timestamp ? formatRelativeAgeCompact(buoy.timestamp) : "UPDATING";
    return `LIVE ROCKAWAY: ${surfLabel} • ${windMph != null ? `${windMph}MPH` : "N/A"} ${windDirection} • ${ageLabel}`;
  }, [buoyQuery.data, buoyBreakingHeightsQuery.data, rockawayLive.wind.speedMph, rockawayLive.wind.directionDeg]);

  const landingNextWindowLine = useMemo(() => {
    const now = Date.now();
    const spotCoordinatesMap: Record<string, string> = {
      "Rockaway": "40.5794,-73.8136",
      "Long Beach": "40.5884,-73.6580",
      "Lido": "40.5890,-73.6250",
    };

    const candidates = [
      { name: "Rockaway", timeline: rockawayLive.queries.timeline.data?.timeline },
      { name: "Long Beach", timeline: longBeachLive.queries.timeline.data?.timeline },
      { name: "Lido", timeline: lidoLive.queries.timeline.data?.timeline },
    ];

    // Helper to find windows at a given threshold (daylight hours only)
    const findWindowsAtThreshold = (minScore: number): Array<{ name: string; start: Date; score: number }> => {
      const windows: Array<{ name: string; start: Date; score: number }> = [];
      candidates.forEach((candidate) => {
        if (!candidate.timeline) return;

        // Get coordinates for nighttime check
        const coords = spotCoordinatesMap[candidate.name];
        if (!coords) return;
        const [lat, lng] = coords.split(',').map(Number);

        const next = candidate.timeline.find((point) => {
          const pointTime = new Date(point.forecastTimestamp);
          const t = pointTime.getTime();

          // Skip past times
          if (t <= now) return false;

          // Skip nighttime hours
          if (isNighttime(pointTime, lat, lng)) return false;

          const score = point.quality_score ?? point.probabilityScore ?? 0;
          return score >= minScore;
        });
        if (next) {
          const score = next.quality_score ?? next.probabilityScore ?? 0;
          windows.push({ name: candidate.name, start: new Date(next.forecastTimestamp), score });
        }
      });
      return windows;
    };

    // Try for good windows (score >= 50)
    let windows = findWindowsAtThreshold(50);
    let windowType: 'good' | 'marginal' | 'none' = 'good';

    // If no good windows, try marginal (score >= 40)
    if (windows.length === 0) {
      windows = findWindowsAtThreshold(40);
      windowType = windows.length > 0 ? 'marginal' : 'none';
    }

    // No windows found
    if (windows.length === 0) {
      return "NEXT WINDOW: NO IMPROVEMENT IN 7-DAY FORECAST";
    }

    // Format the earliest window
    windows.sort((a, b) => a.start.getTime() - b.start.getTime());
    const next = windows[0];
    const isToday = next.start.toDateString() === new Date().toDateString();
    const isTomorrow = next.start.toDateString() === new Date(Date.now() + 86400000).toDateString();
    const dayLabel = isToday
      ? "TODAY"
      : isTomorrow
        ? "TOMORROW"
        : next.start.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const hourLabel = next.start.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).replace(" ", "").toUpperCase();

    const prefix = windowType === 'good' ? 'GOOD WINDOW' : 'MARGINAL WINDOW';
    return `${prefix}: ${next.name.toUpperCase()} ${dayLabel} ${hourLabel}`;
  }, [rockawayLive.queries.timeline.data?.timeline, longBeachLive.queries.timeline.data?.timeline, lidoLive.queries.timeline.data?.timeline]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Fixed overlay that stays visible when scrolling */}
      <header className="fixed top-0 left-0 w-full z-50 bg-transparent">
        <div className="container py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Logo - smaller and to the left */}
            <Logo
              logoSize="h-8 sm:h-10 md:h-12"
              textSize="text-lg sm:text-xl md:text-2xl"
              textColor="text-white hover:text-white/80"
              showLink={true}
            />

            {/* Center - Navigation Dropdowns */}
            <div className="hidden md:flex items-center gap-3">
              {/* FORECASTING Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-white hover:text-white/80 hover:bg-white/10 px-3 py-2 text-base font-bold uppercase"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    Forecasting
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48 bg-white border-2 border-black rounded-none shadow-lg">
                  <DropdownMenuItem
                    onClick={() => setLocation("/spot/3")}
                    className="cursor-pointer px-4 py-3 text-sm font-bold text-gray-900 hover:bg-black hover:text-white focus:bg-black focus:text-white"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Rockaway
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocation("/spot/2")}
                    className="cursor-pointer px-4 py-3 text-sm font-bold text-gray-900 hover:bg-black hover:text-white focus:bg-black focus:text-white"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Long Beach
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocation("/spot/1")}
                    className="cursor-pointer px-4 py-3 text-sm font-bold text-gray-900 hover:bg-black hover:text-white focus:bg-black focus:text-white"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Lido Beach
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* LOCAL GUIDES Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-white hover:text-white/80 hover:bg-white/10 px-3 py-2 text-base font-bold uppercase"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    Local Guides
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48 bg-white border-2 border-black rounded-none shadow-lg">
                  <DropdownMenuItem
                    onClick={() => setLocation("/spot/3#guide")}
                    className="cursor-pointer px-4 py-3 text-sm font-bold text-gray-900 hover:bg-black hover:text-white focus:bg-black focus:text-white"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Rockaway
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocation("/spot/2#guide")}
                    className="cursor-pointer px-4 py-3 text-sm font-bold text-gray-900 hover:bg-black hover:text-white focus:bg-black focus:text-white"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Long Beach
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocation("/spot/1#guide")}
                    className="cursor-pointer px-4 py-3 text-sm font-bold text-gray-900 hover:bg-black hover:text-white focus:bg-black focus:text-white"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Lido Beach
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* MEMBERS PORTAL Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-white hover:text-white/80 hover:bg-white/10 px-3 py-2 text-base font-bold uppercase"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    Members Portal (Private Beta)
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64 bg-white border-2 border-black rounded-none shadow-lg p-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-800 font-medium" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                      Join the first 40.
                    </p>
                    <div className="space-y-1">
                      <div className="h-2 w-full border border-black bg-gray-100">
                        <div className="h-full bg-black" style={{ width: "37.5%" }} />
                      </div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        15/40 spots filled
                      </p>
                    </div>
                    <Button
                      onClick={() => setLocation("/members")}
                      className="w-full bg-black text-white hover:bg-gray-800 border-2 border-black px-4 py-2 font-bold uppercase text-sm"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      Join The Crew
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right side - buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                onClick={() => {
                  setLocation("/dashboard");
                  window.scrollTo(0, 0);
                }}
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/20 hover:border-white/80 bg-transparent text-[10px] sm:text-xs md:text-sm px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <span className="hidden sm:inline">View All Spots</span>
                <span className="sm:hidden">All Spots</span>
                <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              </Button>
              
              {/* User menu dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white/20 hover:border-white/80 bg-transparent py-1.5 px-1.5 sm:py-2 sm:px-2.5 md:py-2 md:px-3 h-auto"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <User className="h-3 w-3 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 rounded-md shadow-lg">
                  {isAuthenticated ? (
                    <>
                      {user?.email && (
                        <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 truncate">
                          {user.email}
                        </div>
                      )}
                      <DropdownMenuItem
                        onClick={() => setLocation("/members")}
                        className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                      >
                        Members Portal (Private Beta)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          await logout();
                          setLocation("/");
                        }}
                        className="cursor-pointer px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700"
                      >
                        Sign Out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => setLocation("/login")}
                      className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                    >
                      Login or Sign Up
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="fixed top-[70px] sm:top-[80px] left-0 w-full z-40 px-3 sm:px-6 pointer-events-none">
        <div className="container">
          <div className="flex flex-col gap-1.5">
            <div
              className="inline-flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-wider text-white/85"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>{landingLiveStatusLine}</span>
            </div>
            <div
              className="text-[10px] sm:text-xs uppercase tracking-wider text-white/75"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {landingNextWindowLine}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section 
        className="relative w-full h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat pt-24 sm:pt-28 overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Carousel Background */}
        <div className="absolute inset-0">
          {/* Lido Beach Image - Slide 0 */}
          <div 
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out",
              currentSlide === 0 ? "opacity-100" : "opacity-0"
            )}
            style={{
              backgroundImage: "url('/Lido-beach.jpg')"
            }}
          />

          {/* 4365.webp Image - Slide 1 */}
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out",
              currentSlide === 1 ? "opacity-100" : "opacity-0"
            )}
            style={{
              backgroundImage: "url('/4365.webp')"
            }}
          />

          {/* Long Beach Image - Slide 2 */}
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out",
              currentSlide === 2 ? "opacity-100" : "opacity-0"
            )}
            style={{
              backgroundImage: "url('/Long Beach.webp')"
            }}
          />

          {/* Lido Winter Image - Slide 3 */}
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out",
              currentSlide === 3 ? "opacity-100" : "opacity-0"
            )}
            style={{
              backgroundImage: "url('/Lido%20Winter.webp')"
            }}
          />

          {/* NorEaster Image - Slide 4 */}
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out",
              currentSlide === 4 ? "opacity-100" : "opacity-0"
            )}
            style={{
              backgroundImage: "url('/NorEaster_October_CoryRansom-56.jpg')"
            }}
          />
        </div>

        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60 z-0"></div>
        
        {/* Content container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto text-center px-4">
          {/* Logo above headline */}
          <div className="mb-6 sm:mb-8 md:mb-10 flex justify-center">
            <Logo
              logoSize="h-16 sm:h-20 md:h-24 lg:h-28"
              textSize="text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
              textColor="text-white hover:text-white/80"
              showLink={true}
            />
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 sm:mb-6 md:mb-8 uppercase tracking-tighter sm:tracking-tight leading-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
            Know if it's worth the commute in 5 seconds
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white font-light mb-6 sm:mb-8 md:mb-10">
            Score more. Commute less. Join the first 40+ members for free.
          </p>
          <div className="flex flex-col items-center">
            <button
              onClick={scrollToFeatured}
              className="!border-2 !border-white bg-black text-white hover:bg-white hover:text-black rounded-none uppercase transition-all duration-300 hover:-translate-y-0.5 group flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-[18px] text-xs sm:text-sm md:text-[0.95rem]"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                letterSpacing: '1px'
              }}
            >
              <span>View Today's Conditions</span>
              <ArrowRight className="h-4 w-4 text-white group-hover:text-black transition-colors duration-300 flex-shrink-0" />
            </button>
          </div>
        </div>

      </section>

      {/* Today's NYC Surf at a Glance - Professional Dark Design */}
      <section
        id="featured-spots"
        className="w-full pt-4 sm:pt-6 md:pt-8 pb-10 sm:pb-12 md:pb-16 px-4 md:px-8 relative bg-white"
      >
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-1 relative">
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Status bar */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-black uppercase tracking-wider">LIVE</span>
              </div>
              <span className="text-gray-500">•</span>
              <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-gray-600">
                <Clock className="h-3 w-3" />
                <span>Live</span>
              </div>
            </div>

            {/* Main title */}
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-black uppercase tracking-tighter leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.03em' }}>
                Today's NYC Surf
              </h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-1 tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span className="hidden sm:inline">Real-time conditions across Long Island's south shore</span>
                <span className="sm:hidden">Live conditions on Long Island</span>
              </p>
            </div>
          </div>
        </div>

        {/* Travel Mode Toggle */}
        <div className="max-w-7xl mx-auto flex items-center justify-end mb-3 sm:mb-4">
          <div className="flex items-center border-2 border-black">
            <button
              onClick={() => setTravelMode("driving")}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
                travelMode === "driving"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-50"
              }`}
              style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
            >
              <Car className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Driving</span>
              <span className="sm:hidden">Drive</span>
            </button>
            <button
              onClick={() => setTravelMode("transit")}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors border-l-2 border-black ${
                travelMode === "transit"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-50"
              }`}
              style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
            >
              <Train className="h-3 w-3 sm:h-4 sm:w-4" />
              Transit
            </button>
          </div>
        </div>

        {/* Big Status Banner */}
        {featuredSpots.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <SurfStatusBanner featuredSpots={featuredSpots} travelMode={travelMode} />
          </div>
        )}

        {/* Forecast Cards Grid */}
        {spotsQuery.isLoading ? (
          <div className="max-w-7xl mx-auto relative">
            <div className="text-lg text-black text-center py-16" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Loading spots...
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto flex md:grid gap-4 md:grid-cols-3 relative overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none scrollbar-hide">
            {featuredSpots.map((spot) => (
              <div key={spot.id} className="flex-shrink-0 w-[calc(100vw-5rem)] md:w-auto snap-center md:snap-none">
                <SpotForecastCard
                  spot={spot}
                  isExpanded={expandedSpot === spot.id}
                  onToggleExpand={() => setExpandedSpot(expandedSpot === spot.id ? null : spot.id)}
                  onNavigate={setLocation}
                  isAuthenticated={isAuthenticated}
                  travelMode={travelMode}
                  useNeutralBackground={true}
                  buoyData={buoyQuery.data}
                />
              </div>
            ))}
          </div>
        )}

        {/* View All Spots Button */}
        <div className="max-w-7xl mx-auto mt-8 text-center relative">
          <Button
            onClick={() => {
              setLocation("/dashboard");
              window.scrollTo(0, 0);
            }}
            className="!border-2 !border-black bg-black text-white hover:bg-white hover:text-black rounded-none uppercase transition-all duration-300 hover:-translate-y-0.5 group"
            style={{ 
              fontFamily: "'JetBrains Mono', monospace",
              padding: '18px 40px',
              minWidth: '200px',
              fontSize: '1.05rem',
              fontWeight: 700,
              letterSpacing: '1px',
              margin: '24px auto 0'
            }}
          >
            View All Spots
            <ArrowRight className="ml-2 h-5 w-5 text-white group-hover:text-black transition-colors duration-300" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

