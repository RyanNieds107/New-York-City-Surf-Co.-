import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  RefreshCw,
  Waves,
  Wind,
  Clock,
  Users,
  ArrowLeft,
  Compass,
  TrendingUp,
  MapPin,
  Loader2,
  AlertCircle,
  Gauge,
  Droplet,
  Sun,
  Thermometer,
  ArrowUp,
  ArrowDown,
  BarChart3,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/Footer";

// Reusable component for spot info cards
function SpotInfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 relative overflow-hidden transition-all duration-200" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`,
    }}>
      <div className="px-8 py-6 border-b border-gray-100">
        <h3 className="text-2xl font-semibold text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>{title.toUpperCase()}</h3>
      </div>
      <div className="px-8 py-10">
        <div className="text-base text-black leading-relaxed space-y-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>{children}</div>
      </div>
    </div>
  );
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
    swellDirection: "NE - SE (45-135°)",
    waveHeight: "4-6ft at 8-10s swell period",
    windDirection: "NW - N (offshore)",
    tide: "Incoming Low-Mid",
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 relative overflow-hidden transition-all duration-200" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`,
    }}>
      <div className="px-8 py-6 border-b border-gray-100">
        <h2 className="text-2xl font-semibold text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>
          WHAT GOOD LOOKS LIKE AT {spotName.toUpperCase()}
        </h2>
      </div>
      <div className="px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Ideal Swell */}
          <div className="px-8 py-10">
            <div className="flex flex-col items-center text-center">
              <Compass className="h-6 w-6 text-black mb-6" style={{ minWidth: '24px', minHeight: '24px' }} />
              <p className="text-[10px] font-normal text-gray-500 uppercase tracking-wider mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Ideal Swell</p>
              <p className="text-xl font-black text-black leading-tight" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                {idealConditions.swellDirection}
              </p>
            </div>
          </div>

          {/* Ideal Size */}
          <div className="px-8 py-10">
            <div className="flex flex-col items-center text-center">
              <Waves className="h-6 w-6 text-black mb-6" style={{ minWidth: '24px', minHeight: '24px' }} />
              <p className="text-[10px] font-normal text-gray-500 uppercase tracking-wider mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Ideal Size</p>
              <p className="text-xl font-black text-black leading-tight" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                {idealConditions.waveHeight}
              </p>
            </div>
          </div>

          {/* Ideal Wind */}
          <div className="px-8 py-10">
            <div className="flex flex-col items-center text-center">
              <Wind className="h-6 w-6 text-black mb-6" style={{ minWidth: '24px', minHeight: '24px' }} />
              <p className="text-[10px] font-normal text-gray-500 uppercase tracking-wider mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Ideal Wind</p>
              <p className="text-xl font-black text-black leading-tight" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                {idealConditions.windDirection}
              </p>
            </div>
          </div>

          {/* Ideal Tide */}
          <div className="px-8 py-10">
            <div className="flex flex-col items-center text-center">
              <Droplet className="h-6 w-6 text-black mb-6" style={{ minWidth: '24px', minHeight: '24px' }} />
              <p className="text-[10px] font-normal text-gray-500 uppercase tracking-wider mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Ideal Tide</p>
              <p className="text-xl font-black text-black leading-tight" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                {idealConditions.tide}
              </p>
            </div>
          </div>
        </div>
        
        {/* Note */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-[11px] text-gray-400 italic text-center leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Ideal conditions are based on an analysis of the 100 best days at Lido Beach over the last 10 years.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SpotDetail() {
  const params = useParams<{ id: string }>();
  const spotId = parseInt(params.id || "0", 10);

  const { user, isAuthenticated } = useAuth();
  const [crowdLevel, setCrowdLevel] = useState(3);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("ideal-conditions");

  const spotQuery = trpc.spots.get.useQuery({ id: spotId });
  const forecastQuery = trpc.forecasts.getForSpot.useQuery({ spotId });
  const timelineQuery = trpc.forecasts.getTimeline.useQuery({ spotId, hours: 72 });
  const crowdQuery = trpc.crowd.getForSpot.useQuery({ spotId });
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
    
    // Filter out past forecast points (older than 1 hour ago)
    // Only show future or very recent forecasts
    const cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    
    timelineQuery.data.timeline.forEach((point, index) => {
      // Create date from timestamp
      const date = new Date(point.forecastTimestamp);
      
      // Skip forecast points that are too far in the past (more than 1 hour old)
      if (date.getTime() < cutoffTime.getTime()) {
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
    return Array.from(groupedByDay.entries()).sort(([a], [b]) => {
      return a.localeCompare(b); // ISO date strings sort correctly
    });
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
  const buoyReading = forecastQuery.data?.buoyReading;
  const isLoading = spotQuery.isLoading || forecastQuery.isLoading;
  const isError = spotQuery.error || forecastQuery.error;
  
  // Get current conditions from Open-Meteo (first timeline point)
  const currentConditions = timelineQuery.data?.timeline?.[0] || null;
  
  // Temporary debug logging
  useEffect(() => {
    if (currentConditions) {
      console.log('🖥️ FRONTEND DISPLAY DEBUG:');
      console.log('Current forecast object:', currentConditions);
      console.log('What UI is showing:', {
        displayed_wave_height: currentConditions.breaking_wave_height || (currentConditions.waveHeightFt?.toFixed(1) + 'ft'),
        breaking_wave_height_from_api: currentConditions.breaking_wave_height,
        raw_wave_height: currentConditions.waveHeightFt,
        direction: currentConditions.waveDirectionDeg
      });
      
      // Check if UI is using the right field
      console.log('Which field is the UI displaying?');
      console.log('Is it using breaking_wave_height?', !!currentConditions.breaking_wave_height);
      console.log('Is it using waveHeightFt?', !!currentConditions.waveHeightFt);
    }
  }, [currentConditions]);
  
  // 🖥️ STEP 6: Frontend Received
  if (currentConditions) {
    console.log('🖥️ STEP 6: Frontend Received');
    console.log('🖥️ Frontend received forecast:', {
      breaking_wave_height: currentConditions.breaking_wave_height,
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
  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score: number): "Excellent" | "Good" | "Fair" | "Poor" => {
    if (score >= 70) return "Excellent";
    if (score >= 40) return "Fair";
    return "Poor";
  };

  const getLabelColor = (label: string) => {
    if (label === "Good" || label === "Excellent") return "text-emerald-600";
    if (label === "Fair") return "text-amber-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (band: string) => {
    switch (band) {
      case "High":
        return (
          <Badge className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 shadow-sm border-0">
            High Confidence
          </Badge>
        );
      case "Medium":
        return (
          <Badge className="bg-amber-500 text-white text-xs font-semibold px-3 py-1 shadow-sm border-0">
            Medium Confidence
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-red-400 text-red-600 text-xs font-semibold px-3 py-1 bg-red-50">
            Low Confidence
          </Badge>
        );
    }
  };

  const formatWaveHeight = (tenthsFt: number) => {
    const feet = tenthsFt / 10;
    return `${feet.toFixed(1)}ft`;
  };

  const formatWaveHeightRange = (tenthsFt: number) => {
    const feet = tenthsFt / 10;
    // Simple range: ±0.5ft
    return `${(feet - 0.5).toFixed(1)}-${(feet + 0.5).toFixed(1)}ft`;
  };

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

  const getWaveHeightDescription = (heightFt: number | null): string => {
    if (heightFt === null) return "";
    if (heightFt < 1) return "Ankle to shin";
    if (heightFt < 2) return "Shin to knee";
    if (heightFt < 3) return "Knee to waist";
    if (heightFt < 4) return "Waist to chest";
    if (heightFt < 6) return "Chest to head";
    if (heightFt < 8) return "Head high to overhead";
    return "Double overhead+";
  };

  const getDirectionArrowRotation = (degrees: number): number => {
    // Convert from compass degrees (0=N, 90=E) to CSS rotation (0=top, clockwise)
    // For arrows pointing in the direction the swell is coming FROM
    return degrees;
  };

  const DirectionArrow = ({ degrees }: { degrees: number }) => {
    const rotation = getDirectionArrowRotation(degrees);
    return (
      <span 
        className="inline-block text-black"
        style={{ 
          transform: `rotate(${rotation}deg)`,
          display: 'inline-block',
          lineHeight: 1
        }}
      >
        ▲
      </span>
    );
  };

  const getCrowdLabel = (level: number) => {
    const labels = ["", "Empty", "Light", "Moderate", "Crowded", "Packed"];
    return labels[level] || "Unknown";
  };

  // Generate actionable surf report
  const getSurfReport = (score: number | null, conditions: typeof currentConditions) => {
    if (!score && score !== 0) return "No data available";
    
    if (score < 40) {
      // Poor conditions
      if (conditions?.waveHeightFt && conditions.waveHeightFt < 1) {
        return "Small and choppy. Skip it today.";
      } else if (conditions?.windType === "onshore") {
        return "Onshore winds making it messy. Not worth it.";
      } else {
        return "Poor conditions. Skip it today.";
      }
    } else if (score < 70) {
      // Fair conditions
      if (conditions?.windType === "offshore") {
        return "Rideable but not great. Early morning best.";
      } else if (conditions?.waveHeightFt && conditions.waveHeightFt >= 2) {
        return "Decent size but conditions could be better. Worth checking.";
      } else {
        return "Rideable but not great. Early morning best.";
      }
    } else {
      // Good/Excellent conditions
      if (conditions?.windType === "offshore" && conditions?.waveHeightFt && conditions.waveHeightFt >= 2) {
        return "Clean conditions. Get out there!";
      } else if (conditions?.windType === "offshore") {
        return "Offshore winds and clean. Good session ahead.";
      } else {
        return "Clean conditions. Get out there!";
      }
    }
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

  // Auto-refresh interval (from env or default 3 hours)
  const refreshIntervalHours = 3;

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
        <main className="container max-w-5xl py-8">
          <div className="space-y-6">
            <Card className="bg-white border-black">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Loader2 className="h-5 w-5 animate-spin text-black" />
                  <p className="text-black">Loading forecast...</p>
                </div>
              </CardContent>
            </Card>
            <Skeleton className="h-64 w-full bg-gray-100" />
            <Skeleton className="h-48 w-full bg-gray-100" />
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
        <main className="container max-w-5xl py-8">
          <Card className="bg-white border-black">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-black mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Error Loading Forecast</h3>
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
        <main className="container max-w-5xl py-8">
          <div className="text-center">
            <Waves className="h-16 w-16 text-black mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-black mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Spot Not Found</h1>
            <p className="text-black mb-6">The surf spot you're looking for doesn't exist.</p>
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

  const lastUpdated = forecast?.createdAt ? new Date(forecast.createdAt) : null;

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
                  {/* Last Updated + Auto-refresh indicator */}
                  {lastUpdated && (
                    <div className="flex items-center gap-2 text-xs text-white/80">
                      {refreshMutation.isPending && (
                        <Loader2 className="h-3 w-3 animate-spin text-white" />
                      )}
                      <span>
                        Updated {formatRelativeTime(lastUpdated)} ({formatAbsoluteTime(lastUpdated)})
                      </span>
                      <span className="text-white/60">·</span>
                      <span>Auto-refresh every {refreshIntervalHours}h</span>
                    </div>
                  )}
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
                  {/* Last Updated + Auto-refresh indicator */}
                  {lastUpdated && (
                    <div className="flex items-center gap-2 text-xs text-white/80">
                      {refreshMutation.isPending && (
                        <Loader2 className="h-3 w-3 animate-spin text-white" />
                      )}
                      <span>
                        Updated {formatRelativeTime(lastUpdated)} ({formatAbsoluteTime(lastUpdated)})
                      </span>
                      <span className="text-white/60">·</span>
                      <span>Auto-refresh every {refreshIntervalHours}h</span>
                    </div>
                  )}
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
                  {/* Last Updated + Auto-refresh indicator */}
                  {lastUpdated && (
                    <div className="flex items-center gap-2 text-xs text-white/80">
                      {refreshMutation.isPending && (
                        <Loader2 className="h-3 w-3 animate-spin text-white" />
                      )}
                      <span>
                        Updated {formatRelativeTime(lastUpdated)} ({formatAbsoluteTime(lastUpdated)})
                      </span>
                      <span className="text-white/60">·</span>
                      <span>Auto-refresh every {refreshIntervalHours}h</span>
                    </div>
                  )}
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
                {/* Last Updated + Auto-refresh indicator */}
                {lastUpdated && (
                  <div className="flex items-center gap-2 text-xs text-black">
                    {refreshMutation.isPending && (
                      <Loader2 className="h-3 w-3 animate-spin text-black" />
                    )}
                    <span>
                      Updated {formatRelativeTime(lastUpdated)} ({formatAbsoluteTime(lastUpdated)})
                    </span>
                    <span className="text-black">·</span>
                    <span>Auto-refresh every {refreshIntervalHours}h</span>
                  </div>
                )}
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
      <main className="container max-w-5xl py-8">
        {forecast ? (
          <div className="space-y-6">
            {/* Spot Description - Lido Beach Only */}
            {spot?.name === "Lido Beach" && (
              <div className="bg-gray-50 border-2 border-black">
                <div className="p-6">
                  <div className="space-y-3 text-center">
                    <p className="text-3xl md:text-4xl font-black text-black leading-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                      Long Island's premier beach break.
                    </p>
                    <p className="text-lg md:text-xl font-semibold text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                      Where offshore bathymetry and perfect sandbars create waves 1-2 feet larger than anywhere else in Western Long Island.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Conditions - NYC Style 3-Column Stat Row */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Conditions
                  </h2>
                  {lastUpdated && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatRelativeTime(lastUpdated)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-8">
                {currentConditions ? (
                  <>
                    <div className="grid grid-cols-2 gap-12">
                      {/* Surf Height */}
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                          Surf Height
                        </p>
                        <p className="text-3xl font-semibold text-gray-900 mb-2 leading-none" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                          {currentConditions.breaking_wave_height 
                            ? currentConditions.breaking_wave_height
                            : currentConditions.waveHeightFt !== null 
                              ? `${currentConditions.waveHeightFt.toFixed(1)}ft`
                              : "—"}
                        </p>
                        {(() => {
                          const height = currentConditions.breaking_wave_height 
                            ? parseFloat(currentConditions.breaking_wave_height.split('-')[0] || currentConditions.breaking_wave_height.replace('ft', ''))
                            : currentConditions.waveHeightFt;
                          const description = getWaveHeightDescription(height);
                          return description ? (
                            <p className="text-sm font-normal text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              {description}
                            </p>
                          ) : null;
                        })()}
                      </div>

                      {/* Swell */}
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                          Swell
                        </p>
                        {(() => {
                          const swells = [];
                          
                          // Primary swell
                          if (currentConditions.waveHeightFt !== null && currentConditions.wavePeriodSec !== null) {
                            const height = currentConditions.waveHeightFt.toFixed(1);
                            const period = currentConditions.wavePeriodSec.toFixed(0);
                            const direction = currentConditions.waveDirectionDeg !== null && currentConditions.waveDirectionDeg !== undefined
                              ? formatSwellDirection(currentConditions.waveDirectionDeg)
                              : null;
                            swells.push({
                              label: 'Primary',
                              height,
                              period,
                              direction,
                              directionDeg: currentConditions.waveDirectionDeg,
                            });
                          }
                          
                          // Secondary swell
                          if (currentConditions.secondarySwellHeightFt !== null && currentConditions.secondarySwellPeriodS !== null) {
                            const height = currentConditions.secondarySwellHeightFt.toFixed(1);
                            const period = currentConditions.secondarySwellPeriodS.toFixed(0);
                            const direction = currentConditions.secondarySwellDirectionDeg !== null && currentConditions.secondarySwellDirectionDeg !== undefined
                              ? formatSwellDirection(currentConditions.secondarySwellDirectionDeg)
                              : null;
                            swells.push({
                              label: 'Secondary',
                              height,
                              period,
                              direction,
                              directionDeg: currentConditions.secondarySwellDirectionDeg,
                            });
                          }
                          
                          // Wind waves
                          if (currentConditions.windWaveHeightFt !== null && currentConditions.windWavePeriodS !== null) {
                            const height = currentConditions.windWaveHeightFt.toFixed(1);
                            const period = currentConditions.windWavePeriodS.toFixed(0);
                            const direction = currentConditions.windWaveDirectionDeg !== null && currentConditions.windWaveDirectionDeg !== undefined
                              ? formatSwellDirection(currentConditions.windWaveDirectionDeg)
                              : null;
                            swells.push({
                              label: 'Wind Swell',
                              height,
                              period,
                              direction,
                              directionDeg: currentConditions.windWaveDirectionDeg,
                            });
                          }
                          
                          if (swells.length === 0) {
                            return <p className="text-sm text-gray-500">No swell data</p>;
                          }
                          
                          return (
                            <div className="space-y-2">
                              {swells.map((swell, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-500" style={{ fontFamily: "'Inter', 'Roboto', sans-serif", minWidth: '60px' }}>
                                    {swell.label}:
                                  </span>
                                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    {swell.height}ft
                                  </span>
                                  <span className="text-sm font-normal text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                    {swell.period}s
                                  </span>
                                  {swell.directionDeg !== null && swell.directionDeg !== undefined && (
                                    <>
                                      <DirectionArrow degrees={swell.directionDeg} />
                                      {swell.direction && (
                                        <span className="text-sm font-normal text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                          {swell.direction}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Additional Sections: Wind, Tide, Temperature */}
                    <div className="grid grid-cols-3 gap-8 mt-8 pt-8 border-t border-gray-200">
                    {/* Wind */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        Wind
                      </p>
                      {currentConditions.windSpeedMph !== null && currentConditions.windDirectionDeg !== null ? (
                        <>
                          <p className="text-2xl font-semibold text-gray-900 mb-1 leading-none" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                            {Math.round(currentConditions.windSpeedMph)}mph {(() => {
                              const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
                              const index = Math.round(currentConditions.windDirectionDeg / 22.5) % 16;
                              return directions[index];
                            })()}
                          </p>
                          {currentConditions.windType && (
                            <p className="text-sm font-normal text-gray-700 capitalize" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              {currentConditions.windType}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No wind data</p>
                      )}
                    </div>

                    {/* Tide */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        Tide
                      </p>
                      {currentConditions.tideHeightFt !== null ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-2xl font-semibold text-gray-900 leading-none" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              {(currentConditions.tideHeightFt / 10).toFixed(1)}ft
                            </p>
                            {currentConditions.tidePhase === "rising" && (
                              <ArrowUp className="h-4 w-4 text-gray-700" />
                            )}
                            {currentConditions.tidePhase === "falling" && (
                              <ArrowDown className="h-4 w-4 text-gray-700" />
                            )}
                          </div>
                          {currentConditions.tidePhase && (
                            <p className="text-sm font-normal text-gray-700 capitalize" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              {currentConditions.tidePhase}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No tide data</p>
                      )}
                    </div>

                    {/* Temperature */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        Temperature
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Droplet className="h-5 w-5 text-blue-500" />
                          <p className="text-2xl font-semibold text-gray-900 leading-none" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                            —°f
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sun className="h-5 w-5 text-yellow-500" />
                          <p className="text-2xl font-semibold text-gray-900 leading-none" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                            —°f
                          </p>
                        </div>
                      </div>
                    </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Loading conditions...</p>
                    {timelineQuery.isLoading && (
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mt-4" />
                    )}
                  </div>
                )}
              </div>
              
              {/* Quality Bar - Red to Green with Diamond Indicator */}
              {forecast && (
                <div className="px-6 pb-6">
                  <div className="relative w-full h-4 bg-gradient-to-r from-red-600 to-green-600">
                    {/* Diamond Indicator */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{
                        left: `${Math.min(100, Math.max(0, currentConditions?.probabilityScore ?? forecast.probabilityScore))}%`,
                        transform: `translate(-50%, -50%) rotate(45deg)`,
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#000000',
                        border: '2px solid #ffffff',
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Local Insight */}
              {forecast && currentConditions && (
                <div className="px-6 pb-6 border-t border-black pt-4">
                  <p className="text-sm italic text-black" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {getSurfReport(currentConditions.probabilityScore ?? forecast.probabilityScore, currentConditions)}
                  </p>
                </div>
              )}
            </div>

            {/* Forecast Timeline - Multi-Day Forecast - NYC Style */}
            <div className="bg-white border border-black relative" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`,
            }}>
              <div className="p-6 border-b border-black">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-1 uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                      72-HOUR FORECAST
                    </h2>
                    <p className="text-xs font-bold text-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                      QUALITY SCORES FOR THE NEXT 3 DAYS
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
              </div>
              {timelineQuery.isLoading ? (
                <div className="p-6">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-black" />
                    <span className="ml-2 text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Loading forecast timeline...</span>
                  </div>
                </div>
              ) : timelineQuery.data?.timeline && timelineQuery.data.timeline.length > 0 ? (
                <div className="p-6">
                  <div className="space-y-3">
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
                        const validScores = points.map(p => p.quality_score !== null ? p.quality_score : p.probabilityScore).filter(s => s !== null);
                        const avgScore = validScores.length > 0 
                          ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
                          : 0;
                        const bestScore = validScores.length > 0 ? Math.max(...validScores) : 0;
                        
                        // Prefer breaking_wave_height, fallback to waveHeightFt
                        const breakingHeights = points.map(p => p.breaking_wave_height).filter(h => h !== null && h !== undefined) as string[];
                        const heightRange = breakingHeights.length > 0 
                          ? breakingHeights[0] // Show first breaking height (most common will be first)
                          : (() => {
                              const validHeights = points.map(p => p.waveHeightFt).filter(h => h !== null && h > 0) as number[];
                              const minHeight = validHeights.length > 0 ? Math.min(...validHeights) : null;
                              const maxHeight = validHeights.length > 0 ? Math.max(...validHeights) : null;
                              return minHeight && maxHeight 
                                ? minHeight === maxHeight 
                                  ? `${minHeight.toFixed(1)}ft`
                                  : `${minHeight.toFixed(1)}-${maxHeight.toFixed(1)}ft`
                                : "N/A";
                            })();
                        
                        const validPeriods = points.map(p => p.wavePeriodSec).filter(p => p !== null && p > 0) as number[];
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
                        
                        // Day label
                        let dayLabel = "";
                        if (isToday) {
                          dayLabel = `Today (${dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
                        } else if (isTomorrow) {
                          dayLabel = `Tomorrow (${dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
                        } else {
                          dayLabel = dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        }
                        
                        const isExpanded = expandedDays.has(dayKey);
                        
                        return (
                          <div
                            key={dayKey}
                            className="bg-white border border-black transition-all mb-3"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E")`,
                            }}
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
                              className="w-full p-4 hover:bg-gray-50 transition-colors text-left border-b border-black"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-bold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>{dayLabel}</h3>
                                    <span className={`text-xs uppercase tracking-wider px-2 py-1 border border-black ${
                                      displayConfidence === "High"
                                        ? "bg-green-600 text-white"
                                        : displayConfidence === "Medium"
                                        ? "bg-yellow-500 text-black"
                                        : "bg-red-600 text-white"
                                    }`} style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                      {confidenceLabel}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                      <span className="text-black font-bold uppercase tracking-wide" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>BEST:</span>
                                      <span
                                        className={`ml-2 font-bold ${
                                          bestScore >= 70
                                            ? "text-green-600"
                                            : bestScore >= 40
                                            ? "text-yellow-500"
                                            : "text-red-600"
                                        }`}
                                        style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                                      >
                                        {bestScore}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-black font-bold uppercase tracking-wide" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>AVG:</span>
                                      <span
                                        className={`ml-2 font-bold ${
                                          avgScore >= 70
                                            ? "text-green-600"
                                            : avgScore >= 40
                                            ? "text-yellow-500"
                                            : "text-red-600"
                                        }`}
                                        style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                                      >
                                        {avgScore}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-black font-bold uppercase tracking-wide" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>HEIGHT:</span>
                                      <span className="ml-2 font-normal text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>{heightRange}</span>
                                    </div>
                                    <div>
                                      <span className="text-black font-bold uppercase tracking-wide" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>PERIOD:</span>
                                      <span className="ml-2 font-bold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>{avgPeriod}s</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  {isExpanded ? (
                                    <ChevronUp className="h-5 w-5 text-black" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-black" />
                                  )}
                                </div>
                              </div>
                            </button>
                            
                            {/* Hourly Breakdown (Expandable) */}
                            <div
                              className={`border-t border-black bg-white overflow-hidden transition-all duration-300 ease-in-out ${
                                isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                              }`}
                            >
                              <div className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {(() => {
                                      // Deduplicate points by time slot - keep only first occurrence of each unique time
                                      const seenTimes = new Set<string>();
                                      const uniquePoints = points.filter((point) => {
                                        const date = new Date(point.forecastTimestamp);
                                        const timeStr = date.toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                          hour12: true,
                                        });
                                        
                                        // Use hour and minute as the unique key (ignore seconds)
                                        const hour = date.getHours();
                                        const minute = date.getMinutes();
                                        const timeKey = `${hour}:${minute}`;
                                        
                                        if (seenTimes.has(timeKey)) {
                                          return false; // Skip duplicate
                                        }
                                        seenTimes.add(timeKey);
                                        return true; // Keep first occurrence
                                      });
                                      
                                      // Sort by timestamp to ensure chronological order
                                      uniquePoints.sort((a, b) => {
                                        return new Date(a.forecastTimestamp).getTime() - new Date(b.forecastTimestamp).getTime();
                                      });
                                      
                                      return uniquePoints.map((point, index) => {
                                        const date = new Date(point.forecastTimestamp);
                                        const timeStr = date.toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                          hour12: true,
                                        });
                                        
                                        return (
                                          <div
                                            key={`${point.forecastTimestamp}-${index}`}
                                            className="bg-white border border-black p-3 transition-all hover:bg-gray-50"
                                            style={{
                                              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E")`,
                                            }}
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-sm font-medium text-black" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{timeStr}</span>
                                              {point.quality_rating ? (
                                                <div
                                                  className={`text-sm font-black uppercase tracking-wide ${
                                                    point.quality_score !== null && point.quality_score >= 75
                                                      ? "text-green-600"
                                                      : point.quality_score !== null && point.quality_score >= 60
                                                      ? "text-yellow-500"
                                                      : "text-red-600"
                                                  }`}
                                                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                                                >
                                                  {point.quality_rating}
                                                </div>
                                              ) : (
                                                <div
                                                  className={`text-xl font-black ${
                                                    point.probabilityScore >= 70
                                                      ? "text-green-600"
                                                      : point.probabilityScore >= 40
                                                      ? "text-yellow-500"
                                                      : "text-red-600"
                                                  }`}
                                                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                                                >
                                                  {point.probabilityScore}
                                                </div>
                                              )}
                                            </div>
                                            
                                            <div className="space-y-1 text-xs">
                                              <div className="flex items-center justify-between">
                                                <span className="text-black font-bold uppercase tracking-wide" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>WAVES</span>
                                                <span className="font-normal text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                                  {point.breaking_wave_height || (point.waveHeightFt?.toFixed(1) ? `${point.waveHeightFt.toFixed(1)}ft` : "N/A")}
                                                </span>
                                              </div>
                                              <div className="flex items-center justify-between">
                                                <span className="text-black font-bold uppercase tracking-wide" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>PERIOD</span>
                                                <span className="font-normal text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                                  {point.wavePeriodSec?.toFixed(0) ?? "N/A"}s
                                                </span>
                                              </div>
                                              <div className="flex items-center justify-between">
                                                <span className="text-black font-bold uppercase tracking-wide" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>TIDE</span>
                                                <span className="font-normal text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                                  {point.tideHeightFt ? (point.tideHeightFt / 10).toFixed(1) : "N/A"}ft
                                                </span>
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
                        );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="text-center py-8">
                    <p className="text-black mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>No forecast timeline available yet.</p>
                    <Button
                      onClick={() => refreshTimelineMutation.mutate({ spotId })}
                      disabled={refreshTimelineMutation.isPending}
                      variant="outline"
                      className="border-black text-black hover:bg-gray-50 font-bold uppercase tracking-wide"
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                    >
                      {refreshTimelineMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          FETCHING...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          FETCH 72-HOUR FORECAST
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-600 mt-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      This will fetch marine forecast data from Open-Meteo
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tabbed Content Interface */}
            {spot && (spot.name === "Lido Beach" || spot.name === "Rockaway Beach") && (
              <div className="mt-12">
                {/* Tab Navigation */}
                <div className="bg-gray-50 border-2 border-black mb-8">
                  <div className="p-4 border-b-2 border-black">
                    <h2 className="text-2xl font-bold text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                      SPOT GUIDE
                    </h2>
                  </div>
                  <div className="flex gap-2 p-4">
                    {spot.name === "Lido Beach" ? (
                      <>
                        <button
                          onClick={() => setActiveTab("ideal-conditions")}
                          className={cn(
                            "flex-1 px-6 py-4 text-base font-bold uppercase tracking-wide transition-all duration-200 relative border-2",
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
                            "flex-1 px-6 py-4 text-base font-bold uppercase tracking-wide transition-all duration-200 relative border-2",
                            activeTab === "when-to-go"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          )}
                          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                        >
                          When to Go
                        </button>
                        <button
                          onClick={() => setActiveTab("bathymetry")}
                          className={cn(
                            "flex-1 px-6 py-4 text-base font-bold uppercase tracking-wide transition-all duration-200 relative border-2",
                            activeTab === "bathymetry"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          )}
                          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                        >
                          Bathymetry
                        </button>
                        <button
                          onClick={() => setActiveTab("location")}
                          className={cn(
                            "flex-1 px-6 py-4 text-base font-bold uppercase tracking-wide transition-all duration-200 relative border-2",
                            activeTab === "location"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          )}
                          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                        >
                          Location
                        </button>
                        <button
                          onClick={() => setActiveTab("local-knowledge")}
                          className={cn(
                            "flex-1 px-6 py-4 text-base font-bold uppercase tracking-wide transition-all duration-200 relative border-2",
                            activeTab === "local-knowledge"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          )}
                          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                        >
                          Local Knowledge
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setActiveTab("ideal-conditions")}
                          className={cn(
                            "px-6 py-4 text-base font-bold uppercase tracking-wide transition-all duration-200 relative whitespace-nowrap border-2",
                            activeTab === "ideal-conditions"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          )}
                          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                        >
                          Ideal Conditions
                        </button>
                        <button
                          onClick={() => setActiveTab("overview")}
                          className={cn(
                            "px-6 py-4 text-base font-bold uppercase tracking-wide transition-all duration-200 relative whitespace-nowrap border-2",
                            activeTab === "overview"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          )}
                          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                        >
                          Overview
                        </button>
                        <button
                          onClick={() => setActiveTab("who-its-for")}
                          className={cn(
                            "px-6 py-4 text-base font-bold uppercase tracking-wide transition-all duration-200 relative whitespace-nowrap border-2",
                            activeTab === "who-its-for"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          )}
                          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                        >
                          Who It's For
                        </button>
                        <button
                          onClick={() => setActiveTab("best-conditions")}
                          className={cn(
                            "px-6 py-4 text-base font-bold uppercase tracking-wide transition-all duration-200 relative whitespace-nowrap border-2",
                            activeTab === "best-conditions"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          )}
                          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                        >
                          Best Conditions
                        </button>
                        <button
                          onClick={() => setActiveTab("hazards")}
                          className={cn(
                            "px-6 py-4 text-base font-bold uppercase tracking-wide transition-all duration-200 relative whitespace-nowrap border-2",
                            activeTab === "hazards"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          )}
                          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                        >
                          Hazards
                        </button>
                        <button
                          onClick={() => setActiveTab("seasonality")}
                          className={cn(
                            "px-6 py-4 text-base font-bold uppercase tracking-wide transition-all duration-200 relative whitespace-nowrap border-2",
                            activeTab === "seasonality"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          )}
                          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                        >
                          Seasonality
                        </button>
                        <button
                          onClick={() => setActiveTab("getting-there")}
                          className={cn(
                            "px-6 py-4 text-base font-bold uppercase tracking-wide transition-all duration-200 relative whitespace-nowrap border-2",
                            activeTab === "getting-there"
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-100"
                          )}
                          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                        >
                          Getting There
                        </button>
                      </>
                    )}
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
                        <SpotInfoCard title="When to Go">
                          <div className="space-y-4">
                            <div className="bg-green-50 border-l-4 border-green-500 p-4">
                              <p className="font-bold text-black mb-2" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Prime Time: September - October</p>
                              <p className="text-base text-black leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Hurricane season brings the most consistent large surf. Active low pressure systems and the occassion Nor'easter bring mid-period E/SE swells with offshore winds create the famous A-frames.</p>
                            </div>
                            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                              <p className="font-bold text-black mb-2" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Occasional: Winter</p>
                              <p className="text-base text-black leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Short windows when S/SSW low pressure systems align perfectly. Timing is everything. Water is freezing so crowds are down the most.</p>
                            </div>
                            <div className="bg-red-50 border-l-4 border-red-500 p-4">
                              <p className="font-bold text-black mb-2" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Avoid: Summer</p>
                              <p className="text-base text-black leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Crowded, onshore winds dominate. Mostly small and weak unless a rare long-period pulse shows up.</p>
                            </div>
                          </div>
                        </SpotInfoCard>
                      )}

                      {activeTab === "bathymetry" && (
                        <SpotInfoCard title="Bathymetry">
                          <div className="space-y-6">
                            <div>
                              <p className="font-bold text-black mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>The Hudson Canyon Depth Advantage</p>
                              <p className="text-black mb-3 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                While the Mid-Atlantic Ridge creates a 100-mile shallow continental shelf that drags on swells and reduces wave energy, Lido is an exception. The Hudson Canyon creates deeper water directly offshore, allowing swells to maintain more energy as they approach the beach.
                              </p>
                              <p className="text-black mb-0 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                This is why you might see 5-foot waves at Lincoln, 7-foot waves at Lido, and 2-foot waves at Point Lookout to the east—all from the same swell.
                              </p>
                            </div>
                            <div>
                              <p className="font-bold text-black mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Offshore Bathymetry & Sandbars</p>
                              <p className="text-black mb-3 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                Lido sits in a curved ridge where the offshore water is deeper than surrounding areas. This means swells experience less drag and produce larger surf. Unlike jetty beaches where sand gets trapped in one area, Lido's lack of dominant jetty influence allows sand to build up in multiple areas throughout the stretch.
                              </p>
                              <p className="text-black mb-0 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                This combination of offshore depth and distributed sandbars is what creates the famous A-frame peaks that Lido is known for—often 1-2 feet larger than surrounding breaks.
                              </p>
                            </div>
                          </div>
                        </SpotInfoCard>
                      )}

                      {activeTab === "location" && (
                        <SpotInfoCard title="Location">
                          <div className="space-y-6">
                            <div>
                              <p className="font-bold text-black mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Location Advantage</p>
                              <p className="text-black mb-0 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                Lido sits at the west end of the Long Beach strip, positioned in between Rockaway to the west and Jones Beach to the east. This unique position gives it access to swells that other breaks miss.
                              </p>
                            </div>
                          </div>
                        </SpotInfoCard>
                      )}


                      {activeTab === "local-knowledge" && (
                        <SpotInfoCard title="Local Knowledge">
                          <div className="space-y-6">
                            <div>
                              <p className="font-bold text-black mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>The Jetty Situation</p>
                              <p className="text-black mb-3 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                The jetties along the Long Beach strip have long been known for producing the best waves. Sand buildup in jetty areas creates sandbars that gradually fade as you get away from the jetty—creating a makeshift point break and a goofyfooter's dream. Dreamy lefts have long been a staple of jetty beaches.
                              </p>
                              <p className="text-black mb-0 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                However, over the years, something has happened with the jetties. They haven't been breaking the way they used to. While there's no scientific study proving this, anecdotal evidence from longtime locals confirms this theory. This is part of why more attention has shifted to Lido Beach over the years.
                              </p>
                            </div>
                            <div>
                              <p className="font-bold text-black mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>The Unpredictability Factor</p>
                              <p className="text-black mb-3 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                While understanding swell period/height, swell direction, and winds can give you a good idea of how waves are going to break at Lido Beach, ultimately Mother Nature has her own agenda. It's nearly impossible to know what you're getting into when you arrive at the Lido West parking lot and peek over the mound facing the water in front of you.
                              </p>
                              <p className="text-black mb-0 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                There are so many days that looked average going in that ended up being phenomenal. More times than not, there have been fair share of busts—when you look over the mound and it's nowhere near what you're expecting. Surfline cams have helped big time with this.
                              </p>
                            </div>
                            <div>
                              <p className="font-bold text-black mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Best Viewing Spot</p>
                              <p className="text-black mb-0 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                The West parking lot mound is the best spot to check conditions. This elevated position gives you a clear view of the break and helps you assess what you're getting into before paddling out.
                              </p>
                            </div>
                            <div>
                              <p className="font-bold text-black mb-3" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>The Reality</p>
                              <p className="text-black mb-0 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                Western Long Island is by no means a hotbed for surfing. For most of the year, the surf is completely flat. However, the more time spent in the water, the more you learn about the wave and all its hidden agendas. Lido rewards those who understand its nuances and are willing to wait for the right conditions.
                              </p>
                            </div>
                          </div>
                        </SpotInfoCard>
                      )}
                    </>
                  )}

                  {/* Rockaway Beach Tabs */}
                  {spot.name === "Rockaway Beach" && (
                    <>
                      {activeTab === "overview" && (
                        <>
                          <div className="mb-8">
                            {/* Tag Badges */}
                            <div className="flex flex-wrap gap-2 mb-6">
                              <Badge variant="outline" className="border-black text-black">
                                Beach break
                              </Badge>
                              <Badge variant="outline" className="border-black text-black">
                                Year round
                              </Badge>
                              <Badge variant="outline" className="border-black text-black">
                                Crowded
                              </Badge>
                            </div>

                            {/* Overview Paragraph */}
                            <p className="text-lg text-black leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              The most accessible and most crowded break in the region. Consistent, punchy beach break with jetties that shape the sand. Works better than most people think on the right tide and wind.
                            </p>
                          </div>
                          <SpotInfoCard title="Break overview">
                            <ul className="list-disc list-inside space-y-1 text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              <li>Beach break</li>
                              <li>Short, sometimes dumpy peaks</li>
                              <li>Occasional A-frames during hurricane season and solid NE setups</li>
                            </ul>
                          </SpotInfoCard>
                        </>
                      )}

                      {activeTab === "who-its-for" && (
                        <SpotInfoCard title="Who it is for">
                          <ul className="list-disc list-inside space-y-1 text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                            <li>Everyone</li>
                            <li>Beginners often pack the inside</li>
                            <li>Advanced surfers sit deeper by the jetties and on better sandbars</li>
                          </ul>
                        </SpotInfoCard>
                      )}

                      {activeTab === "best-conditions" && (
                        <SpotInfoCard title="Best conditions">
                          <div className="space-y-2">
                            <div>
                              <p className="font-medium text-black mb-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Best swell:</p>
                              <p className="text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Hurricane / long-period SE–S swells; NE swells with offshore NW winds</p>
                            </div>
                            <div>
                              <p className="font-medium text-black mb-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Best wind:</p>
                              <p className="text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>NW (classic offshore - best), W or N (good), Avoid anything S (usually its very calm)</p>
                            </div>
                            <div>
                              <p className="font-medium text-black mb-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Best tide:</p>
                              <p className="text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Incoming tide is ideal; Mid to high tide usually works best; Low tide often gets dumpy with lots of closeouts</p>
                            </div>
                          </div>
                        </SpotInfoCard>
                      )}

                      {activeTab === "hazards" && (
                        <SpotInfoCard title="Hazards">
                          <ul className="list-disc list-inside space-y-1 text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                            <li>Crowds and drop-ins</li>
                            <li>Surf schools and beginners on soft tops</li>
                            <li>Rips near the jetties</li>
                            <li>Boards flying around on busy summer weekends</li>
                          </ul>
                        </SpotInfoCard>
                      )}

                      {activeTab === "seasonality" && (
                        <SpotInfoCard title="Seasonality">
                          <ul className="list-disc list-inside space-y-1 text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                            <li><strong className="text-black">Hurricane season (Aug–Oct):</strong> usually the best Rockaway of the year</li>
                            <li><strong className="text-black">Fall:</strong> very consistent with frequent surfable days</li>
                            <li><strong className="text-black">Winter:</strong> colder, less crowded, and usually perfect when it works</li>
                            <li><strong className="text-black">Summer:</strong> mostly small and weak unless a rare long-period pulse shows up</li>
                          </ul>
                        </SpotInfoCard>
                      )}

                      {activeTab === "getting-there" && (
                        <SpotInfoCard title="Getting here from NYC">
                          <ul className="list-disc list-inside space-y-1 text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                            <li>A train to Beach 90th / 98th / 105th</li>
                            <li>NYC Ferry from Wall Street to Rockaway, then local shuttle or bike</li>
                            <li>Bike path from Brooklyn</li>
                            <li>20–45 min drive from parts of the city depending on traffic and bridges</li>
                          </ul>
                        </SpotInfoCard>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Crowd Report Section */}
            <div className="bg-white border-2 border-black">
              <div className="p-4 border-b-2 border-black">
                <h2 className="text-2xl font-bold text-black uppercase tracking-tight flex items-center gap-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  <Users className="h-6 w-6 text-black" />
                  CROWD REPORT
                </h2>
              </div>
              <div className="p-6">
                <div className="mb-4 pb-4 border-b border-black">
                  <p className="text-sm text-black uppercase tracking-wide" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    {crowdQuery.data?.averageLevel
                      ? `Current average: ${getCrowdLabel(crowdQuery.data.averageLevel).toUpperCase()} (${crowdQuery.data.reports.length} reports)`
                      : "No recent reports. Be the first to report!"}
                  </p>
                </div>
                {isAuthenticated ? (
                  <div className="space-y-6">
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
                      onClick={() => submitCrowdMutation.mutate({ spotId, crowdLevel })}
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
            </div>
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
      
      {/* Debug Button */}
      {/* <button 
        onClick={() => debugQuery.refetch()}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'red',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          zIndex: 9999,
          fontWeight: 'bold'
        }}
      >
        🐛 Debug
      </button> */}
    </div>
  );
}
