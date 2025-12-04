import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Waves, Wind, Clock, Users, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Dashboard() {
  const spotsQuery = trpc.spots.list.useQuery();
  const forecastsQuery = trpc.forecasts.listAll.useQuery();
  const refreshAllMutation = trpc.forecasts.refreshAll.useMutation({
    onSuccess: () => {
      toast.success("All forecasts refreshed!");
      forecastsQuery.refetch();
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Waves className="h-8 w-8 text-cyan-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">LI Surf Forecast</h1>
                <p className="text-sm text-slate-400">Long Island, NY</p>
              </div>
            </div>
            <Button
              onClick={() => refreshAllMutation.mutate()}
              disabled={refreshAllMutation.isPending}
              variant="outline"
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshAllMutation.isPending ? "animate-spin" : ""}`} />
              Refresh All
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-cyan-500/20">
                  <Waves className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Spots Tracked</p>
                  <p className="text-2xl font-bold text-white">{spotsQuery.data?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <Wind className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Best Conditions</p>
                  <p className="text-2xl font-bold text-white">
                    {forecastsQuery.data?.length
                      ? forecastsQuery.data.reduce((best, f) =>
                          f.probabilityScore > best.probabilityScore ? f : best
                        ).spot?.name || "N/A"
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-500/20">
                  <Clock className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Last Updated</p>
                  <p className="text-2xl font-bold text-white">
                    {forecastsQuery.data?.[0]?.createdAt
                      ? formatTimestamp(forecastsQuery.data[0].createdAt)
                      : "Never"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Spot Cards */}
        <h2 className="text-xl font-semibold text-white mb-4">Surf Spots</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <Skeleton className="h-6 w-32 bg-slate-700" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full bg-slate-700" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spotsQuery.data?.map((spot) => {
              const forecast = forecastMap.get(spot.id);
              return (
                <Link key={spot.id} href={`/spot/${spot.id}`}>
                  <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-colors cursor-pointer group">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-white group-hover:text-cyan-400 transition-colors">
                          {spot.name}
                        </CardTitle>
                        <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {forecast ? (
                        <div className="space-y-4">
                          {/* Score Circle */}
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-16 h-16 rounded-full flex items-center justify-center ${getScoreColor(
                                forecast.probabilityScore
                              )}`}
                            >
                              <span className="text-2xl font-bold text-white">
                                {forecast.probabilityScore}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm text-slate-400">Score Probability</p>
                              {getConfidenceBadge(forecast.confidenceBand)}
                            </div>
                          </div>

                          {/* Wave Height */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Wave Height</span>
                            <span className="text-white font-medium">
                              {formatWaveHeight(forecast.waveHeightTenthsFt)}
                            </span>
                          </div>

                          {/* Usability Scores */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
                            <div className="text-center">
                              <p className="text-xs text-slate-500">Intermediate</p>
                              <p className="text-lg font-semibold text-cyan-400">
                                {forecast.usabilityIntermediate}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-slate-500">Advanced</p>
                              <p className="text-lg font-semibold text-purple-400">
                                {forecast.usabilityAdvanced}%
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-slate-400">No forecast data</p>
                          <p className="text-xs text-slate-500 mt-1">Click "Refresh All" to generate</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!spotsQuery.data || spotsQuery.data.length === 0) && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <Waves className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No spots configured</h3>
              <p className="text-slate-400">Add surf spots to start tracking forecasts.</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-6 mt-auto">
        <div className="container text-center text-sm text-slate-500">
          <p>Data sourced from NOAA NDBC and Tides & Currents</p>
          <p className="mt-1">Long Island Surf Forecast MVP</p>
        </div>
      </footer>
    </div>
  );
}
