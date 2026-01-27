import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminForecastComparison() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);

  // Fetch all spots for the dropdown
  const spotsQuery = trpc.spots.list.useQuery();

  // Fetch comparison data for selected spot
  const comparisonQuery = trpc.admin.forecasts.getComparison.useQuery(
    { spotId: selectedSpotId! },
    {
      enabled: !!user && user.role === "admin" && selectedSpotId !== null,
    }
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-select first spot when spots load
  useEffect(() => {
    if (spotsQuery.data && spotsQuery.data.length > 0 && selectedSpotId === null) {
      setSelectedSpotId(spotsQuery.data[0].id);
    }
  }, [spotsQuery.data, selectedSpotId]);

  // Check if user is admin
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              You must be an admin to access this page.
            </p>
            <Button onClick={() => setLocation("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatLastFetch = (date: Date | string | null): string => {
    if (!date) return "Never";
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  };

  const getConfidenceBadge = (confidence: string | null) => {
    if (!confidence) {
      return <Badge variant="outline" className="text-gray-400">No Data</Badge>;
    }
    switch (confidence) {
      case "HIGH":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            HIGH
          </Badge>
        );
      case "MED":
        return <Badge variant="secondary">MED</Badge>;
      case "LOW":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">
            <AlertTriangle className="h-3 w-3 mr-1" />
            LOW
          </Badge>
        );
      default:
        return <Badge variant="outline">{confidence}</Badge>;
    }
  };

  const getDifferenceColor = (diff: number | null): string => {
    if (diff === null) return "text-gray-400";
    if (diff < 0.5) return "text-green-600 font-medium";
    if (diff < 1.5) return "text-gray-600";
    return "text-yellow-600 font-medium";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Forecast Comparison</h1>
          <p className="text-gray-600">Compare Open-Meteo vs Stormglass (ECMWF) forecasts</p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Spot:</span>
                <Select
                  value={selectedSpotId?.toString() ?? ""}
                  onValueChange={(value) => setSelectedSpotId(parseInt(value))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select a spot" />
                  </SelectTrigger>
                  <SelectContent>
                    {spotsQuery.data?.map((spot) => (
                      <SelectItem key={spot.id} value={spot.id.toString()}>
                        {spot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => comparisonQuery.refetch()}
                disabled={comparisonQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${comparisonQuery.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stormglass Status */}
        {comparisonQuery.data && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Last Stormglass Fetch:</span>
                  <span className="font-medium">
                    {formatLastFetch(comparisonQuery.data.lastStormglassFetch)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Stormglass Points:</span>
                  <Badge variant="outline">{comparisonQuery.data.stormglassPointCount}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Open-Meteo Points:</span>
                  <Badge variant="outline">{comparisonQuery.data.openMeteoPointCount}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {comparisonQuery.data?.spot?.name ?? "Select a Spot"} - Hour by Hour Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comparisonQuery.isLoading || comparisonQuery.isFetching ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !comparisonQuery.data || comparisonQuery.data.comparison.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {selectedSpotId === null
                  ? "Select a spot to view comparison"
                  : "No comparison data available"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead className="w-[100px]">Time</TableHead>
                      <TableHead className="text-right">Open-Meteo (ft)</TableHead>
                      <TableHead className="text-right">Stormglass (ft)</TableHead>
                      <TableHead className="text-right">Difference</TableHead>
                      <TableHead className="text-center">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonQuery.data.comparison.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{formatDate(row.time)}</TableCell>
                        <TableCell>{formatTime(row.time)}</TableCell>
                        <TableCell className="text-right">
                          {row.openMeteoHeightFt !== null
                            ? row.openMeteoHeightFt.toFixed(1)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.stormglassHeightFt !== null
                            ? row.stormglassHeightFt.toFixed(1)
                            : "—"}
                        </TableCell>
                        <TableCell className={`text-right ${getDifferenceColor(row.differenceFt)}`}>
                          {row.differenceFt !== null
                            ? row.differenceFt.toFixed(1)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {getConfidenceBadge(row.confidence)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3">Confidence Legend</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600">HIGH</Badge>
                <span className="text-gray-600">Models agree within 0.5ft</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">MED</Badge>
                <span className="text-gray-600">Models agree within 1.5ft</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-500 text-black">LOW</Badge>
                <span className="text-gray-600">Models disagree by more than 1.5ft</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
