import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Arrow } from "@/components/ui/arrow";
import { formatSurfHeight } from "@/lib/forecastUtils";
import { getScoreBadgeHexColor, getScoreBadgeTextHexColor } from "@/lib/ratingColors";
import { isNighttime } from "@/lib/sunTimes";

interface WaveForecastChartProps {
  spotId: number | undefined;
  model?: 'euro' | 'om';
  lat?: number;
  lng?: number;
}

type Period = "1D" | "3D" | "7D";

interface DayData {
  label: string;
  subLabel: string;
  waveHeight: number;
  qualityScore: number;
  // Dominant swell
  dominantPeriodS: number | null;
  dominantHeightFt: number | null;
  dominantDirDeg: number | null;
  dominantLabel: string | null; // "Groundswell", "Swell", "Wind Swell"
  // Secondary swell
  secondaryHeightFt: number | null;
  secondaryPeriodS: number | null;
  secondaryDirDeg: number | null;
  // Wind wave
  windWaveHeightFt: number | null;
  windWavePeriodS: number | null;
  // Nighttime flag (1D only)
  isNight: boolean;
  // Wind
  windSpeed: number | null;
  windGustsMph: number | null;
  windDir: string;
  windDirectionDeg: number | null;
  // Euro cross-reference
  ecmwfWaveHeightFt: number | null;
}

const PERIOD_HOURS: Record<Period, number> = {
  "1D": 24,
  "3D": 72,
  "7D": 168,
};

const getRatingLabel = (score: number) => {
  if (score >= 91) return "All-Time";
  if (score >= 76) return "Firing";
  if (score >= 60) return "Go Surf";
  if (score >= 40) return "Worth a Look";
  return "Don't Bother";
};

const cardinals = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
const formatCardinal = (deg: number | null | undefined): string => {
  if (deg == null) return "—";
  return cardinals[Math.round(deg / 22.5) % 16];
};

const BAR_SECTION_HEIGHT = 110;

export function WaveForecastChart({ spotId, model = 'om', lat, lng }: WaveForecastChartProps) {
  const [period, setPeriod] = useState<Period>("7D");
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const isEuro = model === 'euro';

  const { data, isLoading } = trpc.forecasts.getTimeline.useQuery(
    { spotId: spotId!, hours: PERIOD_HOURS[period] },
    { enabled: spotId != null, staleTime: 30 * 60 * 1000 }
  );

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setMounted(false);
    setSelectedCol(null);
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, [period, model]);

  const chartData: DayData[] = (() => {
    if (!data?.timeline?.length) return [];

    if (period === "1D") {
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
        const euroHeights = slice.map((p) => p.ecmwfWaveHeightFt != null ? Number(p.ecmwfWaveHeightFt) : null).filter((v): v is number => v != null);
        const avgEuroHeight = euroHeights.length > 0 ? euroHeights.reduce((a, b) => a + b, 0) / euroHeights.length : null;
        const windSpeeds = slice.map((p) => p.windSpeedMph).filter((v): v is number => v != null);
        const windGusts = slice.map((p) => p.windGustsMph).filter((v): v is number => v != null);
        const labelDate = new Date(Date.now() + h * 3600000);
        const lh = labelDate.getHours();
        const timeLabel = lh === 0 ? "12am" : lh === 12 ? "12pm" : lh > 12 ? `${lh - 12}pm` : `${lh}am`;
        const blendHeight = best.breakingWaveHeightFt ?? best.dominantSwellHeightFt ?? 0;
        const bucketIsNight = (lat != null && lng != null)
          ? isNighttime(best.forecastTimestamp, lat, lng)
          : false;
        buckets.push({
          label: h === 0 ? "Now" : timeLabel,
          subLabel: h === 0 ? timeLabel : "",
          waveHeight: isEuro && avgEuroHeight != null ? avgEuroHeight : blendHeight,
          qualityScore: best.quality_score ?? 0,
          dominantPeriodS: best.dominantSwellPeriodS ?? null,
          dominantHeightFt: best.dominantSwellHeightFt ?? null,
          dominantDirDeg: best.dominantSwellDirectionDeg ?? null,
          dominantLabel: best.dominantSwellLabel ?? null,
          secondaryHeightFt: best.secondarySwellHeightFt ?? null,
          secondaryPeriodS: best.secondarySwellPeriodS ?? null,
          secondaryDirDeg: best.secondarySwellDirectionDeg ?? null,
          windWaveHeightFt: best.windWaveHeightFt ?? null,
          windWavePeriodS: best.windWavePeriodS ?? null,
          windSpeed: windSpeeds.length > 0 ? Math.round(windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length) : null,
          windGustsMph: windGusts.length > 0 ? Math.round(Math.max(...windGusts)) : null,
          windDir: formatCardinal(best.windDirectionDeg),
          windDirectionDeg: best.windDirectionDeg ?? null,
          ecmwfWaveHeightFt: avgEuroHeight,
          isNight: bucketIsNight,
        });
      }
      return buckets;
    }

    const ET_TIMEZONE = "America/New_York";
    const etDateFmt = new Intl.DateTimeFormat("en-US", { timeZone: ET_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
    const etWeekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: ET_TIMEZONE, weekday: "short" });
    const etDayMonthFmt = new Intl.DateTimeFormat("en-US", { timeZone: ET_TIMEZONE, day: "2-digit", month: "2-digit" });
    const todayEtKey = etDateFmt.format(new Date());

    const dayMap = new Map<string, typeof data.timeline>();
    for (const pt of data.timeline) {
      const dayKey = etDateFmt.format(new Date(pt.forecastTimestamp));
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
      dayMap.get(dayKey)!.push(pt);
    }

    return Array.from(dayMap.entries()).map(([dayKey, pts]) => {
      const best = pts.reduce((a, b) => (b.quality_score ?? 0) > (a.quality_score ?? 0) ? b : a);
      const euroHeights = pts.map((p) => p.ecmwfWaveHeightFt != null ? Number(p.ecmwfWaveHeightFt) : null).filter((v): v is number => v != null);
      const maxEuroHeight = euroHeights.length > 0 ? Math.max(...euroHeights) : null;
      const blendHeight = Math.max(...pts.map((p) => p.breakingWaveHeightFt ?? p.dominantSwellHeightFt ?? 0));
      const windSpeeds = pts.map((p) => p.windSpeedMph).filter((v): v is number => v != null);
      const windGusts = pts.map((p) => p.windGustsMph).filter((v): v is number => v != null);
      const sampleDate = new Date(pts[0].forecastTimestamp);
      return {
        label: dayKey === todayEtKey ? "Today" : etWeekdayFmt.format(sampleDate),
        subLabel: etDayMonthFmt.format(sampleDate),
        waveHeight: isEuro && maxEuroHeight != null ? maxEuroHeight : blendHeight,
        qualityScore: (() => {
          const allScores = pts.map((p) => p.quality_score ?? 0);
          const allAvg = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
          if (lat == null || lng == null) return allAvg;
          const daylightScores = pts
            .filter((p) => !isNighttime(p.forecastTimestamp, lat, lng))
            .map((p) => p.quality_score ?? 0);
          if (daylightScores.length < 2) return allAvg;
          const surfablePct = daylightScores.filter((s) => s >= 40).length / daylightScores.length;
          if (surfablePct >= 0.5) {
            return Math.round(daylightScores.reduce((a, b) => a + b, 0) / daylightScores.length);
          }
          return allAvg;
        })(),
        dominantPeriodS: best.dominantSwellPeriodS ?? null,
        dominantHeightFt: best.dominantSwellHeightFt ?? null,
        dominantDirDeg: best.dominantSwellDirectionDeg ?? null,
        dominantLabel: best.dominantSwellLabel ?? null,
        secondaryHeightFt: best.secondarySwellHeightFt ?? null,
        secondaryPeriodS: best.secondarySwellPeriodS ?? null,
        secondaryDirDeg: best.secondarySwellDirectionDeg ?? null,
        windWaveHeightFt: best.windWaveHeightFt ?? null,
        windWavePeriodS: best.windWavePeriodS ?? null,
        windSpeed: windSpeeds.length > 0 ? Math.round(windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length) : null,
        windGustsMph: windGusts.length > 0 ? Math.round(Math.max(...windGusts)) : null,
        windDir: formatCardinal(best.windDirectionDeg),
        windDirectionDeg: best.windDirectionDeg ?? null,
        ecmwfWaveHeightFt: maxEuroHeight,
        isNight: false,
      };
    });
  })();

  const monoFont = { fontFamily: "'JetBrains Mono', monospace" };
  const maxHeight = Math.max(...chartData.map((d) => d.waveHeight), 1);
  const selected = selectedCol != null ? chartData[selectedCol] : null;

  if (!spotId) {
    return (
      <div className="border-2 border-black h-[220px] flex items-center justify-center" style={monoFont}>
        <p className="text-[10px] uppercase tracking-widest text-gray-400">Set home break to view forecast</p>
      </div>
    );
  }

  return (
    <div className="mt-2 border-2 border-black bg-white" style={monoFont}>

      {/* Period tabs */}
      <div className="flex border-b-2 border-black">
        {(["1D", "3D", "7D"] as Period[]).map((p, i) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 min-h-[44px] py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors active:opacity-70
              ${period === p ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}
              ${i < 2 ? "border-r-2 border-black" : ""}`}
          >
            {p === "1D" ? "Today" : p === "3D" ? "3 Day" : "7 Day"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-[260px] flex items-end justify-center gap-1 px-4 pb-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-1 bg-gray-200 animate-pulse" style={{ height: `${35 + (i * 17) % 65}px` }} />
          ))}
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">No forecast data</p>
        </div>
      ) : (
        <>
          {/* Section header */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                Surf Height <span className="text-gray-400">(ft)</span>
              </span>
              <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${isEuro ? "bg-blue-600 text-white" : "bg-black text-white"}`}>
                {isEuro ? "Euro" : "Blend"}
              </span>
            </div>
            {selected && (
              <button
                onClick={() => setSelectedCol(null)}
                className="text-[8px] uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
              >
                ✕ close
              </button>
            )}
          </div>

          {/* Columns */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex" style={{ minWidth: `${Math.max(chartData.length * 64, 320)}px` }}>
              {chartData.map((d, i) => {
                const barPx = Math.max(Math.round((d.waveHeight / maxHeight) * BAR_SECTION_HEIGHT), 4);
                const barColor = getScoreBadgeHexColor(d.qualityScore);
                const windArrowDeg = d.windDirectionDeg != null ? (d.windDirectionDeg + 180) % 360 : null;
                const isSelected = selectedCol === i;
                const isNight = d.isNight;

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedCol(isSelected ? null : i)}
                    className={`flex-1 flex flex-col text-left transition-colors duration-150 focus:outline-none active:opacity-75
                      ${i < chartData.length - 1 ? "border-r border-gray-200" : ""}
                      ${isSelected ? "bg-gray-100" : isNight ? "bg-gray-100/60 hover:bg-gray-100" : "bg-white hover:bg-gray-50/70"}`}
                  >
                    {/* Day header */}
                    <div className={`text-center pt-2 pb-1.5 border-b transition-colors
                      ${isSelected ? "border-black border-b-2 bg-black text-white" : isNight ? "border-gray-200 bg-gray-200/70 text-black" : "border-gray-200 bg-gray-50 text-black"}`}
                    >
                      <div className={`text-[11px] font-bold uppercase leading-tight ${isSelected ? "text-white" : "text-black"}`}>
                        {d.label}
                      </div>
                      {d.subLabel && (
                        <div className={`text-[9px] leading-tight ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
                          {d.subLabel}
                        </div>
                      )}
                    </div>

                    {/* Bar area */}
                    <div className="flex flex-col items-center justify-end px-1" style={{ height: BAR_SECTION_HEIGHT + 20 }}>
                      <div className="text-[9px] font-bold text-center leading-tight mb-0.5" style={{ color: barColor }}>
                        {d.waveHeight > 0.4 ? formatSurfHeight(d.waveHeight) : ""}
                      </div>
                      <div style={{
                        height: mounted ? barPx : 0,
                        width: "100%",
                        backgroundColor: barColor,
                        minHeight: mounted ? 3 : 0,
                        transition: "height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                        opacity: isSelected ? 1 : 0.85,
                        outline: isSelected ? `2px solid ${barColor}` : "none",
                        outlineOffset: "1px",
                      }} />
                    </div>

                    {/* Wind divider */}
                    <div className="border-t-2 border-black" />

                    {/* Wind row */}
                    <div className="flex flex-col items-center justify-center py-2.5 gap-1 bg-white">
                      <div className="flex items-center justify-center h-5">
                        {windArrowDeg != null
                          ? <Arrow degrees={windArrowDeg} color="#374151" size={14} />
                          : <span className="text-[9px] text-gray-400">—</span>
                        }
                      </div>
                      <div className="text-[14px] font-bold text-black leading-none">
                        {d.windSpeed != null ? d.windSpeed : "—"}
                      </div>
                      <div className="text-[10px] text-gray-500 leading-none">
                        {d.windGustsMph != null ? d.windGustsMph : "—"}
                      </div>
                    </div>

                    {/* Quality strip */}
                    <div style={{ height: 6, backgroundColor: barColor, opacity: isSelected ? 1 : 0.7 }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wind section label */}
          <div className="border-t-2 border-black flex items-center gap-3 text-[8px] uppercase tracking-widest text-gray-500 px-3 py-1.5">
            <span>Wind avg (mph)</span>
            <span className="text-gray-300">|</span>
            <span>Gust below</span>
          </div>

          {/* Expanded detail panel */}
          <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out border-t-2 border-black
            ${selected ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
            <div className="overflow-hidden">
              {selected && (
                <div className="px-3 sm:px-4 py-3 bg-gray-50 space-y-3">

                  {/* Row 1: Rating badge + score */}
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
                      style={{
                        backgroundColor: getScoreBadgeHexColor(selected.qualityScore),
                        color: getScoreBadgeTextHexColor(selected.qualityScore),
                      }}
                    >
                      {getRatingLabel(selected.qualityScore)}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                      Score: {Math.round(selected.qualityScore)}
                    </span>
                  </div>

                  {/* Row 2: Swell breakdown — Euro vs OM */}
                  {isEuro ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-black leading-none">
                        {formatSurfHeight(selected.waveHeight)}
                      </span>
                      {selected.dominantPeriodS && (
                        <span className="text-[11px] text-gray-500">@ {Math.round(selected.dominantPeriodS)}s</span>
                      )}
                      <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600">EURO</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {/* Dominant swell */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {selected.dominantDirDeg != null && (
                          <Arrow degrees={(selected.dominantDirDeg + 180) % 360} color="#1e293b" size={13} />
                        )}
                        <span className="text-[15px] font-bold text-black leading-none">
                          {formatSurfHeight(selected.dominantHeightFt ?? selected.waveHeight)}
                        </span>
                        {selected.dominantPeriodS && (
                          <span className="text-[11px] text-gray-600">@ {Math.round(selected.dominantPeriodS)}s</span>
                        )}
                        {selected.dominantDirDeg != null && (
                          <span className="text-[10px] text-gray-500">{formatCardinal(selected.dominantDirDeg)}</span>
                        )}
                        {selected.dominantLabel && (
                          <span className="text-[9px] uppercase tracking-widest text-gray-400">{selected.dominantLabel}</span>
                        )}
                      </div>

                      {/* Secondary swell */}
                      {selected.secondaryHeightFt != null && selected.secondaryHeightFt >= 0.5 && (
                        <div className="flex items-center gap-2 flex-wrap pl-1">
                          {selected.secondaryDirDeg != null && (
                            <Arrow degrees={(selected.secondaryDirDeg + 180) % 360} color="#94a3b8" size={11} />
                          )}
                          <span className="text-[13px] font-medium text-gray-600 leading-none">
                            {formatSurfHeight(selected.secondaryHeightFt)}
                          </span>
                          {selected.secondaryPeriodS && (
                            <span className="text-[10px] text-gray-500">@ {Math.round(selected.secondaryPeriodS)}s</span>
                          )}
                          {selected.secondaryDirDeg != null && (
                            <span className="text-[10px] text-gray-400">{formatCardinal(selected.secondaryDirDeg)}</span>
                          )}
                          <span className="text-[9px] uppercase tracking-widest text-gray-400">Secondary</span>
                        </div>
                      )}

                      {/* Wind wave */}
                      {selected.windWaveHeightFt != null && selected.windWaveHeightFt >= 0.5 &&
                        selected.windWaveHeightFt !== selected.dominantHeightFt && (
                        <div className="flex items-center gap-2 flex-wrap pl-1">
                          <span className="text-[13px] font-medium text-gray-500 leading-none">
                            {formatSurfHeight(selected.windWaveHeightFt)}
                          </span>
                          {selected.windWavePeriodS && (
                            <span className="text-[10px] text-gray-400">@ {Math.round(selected.windWavePeriodS)}s</span>
                          )}
                          <span className="text-[9px] uppercase tracking-widest text-gray-400">Wind Wave</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Row 3: Wind — always OM */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200 flex-wrap">
                    {selected.windDirectionDeg != null && (
                      <Arrow degrees={(selected.windDirectionDeg + 180) % 360} color="#374151" size={14} />
                    )}
                    <span className="text-[13px] font-bold text-black">
                      {selected.windSpeed != null ? selected.windSpeed : "—"}
                    </span>
                    {selected.windGustsMph != null && (
                      <span className="text-[11px] text-gray-500">/ {selected.windGustsMph} mph gusts</span>
                    )}
                    <span className="text-[11px] text-gray-500 uppercase">{selected.windDir}</span>
                    {!isEuro && selected.ecmwfWaveHeightFt != null && (
                      <span className="ml-auto text-[10px] text-blue-500 font-medium">
                        Euro: {formatSurfHeight(selected.ecmwfWaveHeightFt)}
                      </span>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="border-t border-gray-200 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2.5">
            {[
              { score: 95, label: "All-Time" },
              { score: 80, label: "Firing" },
              { score: 65, label: "Go Surf" },
              { score: 45, label: "Worth a Look" },
              { score: 20, label: "Don't Bother" },
            ].map(({ score, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5" style={{ backgroundColor: getScoreBadgeHexColor(score) }} />
                <span className="text-[8px] uppercase text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
