import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { selectCurrentTimelinePoint } from '@/lib/forecastUtils';

/**
 * Unified hook for resolving current surf conditions for a spot.
 * 
 * Uses the same logic across landing page (banner + cards) and spot detail pages:
 * - Fetches timeline (120hr), buoy data, and forecast
 * - Selects current point from timeline (past only, within 1 hour)
 * - Resolves score, wave height, swell, wind, tide with consistent priority
 * 
 * Priority for "current" data:
 * - Score: timeline quality_score → forecast qualityScore → probabilityScore
 * - Wave height: timeline breakingWaveHeightFt → buoy height → timeline dominantSwellHeightFt → waveHeightFt → forecast
 * - Swell/wind/tide: timeline currentPoint → forecast (where applicable)
 */
export function useCurrentConditions(spotId: number, options?: { refetchInterval?: number }) {
  const refetchInterval = options?.refetchInterval ?? 30 * 60 * 1000; // Default 30 min

  // Fetch spot info (for name, needed for buoy lookup)
  const spotQuery = trpc.spots.get.useQuery({ id: spotId });

  // Fetch timeline (168hr = 7 days, same as SpotDetail)
  const timelineQuery = trpc.forecasts.getTimeline.useQuery(
    { spotId, hours: 168 },
    { refetchInterval }
  );

  // Fetch forecast (fallback when no timeline point)
  const forecastQuery = trpc.forecasts.getForSpot.useQuery(
    { spotId },
    { refetchInterval }
  );

  // Fetch buoy-based breaking heights (shared across all spots)
  const buoyBreakingHeightsQuery = trpc.buoy.getBreakingHeightsForSpots.useQuery(undefined, {
    refetchInterval,
    staleTime: 15 * 60 * 1000,
  });

  // Fetch raw buoy data (for validation, swell components)
  const buoyQuery = trpc.buoy.get44065.useQuery(undefined, {
    refetchInterval,
    staleTime: 15 * 60 * 1000,
  });

  // Select current point from timeline (past only, within 1 hour)
  const currentPoint = useMemo(() => {
    return selectCurrentTimelinePoint(timelineQuery.data?.timeline) ?? null;
  }, [timelineQuery.data?.timeline]);

  // Resolve current conditions with same priority as SpotDetail
  const currentConditions = useMemo(() => {
    const spot = spotQuery.data;
    const forecast = forecastQuery.data?.forecast;
    const spotName = spot?.name;

    // Score: timeline → forecast (qualityScore → probabilityScore)
    const score = currentPoint?.quality_score != null
      ? Number(currentPoint.quality_score)
      : (forecast?.qualityScore != null
        ? Number(forecast.qualityScore)
        : (forecast?.probabilityScore != null ? Number(forecast.probabilityScore) : 0));

    // Wave height: timeline breaking → buoy → timeline swell → forecast
    const buoyBasedHeight = spotName ? buoyBreakingHeightsQuery.data?.[spotName]?.height : null;
    const waveHeight = currentPoint?.breakingWaveHeightFt ??
      buoyBasedHeight ??
      currentPoint?.dominantSwellHeightFt ??
      currentPoint?.waveHeightFt ??
      (forecast?.waveHeightTenthsFt != null ? forecast.waveHeightTenthsFt / 10 : null);

    // Buoy swell data (for swell components when available)
    const buoySwellPeriod = spotName ? buoyBreakingHeightsQuery.data?.[spotName]?.period : null;
    const buoySwellDirection = spotName ? buoyBreakingHeightsQuery.data?.[spotName]?.direction : null;

    // Swell info: prefer buoy when available (matches buoyBasedHeight source), else timeline
    const getDominantSwellInfo = () => {
      if (buoySwellPeriod !== null && buoySwellPeriod !== undefined && buoySwellPeriod > 0) {
        return {
          period: buoySwellPeriod,
          direction: buoySwellDirection ?? null,
          type: 'buoy' as const,
        };
      }

      if (!currentPoint) {
        // Fallback to forecast
        return {
          period: forecast?.periodDs != null ? forecast.periodDs / 10 : null,
          direction: forecast?.directionDeg ?? null,
          type: 'forecast' as const,
        };
      }

      const dominantType = currentPoint.dominantSwellType;
      if (dominantType === 'primary') {
        return {
          period: currentPoint.wavePeriodSec,
          direction: currentPoint.waveDirectionDeg,
          type: 'primary' as const,
        };
      } else if (dominantType === 'secondary') {
        return {
          period: currentPoint.secondarySwellPeriodS,
          direction: currentPoint.secondarySwellDirectionDeg,
          type: 'secondary' as const,
        };
      } else if (dominantType === 'wind') {
        return {
          period: currentPoint.windWavePeriodS,
          direction: currentPoint.windWaveDirectionDeg,
          type: 'wind' as const,
        };
      }

      // Fallback
      return {
        period: currentPoint.dominantSwellPeriodS ?? currentPoint.wavePeriodSec,
        direction: currentPoint.dominantSwellDirectionDeg ?? currentPoint.waveDirectionDeg,
        type: 'fallback' as const,
      };
    };

    const swell = getDominantSwellInfo();

    // Wind: timeline → forecast
    const wind = {
      speedMph: currentPoint?.windSpeedMph ?? forecast?.windSpeedMph ?? null,
      gustsMph: currentPoint?.windGustsMph ?? null,
      directionDeg: currentPoint?.windDirectionDeg ?? forecast?.windDirectionDeg ?? null,
      type: currentPoint?.windType ?? forecast?.windType ?? null,
    };

    // Tide: timeline → forecast
    const tide = {
      heightFt: currentPoint?.tideHeightFt ?? forecast?.tideHeightFt ?? null,
      phase: currentPoint?.tidePhase ?? forecast?.tidePhase ?? null,
    };

    // Temps: timeline → forecast
    const temps = {
      waterF: currentPoint?.waterTempF ?? forecast?.waterTempF ?? null,
      airF: currentPoint?.airTempF ?? forecast?.airTempF ?? null,
    };

    // Timestamp for "as of"
    const timestamp = currentPoint?.forecastTimestamp ?? forecast?.createdAt ?? null;

    return {
      currentPoint,
      score,
      waveHeight,
      swell,
      wind,
      tide,
      temps,
      timestamp,
      spotName: spotName ?? null,
      // Full point data for advanced usage
      buoyData: buoyQuery.data ?? null,
    };
  }, [
    currentPoint,
    spotQuery.data,
    forecastQuery.data,
    buoyBreakingHeightsQuery.data,
    buoyQuery.data,
  ]);

  return {
    ...currentConditions,
    isLoading: spotQuery.isLoading || timelineQuery.isLoading || forecastQuery.isLoading,
    error: spotQuery.error || timelineQuery.error || forecastQuery.error,
    // Expose raw queries for advanced usage (e.g. charts, full timeline)
    queries: {
      spot: spotQuery,
      timeline: timelineQuery,
      forecast: forecastQuery,
      buoyBreakingHeights: buoyBreakingHeightsQuery,
      buoy: buoyQuery,
    },
  };
}
