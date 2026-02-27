import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, startOfDay, isSameDay } from "date-fns";
import { formatSurfHeight } from "@/lib/forecastUtils";

interface WaveForecastChartProps {
  spotId: number | undefined;
}

type Period = "1D" | "3D" | "7D";

interface DayData {
  label: string;
  waveHeight: number;
  qualityScore: number;
  period: number | null;
  windSpeed: number | null;
  windDir: string;
  ecmwfWaveHeightFt: number | null;
}

const PERIOD_HOURS: Record<Period, number> = {
  "1D": 24,
  "3D": 72,
  "7D": 168,
};

const getBarColor = (score: number) => {
  if (score >= 70) return "#10b981"; // emerald-500
  if (score >= 50) return "#f59e0b"; // amber-500
  return "#9ca3af"; // gray-400
};

const cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const formatCardinal = (deg: number | null | undefined): string => {
  if (deg == null) return "—";
  return cardinals[Math.round(deg / 22.5) % 16];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as DayData;
  return (
    <div
      className="bg-white border-2 border-black p-2.5 text-[10px] uppercase tracking-wide shadow-sm text-gray-900"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <div className="font-bold mb-1">{label}</div>
      <div>Height: {d.waveHeight > 0 ? `${d.waveHeight.toFixed(1)}ft` : "—"}</div>
      {d.ecmwfWaveHeightFt != null && <div className="text-blue-400">Euro: {formatSurfHeight(d.ecmwfWaveHeightFt)}</div>}
      {d.period && <div>Period: {d.period}s</div>}
      {d.windSpeed != null && <div>Wind: {Math.round(d.windSpeed)}mph {d.windDir}</div>}
      <div>Score: {Math.round(d.qualityScore)}</div>
    </div>
  );
};

export function WaveForecastChart({ spotId }: WaveForecastChartProps) {
  const [period, setPeriod] = useState<Period>("7D");

  const { data, isLoading } = trpc.forecasts.getTimeline.useQuery(
    { spotId: spotId!, hours: PERIOD_HOURS[period] },
    { enabled: spotId != null, staleTime: 30 * 60 * 1000 }
  );

  // Aggregate hourly -> daily
  const chartData: DayData[] = (() => {
    if (!data?.timeline?.length) return [];

    if (period === "1D") {
      // Hourly for today: group into 3-hour buckets relative to current time
      const buckets: DayData[] = [];
      const now = Date.now();
      for (let h = 0; h < 24; h += 3) {
        const slice = data.timeline.filter((pt) => {
          const hoursFromNow = (new Date(pt.forecastTimestamp).getTime() - now) / (1000 * 60 * 60);
          return hoursFromNow >= (h === 0 ? -1 : h) && hoursFromNow < h + 3;
        });
        if (!slice.length) continue;
        const best = slice.reduce((a, b) =>
          (b.quality_score ?? 0) > (a.quality_score ?? 0) ? b : a
        );
        const sliceEcmwf = slice.map((p) => p.ecmwfWaveHeightFt).filter((v) => v != null) as number[];
        buckets.push({
          label: `${h === 0 ? "Now" : `+${h}h`}`,
          waveHeight: best.breakingWaveHeightFt ?? best.dominantSwellHeightFt ?? 0,
          qualityScore: best.quality_score ?? 0,
          period: best.dominantSwellPeriodS ?? null,
          windSpeed: best.windSpeedMph ?? null,
          windDir: formatCardinal(best.windDirectionDeg),
          ecmwfWaveHeightFt: sliceEcmwf.length > 0 ? sliceEcmwf.reduce((a, b) => a + b, 0) / sliceEcmwf.length : null,
        });
      }
      return buckets;
    }

    // Daily for 3D/7D: group by calendar day
    const dayMap = new Map<string, typeof data.timeline>();
    for (const pt of data.timeline) {
      const dayKey = startOfDay(new Date(pt.forecastTimestamp)).toISOString();
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
      dayMap.get(dayKey)!.push(pt);
    }

    const today = startOfDay(new Date());
    return Array.from(dayMap.entries()).map(([dayKey, pts]) => {
      const dayDate = new Date(dayKey);
      const best = pts.reduce((a, b) =>
        (b.quality_score ?? 0) > (a.quality_score ?? 0) ? b : a
      );
      const dayEcmwf = pts.map((p) => p.ecmwfWaveHeightFt).filter((v) => v != null) as number[];
      return {
        label: isSameDay(dayDate, today) ? "Today" : format(dayDate, "EEE"),
        waveHeight: Math.max(...pts.map((p) => p.breakingWaveHeightFt ?? p.dominantSwellHeightFt ?? 0)),
        qualityScore: Math.max(...pts.map((p) => p.quality_score ?? 0)),
        period: best.dominantSwellPeriodS ?? null,
        windSpeed: best.windSpeedMph ?? null,
        windDir: formatCardinal(best.windDirectionDeg),
        ecmwfWaveHeightFt: dayEcmwf.length > 0 ? dayEcmwf.reduce((a, b) => a + b, 0) / dayEcmwf.length : null,
      };
    });
  })();

  const monoFont = { fontFamily: "'JetBrains Mono', monospace" };

  if (!spotId) {
    return (
      <div className="border border-gray-200 h-[180px] flex items-center justify-center">
        <p className="text-[10px] uppercase tracking-widest text-gray-400" style={monoFont}>
          Set home break to view forecast
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {/* Period selector */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-gray-500" style={monoFont}>
          Wave Forecast
        </div>
        <div className="flex gap-0 border border-black">
          {(["1D", "3D", "7D"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                period === p
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
              style={monoFont}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-[180px] border border-gray-200 flex items-center justify-center">
          <div className="flex gap-1">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-8 bg-gray-200 animate-pulse rounded-sm"
                style={{ height: `${40 + Math.random() * 80}px`, alignSelf: "flex-end" }}
              />
            ))}
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[180px] border border-gray-200 flex items-center justify-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-400" style={monoFont}>
            No forecast data
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 p-2">
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="wave"
                tick={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}ft`}
                domain={[0, "auto"]}
              />
              <YAxis
                yAxisId="score"
                orientation="right"
                tick={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fill: "#d1d5db" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar yAxisId="wave" dataKey="waveHeight" radius={[2, 2, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.qualityScore)} />
                ))}
              </Bar>
              <Line
                yAxisId="score"
                type="monotone"
                dataKey="qualityScore"
                stroke="#d1d5db"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="3 3"
              />
            </ComposedChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex items-center gap-3 mt-1 px-1">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
              <span className="text-[9px] text-gray-500 uppercase" style={monoFont}>Go surf (70+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded-sm" />
              <span className="text-[9px] text-gray-500 uppercase" style={monoFont}>Decent (50+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 rounded-sm" />
              <span className="text-[9px] text-gray-500 uppercase" style={monoFont}>Don't Bother</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
