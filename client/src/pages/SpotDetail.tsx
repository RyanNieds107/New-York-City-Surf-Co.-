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
  Timer,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import { getLoginUrl } from "@/const";

export default function SpotDetail() {
  const params = useParams<{ id: string }>();
  const spotId = parseInt(params.id || "0", 10);

  const { user, isAuthenticated } = useAuth();
  const [crowdLevel, setCrowdLevel] = useState(3);

  const spotQuery = trpc.spots.get.useQuery({ id: spotId });
  const forecastQuery = trpc.forecasts.getForSpot.useQuery({ spotId });
  const crowdQuery = trpc.crowd.getForSpot.useQuery({ spotId });

  const refreshMutation = trpc.forecasts.refresh.useMutation({
    onSuccess: () => {
      toast.success("Forecast refreshed!");
      forecastQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to refresh: ${error.message}`);
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
  const isLoading = spotQuery.isLoading || forecastQuery.isLoading;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    if (score >= 20) return "Poor";
    return "Flat";
  };

  const getConfidenceBadge = (band: string) => {
    switch (band) {
      case "High":
        return <Badge className="bg-green-600">High Confidence</Badge>;
      case "Medium":
        return <Badge className="bg-yellow-600 text-white">Medium Confidence</Badge>;
      default:
        return <Badge variant="outline" className="border-red-500 text-red-500">Low Confidence</Badge>;
    }
  };

  const formatWaveHeight = (tenthsFt: number) => {
    const feet = tenthsFt / 10;
    return `${feet.toFixed(1)} ft`;
  };

  const getCrowdLabel = (level: number) => {
    const labels = ["", "Empty", "Light", "Moderate", "Crowded", "Packed"];
    return labels[level] || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="container max-w-4xl">
          <Skeleton className="h-8 w-48 bg-slate-700 mb-8" />
          <Skeleton className="h-64 w-full bg-slate-700" />
        </div>
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="container max-w-4xl text-center">
          <Waves className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Spot Not Found</h1>
          <p className="text-slate-400 mb-6">The surf spot you're looking for doesn't exist.</p>
          <Link href="/">
            <Button variant="outline" className="border-cyan-500 text-cyan-400">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">{spot.name}</h1>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {spot.latitude}, {spot.longitude}
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => refreshMutation.mutate({ spotId })}
              disabled={refreshMutation.isPending}
              variant="outline"
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl py-8">
        {forecast ? (
          <div className="space-y-6">
            {/* Main Score Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Score Circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-32 h-32 rounded-full flex items-center justify-center ${getScoreColor(
                        forecast.probabilityScore
                      )}`}
                    >
                      <div className="text-center">
                        <span className="text-4xl font-bold text-white">{forecast.probabilityScore}</span>
                        <span className="text-lg text-white/80">%</span>
                      </div>
                    </div>
                    <p className="mt-3 text-lg font-medium text-white">
                      {getScoreLabel(forecast.probabilityScore)}
                    </p>
                    <div className="mt-2">{getConfidenceBadge(forecast.confidenceBand)}</div>
                  </div>

                  {/* Details Grid */}
                  <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Waves className="h-4 w-4" />
                        <span className="text-sm">Wave Height</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {formatWaveHeight(forecast.waveHeightTenthsFt)}
                      </p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">Updated</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {new Date(forecast.createdAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-cyan-400 mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm">Intermediate</span>
                      </div>
                      <p className="text-2xl font-bold text-cyan-400">{forecast.usabilityIntermediate}%</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-purple-400 mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm">Advanced</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-400">{forecast.usabilityAdvanced}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Spot Info */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Compass className="h-5 w-5 text-cyan-400" />
                  Spot Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Buoy ID</p>
                    <p className="text-white font-medium">{spot.buoyId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Tide Station</p>
                    <p className="text-white font-medium">{spot.tideStationId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Ideal Swell</p>
                    <p className="text-white font-medium">
                      {spot.idealSwellDirMin}° - {spot.idealSwellDirMax}°
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Bathymetry</p>
                    <p className="text-white font-medium">{spot.bathymetryFactor}/10</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Crowd Report Section */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-400" />
                  Crowd Report
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {crowdQuery.data?.averageLevel
                    ? `Current average: ${getCrowdLabel(crowdQuery.data.averageLevel)} (${crowdQuery.data.reports.length} reports)`
                    : "No recent reports. Be the first to report!"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAuthenticated ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-400">How crowded is it?</span>
                        <span className="text-sm font-medium text-white">{getCrowdLabel(crowdLevel)}</span>
                      </div>
                      <Slider
                        value={[crowdLevel]}
                        onValueChange={(v) => setCrowdLevel(v[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between mt-1 text-xs text-slate-500">
                        <span>Empty</span>
                        <span>Packed</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => submitCrowdMutation.mutate({ spotId, crowdLevel })}
                      disabled={submitCrowdMutation.isPending}
                      className="w-full bg-cyan-600 hover:bg-cyan-700"
                    >
                      {submitCrowdMutation.isPending ? "Submitting..." : "Submit Report"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-400 mb-4">Sign in to submit crowd reports</p>
                    <a href={getLoginUrl()}>
                      <Button variant="outline" className="border-cyan-500 text-cyan-400">
                        Sign In
                      </Button>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <Waves className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Forecast Data</h3>
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

      {/* Footer */}
      <footer className="border-t border-slate-700 py-6 mt-auto">
        <div className="container text-center text-sm text-slate-500">
          <p>Data sourced from NOAA NDBC and Tides & Currents</p>
        </div>
      </footer>
    </div>
  );
}
