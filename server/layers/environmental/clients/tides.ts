import axios from "axios";

/**
 * NOAA Tides & Currents Data Service
 * Fetches tide predictions from NOAA CO-OPS API.
 * API Docs: https://api.tidesandcurrents.noaa.gov/api/prod/
 */

const tideCache = new Map<string, { data: TidePrediction[]; ts: number }>();
const TIDE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export interface TidePrediction {
  time: Date;
  heightFt: number;
  type: "H" | "L"; // High or Low
}

export interface CurrentTideInfo {
  currentHeightFt: number;
  nextTide: TidePrediction | null;
  tidePhase: "rising" | "falling" | "high" | "low";
}

/**
 * Fetches tide predictions for a station for the next 24 hours.
 * Results are cached for 30 minutes — tide schedules don't change mid-day.
 */
export async function fetchTidePredictions(stationId: string): Promise<TidePrediction[]> {
  const cached = tideCache.get(stationId);
  if (cached && Date.now() - cached.ts < TIDE_CACHE_TTL) {
    return cached.data;
  }

  const now = new Date();
  const beginDate = formatDate(now);
  const endDate = formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter`;
  const params = {
    begin_date: beginDate,
    end_date: endDate,
    station: stationId,
    product: "predictions",
    datum: "MLLW",
    units: "english",
    time_zone: "gmt",
    application: "LongIslandSurfForecast",
    format: "json",
    interval: "hilo", // High/Low only
  };

  try {
    const response = await axios.get(url, { params, timeout: 10000 });

    if (!response.data.predictions) {
      console.warn(`[Tides] No predictions for station ${stationId}`);
      return cached?.data ?? [];
    }

    const data = response.data.predictions.map((p: { t: string; v: string; type: string }) => ({
      time: new Date(p.t + "Z"),
      heightFt: parseFloat(p.v),
      type: p.type as "H" | "L",
    }));

    tideCache.set(stationId, { data, ts: Date.now() });
    return data;
  } catch (error) {
    console.error(`[Tides] Failed to fetch station ${stationId}:`, error);
    return cached?.data ?? [];
  }
}

/**
 * Gets current tide information for a station.
 */
export async function getCurrentTideInfo(stationId: string): Promise<CurrentTideInfo | null> {
  const predictions = await fetchTidePredictions(stationId);
  if (predictions.length < 2) return null;

  const now = new Date();

  // Find the next tide event
  const nextTide = predictions.find((p) => p.time > now) || null;

  // Determine tide phase
  let tidePhase: CurrentTideInfo["tidePhase"] = "rising";
  if (nextTide) {
    if (nextTide.type === "H") {
      tidePhase = "rising";
    } else {
      tidePhase = "falling";
    }
  }

  // Estimate current height (simple linear interpolation)
  let currentHeightFt = 0;
  const prevTide = predictions.find((p) => p.time <= now);
  if (prevTide && nextTide) {
    const totalTime = nextTide.time.getTime() - prevTide.time.getTime();
    const elapsedTime = now.getTime() - prevTide.time.getTime();
    const progress = elapsedTime / totalTime;
    currentHeightFt = prevTide.heightFt + (nextTide.heightFt - prevTide.heightFt) * progress;
  } else if (nextTide) {
    currentHeightFt = nextTide.heightFt;
  }

  return {
    currentHeightFt: Math.round(currentHeightFt * 10) / 10,
    nextTide,
    tidePhase,
  };
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
