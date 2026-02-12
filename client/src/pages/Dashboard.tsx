import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Waves, Wind, Clock, ArrowRight, Droplets, ChevronRight } from "lucide-react";
import { TrendArrow, WindArrowBadge } from "@/components/ui/arrow";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { SpotCard } from "@/components/SpotCard";
import { PhotoSpotCard } from "@/components/PhotoSpotCard";
import { Footer } from "@/components/Footer";
import { YearInReview2025 } from "@/components/YearInReview2025";
import { Logo } from "@/components/Logo";
import { GateOverlay } from "@/components/GateOverlay";
import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Dashboard() {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Geolocation state for distance feature
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Request geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // Permission denied or error - leave userLocation as null
      }
    );
  }, []);

  // Auto-refresh interval: 30 minutes
  const refetchInterval = 30 * 60 * 1000;

  const spotsQuery = trpc.spots.list.useQuery(undefined, {
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
    refetchInterval,
  });
  const forecastsQuery = trpc.forecasts.getCurrentConditionsForAll.useQuery(undefined, {
    refetchInterval,
  });

  // Distance query - only runs when user location is available
  const distanceQuery = trpc.distance.getDistanceToSpots.useQuery(
    { origin: userLocation ? `${userLocation.lat},${userLocation.lng}` : "", mode: "driving" },
    { enabled: !!userLocation }
  );

  // Auth and alerts query for promo banner
  const { isAuthenticated } = useAuth();
  const showGuideGate = !isAuthenticated;
  const alertsQuery = trpc.alerts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const unlockGuide = () => {
    setLocation(`/login?redirect=${encodeURIComponent("/surf-analysis")}`);
  };

  const refreshAllMutation = trpc.forecasts.refreshAll.useMutation({
    onSuccess: () => {
      toast.success("All forecasts refreshed!");
      forecastsQuery.refetch();
      spotsQuery.refetch(); // Also refetch spots to pick up any new spots
    },
    onError: (error) => {
      toast.error(`Failed to refresh: ${error.message}`);
    },
  });

  const isLoading = spotsQuery.isLoading || forecastsQuery.isLoading;

  // Create a map of spotId -> current conditions for easy lookup
  const forecastMap = new Map(
    (forecastsQuery.data || []).map((item) => [item.spotId, item.currentConditions])
  );


  const getConfidenceBadge = (band: string) => {
    switch (band) {
      case "High":
        return <Badge variant="default" className="bg-green-600">High Confidence</Badge>;
      case "Medium":
        return <Badge variant="secondary" className="bg-yellow-600 text-white">Medium Confidence</Badge>;
      default:
        return <Badge variant="outline" className="border-red-500 text-red-500">Low Confidence</Badge>;
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getWindTypeColor = (windType: string | null) => {
    switch (windType) {
      case "offshore":
        return "text-green-400";
      case "cross":
        return "text-yellow-400";
      case "onshore":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  const getWindTypeLabel = (windType: string | null) => {
    switch (windType) {
      case "offshore":
        return "Offshore";
      case "cross":
        return "Cross";
      case "onshore":
        return "Onshore";
      default:
        return "N/A";
    }
  };

  const getTidePhaseIcon = (phase: string | null) => {
    switch (phase) {
      case "rising":
        return <TrendArrow rising={true} size={14} />;
      case "falling":
        return <TrendArrow rising={false} size={14} />;
      case "high":
        return <TrendArrow rising={true} size={14} color="#1e293b" />;
      case "low":
        return <TrendArrow rising={false} size={14} color="#94a3b8" />;
      default:
        return "–";
    }
  };

  const getTidePhaseColor = (phase: string | null) => {
    switch (phase) {
      case "rising":
        return "text-cyan-400";
      case "falling":
        return "text-orange-400";
      case "high":
        return "text-blue-400";
      case "low":
        return "text-amber-400";
      default:
        return "text-slate-400";
    }
  };

  const getTidePhaseLabel = (phase: string | null) => {
    switch (phase) {
      case "rising":
        return "Rising";
      case "falling":
        return "Falling";
      case "high":
        return "High";
      case "low":
        return "Low";
      default:
        return "N/A";
    }
  };

  const getWindDirectionArrow = (degrees: number | null, windType: string | null = null) => {
    if (degrees === null) return null;
    // Determine wind type for badge coloring
    const badgeWindType: "offshore" | "onshore" | "cross" | "unknown" =
      windType?.toLowerCase().includes("offshore") ? "offshore" :
      windType?.toLowerCase().includes("onshore") ? "onshore" :
      windType?.toLowerCase().includes("cross") ? "cross" : "unknown";

    return <WindArrowBadge directionDeg={degrees} windType={badgeWindType} badgeSize="sm" />;
  };

  // Helper functions for SpotCard data mapping
  const getScoreLabel = (score: number): "Good" | "Fair" | "Poor" => {
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  };

  const formatWindSummary = (forecast: { windType: string | null; windSpeedMph: number | null }): string => {
    const windType = forecast.windType || "N/A";
    const windSpeed = forecast.windSpeedMph !== null ? `${forecast.windSpeedMph} mph` : "";
    
    if (windType === "N/A" && !windSpeed) return "N/A";
    if (!windSpeed) return windType;
    
    return `${windType} · ${windSpeed}`;
  };

  const formatPeriodSummary = (forecast: { wavePeriodSec: number | null } | null | undefined): string => {
    if (!forecast || forecast.wavePeriodSec === null) return "N/A";
    return `${forecast.wavePeriodSec}s`;
  };

  const formatLastUpdated = (date: Date): string => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const [, setLocation] = useLocation();

  // Custom sort order for spots
  const spotOrder = [
    "Rockaway Beach",
    "Long Beach",
    "Lido Beach",
    "Gilgo Beach",
    "Montauk",
    "Belmar",
  ];

  // Sort spots according to custom order
  const sortedSpots = spotsQuery.data ? [...spotsQuery.data].sort((a, b) => {
    const indexA = spotOrder.indexOf(a.name);
    const indexB = spotOrder.indexOf(b.name);
    // If both are in the order list, sort by their position
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // If only one is in the list, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    // If neither is in the list, sort alphabetically
    return a.name.localeCompare(b.name);
  }) : [];

  // Check if spot should show "Coming Soon"
  const isComingSoonSpot = (spotName: string) => {
    return spotName === "Gilgo Beach" ||
           spotName === "Belmar" ||
           spotName === "Montauk";
  };

  // Get image path for a spot
  const getSpotImagePath = (spotName: string): string => {
    if (spotName === "Rockaway Beach") return "/Rockaway.avif";
    if (spotName === "Long Beach") return "/Long Beach.webp";
    if (spotName === "Lido Beach") return "/Lido-beach.jpg";
    if (spotName === "Gilgo Beach") return "/Gilgo Beach.jpg";
    if (spotName === "Belmar") return "/Belmar.jpg";
    if (spotName === "Montauk") return "/Montauk.jpg";
    return "";
  };

  // Get region for a spot
  const getSpotRegion = (spotName: string): string => {
    if (spotName === "Rockaway Beach") return "Queens, NY";
    if (spotName === "Long Beach") return "Nassau County, NY";
    if (spotName === "Lido Beach") return "Nassau County, NY";
    if (spotName === "Gilgo Beach") return "Suffolk County, NY";
    if (spotName === "Belmar") return "Monmouth County, NJ";
    if (spotName === "Montauk") return "Suffolk County, NY";
    return "";
  };

  // Split spots into top 3 (photo cards) and bottom 3 (regular cards)
  const topThreeSpotNames = ["Rockaway Beach", "Long Beach", "Lido Beach"];
  const topThreeSpots = sortedSpots.filter((spot) => {
    return topThreeSpotNames.includes(spot.name);
  });
  const bottomThreeSpots = sortedSpots.filter((spot) => {
    return !topThreeSpotNames.includes(spot.name);
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white sticky top-0 z-10 border-b border-black">
        <div className="container mx-auto px-3 sm:px-4 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Logo
                logoSize="h-10 sm:h-12"
                showLink={true}
              />
            </div>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-black">
              {refreshAllMutation.isPending && (
                <RefreshCw className="h-3 w-3 animate-spin text-black" />
              )}
              <button
              onClick={() => refreshAllMutation.mutate()}
              disabled={refreshAllMutation.isPending}
                className="flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${refreshAllMutation.isPending ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-4 sm:py-6 md:py-8 px-3 sm:px-4">
        {isLoading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 sm:h-64 w-full rounded-sm bg-gray-100" style={{ borderRadius: '2px' }} />
              ))}
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-white border-black">
                <CardHeader>
                    <Skeleton className="h-6 w-32 bg-gray-100" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full bg-gray-100" />
                </CardContent>
              </Card>
            ))}
          </div>
          </>
        ) : (
          <>
            {/* Alerts Promo Banner - Show to authenticated users without alerts */}
            {isAuthenticated && alertsQuery.data && alertsQuery.data.length === 0 && (
              <div className="mb-4 sm:mb-6 p-3 bg-gray-50 border-2 border-black flex items-center justify-between">
                <p className="text-xs text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Pro tip: Set up alerts to never miss good conditions
                </p>
                <Link href="/members" className="text-xs text-black font-bold uppercase tracking-wider hover:underline" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Set Up →
                </Link>
              </div>
            )}

            {/* Top 3 Spots - Photo Cards */}
            {topThreeSpots.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
                {topThreeSpots.map((spot) => {
                  const imagePath = getSpotImagePath(spot.name);
                  const region = getSpotRegion(spot.name);
                  const spotDistance = distanceQuery.data?.[spot.name] ?? null;

                  return (
                    <PhotoSpotCard
                      key={spot.id}
                      name={spot.name}
                      region={region}
                      imageSrc={imagePath}
                      onClick={() => setLocation(`/spot/${spot.id}`)}
                      distance={spotDistance}
                      isLoadingDistance={!!userLocation && distanceQuery.isLoading}
                      travelMode="driving"
                    />
                  );
                })}
              </div>
            )}

            {/* Bottom 3 Spots - Photo Cards */}
            {bottomThreeSpots.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {bottomThreeSpots.map((spot) => {
                  const isComingSoon = isComingSoonSpot(spot.name);
                  const imagePath = getSpotImagePath(spot.name);
                  const region = getSpotRegion(spot.name);
                  const spotDistance = distanceQuery.data?.[spot.name] ?? null;

                  return (
                    <div key={spot.id} className="relative">
                      <div className={isComingSoon ? "opacity-50" : ""}>
                        <PhotoSpotCard
                          name={spot.name}
                          region={region}
                          imageSrc={imagePath}
                          onClick={isComingSoon ? undefined : () => setLocation(`/spot/${spot.id}`)}
                          distance={spotDistance}
                          isLoadingDistance={!!userLocation && distanceQuery.isLoading}
                          travelMode="driving"
                        />
                      </div>
                      {isComingSoon && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span
                            className="text-sm font-bold text-white bg-black px-4 py-2 uppercase shadow-lg"
                            style={{
                              borderRadius: '2px',
                              fontFamily: "'JetBrains Mono', monospace",
                              fontWeight: 700,
                              letterSpacing: '1px'
                            }}
                          >
                            Coming Soon
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2025 Year in Review Section */}
            {/* <YearInReview2025 /> */}

            {/* Surf Analysis Card */}
            <div className="relative mt-6 sm:mt-8 md:mt-12 mb-4 sm:mb-6 md:mb-8">
              <GateOverlay
                locked={showGuideGate}
                title="Unlock our 5-Year Swell Study"
                description="Wave Intelligence is reserved for members. Join the lineup to unlock the full analysis."
                ctaLabel="Enter Email to Unlock Full Analysis"
                onUnlock={unlockGuide}
                overlayClassName="items-center justify-center"
              >
                <Card
                  id="surf-analysis-card"
                  className={`bg-white border-2 border-black rounded-none shadow-lg overflow-hidden group transition-all duration-300 p-0 ${showGuideGate ? "" : "cursor-pointer hover:scale-[1.02] hover:shadow-xl"}`}
                  style={{ borderRadius: '2px' }}
                  onClick={showGuideGate ? undefined : () => setLocation("/surf-analysis")}
                >
                  {/* Header Section */}
                  <div className="bg-gray-50 px-4 sm:px-6 md:px-8 lg:px-12 py-6 sm:py-8 md:py-10 lg:py-12 border-b-2 border-black">
                    {/* GUIDE Badge */}
                    <div className="mb-4 sm:mb-6">
                      <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-black text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '2px' }}>
                        GUIDE
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-black mb-3 sm:mb-4 leading-tight tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                      When Western Long Island Surf Actually Works
                    </h2>
                    <div className="text-xs sm:text-sm md:text-base text-gray-700 font-semibold" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                      An analysis based on five years of historical swell data
                    </div>
                  </div>

                  <CardContent className="px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 md:py-8 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm sm:text-base md:text-lg text-gray-700 mb-3 sm:mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        We tracked every surfable day on Western Long Island over the last five years, using Lido Beach as a baseline. Here's what the numbers say.
                        </p>
                        <div className="text-xs sm:text-sm text-black uppercase tracking-wider transition-colors group-hover:text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Click to read full analysis →
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-black ml-3 sm:ml-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </GateOverlay>
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && (!spotsQuery.data || spotsQuery.data.length === 0) && (
          <Card className="bg-white border-black">
            <CardContent className="py-12 text-center">
              <Waves className="h-12 w-12 text-black mx-auto mb-4" />
              <h3 className="text-lg font-medium text-black mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>No spots configured</h3>
              <p className="text-black">Add surf spots to start tracking forecasts.</p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
