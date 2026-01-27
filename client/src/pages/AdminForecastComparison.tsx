import { useState, useEffect, useMemo } from "react";
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
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, Clock, Download, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Spots that are "Coming Soon" and should be excluded from admin views
const EXCLUDED_SPOT_NAMES = ["Belmar", "Gilgo Beach", "Montauk"];

interface ComparisonRow {
  time: string;
  openMeteoHeightFt: number | null;
  stormglassHeightFt: number | null;
  stormglassSwellHeightFt?: number | null;
  differenceFt: number | null;
  confidence: string | null;
  // Open-Meteo swell details
  swellPeriodS: number | null;
  swellDirectionDeg: number | null;
  // Stormglass swell details
  stormglassPeriodS?: number | null;
  stormglassDirectionDeg?: number | null;
}

interface DayGroup {
  dateKey: string;
  displayDate: string;
  isToday: boolean;
  rows: ComparisonRow[];
  avgDifference: number | null;
  confidenceSummary: { high: number; med: number; low: number; noData: number };
}

export default function AdminForecastComparison() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Fetch all spots for the dropdown
  const spotsQuery = trpc.spots.list.useQuery();

  // Filter out excluded spots (Coming Soon spots that don't have active forecasts)
  const activeSpots = spotsQuery.data?.filter(
    (spot) => !EXCLUDED_SPOT_NAMES.includes(spot.name)
  ) ?? [];

  // Fetch comparison data for selected spot
  const comparisonQuery = trpc.admin.forecasts.getComparison.useQuery(
    { spotId: selectedSpotId! },
    {
      enabled: !!user && user.role === "admin" && selectedSpotId !== null,
    }
  );

  // Manual Stormglass fetch trigger
  const triggerFetchMutation = trpc.admin.forecasts.triggerStormglassFetch.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      comparisonQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to fetch Stormglass data");
    },
  });

  // Group comparison data by day
  const groupedByDay = useMemo((): DayGroup[] => {
    if (!comparisonQuery.data?.comparison) return [];

    const today = new Date().toDateString();
    const groups = new Map<string, ComparisonRow[]>();

    for (const row of comparisonQuery.data.comparison) {
      const date = new Date(row.time);
      const dateKey = date.toDateString();
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(row);
    }

    return Array.from(groups.entries()).map(([dateKey, rows]) => {
      const date = new Date(rows[0].time);
      const isToday = dateKey === today;

      // Calculate summary stats
      const differences = rows.filter(r => r.differenceFt !== null).map(r => r.differenceFt!);
      const avgDifference = differences.length > 0
        ? differences.reduce((a, b) => a + b, 0) / differences.length
        : null;

      const confidenceSummary = {
        high: rows.filter(r => r.confidence === "HIGH").length,
        med: rows.filter(r => r.confidence === "MED").length,
        low: rows.filter(r => r.confidence === "LOW").length,
        noData: rows.filter(r => r.confidence === null).length,
      };

      return {
        dateKey,
        displayDate: date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        isToday,
        rows,
        avgDifference,
        confidenceSummary,
      };
    });
  }, [comparisonQuery.data?.comparison]);

  // Auto-expand today's data
  useEffect(() => {
    if (groupedByDay.length > 0) {
      const todayGroup = groupedByDay.find(g => g.isToday);
      if (todayGroup) {
        setExpandedDays(new Set([todayGroup.dateKey]));
      } else {
        // Expand first day if today not found
        setExpandedDays(new Set([groupedByDay[0].dateKey]));
      }
    }
  }, [groupedByDay]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-select first active spot when spots load
  useEffect(() => {
    if (activeSpots.length > 0 && selectedSpotId === null) {
      setSelectedSpotId(activeSpots[0].id);
    }
  }, [activeSpots, selectedSpotId]);

  const toggleDay = (dateKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedDays(new Set(groupedByDay.map(g => g.dateKey)));
  };

  const collapseAll = () => {
    setExpandedDays(new Set());
  };

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
      hour12: true,
    });
  };

  const formatLastFetch = (date: Date | string | null): string => {
    if (!date) return "Never";
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getConfidenceBadge = (confidence: string | null, compact = false) => {
    if (!confidence) {
      return compact ? <span className="text-gray-400">—</span> : <Badge variant="outline" className="text-gray-400">No Data</Badge>;
    }
    switch (confidence) {
      case "HIGH":
        return compact ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            HIGH
          </Badge>
        );
      case "MED":
        return compact ? (
          <span className="text-gray-500">•</span>
        ) : (
          <Badge variant="secondary">MED</Badge>
        );
      case "LOW":
        return compact ? (
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        ) : (
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
    if (diff < 0.5) return "text-green-600";
    if (diff < 1.5) return "text-gray-600";
    return "text-yellow-600";
  };

  const getConfidenceSummaryBadge = (summary: DayGroup["confidenceSummary"]) => {
    const total = summary.high + summary.med + summary.low;
    if (total === 0) return <Badge variant="outline">No Data</Badge>;

    if (summary.high > summary.low && summary.high >= summary.med) {
      return <Badge className="bg-green-600">{summary.high} HIGH</Badge>;
    } else if (summary.low > 0) {
      return <Badge className="bg-yellow-500 text-black">{summary.low} LOW</Badge>;
    }
    return <Badge variant="secondary">{summary.med} MED</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Forecast Comparison</h1>
          <p className="text-gray-600">Compare Open-Meteo vs Stormglass (ECMWF) forecasts - 7 Day View</p>
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
                    {activeSpots.map((spot) => (
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
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (selectedSpotId) {
                    triggerFetchMutation.mutate({ spotId: selectedSpotId });
                  }
                }}
                disabled={triggerFetchMutation.isPending || !selectedSpotId}
              >
                {triggerFetchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Fetch Stormglass (7 days)
              </Button>
              {groupedByDay.length > 0 && (
                <>
                  <Button variant="ghost" size="sm" onClick={expandAll}>
                    Expand All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={collapseAll}>
                    Collapse All
                  </Button>
                </>
              )}
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

        {/* Loading State */}
        {(comparisonQuery.isLoading || comparisonQuery.isFetching) && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {!comparisonQuery.isLoading && !comparisonQuery.isFetching && groupedByDay.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {selectedSpotId === null
                  ? "Select a spot to view comparison"
                  : "No comparison data available. Click 'Fetch Stormglass' to load data."}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Day-by-Day Comparison */}
        {groupedByDay.map((dayGroup) => (
          <Card key={dayGroup.dateKey} className="mb-4">
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleDay(dayGroup.dateKey)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedDays.has(dayGroup.dateKey) ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                  <CardTitle className="text-lg">
                    {dayGroup.displayDate}
                    {dayGroup.isToday && (
                      <Badge variant="outline" className="ml-2">Today</Badge>
                    )}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {dayGroup.avgDifference !== null && (
                    <span className={getDifferenceColor(dayGroup.avgDifference)}>
                      Avg diff: {dayGroup.avgDifference.toFixed(1)}ft
                    </span>
                  )}
                  {getConfidenceSummaryBadge(dayGroup.confidenceSummary)}
                  <span className="text-gray-500">{dayGroup.rows.length} hours</span>
                </div>
              </div>
            </CardHeader>

            {expandedDays.has(dayGroup.dateKey) && (
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[70px]">Time</TableHead>
                        <TableHead className="text-right">OM Ht</TableHead>
                        <TableHead className="text-right">SG Ht</TableHead>
                        <TableHead className="text-right">Diff</TableHead>
                        <TableHead className="text-right">OM Per</TableHead>
                        <TableHead className="text-right">SG Per</TableHead>
                        <TableHead className="text-right">OM Dir</TableHead>
                        <TableHead className="text-right">SG Dir</TableHead>
                        <TableHead className="text-center w-[50px]">Conf</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayGroup.rows.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{formatTime(row.time)}</TableCell>
                          <TableCell className="text-right">
                            {row.openMeteoHeightFt !== null
                              ? `${row.openMeteoHeightFt.toFixed(1)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.stormglassHeightFt !== null
                              ? `${row.stormglassHeightFt.toFixed(1)}`
                              : "—"}
                          </TableCell>
                          <TableCell className={`text-right ${getDifferenceColor(row.differenceFt)}`}>
                            {row.differenceFt !== null
                              ? `${row.differenceFt.toFixed(1)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.swellPeriodS !== null ? `${row.swellPeriodS}s` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.stormglassPeriodS !== null ? `${row.stormglassPeriodS}s` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.swellDirectionDeg !== null ? `${row.swellDirectionDeg}°` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.stormglassDirectionDeg !== null ? `${row.stormglassDirectionDeg}°` : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {getConfidenceBadge(row.confidence, true)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {/* Legend */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3">Confidence Legend</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">HIGH - Models agree within 0.5ft</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-lg">•</span>
                <span className="text-gray-600">MED - Models agree within 1.5ft</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-gray-600">LOW - Models disagree by more than 1.5ft</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
