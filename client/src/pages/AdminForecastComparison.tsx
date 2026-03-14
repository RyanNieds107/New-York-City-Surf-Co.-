import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, RefreshCw, AlertTriangle, Clock, Download, ChevronDown, ChevronRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";

// Spots that are "Coming Soon" and should be excluded from admin views
const EXCLUDED_SPOT_NAMES = ["Belmar", "Gilgo Beach"];

const monoStyle = { fontFamily: "'JetBrains Mono', monospace" };
const bebasStyle = { fontFamily: "'Bebas Neue', sans-serif" };
const oswaldStyle = { fontFamily: "'Oswald', sans-serif" };

interface ComparisonRow {
  time: string;
  openMeteoHeightFt: number | null;
  stormglassHeightFt: number | null;
  stormglassSwellHeightFt?: number | null;
  differenceFt: number | null;
  confidence: string | null;
  swellPeriodS: number | null;
  swellDirectionDeg: number | null;
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
  const [hoursAhead, setHoursAhead] = useState<number>(168);

  const spotsQuery = trpc.spots.list.useQuery();

  const activeSpots = spotsQuery.data?.filter(
    (spot) => !EXCLUDED_SPOT_NAMES.includes(spot.name)
  ) ?? [];

  const comparisonQuery = trpc.admin.forecasts.getComparison.useQuery(
    { spotId: selectedSpotId!, hoursAhead },
    {
      enabled: !!user && user.role === "admin" && selectedSpotId !== null,
    }
  );

  const triggerFetchMutation = trpc.admin.forecasts.triggerStormglassFetch.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      comparisonQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to fetch Stormglass data");
    },
  });

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

  useEffect(() => {
    if (groupedByDay.length > 0) {
      const todayGroup = groupedByDay.find(g => g.isToday);
      if (todayGroup) {
        setExpandedDays(new Set([todayGroup.dateKey]));
      } else {
        setExpandedDays(new Set([groupedByDay[0].dateKey]));
      }
    }
  }, [groupedByDay]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  const expandAll = () => setExpandedDays(new Set(groupedByDay.map(g => g.dateKey)));
  const collapseAll = () => setExpandedDays(new Set());

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="border-2 border-white p-8 max-w-md w-full mx-4 text-center">
          <h1 className="text-4xl text-white mb-4" style={bebasStyle}>ACCESS DENIED</h1>
          <p className="text-gray-400 mb-6" style={monoStyle}>You must be an admin to access this page.</p>
          <button
            onClick={() => setLocation("/dashboard")}
            className="bg-white text-black px-6 py-2 font-bold uppercase tracking-widest text-sm hover:bg-gray-200"
            style={monoStyle}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
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

  const getDifferenceColor = (diff: number | null): string => {
    if (diff === null) return "text-gray-500";
    if (diff < 0.5) return "text-green-400";
    if (diff < 1.5) return "text-gray-300";
    return "text-yellow-400";
  };

  const getConfidenceDisplay = (confidence: string | null, compact = false) => {
    if (!confidence) return <span className="text-gray-600" style={monoStyle}>—</span>;
    switch (confidence) {
      case "HIGH":
        return compact
          ? <CheckCircle className="h-3.5 w-3.5 text-green-400" />
          : <span className="text-green-400 text-xs font-bold" style={monoStyle}>HIGH</span>;
      case "MED":
        return compact
          ? <span className="text-gray-400 text-xs" style={monoStyle}>•</span>
          : <span className="text-gray-400 text-xs font-bold" style={monoStyle}>MED</span>;
      case "LOW":
        return compact
          ? <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
          : <span className="text-yellow-400 text-xs font-bold" style={monoStyle}>LOW</span>;
      default:
        return <span className="text-gray-500 text-xs" style={monoStyle}>{confidence}</span>;
    }
  };

  const getConfidenceSummaryLabel = (summary: DayGroup["confidenceSummary"]) => {
    const total = summary.high + summary.med + summary.low;
    if (total === 0) return <span className="text-gray-600 text-xs" style={monoStyle}>NO DATA</span>;

    if (summary.low > 0) {
      return (
        <span className="text-yellow-400 text-xs font-bold px-2 py-0.5 border border-yellow-400" style={monoStyle}>
          {summary.low} LOW
        </span>
      );
    }
    if (summary.high >= summary.med) {
      return (
        <span className="text-green-400 text-xs font-bold px-2 py-0.5 border border-green-400" style={monoStyle}>
          {summary.high} HIGH
        </span>
      );
    }
    return (
      <span className="text-gray-400 text-xs font-bold px-2 py-0.5 border border-gray-400" style={monoStyle}>
        {summary.med} MED
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b-2 border-white px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-5xl sm:text-6xl text-white leading-none" style={bebasStyle}>
                FORECAST COMPARISON
              </h1>
              <p className="text-gray-400 text-xs mt-2 max-w-2xl" style={monoStyle}>
                Open-Meteo vs Stormglass (ECMWF) — 7 day view. Differences ≥1ft trigger the forecast warning on the spot page.
              </p>
            </div>
            <button
              onClick={() => setLocation("/dashboard")}
              className="text-gray-500 hover:text-white text-xs uppercase tracking-widest flex-shrink-0 mt-1"
              style={monoStyle}
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-4">

        {/* Controls */}
        <div className="border border-white/20 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-3">

            {/* Spot selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-gray-500" style={monoStyle}>Spot:</span>
              <div className="relative">
                <select
                  value={selectedSpotId?.toString() ?? ""}
                  onChange={(e) => setSelectedSpotId(parseInt(e.target.value))}
                  className="bg-black border border-white/40 text-white text-xs px-3 py-2 pr-8 uppercase tracking-wider appearance-none cursor-pointer hover:border-white focus:outline-none focus:border-white"
                  style={monoStyle}
                >
                  {activeSpots.map((spot) => (
                    <option key={spot.id} value={spot.id.toString()} className="bg-black">
                      {spot.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3 w-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Window selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-gray-500" style={monoStyle}>Window:</span>
              <div className="relative">
                <select
                  value={hoursAhead.toString()}
                  onChange={(e) => setHoursAhead(parseInt(e.target.value))}
                  className="bg-black border border-white/40 text-white text-xs px-3 py-2 pr-8 appearance-none cursor-pointer hover:border-white focus:outline-none focus:border-white"
                  style={monoStyle}
                >
                  {[48, 72, 96, 168].map((v) => (
                    <option key={v} value={v.toString()} className="bg-black">{v} hours</option>
                  ))}
                </select>
                <ChevronDown className="h-3 w-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Refresh */}
            <button
              onClick={() => comparisonQuery.refetch()}
              disabled={comparisonQuery.isFetching}
              className="flex items-center gap-1.5 border border-white/40 text-white text-xs px-3 py-2 hover:bg-white hover:text-black disabled:opacity-40 uppercase tracking-widest transition-colors"
              style={monoStyle}
            >
              <RefreshCw className={`h-3 w-3 ${comparisonQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {/* Fetch Stormglass */}
            <button
              onClick={() => selectedSpotId && triggerFetchMutation.mutate({ spotId: selectedSpotId, hoursAhead })}
              disabled={triggerFetchMutation.isPending || !selectedSpotId}
              className="flex items-center gap-1.5 bg-white text-black text-xs px-3 py-2 font-bold hover:bg-gray-200 disabled:opacity-40 uppercase tracking-widest transition-colors"
              style={monoStyle}
            >
              {triggerFetchMutation.isPending
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Download className="h-3 w-3" />
              }
              Fetch Stormglass (7 days)
            </button>

            {groupedByDay.length > 0 && (
              <>
                <button
                  onClick={expandAll}
                  className="text-gray-400 hover:text-white text-xs uppercase tracking-widest"
                  style={monoStyle}
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="text-gray-400 hover:text-white text-xs uppercase tracking-widest"
                  style={monoStyle}
                >
                  Collapse All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status bar */}
        {comparisonQuery.data && (
          <div className="border border-white/20 px-4 py-3 flex flex-wrap gap-6 text-xs" style={monoStyle}>
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="h-3 w-3" />
              <span className="uppercase tracking-widest text-[10px]">Last SG Fetch:</span>
              <span className="text-white">{formatLastFetch(comparisonQuery.data.lastStormglassFetch)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <span className="uppercase tracking-widest text-[10px]">Stormglass Points:</span>
              <span className="text-white border border-white/30 px-2">{comparisonQuery.data.stormglassPointCount}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <span className="uppercase tracking-widest text-[10px]">Open-Meteo Points:</span>
              <span className="text-white border border-white/30 px-2">{comparisonQuery.data.openMeteoPointCount}</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {(comparisonQuery.isLoading || comparisonQuery.isFetching) && (
          <div className="border border-white/20 p-6 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full bg-white/10" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!comparisonQuery.isLoading && !comparisonQuery.isFetching && groupedByDay.length === 0 && (
          <div className="border border-white/20 py-16 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-widest" style={monoStyle}>
              {selectedSpotId === null
                ? "Select a spot to view comparison"
                : "No data — click Fetch Stormglass to load"}
            </p>
          </div>
        )}

        {/* Day groups */}
        {groupedByDay.map((dayGroup) => (
          <div key={dayGroup.dateKey} className="border border-white/20">
            {/* Day header */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left"
              onClick={() => toggleDay(dayGroup.dateKey)}
            >
              <div className="flex items-center gap-3">
                {expandedDays.has(dayGroup.dateKey)
                  ? <ChevronDown className="h-4 w-4 text-gray-400" />
                  : <ChevronRight className="h-4 w-4 text-gray-400" />
                }
                <span className="text-xl font-semibold tracking-wide" style={oswaldStyle}>
                  {dayGroup.displayDate}
                </span>
                {dayGroup.isToday && (
                  <span className="text-[10px] uppercase tracking-widest bg-white text-black px-2 py-0.5 font-bold" style={monoStyle}>
                    Today
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {dayGroup.avgDifference !== null && (
                  <span className={`text-xs ${getDifferenceColor(dayGroup.avgDifference)}`} style={monoStyle}>
                    Avg diff: {dayGroup.avgDifference.toFixed(1)}ft
                  </span>
                )}
                {getConfidenceSummaryLabel(dayGroup.confidenceSummary)}
                <span className="text-gray-500 text-xs" style={monoStyle}>{dayGroup.rows.length} hours</span>
              </div>
            </button>

            {/* Table */}
            {expandedDays.has(dayGroup.dateKey) && (
              <div className="border-t border-white/20 overflow-x-auto">
                <table className="w-full text-xs" style={monoStyle}>
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Time</th>
                      <th className="text-right px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">OM Wave Ht</th>
                      <th className="text-right px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">SG Wave Ht</th>
                      <th className="text-right px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Diff</th>
                      <th className="text-right px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">OM Per</th>
                      <th className="text-right px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">OM Dir</th>
                      <th className="text-center px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal w-12">Conf</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayGroup.rows.map((row, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-2 text-white">{formatTime(row.time)}</td>
                        <td className="px-4 py-2 text-right text-white">
                          {row.openMeteoHeightFt !== null ? row.openMeteoHeightFt.toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {row.stormglassHeightFt !== null
                            ? <span className="text-white">{row.stormglassHeightFt.toFixed(1)}</span>
                            : row.openMeteoHeightFt !== null
                              ? <span className="text-yellow-600">No SG match</span>
                              : <span className="text-gray-600">—</span>
                          }
                        </td>
                        <td className={`px-4 py-2 text-right ${getDifferenceColor(row.differenceFt)}`}>
                          {row.differenceFt !== null ? row.differenceFt.toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-300">
                          {row.swellPeriodS !== null ? `${row.swellPeriodS}s` : "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-300">
                          {row.swellDirectionDeg !== null ? `${row.swellDirectionDeg}°` : "—"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {getConfidenceDisplay(row.confidence, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {/* Legend */}
        <div className="border border-white/10 px-4 py-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-3" style={monoStyle}>Legend</p>
          <p className="text-xs text-gray-500 mb-3" style={monoStyle}>
            OM = Open-Meteo (our forecast) · SG = Stormglass (ECMWF) · Diff = absolute difference in feet
          </p>
          <div className="flex flex-wrap gap-6 text-xs" style={monoStyle}>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-gray-400">HIGH — agree within 0.5ft</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">•</span>
              <span className="text-gray-400">MED — within 1.5ft</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-yellow-400" />
              <span className="text-gray-400">LOW — disagree by &gt;1.5ft (warning shown on spot page if ≥1ft)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
