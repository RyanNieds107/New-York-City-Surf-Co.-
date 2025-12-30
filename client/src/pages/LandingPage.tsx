import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Clock, Car, Train, ChevronDown, Users } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { selectCurrentTimelinePoint, formatSurfHeight } from "@/lib/forecastUtils";
import { getScoreBadgeHexColor, getScoreBadgeTextHexColor } from "@/lib/ratingColors";

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

// Wind arrows point in the direction wind is GOING (opposite of where it comes from)
const getWindArrow = (directionDeg: number): string => {
  const goingTo = (directionDeg + 180) % 360;
  if (goingTo >= 337.5 || goingTo < 22.5) return '↑';
  if (goingTo >= 22.5 && goingTo < 67.5) return '↗';
  if (goingTo >= 67.5 && goingTo < 112.5) return '→';
  if (goingTo >= 112.5 && goingTo < 157.5) return '↘';
  if (goingTo >= 157.5 && goingTo < 202.5) return '↓';
  if (goingTo >= 202.5 && goingTo < 247.5) return '↙';
  if (goingTo >= 247.5 && goingTo < 292.5) return '←';
  return '↖'; // 292.5 to 337.5
};

// Swell arrows point in the direction swell is COMING FROM (same as direction value)
const getSwellArrow = (directionDeg: number): string => {
  if (directionDeg >= 337.5 || directionDeg < 22.5) return '↓';   // From N
  if (directionDeg >= 22.5 && directionDeg < 67.5) return '↙';    // From NE
  if (directionDeg >= 67.5 && directionDeg < 112.5) return '←';   // From E
  if (directionDeg >= 112.5 && directionDeg < 157.5) return '↖';  // From SE
  if (directionDeg >= 157.5 && directionDeg < 202.5) return '↑';  // From S
  if (directionDeg >= 202.5 && directionDeg < 247.5) return '↗';  // From SW
  if (directionDeg >= 247.5 && directionDeg < 292.5) return '→';  // From W
  return '↘'; // From NW (292.5 to 337.5)
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
  waveDirection: number;
  directionLabel: string;
  timestamp: Date | string;
  isStale: boolean;
  // Spectral data - separated swell components from NOAA
  swellHeight: number | null;      // SwH - background groundswell
  swellPeriod: number | null;      // SwP in seconds
  swellDirection: string | null;   // SwD cardinal direction (e.g., "SE")
  windWaveHeight: number | null;   // WWH - local wind chop
  windWavePeriod: number | null;   // WWP in seconds
  windWaveDirection: string | null; // WWD cardinal direction (e.g., "WNW")
  steepness: string | null;        // STEEPNESS classification
} | null;

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

// SpotForecastCard component - extracted to properly use hooks
type SpotForecastCardProps = {
  spot: { id: number; name: string };
  forecast: {
    qualityScore?: number | null;
    probabilityScore?: number | null;
    waveHeightTenthsFt?: number | null;
    tideHeightFt?: number | null;
    tidePhase?: string | null;
  } | undefined;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate: (path: string) => void;
  travelMode?: "driving" | "transit";
  useNeutralBackground?: boolean;
  buoyBasedHeight?: number | null;
  buoyData?: BuoyReading;
  buoyLoading?: boolean;
};

function SpotForecastCard({ spot, forecast, isExpanded, onToggleExpand, onNavigate, travelMode = "driving", useNeutralBackground = false, buoyBasedHeight, buoyData, buoyLoading }: SpotForecastCardProps) {
  // Always fetch timeline for current conditions (fresh from Open-Meteo)
  // Fetch more hours when expanded for the full timeline view
  const timelineQuery = trpc.forecasts.getTimeline.useQuery(
    { spotId: spot.id, hours: isExpanded ? 24 : 3 }
  );

  // Fetch crowd data
  const crowdQuery = trpc.crowd.getForSpot.useQuery({ spotId: spot.id });

  // Find nearest point to now using shared utility
  const currentPoint = useMemo(() => {
    return selectCurrentTimelinePoint(timelineQuery.data?.timeline);
  }, [timelineQuery.data?.timeline]);

  // Prefer timeline data (fresh from Open-Meteo) over old forecast data
  const score = currentPoint?.quality_score != null
    ? Number(currentPoint.quality_score)
    : (forecast?.qualityScore != null
      ? Number(forecast.qualityScore)
      : (forecast?.probabilityScore != null ? Number(forecast.probabilityScore) : 0));

  // Use buoy-based breaking height if available, otherwise fall back to timeline data
  // Priority: buoyBasedHeight > dominantSwellHeightFt > waveHeightFt (fallback)
  // Note: breakingWaveHeightFt can be 0 which breaks nullish coalescing, so we skip it
  const heightUsed = buoyBasedHeight ??
    currentPoint?.dominantSwellHeightFt ??
    currentPoint?.waveHeightFt ??
    (forecast?.waveHeightTenthsFt ? forecast.waveHeightTenthsFt / 10 : null);

  console.log(`[${spot.name}] Wave height debug:`, {
    buoyBasedHeight,
    dominantSwellHeightFt: currentPoint?.dominantSwellHeightFt,
    waveHeightFt: currentPoint?.waveHeightFt,
    heightUsed,
    source: buoyBasedHeight != null ? 'BUOY' :
            currentPoint?.dominantSwellHeightFt != null ? 'dominantSwellHeightFt' :
            currentPoint?.waveHeightFt != null ? 'waveHeightFt' : 'forecast'
  });

  const surfHeight = formatSurfHeight(heightUsed);
  const ratingLabel = getRatingLabel(score, surfHeight);

  // Get dominant swell period and direction (matching SpotDetail logic)
  const getDominantSwellInfo = () => {
    if (!currentPoint) return { period: null, direction: null };
    
    const dominantType = currentPoint.dominantSwellType;
    
    if (dominantType === 'primary') {
      return {
        period: currentPoint.wavePeriodSec,
        direction: currentPoint.waveDirectionDeg,
      };
    } else if (dominantType === 'secondary') {
      return {
        period: currentPoint.secondarySwellPeriodS,
        direction: currentPoint.secondarySwellDirectionDeg,
      };
    } else if (dominantType === 'wind') {
      return {
        period: currentPoint.windWavePeriodS,
        direction: currentPoint.windWaveDirectionDeg,
      };
    }
    
    // Fallback
    return {
      period: currentPoint.dominantSwellPeriodS ?? currentPoint.wavePeriodSec,
      direction: currentPoint.dominantSwellDirectionDeg ?? currentPoint.waveDirectionDeg,
    };
  };

  const dominantSwell = getDominantSwellInfo();
  const swellPeriod = dominantSwell.period !== null ? `${dominantSwell.period.toFixed(0)}s` : '—';
  const swellDirection = dominantSwell.direction !== null ? formatSwellDirection(dominantSwell.direction) : '—';
  const swellArrow = dominantSwell.direction !== null ? getSwellArrow(dominantSwell.direction) : '';
  const swellInfo = dominantSwell.direction !== null
    ? `${swellPeriod} ${swellDirection}${swellArrow}`
    : `${swellPeriod} ${swellDirection}`;

  // Format wind info
  const windSpeed = currentPoint?.windSpeedMph !== null && currentPoint?.windSpeedMph !== undefined
    ? `${currentPoint.windSpeedMph.toFixed(0)}mph`
    : '—';
  const windDirection = currentPoint?.windDirectionDeg !== null && currentPoint?.windDirectionDeg !== undefined
    ? formatSwellDirection(currentPoint.windDirectionDeg)
    : '—';
  const windArrow = currentPoint?.windDirectionDeg !== null && currentPoint?.windDirectionDeg !== undefined
    ? getWindArrow(currentPoint.windDirectionDeg)
    : '';
  const windInfo = currentPoint?.windDirectionDeg !== null && currentPoint?.windDirectionDeg !== undefined
    ? `${windSpeed} ${windDirection}${windArrow}`
    : `${windSpeed} ${windDirection}`;

  // Get crowd info
  const crowdLevel = crowdQuery.data?.averageLevel ?? null;
  const crowdLabel = crowdLevel !== null ? getCrowdLabel(crowdLevel) : '—';
  const crowdColor = crowdLevel !== null ? getCrowdColor(crowdLevel) : 'bg-gray-300';

  // Get background tint based on score
  // If useNeutralBackground is true, always use white (no tints)
  const backgroundTint = useNeutralBackground ? "bg-white" : getScoreBackgroundTint(score, false);

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
        className="p-8 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
          {/* Left: Spot name + surf height */}
          <div className="space-y-3">
            <div>
              <h3 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                {spot.name}
              </h3>
              <div className="mt-1">
                <DistanceDisplay spotName={spot.name} mode={travelMode} />
              </div>
            </div>
            <span className="text-5xl md:text-6xl font-black text-black leading-none block" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.03em' }}>
              {surfHeight}
            </span>
          </div>

          {/* Right: Score badge + rating */}
          <div className="flex flex-col items-end gap-2">
            {/* Clean square score badge with label */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-gray-600 uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                SCORE
              </span>
              <div
                className="w-16 h-16 flex items-center justify-center transition-all duration-300 border-2 border-black"
                style={{
                  backgroundColor: getScoreBadgeHexColor(score),
                }}
              >
                <span className="text-2xl font-black leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", color: getScoreBadgeTextHexColor(score) }}>
                  {score}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-medium text-black uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {ratingLabel}
            </span>
          </div>
        </div>

        {/* NOAA Buoy Data Section */}
        <div className="mt-6">
          {/* Buoy Label with Indicator */}
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping opacity-75"></div>
              <div className="relative w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            </div>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              BUOY 44065 (15NM OFFSHORE)
            </span>
          </div>

          {/* 3-Card Info Grid - Always blue styled */}
          <div className="grid grid-cols-3 gap-2">
            {/* Swell Height - use buoy data if available, otherwise forecast */}
            <div className="border-2 border-blue-300 bg-blue-50 p-3 flex flex-col items-center justify-center gap-1.5">
              {buoyLoading ? (
                <div className="h-4 w-12 bg-blue-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-sm font-bold text-black uppercase tracking-wider text-center leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {buoyData ? `${buoyData.waveHeight.toFixed(1)}ft` : surfHeight}
                </p>
              )}
              <p className="text-[10px] text-blue-600 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Swell Height
              </p>
            </div>

            {/* Period + Direction - use buoy data if available, otherwise forecast */}
            <div className="border-2 border-blue-300 bg-blue-50 p-3 flex flex-col items-center justify-center gap-1.5">
              {buoyLoading ? (
                <div className="h-4 w-16 bg-blue-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-sm font-bold text-black uppercase tracking-wider text-center leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {buoyData
                    ? `${buoyData.dominantPeriod.toFixed(0)}s ${buoyData.directionLabel} ${Math.round(buoyData.waveDirection)}°${getSwellArrow(buoyData.waveDirection)}`
                    : swellPeriod}
                </p>
              )}
              <p className="text-[10px] text-blue-600 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Period
              </p>
            </div>

            {/* Wind - always from forecast */}
            <div className="border-2 border-blue-300 bg-blue-50 p-3 flex flex-col items-center justify-center gap-1.5">
              {buoyLoading ? (
                <div className="h-4 w-10 bg-blue-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-sm font-bold text-black uppercase tracking-wider text-center leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {windInfo}
                </p>
              )}
              <p className="text-[10px] text-blue-600 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Wind
              </p>
            </div>
          </div>

          {/* Condition Indicators - adapt based on sea state */}
          {(() => {
            // Determine sea state from NOAA spectral data
            const hasSpectralData = buoyData?.windWaveHeight !== null && buoyData?.swellHeight !== null;

            // Calculate which energy is dominant (H² × T)
            const windWaveEnergy = hasSpectralData && buoyData?.windWavePeriod
              ? (buoyData.windWaveHeight! ** 2) * buoyData.windWavePeriod
              : 0;
            const swellEnergy = hasSpectralData && buoyData?.swellPeriod
              ? (buoyData.swellHeight! ** 2) * buoyData.swellPeriod
              : 0;

            const isWindDominant = windWaveEnergy > swellEnergy;
            const dominantPeriod = buoyData?.windWavePeriod ?? buoyData?.dominantPeriod ?? dominantSwell.period;

            // Conditions for each indicator
            const isWindSlop = isWindDominant && dominantPeriod !== null && dominantPeriod < 6;
            const hasBackgroundSwell = isWindDominant &&
                                        buoyData?.swellHeight &&
                                        buoyData.swellHeight >= 0.5 &&
                                        buoyData.swellPeriod &&
                                        buoyData.swellPeriod >= 8;
            const isCleanSwell = !isWindDominant &&
                                  buoyData?.swellPeriod &&
                                  buoyData.swellPeriod >= 8;
            const hasSteepConditions = buoyData?.steepness === "VERY_STEEP" || buoyData?.steepness === "STEEP";

            return (
              <>
                {/* Wind Slop Warning - only when wind waves dominate with short period */}
                {isWindSlop && (
                  <div className="mt-2 border-2 border-amber-400 bg-amber-50 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-600 text-sm">⚠️</span>
                      <span className="text-[10px] text-amber-700 uppercase tracking-wider font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        WIND SLOP
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Short period ({dominantPeriod?.toFixed(0)}s) = choppy, disorganized
                    </span>
                  </div>
                )}

                {/* Background Swell - only when there's organized swell hiding under wind chop */}
                {hasBackgroundSwell && (
                  <div className="mt-2 border-2 border-emerald-300 bg-emerald-50 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-[10px] text-emerald-700 uppercase tracking-wider font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        BACKGROUND SWELL
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-800" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {buoyData!.swellHeight!.toFixed(1)}ft @ {buoyData!.swellPeriod}s {buoyData!.swellDirection || ''}
                    </span>
                  </div>
                )}

                {/* Clean Swell Day - when groundswell is the dominant energy */}
                {isCleanSwell && !hasSteepConditions && (
                  <div className="mt-2 border-2 border-blue-400 bg-blue-50 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 text-sm">🌊</span>
                      <span className="text-[10px] text-blue-700 uppercase tracking-wider font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        CLEAN SWELL
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {buoyData!.swellPeriod}s period = organized waves
                    </span>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Click to expand hint */}
        <div className="mt-6 pt-4 border-t-2 border-black flex items-center justify-between">
          <div className="text-xs text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
            {/* Wind Wave (Dominant) - from NOAA Buoy 44065 spectral data */}
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WIND WAVE (DOMINANT)</div>
              {buoyLoading ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
              ) : buoyData?.windWaveHeight ? (
                <>
                  <div className="text-2xl text-black font-bold" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>
                    {buoyData.windWaveHeight.toFixed(1)}ft @ {buoyData.windWavePeriod}s
                  </div>
                  <div className="text-xs text-black mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {buoyData.windWaveDirection || 'N/A'}
                  </div>
                </>
              ) : buoyData ? (
                <>
                  <div className="text-2xl text-black font-bold" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>
                    {buoyData.waveHeight.toFixed(1)}ft @ {buoyData.dominantPeriod.toFixed(0)}s
                  </div>
                  <div className="text-xs text-black mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {buoyData.directionLabel} {Math.round(buoyData.waveDirection)}°
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>—</div>
              )}
            </div>

            {/* Background Swell - from NOAA Buoy spectral data (SwH/SwP/SwD) */}
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BACKGROUND SWELL</div>
              {buoyLoading ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
              ) : buoyData?.swellHeight ? (
                <>
                  <div className="text-2xl text-black font-bold" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>
                    {buoyData.swellHeight.toFixed(1)}ft @ {buoyData.swellPeriod}s
                  </div>
                  <div className="text-xs text-black mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {buoyData.swellDirection || 'N/A'}
                  </div>
                </>
              ) : currentPoint?.secondarySwellHeightFt ? (
                <>
                  <div className="text-2xl text-black font-bold" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>
                    {Number(currentPoint.secondarySwellHeightFt).toFixed(1)}ft @ {currentPoint.secondarySwellPeriodS || 'N/A'}s
                  </div>
                  <div className="text-xs text-black mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatSwellDirection(currentPoint.secondarySwellDirectionDeg)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>—</div>
              )}
            </div>

            {/* Tertiary Swell - only show when there's a third swell component */}
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TERTIARY SWELL</div>
              {currentPoint?.tertiarySwellHeightFt && currentPoint.tertiarySwellPeriodS ? (
                <>
                  <div className="text-2xl text-black font-bold" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>
                    {Number(currentPoint.tertiarySwellHeightFt).toFixed(1)}ft @ {currentPoint.tertiarySwellPeriodS}s
                  </div>
                  <div className="text-xs text-black mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {currentPoint.tertiarySwellDirectionDeg !== null ? formatSwellDirection(currentPoint.tertiarySwellDirectionDeg) : 'N/A'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>—</div>
              )}
            </div>

            {/* Wind - from forecast */}
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WIND</div>
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
                {forecast?.tideHeightFt ? `${(forecast.tideHeightFt / 10).toFixed(1)}ft` : 'N/A'}
              </div>
              <div className="text-xs text-black uppercase mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {forecast?.tidePhase || 'N/A'}
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
  featuredSpots: Array<{
    spot: { id: number; name: string };
    forecast: {
      qualityScore?: number | null;
      probabilityScore?: number | null;
      waveHeightTenthsFt?: number | null;
    } | undefined;
  }>;
  travelMode: "driving" | "transit";
};

function SurfStatusBanner({ featuredSpots, travelMode }: SurfStatusBannerProps) {
  // Fetch timeline for all featured spots to get current conditions and find next window
  const rockawaytimeline = trpc.forecasts.getTimeline.useQuery({ spotId: featuredSpots.find(s => s.spot.name === "Rockaway Beach")?.spot.id ?? 0, hours: 72 }, { enabled: featuredSpots.length > 0 });
  const longBeachTimeline = trpc.forecasts.getTimeline.useQuery({ spotId: featuredSpots.find(s => s.spot.name === "Long Beach")?.spot.id ?? 0, hours: 72 }, { enabled: featuredSpots.length > 0 });
  const lidoTimeline = trpc.forecasts.getTimeline.useQuery({ spotId: featuredSpots.find(s => s.spot.name === "Lido Beach")?.spot.id ?? 0, hours: 72 }, { enabled: featuredSpots.length > 0 });

  // Fetch buoy data for logging
  const buoyQuery = trpc.buoy.get44065.useQuery(undefined, {
    staleTime: 15 * 60 * 1000,
  });

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

  // Analyze current conditions across all spots
  const allTimelines = [
    { name: "Rockaway Beach", timeline: rockawaytimeline.data?.timeline },
    { name: "Long Beach", timeline: longBeachTimeline.data?.timeline },
    { name: "Lido Beach", timeline: lidoTimeline.data?.timeline },
  ];

  // Find current best spot (score >= 60 = "Go Surf" or better)
  const now = Date.now();
  const currentConditions = allTimelines.map(({ name, timeline }) => {
    if (!timeline || timeline.length === 0) return null;
    // Find the point closest to now
    const current = timeline.reduce((closest, point) => {
      const pointTime = new Date(point.forecastTimestamp).getTime();
      const closestTime = new Date(closest.forecastTimestamp).getTime();
      return Math.abs(pointTime - now) < Math.abs(closestTime - now) ? point : closest;
    });
    const score = current.quality_score ?? current.probabilityScore ?? 0;
    const waveHeight = current.dominantSwellHeightFt ?? current.waveHeightFt ?? 0;
    const windType = current.windType ?? "";
    const windSpeed = current.windSpeedMph ?? 0;
    return { name, score, waveHeight, windType, windSpeed, current };
  }).filter(Boolean) as Array<{ name: string; score: number; waveHeight: number; windType: string; windSpeed: number; current: any }>;

  // Find the best current spot
  const bestSpot = currentConditions.length > 0
    ? currentConditions.reduce((best, spot) => spot.score > best.score ? spot : best)
    : null;

  const isSurfable = bestSpot && bestSpot.score >= 60;

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

    // Determine unsurfable reason if not surfable (using buoy data for waves)
    let unsurfableReason: string | null = null;
    if (!isSurfable) {
      // Use buoy data for wave conditions, forecast for wind
      const buoyWaveHeight = buoyQuery.data?.waveHeight ?? null;
      const buoyPeriod = buoyQuery.data?.dominantPeriod ?? null;
      const waveHeight = buoyWaveHeight ?? bestSpot.waveHeight;
      const period = buoyPeriod ?? bestSpot.current?.wavePeriodSec ?? null;

      const { windType, windSpeed } = bestSpot;
      const isOnshore = windType?.toLowerCase().includes("onshore");
      const isCrossShore = windType?.toLowerCase().includes("cross");

      if (waveHeight < 1) unsurfableReason = "flat";
      else if (isOnshore && windSpeed >= 15) unsurfableReason = "blown_out";
      else if (isOnshore && windSpeed >= 8) unsurfableReason = "choppy";
      else if (windSpeed >= 30) unsurfableReason = "too_windy";
      else if (isCrossShore && windSpeed >= 12) unsurfableReason = "cross_shore";
      else if (waveHeight < 2) unsurfableReason = "too_small";
      else if (period !== null && period < 6) unsurfableReason = "wind_swell";
      else unsurfableReason = "poor";
    }

    // Log the snapshot - use buoy data for wave conditions
    const buoyWaveHeight = buoyQuery.data?.waveHeight ?? null;
    const buoyPeriod = buoyQuery.data?.dominantPeriod ?? null;
    const buoyDirection = buoyQuery.data?.waveDirection ?? null;

    logConditionsMutation.mutate({
      bestSpotName: bestSpot.name,
      qualityScore: bestSpot.score,
      waveHeightFt: buoyWaveHeight ?? bestSpot.waveHeight,
      wavePeriodSec: buoyPeriod ?? bestSpot.current?.wavePeriodSec ?? null,
      waveDirectionDeg: buoyDirection ?? bestSpot.current?.waveDirectionDeg ?? null,
      windSpeedMph: bestSpot.windSpeed,
      windDirectionDeg: bestSpot.current?.windDirectionDeg ?? null,
      windType: bestSpot.windType || null,
      buoyWaveHeightFt: buoyQuery.data?.waveHeight ?? null,
      buoyPeriodSec: buoyQuery.data?.dominantPeriod ?? null,
      buoyDirectionDeg: buoyQuery.data?.waveDirection ?? null,
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
  }, [bestSpot, isSurfable, buoyQuery.data, hasLoggedThisHour, logConditionsMutation]);

  // Find next surf window if not currently surfable
  const findNextWindow = () => {
    if (isSurfable) return null;

    const futureWindows: Array<{ name: string; time: Date; score: number; endTime?: Date }> = [];

    for (const { name, timeline } of allTimelines) {
      if (!timeline) continue;

      let windowStart: Date | null = null;
      let windowScore = 0;

      for (const point of timeline) {
        const pointTime = new Date(point.forecastTimestamp);
        if (pointTime.getTime() <= now) continue; // Skip past times

        const score = point.quality_score ?? point.probabilityScore ?? 0;

        if (score >= 60 && !windowStart) {
          windowStart = pointTime;
          windowScore = score;
        } else if (score < 60 && windowStart) {
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
    return futureWindows[0] || null;
  };

  const nextWindow = findNextWindow();

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
  if (rockawaytimeline.isLoading || longBeachTimeline.isLoading || lidoTimeline.isLoading) {
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

    const spotTimeline = allTimelines.find(t => t.name === bestSpot.name)?.timeline;
    if (!spotTimeline) return null;

    // Find when score drops below 60
    for (const point of spotTimeline) {
      const pointTime = new Date(point.forecastTimestamp);
      if (pointTime.getTime() <= now) continue;

      const score = point.quality_score ?? point.probabilityScore ?? 0;
      if (score < 60) {
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
                    {bestSpot.name.toUpperCase().replace(" BEACH", "")} FIRING
                  </span>
                  <span className="text-xl md:text-2xl text-gray-600" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>•</span>
                  <span className="text-xl md:text-2xl font-bold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    {formatHeight(bestSpot.waveHeight)} {windLabel}
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
                className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <MapPin className="h-4 w-4" />
                Directions
              </a>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${bestSpot.name} is firing!`,
                      text: `${formatHeight(bestSpot.waveHeight)} ${windLabel} at ${bestSpot.name} right now!`,
                      url: window.location.href
                    });
                  } else {
                    navigator.clipboard.writeText(`${bestSpot.name} is firing! ${formatHeight(bestSpot.waveHeight)} ${windLabel}. ${window.location.href}`);
                    alert("Link copied to clipboard!");
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 border-2 border-black bg-white text-black text-sm font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
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
    const buoyData = buoyQuery.data;
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

    // Cross-shore making it difficult
    if (isCrossShore && windSpeed >= 12) {
      return {
        headline: "CROSS-SHORE MESS",
        description: buoyData
          ? `${buoyWaveHeight?.toFixed(1)}ft @ ${buoyPeriod}s but cross-shore winds (${Math.round(windSpeed)}mph) are making lineup conditions difficult.`
          : `Cross-shore winds (${Math.round(windSpeed)}mph) are making lineup conditions difficult.`,
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

    // Period too short - wind swell (using buoy period)
    if (period !== null && period < 6) {
      return {
        headline: "WIND SWELL",
        description: buoyData
          ? `${buoyWaveHeight?.toFixed(1)}ft but only ${buoyPeriod}s period. Short-period wind swell won't produce rideable waves.`
          : `Short period (${period}s) wind swell. Weak and disorganized.`,
        reason: "wind_swell"
      };
    }

    // Default poor conditions
    return {
      headline: "POOR CONDITIONS",
      description: "Conditions aren't lining up. Check back tomorrow morning for updated forecasts.",
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
              {nextWindow && (
                <>
                  <span className="text-xl md:text-2xl text-gray-400" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>•</span>
                  <span className="text-xl md:text-2xl text-gray-700" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Next window: {formatWindowTime(nextWindow.time, nextWindow.endTime)} {nextWindow.name.replace(" Beach", "")}
                  </span>
                </>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {unsurfableInfo.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [travelMode, setTravelMode] = useState<"driving" | "transit">("driving");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [expandedSpot, setExpandedSpot] = useState<number | null>(null);
  const spotsQuery = trpc.spots.list.useQuery();
  const forecastsQuery = trpc.forecasts.getCurrentConditionsForAll.useQuery();

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
  
  // Get featured spots and their forecasts
  const featuredSpots = spotsQuery.data
    ?.filter((spot) => featuredSpotNames.includes(spot.name))
    .map((spot) => {
      const forecastItem = forecastsQuery.data?.find((item) => item.spotId === spot.id);
      return { spot, forecast: forecastItem?.currentConditions ?? undefined };
    }) || [];

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


  return (
    <div className="min-h-screen bg-white">
      {/* Header - Fixed overlay that stays visible when scrolling */}
      <header className="fixed top-0 left-0 w-full z-50 bg-transparent">
        <div className="container py-3">
          <div className="flex items-start justify-between">
            <Logo 
              logoSize="h-14"
              textSize="text-4xl"
              textColor="text-white hover:text-white/80"
              showLink={true}
            />
            <div className="flex items-start gap-3">
              <Button
                onClick={() => {
                  setLocation("/dashboard");
                  window.scrollTo(0, 0);
                }}
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/20 hover:border-white/80 bg-transparent text-sm md:text-base px-4 py-2"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                View All Spots
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="relative w-full h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat pt-16 overflow-hidden"
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
          <h1 className="text-[6rem] md:text-[7.5rem] font-black text-white mb-8 uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
            New York City Surf Co.
          </h1>
          <p className="text-2xl md:text-2xl text-white font-light mb-12">
            Your guide to surfing just outside NYC
          </p>
          <div className="flex justify-center">
            <button
              onClick={scrollToFeatured}
              className="!border-2 !border-white bg-black text-white hover:bg-white hover:text-black rounded-none uppercase transition-all duration-300 hover:-translate-y-0.5 group flex items-center gap-2"
              style={{ 
                fontFamily: "'JetBrains Mono', monospace",
                padding: '18px 40px',
                fontSize: '0.95rem',
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

      {/* Three Phase Sections - Interactive Expandable Cards */}
      <section className="w-full bg-white">
        <div className="max-w-8xl mx-auto px-6 pt-16 pb-8">
          <div className="grid gap-6 md:grid-cols-3 items-stretch">
            {/* Phase 1 — Forecasting */}
            <div
              className={cn(
                "bg-white border-2 border-black transition-all duration-300 group relative overflow-hidden",
                "hover:shadow-lg hover:-translate-y-1",
                "rounded-none",
                "h-full flex flex-col"
              )}
              style={{
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Black top border on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-black transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}></div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-4xl font-black uppercase mb-1 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Forecasting</h3>
                  <p className="text-xs text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Spot-tuned for the NYC surf scene.
                  </p>
                </div>

                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-3">
                    <span className="text-black text-lg leading-none mt-0.5">→</span>
                    <p className="text-sm leading-relaxed text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}><strong className="text-black">Rockaway</strong> — NYC's only legal surf beach. The heart of the scene.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-black text-lg leading-none mt-0.5">→</span>
                    <p className="text-sm leading-relaxed text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}><strong className="text-black">Long Beach</strong> — High-performance jetty break. World-class lefts when it lines up.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-black text-lg leading-none mt-0.5">→</span>
                    <p className="text-sm leading-relaxed text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}><strong className="text-black">Lido Beach</strong> — The crown jewel. Hollow A-frames, fast and unforgiving.</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-auto pt-4">
                  <div className="border-t border-gray-300 pt-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 border-2 border-black font-bold uppercase tracking-wider text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: '10px' }}>Proprietary Model</span>
                      <span className="px-2 py-1 border-2 border-black font-bold uppercase tracking-wider text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: '10px' }}>Spot-Tuned</span>
                      <span className="px-2 py-1 border-2 border-black font-bold uppercase tracking-wider text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: '10px' }}>Updated Hourly</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 2 — Culture + Guides */}
            <div
              className={cn(
                "bg-white border-2 border-black transition-all duration-300 group relative overflow-hidden",
                "hover:shadow-lg hover:-translate-y-1",
                "rounded-none",
                "h-full flex flex-col"
              )}
              style={{
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Black top border on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-black transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}></div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-4xl font-black uppercase mb-1 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Culture + Guides</h3>
                  <p className="text-xs text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    From those who've been doing it their whole lives.
                  </p>
                </div>

                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-3">
                    <span className="text-black text-lg leading-none mt-0.5">→</span>
                    <p className="text-sm leading-relaxed text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}><strong className="text-black">When It Works</strong> — We break down what actually makes Long Island produce.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-black text-lg leading-none mt-0.5">→</span>
                    <p className="text-sm leading-relaxed text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}><strong className="text-black">NYC Logistics</strong> — Trains, parking, and not losing your mind on the way there.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-black text-lg leading-none mt-0.5">→</span>
                    <p className="text-sm leading-relaxed text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}><strong className="text-black">Workday Surfing</strong> — Waves before 8 AM. Back at your desk by 9.</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-auto pt-4">
                  <div className="border-t border-gray-300 pt-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 border-2 border-black font-bold uppercase tracking-wider text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: '10px' }}>Transit Guides</span>
                      <span className="px-2 py-1 border-2 border-black font-bold uppercase tracking-wider text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: '10px' }}>Historic Sessions</span>
                      <span className="px-2 py-1 border-2 border-black font-bold uppercase tracking-wider text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: '10px' }}>Local Intel</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 3 — Community */}
            <div
              className={cn(
                "bg-white border-2 border-black transition-all duration-300 group relative overflow-hidden",
                "hover:shadow-lg hover:-translate-y-1",
                "rounded-none",
                "h-full flex flex-col"
              )}
              style={{
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Black top border on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-black transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}></div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-4xl font-black uppercase mb-1 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Community</h3>
                  <p className="text-xs text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    The scene, centralized.
                  </p>
                </div>

                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-3">
                    <span className="text-black text-lg leading-none mt-0.5">→</span>
                    <p className="text-sm leading-relaxed text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}><strong className="text-black">Session Logs</strong> — Post waves, compare notes, see what's working.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-black text-lg leading-none mt-0.5">→</span>
                    <p className="text-sm leading-relaxed text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}><strong className="text-black">Crowd Intel</strong> — Real-time lineup reports. Know before you go.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-black text-lg leading-none mt-0.5">→</span>
                    <p className="text-sm leading-relaxed text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}><strong className="text-black">Local Warnings</strong> — Rips, sandbars, vibe checks.</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-auto pt-4">
                  <div className="border-t border-gray-300 pt-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 border-2 border-black font-bold uppercase tracking-wider text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: '10px' }}>Transparent</span>
                      <span className="px-2 py-1 border-2 border-black font-bold uppercase tracking-wider text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: '10px' }}>No Gatekeeping</span>
                      <span className="px-2 py-1 border-2 border-black font-bold uppercase tracking-wider text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: '10px' }}>Real Intel</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Today's NYC Surf at a Glance - Professional Dark Design */}
      <section
        id="featured-spots"
        className="w-full pt-14 pb-16 px-4 md:px-8 relative bg-white"
      >
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-1 relative">
          <div className="flex flex-col gap-6">
            {/* Status bar */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-2 h-2 bg-black rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-2 h-2 bg-black rounded-full"></div>
                </div>
                <span className="text-xs font-semibold text-black uppercase tracking-wider">LIVE</span>
              </div>
              <span className="text-gray-500">•</span>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Clock className="h-3 w-3" />
                <span>
                  {forecastsQuery.data?.[0]?.currentConditions?.createdAt
                    ? formatTimestamp(new Date(forecastsQuery.data[0].currentConditions.createdAt))
                    : "Just now"}
                </span>
              </div>
            </div>

            {/* Main title */}
            <div>
              <h2 className="text-5xl md:text-7xl font-black text-black uppercase tracking-tighter leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.03em' }}>
                Today's NYC Surf
              </h2>
              <p className="text-gray-600 text-sm mt-1 tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Real-time conditions across Long Island's south shore
              </p>
            </div>
          </div>
        </div>

        {/* Travel Mode Toggle */}
        <div className="max-w-7xl mx-auto flex items-center justify-end mb-4">
          <div className="flex items-center border-2 border-black">
            <button
              onClick={() => setTravelMode("driving")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                travelMode === "driving"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-50"
              }`}
              style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
            >
              <Car className="h-4 w-4" />
              Driving
            </button>
            <button
              onClick={() => setTravelMode("transit")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-l-2 border-black ${
                travelMode === "transit"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-50"
              }`}
              style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
            >
              <Train className="h-4 w-4" />
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
        {spotsQuery.isLoading || forecastsQuery.isLoading ? (
          <div className="max-w-7xl mx-auto relative">
            <div className="text-lg text-black text-center py-16" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Loading spots...
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto grid gap-4 md:grid-cols-3 relative">
            {featuredSpots.map(({ spot, forecast }) => (
              <SpotForecastCard
                key={spot.id}
                spot={spot}
                forecast={forecast}
                isExpanded={expandedSpot === spot.id}
                onToggleExpand={() => setExpandedSpot(expandedSpot === spot.id ? null : spot.id)}
                onNavigate={setLocation}
                travelMode={travelMode}
                useNeutralBackground={true}
                buoyBasedHeight={buoyBreakingHeightsQuery.data?.[spot.name] ?? null}
                buoyData={buoyQuery.data}
                buoyLoading={buoyQuery.isLoading}
              />
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

