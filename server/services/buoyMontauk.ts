/**
 * Montauk Buoy Service
 *
 * Primary:   NOAA Buoy 44017 (Montauk Point, ~40.69°N, 72.05°W)
 * Fallback:  NOAA Buoy 44097 (Block Island, RI, ~40.97°N, 71.13°W)
 *
 * Fallback is used when:
 *   1. 44017 returns no valid data (offline / maintenance)
 *   2. Swell period from 44017 is > 10 seconds (long-range groundswell reads
 *      similarly at both stations; 44097 is often more stable in those cases)
 *
 * Correction applied to 44097 data:
 *   When swell direction is 45°–90° (NE to E), a 0.75 reduction factor is
 *   applied to swell height.  Block Island is fully exposed to NE/E fetch;
 *   Montauk is partially shadowed by the eastern tip of Long Island for those
 *   directions.  S/SE swells reach Montauk with minimal attenuation from 44097.
 */

import axios from "axios";
import { calculateSwellEnergy } from "../utils/waveHeight";

export interface BuoyReading {
  waveHeight: number;
  waveHeightMeters: number;
  dominantPeriod: number;
  dominantWaveHeight: number;
  dominantWaveHeightMeters: number;
  dominantDirectionDeg: number | null;
  dominantDirectionLabel: string;
  waveDirection: number;
  directionLabel: string;
  timestamp: Date;
  isStale: boolean;
  swellHeight: number | null;
  swellPeriod: number | null;
  swellDirection: string | null;
  swellDirectionDeg: number | null;
  windWaveHeight: number | null;
  windWavePeriod: number | null;
  windWaveDirection: string | null;
  windWaveDirectionDeg: number | null;
  steepness: string | null;
  windSpeedKts: number | null;
  windDirectionDeg: number | null;
  /** Which buoy the data came from */
  source: "44017" | "44097";
}

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Direction range that triggers the 44097 → Montauk correction factor
const NE_E_DIR_MIN = 45;
const NE_E_DIR_MAX = 90;
const NE_E_REDUCTION = 0.75;

function degreesToDirection(degrees: number): string {
  const directions = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

function cardinalToDegrees(cardinal: string | null): number | null {
  if (!cardinal) return null;
  const map: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
    E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  return map[cardinal.toUpperCase()] ?? null;
}

function parseValue(val: string): number | null {
  if (
    val === "MM" || val === "-" || val === "--" ||
    val === "999" || val === "99.0" || val === "9999.0" ||
    val === "99.00" || val.trim() === ""
  ) {
    return null;
  }
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

/**
 * Fetch and parse NDBC spectral + standard data for a given buoy ID.
 * Returns null if the buoy is unreachable or no valid data lines exist.
 */
async function fetchNdbcBuoy(buoyId: string): Promise<Omit<BuoyReading, "source"> | null> {
  const specUrl = `https://www.ndbc.noaa.gov/data/realtime2/${buoyId}.spec`;
  const txtUrl = `https://www.ndbc.noaa.gov/data/realtime2/${buoyId}.txt`;
  const tag = `[Buoy ${buoyId}]`;

  try {
    const [specResponse, txtResponse] = await Promise.all([
      axios.get(specUrl, {
        timeout: 10000,
        headers: { "User-Agent": "NYCSurfCo/1.0 (surf forecast application)" },
      }),
      axios.get(txtUrl, {
        timeout: 10000,
        headers: { "User-Agent": "NYCSurfCo/1.0 (surf forecast application)" },
      }).catch(() => null),
    ]);

    // Wind data from .txt
    let windSpeedKts: number | null = null;
    let windDirectionDeg: number | null = null;
    if (txtResponse?.data) {
      for (const line of (txtResponse.data as string).split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 7) {
          const wdir = parseValue(parts[5]);
          const wspd = parseValue(parts[6]);
          if (wdir !== null) windDirectionDeg = wdir;
          if (wspd !== null) windSpeedKts = wspd * 1.94384;
          console.log(`${tag} Wind: ${windSpeedKts?.toFixed(1)}kts from ${windDirectionDeg}°`);
          break;
        }
      }
    }

    // Spectral data
    for (const line of (specResponse.data as string).split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 15) continue;

      try {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const hour = parseInt(parts[3], 10);
        const minute = parseInt(parts[4], 10);
        const timestamp = new Date(Date.UTC(year, month, day, hour, minute));

        const wvht = parseValue(parts[5]);
        const swH = parseValue(parts[6]);
        const swP = parseValue(parts[7]);
        const wwH = parseValue(parts[8]);
        const wwP = parseValue(parts[9]);
        const swD = parts[10];
        const wwD = parts[11];
        const steepness = parts[12];
        const mwd = parseValue(parts[14]);

        if (swH === null || swP === null) {
          console.log(`${tag} Missing SwH/SwP — trying next line`);
          continue;
        }

        const isStale = Date.now() - timestamp.getTime() > STALE_THRESHOLD_MS;

        const swellHeightFt = swH * 3.28084;
        const windWaveHeightFt = wwH !== null ? wwH * 3.28084 : null;

        const swellEnergy = calculateSwellEnergy(swellHeightFt, swP);
        const windWaveEnergy =
          windWaveHeightFt !== null && wwP !== null
            ? calculateSwellEnergy(windWaveHeightFt, wwP)
            : 0;
        const windWavesDominate = windWaveEnergy > swellEnergy;

        const dominantPeriod = windWavesDominate ? (wwP ?? swP) : swP;
        const dominantHeightFt = windWavesDominate ? (windWaveHeightFt ?? swellHeightFt) : swellHeightFt;
        const dominantHeightM = windWavesDominate ? (wwH ?? swH) : swH;

        const cleanSwD = swD === "MM" || swD === "-" ? null : swD;
        const cleanWwD = wwD === "MM" || wwD === "-" ? null : wwD;
        const cleanSteepness = steepness === "MM" || steepness === "-" ? null : steepness;

        const dominantDirDeg = windWavesDominate
          ? cardinalToDegrees(cleanWwD)
          : cardinalToDegrees(cleanSwD);
        const dominantDirLabel = windWavesDominate
          ? (cleanWwD ?? (dominantDirDeg !== null ? degreesToDirection(dominantDirDeg) : "N/A"))
          : (cleanSwD ?? (dominantDirDeg !== null ? degreesToDirection(dominantDirDeg) : "N/A"));

        console.log(
          `${tag} SwH=${swH}m @ ${swP}s from ${swD}, WWH=${wwH}m @ ${wwP}s from ${wwD}`
        );

        return {
          waveHeight: swellHeightFt,
          waveHeightMeters: swH,
          dominantPeriod,
          dominantWaveHeight: dominantHeightFt,
          dominantWaveHeightMeters: dominantHeightM,
          dominantDirectionDeg: dominantDirDeg,
          dominantDirectionLabel: dominantDirLabel,
          waveDirection: mwd ?? 0,
          directionLabel: mwd !== null ? degreesToDirection(mwd) : "N/A",
          timestamp,
          isStale,
          swellHeight: swellHeightFt,
          swellPeriod: swP,
          swellDirection: cleanSwD,
          swellDirectionDeg: cardinalToDegrees(cleanSwD),
          windWaveHeight: windWaveHeightFt,
          windWavePeriod: wwP,
          windWaveDirection: cleanWwD,
          windWaveDirectionDeg: cardinalToDegrees(cleanWwD),
          steepness: cleanSteepness,
          windSpeedKts,
          windDirectionDeg,
        };
      } catch (e) {
        console.error(`${tag} Failed to parse line: ${line}`, e);
        continue;
      }
    }

    console.log(`${tag} No valid spectral data lines found`);
    return null;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error(`${tag} Network error: ${err.message}`);
    } else {
      console.error(`${tag} Fetch failed:`, err);
    }
    return null;
  }
}

/**
 * Apply Block Island (44097) → Montauk correction.
 * Reduces swell height by 25% when direction is in the NE–E window (45°–90°)
 * to account for Montauk's partial shadow from that fetch angle.
 */
function applyBlockIslandCorrection(
  reading: Omit<BuoyReading, "source">
): Omit<BuoyReading, "source"> {
  const swellDirDeg = reading.swellDirectionDeg;
  if (
    swellDirDeg !== null &&
    swellDirDeg >= NE_E_DIR_MIN &&
    swellDirDeg <= NE_E_DIR_MAX
  ) {
    console.log(
      `[Buoy 44097→Montauk] NE/E swell (${swellDirDeg}°) — applying ${NE_E_REDUCTION}x reduction`
    );
    return {
      ...reading,
      swellHeight: reading.swellHeight !== null ? reading.swellHeight * NE_E_REDUCTION : null,
      waveHeight: reading.waveHeight * NE_E_REDUCTION,
      waveHeightMeters: reading.waveHeightMeters * NE_E_REDUCTION,
      dominantWaveHeight: reading.dominantWaveHeight * NE_E_REDUCTION,
      dominantWaveHeightMeters: reading.dominantWaveHeightMeters * NE_E_REDUCTION,
    };
  }
  return reading;
}

/**
 * Fetch the best available buoy reading for Montauk:
 * 1. Try 44017 (Montauk Point).
 * 2. If 44017 is unavailable OR its swell period > 10s, try 44097 (Block Island)
 *    with NE/E direction correction applied.
 * Returns null only if both buoys fail.
 */
export async function fetchMontaukBuoy(): Promise<BuoyReading | null> {
  const primary = await fetchNdbcBuoy("44017");

  // Use primary if it returned data and period is ≤ 10s
  if (primary !== null && (primary.swellPeriod === null || primary.swellPeriod <= 10)) {
    console.log("[Buoy Montauk] Using 44017 (Montauk Point)");
    return { ...primary, source: "44017" };
  }

  if (primary !== null) {
    console.log(
      `[Buoy Montauk] 44017 period=${primary.swellPeriod}s > 10s — trying 44097 for groundswell reading`
    );
  } else {
    console.log("[Buoy Montauk] 44017 unavailable — falling back to 44097");
  }

  const fallback = await fetchNdbcBuoy("44097");
  if (fallback !== null) {
    const corrected = applyBlockIslandCorrection(fallback);
    console.log("[Buoy Montauk] Using 44097 (Block Island) with correction");
    return { ...corrected, source: "44097" };
  }

  // If 44017 returned data but period > 10s and 44097 also failed, return 44017
  if (primary !== null) {
    console.log("[Buoy Montauk] 44097 also failed — falling back to 44017 long-period data");
    return { ...primary, source: "44017" };
  }

  console.error("[Buoy Montauk] Both 44017 and 44097 unavailable");
  return null;
}

// ==================== Cache ====================

let cachedReading: BuoyReading | null = null;
let cacheTimestamp = 0;

export function clearMontaukBuoyCache(): void {
  cachedReading = null;
  cacheTimestamp = 0;
  console.log("[Buoy Montauk] Cache cleared");
}

export async function fetchMontaukBuoyCached(): Promise<BuoyReading | null> {
  const now = Date.now();
  if (cachedReading && now - cacheTimestamp < CACHE_TTL_MS) {
    const dataAge = now - cachedReading.timestamp.getTime();
    return { ...cachedReading, isStale: dataAge > STALE_THRESHOLD_MS };
  }

  const reading = await fetchMontaukBuoy();
  if (reading) {
    cachedReading = reading;
    cacheTimestamp = now;
  }
  return reading;
}
