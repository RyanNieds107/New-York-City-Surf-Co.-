import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Waves, Wind, Clock, ArrowRight, Navigation, Droplets, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { SpotCard } from "@/components/SpotCard";
import { PhotoSpotCard } from "@/components/PhotoSpotCard";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";

export default function Dashboard() {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const spotsQuery = trpc.spots.list.useQuery(undefined, {
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
  });
  const forecastsQuery = trpc.forecasts.listAll.useQuery();
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

  // Create a map of spotId -> forecast for easy lookup
  const forecastMap = new Map(
    (forecastsQuery.data || []).map((f) => [f.spotId, f])
  );

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

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

  const formatWaveHeight = (tenthsFt: number) => {
    const feet = tenthsFt / 10;
    return `${feet.toFixed(1)} ft`;
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
        return "↑";
      case "falling":
        return "↓";
      case "high":
        return "⬆";
      case "low":
        return "⬇";
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

  const getWindDirectionArrow = (degrees: number | null) => {
    if (degrees === null) return null;
    // Wind direction is where wind comes FROM, so arrow points opposite
    const rotation = (degrees + 180) % 360;
    return (
      <Navigation
        className="h-4 w-4"
        style={{ transform: `rotate(${rotation}deg)` }}
      />
    );
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

  const formatPeriodSummary = (): string => {
    // Period data is not currently in forecast, return placeholder
    // TODO: Add period to forecast response or fetch separately
    return "N/A";
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

  // Auto-refresh interval (from env or default 3 hours)
  const refreshIntervalHours = 3;

  // Map spot names for display (handles legacy database names)
  const getDisplayName = (spotName: string): string => {
    if (spotName === "Ditch Plains") return "Montauk";
    if (spotName === "Lincoln Blvd") return "Belmar";
    return spotName;
  };

  // Custom sort order for spots (using display names)
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
    const displayNameA = getDisplayName(a.name);
    const displayNameB = getDisplayName(b.name);
    const indexA = spotOrder.indexOf(displayNameA);
    const indexB = spotOrder.indexOf(displayNameB);
    // If both are in the order list, sort by their position
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // If only one is in the list, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    // If neither is in the list, sort alphabetically
    return displayNameA.localeCompare(displayNameB);
  }) : [];

  // Check if spot should show "Coming Soon"
  const isComingSoonSpot = (spotName: string) => {
    const displayName = getDisplayName(spotName);
    return displayName === "Gilgo Beach" || 
           displayName === "Belmar" || 
           displayName === "Montauk";
  };

  // Get image path for a spot
  const getSpotImagePath = (spotName: string): string => {
    const displayName = getDisplayName(spotName);
    if (displayName === "Rockaway Beach") return "/Rockaway.avif";
    if (displayName === "Long Beach") return "/Long Beach.webp";
    if (displayName === "Lido Beach") return "/Lido-beach.jpg";
    if (displayName === "Gilgo Beach") return "/Gilgo Beach.jpg";
    if (displayName === "Belmar") return "/Belmar.jpg";
    if (displayName === "Montauk") return "/Montauk.jpg";
    return "";
  };

  // Get region for a spot
  const getSpotRegion = (spotName: string): string => {
    const displayName = getDisplayName(spotName);
    if (displayName === "Rockaway Beach") return "Queens, NY";
    if (displayName === "Long Beach") return "Nassau County, NY";
    if (displayName === "Lido Beach") return "Nassau County, NY";
    if (displayName === "Gilgo Beach") return "Suffolk County, NY";
    if (displayName === "Belmar") return "Monmouth County, NJ";
    if (displayName === "Montauk") return "Suffolk County, NY";
    return "";
  };

  // Split spots into top 3 (photo cards) and bottom 3 (regular cards)
  const topThreeSpotNames = ["Rockaway Beach", "Long Beach", "Lido Beach"];
  const topThreeSpots = sortedSpots.filter((spot) => {
    const displayName = getDisplayName(spot.name);
    return topThreeSpotNames.includes(displayName);
  });
  const bottomThreeSpots = sortedSpots.filter((spot) => {
    const displayName = getDisplayName(spot.name);
    return !topThreeSpotNames.includes(displayName);
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white sticky top-0 z-10">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="h-6 w-6 text-black" />
              <div>
                <Link href="/">
                  <h1 className="text-2xl font-bold text-black hover:text-black/80 cursor-pointer transition-colors" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    New York City Surf Co.
                  </h1>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-black">
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
        <div className="border-b border-black"></div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        {/* Stats Overview - KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="border-t border-b border-black py-4">
            <div className="flex justify-center">
              <div className="text-left">
                <p className="text-xs uppercase tracking-wider text-gray-600 mb-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  Spots Tracked
                </p>
                <p className="text-3xl font-bold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                  {spotsQuery.data?.length || 0}
                </p>
              </div>
            </div>
                </div>
          <div className="border-t border-b border-black py-4">
            <div className="flex justify-center">
              <div className="text-left">
                <p className="text-xs uppercase tracking-wider text-gray-600 mb-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  Best Conditions
                </p>
                <p className="text-3xl font-bold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                    {forecastsQuery.data?.length
                      ? forecastsQuery.data.reduce((best, f) =>
                          f.probabilityScore > best.probabilityScore ? f : best
                      ).spot?.name || "—"
                    : "—"}
                  </p>
                </div>
              </div>
                </div>
          <div className="border-t border-b border-black py-4">
            <div className="flex justify-center">
              <div className="text-left">
                <p className="text-xs uppercase tracking-wider text-gray-600 mb-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  Last Update
                </p>
                <p className="text-3xl font-bold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
                    {forecastsQuery.data?.[0]?.createdAt
                      ? formatTimestamp(forecastsQuery.data[0].createdAt)
                    : "—"}
                  </p>
                </div>
              </div>
          </div>
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full rounded-sm bg-gray-100" style={{ borderRadius: '2px' }} />
              ))}
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            {/* Top 3 Spots - Photo Cards */}
            {topThreeSpots.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {topThreeSpots.map((spot) => {
                  const displayName = getDisplayName(spot.name);
                  const imagePath = getSpotImagePath(spot.name);
                  const region = getSpotRegion(spot.name);

                  return (
                    <PhotoSpotCard
                      key={spot.id}
                      name={displayName}
                      region={region}
                      imageSrc={imagePath}
                      onClick={() => setLocation(`/spot/${spot.id}`)}
                    />
                  );
                })}
              </div>
            )}

            {/* Bottom 3 Spots - Photo Cards */}
            {bottomThreeSpots.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bottomThreeSpots.map((spot) => {
                  const isComingSoon = isComingSoonSpot(spot.name);
                  const displayName = getDisplayName(spot.name);
                  const imagePath = getSpotImagePath(spot.name);
                  const region = getSpotRegion(spot.name);

              return (
                    <div key={spot.id} className="relative">
                      <div className={isComingSoon ? "opacity-50" : ""}>
                        <PhotoSpotCard
                          name={displayName}
                          region={region}
                          imageSrc={imagePath}
                          onClick={isComingSoon ? undefined : () => setLocation(`/spot/${spot.id}`)}
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

            {/* Surf Analysis Card */}
            <Card 
              id="surf-analysis-card" 
              className="bg-white border-2 border-black rounded-none shadow-lg mt-12 mb-8 overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl p-0"
              style={{ borderRadius: '2px' }}
              onClick={() => setLocation("/surf-analysis")}
            >
              {/* Header Section */}
              <div className="bg-gray-50 px-8 md:px-12 py-10 md:py-12 border-b-2 border-black">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-black mb-4 leading-tight tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  When Western Long Island Surf Actually Works
                </h2>
                <div className="text-sm md:text-base text-gray-700 font-semibold" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  An analysis based on five years of historical swell data
                </div>
              </div>

              <CardContent className="px-8 md:px-12 py-6 md:py-8 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-base md:text-lg text-gray-700 mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    We tracked every surfable day on Western Long Island over the last five years, using Lido Beach as a baseline. Here's what the numbers say.
                    </p>
                    <div className="text-sm text-black uppercase tracking-wider transition-colors group-hover:text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Click to read full analysis →
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-black ml-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
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
