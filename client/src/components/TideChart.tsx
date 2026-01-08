import React, { useMemo } from 'react';
import { getLightTimes } from '@/lib/sunTimes';

interface TideDataPoint {
  time: Date;
  height: number; // in feet (not tenths)
}

interface TideExtreme {
  type: 'high' | 'low';
  time: Date;
  height: number;
}

interface TideChartProps {
  tideData: TideDataPoint[];
  currentTime?: Date;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export function TideChart({
  tideData,
  currentTime = new Date(),
  location = 'Long Beach, Long Island, New York',
  latitude = 40.5884,
  longitude = -73.6579,
}: TideChartProps) {
  // Get light times for dawn/dusk shading
  const lightTimes = useMemo(() => {
    return getLightTimes(latitude, longitude, currentTime);
  }, [latitude, longitude, currentTime]);

  // Find high and low tide extremes
  const tideExtremes = useMemo((): TideExtreme[] => {
    const extremes: TideExtreme[] = [];

    for (let i = 1; i < tideData.length - 1; i++) {
      const prev = tideData[i - 1];
      const curr = tideData[i];
      const next = tideData[i + 1];

      if (curr.height > prev.height && curr.height > next.height) {
        extremes.push({ type: 'high', time: curr.time, height: curr.height });
      }
      if (curr.height < prev.height && curr.height < next.height) {
        extremes.push({ type: 'low', time: curr.time, height: curr.height });
      }
    }

    return extremes;
  }, [tideData]);

  // Calculate current tide height via interpolation
  const currentTideHeight = useMemo(() => {
    if (tideData.length < 2) return null;

    const currentMs = currentTime.getTime();

    // Find surrounding points
    let prevPoint: TideDataPoint | null = null;
    let nextPoint: TideDataPoint | null = null;

    for (let i = 0; i < tideData.length; i++) {
      if (tideData[i].time.getTime() <= currentMs) {
        prevPoint = tideData[i];
      }
      if (tideData[i].time.getTime() > currentMs && !nextPoint) {
        nextPoint = tideData[i];
        break;
      }
    }

    if (prevPoint && nextPoint) {
      const totalTime = nextPoint.time.getTime() - prevPoint.time.getTime();
      const elapsedTime = currentMs - prevPoint.time.getTime();
      const progress = elapsedTime / totalTime;
      return prevPoint.height + (nextPoint.height - prevPoint.height) * progress;
    }

    return prevPoint?.height ?? nextPoint?.height ?? null;
  }, [tideData, currentTime]);

  if (tideData.length < 2) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        No tide data available
      </div>
    );
  }

  // SVG dimensions
  const svgWidth = 400;
  const svgHeight = 140;
  const padding = { top: 30, right: 20, bottom: 25, left: 45 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Get time bounds (start of day to end of day)
  const dayStart = new Date(currentTime);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(currentTime);
  dayEnd.setHours(23, 59, 59, 999);

  // Filter tide data to current day and sort
  const dayTideData = tideData
    .filter(d => d.time >= dayStart && d.time <= dayEnd)
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  if (dayTideData.length < 2) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        No tide data for today
      </div>
    );
  }

  // Calculate scales
  const heights = dayTideData.map(d => d.height);
  const minHeight = Math.min(...heights);
  const maxHeight = Math.max(...heights);
  const heightRange = maxHeight - minHeight || 1;
  const heightPadding = heightRange * 0.15;

  const startTime = dayStart.getTime();
  const endTime = dayEnd.getTime();
  const timeRange = endTime - startTime;

  const getX = (time: Date) => {
    const progress = (time.getTime() - startTime) / timeRange;
    return padding.left + progress * chartWidth;
  };

  const getY = (height: number) => {
    const normalizedHeight = (height - minHeight + heightPadding) / (heightRange + heightPadding * 2);
    return padding.top + chartHeight * (1 - normalizedHeight);
  };

  // Build smooth bezier curve path
  let pathD = `M ${getX(dayTideData[0].time)} ${getY(dayTideData[0].height)}`;
  for (let i = 1; i < dayTideData.length; i++) {
    const x0 = getX(dayTideData[i - 1].time);
    const y0 = getY(dayTideData[i - 1].height);
    const x1 = getX(dayTideData[i].time);
    const y1 = getY(dayTideData[i].height);
    const cpx = (x0 + x1) / 2;
    pathD += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
  }

  // Fill path (close to bottom)
  const fillPathD = `${pathD} L ${getX(dayTideData[dayTideData.length - 1].time)} ${svgHeight - padding.bottom} L ${padding.left} ${svgHeight - padding.bottom} Z`;

  // Current time position
  const currentX = getX(currentTime);
  const currentY = currentTideHeight !== null ? getY(currentTideHeight) : null;

  // Format time for display
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'pm' : 'am';
    const hour12 = hours % 12 || 12;
    return minutes === 0 ? `${hour12}${period}` : `${hour12}:${minutes.toString().padStart(2, '0')}${period}`;
  };

  // Calculate shaded regions for dawn/dusk
  const firstLightX = getX(lightTimes.firstLight);
  const sunriseX = getX(lightTimes.sunrise);
  const sunsetX = getX(lightTimes.sunset);
  const lastLightX = getX(lightTimes.lastLight);

  // X-axis hour marks
  const hourMarks = [3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="mb-2">
        <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
          Tides (ft)
        </h3>
        <p className="text-xs text-gray-500" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
          {location}
        </p>
      </div>

      {/* Current tide badge */}
      {currentTideHeight !== null && (
        <div className="flex justify-center mb-2">
          <div className="bg-gray-100 border border-gray-300 rounded px-3 py-1">
            <span className="text-sm font-bold text-gray-900" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              {currentTideHeight.toFixed(1)}ft
            </span>
          </div>
        </div>
      )}

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <defs>
          {/* Gradient for fill under curve */}
          <linearGradient id="tideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Dawn shading (before first light) */}
        <rect
          x={padding.left}
          y={padding.top}
          width={Math.max(0, firstLightX - padding.left)}
          height={chartHeight}
          fill="#f1f5f9"
          opacity="0.8"
        />

        {/* Civil twilight morning (first light to sunrise) */}
        <rect
          x={firstLightX}
          y={padding.top}
          width={Math.max(0, sunriseX - firstLightX)}
          height={chartHeight}
          fill="#f8fafc"
          opacity="0.6"
        />

        {/* Civil twilight evening (sunset to last light) */}
        <rect
          x={sunsetX}
          y={padding.top}
          width={Math.max(0, lastLightX - sunsetX)}
          height={chartHeight}
          fill="#f8fafc"
          opacity="0.6"
        />

        {/* Dusk shading (after last light) */}
        <rect
          x={lastLightX}
          y={padding.top}
          width={Math.max(0, svgWidth - padding.right - lastLightX)}
          height={chartHeight}
          fill="#f1f5f9"
          opacity="0.8"
        />

        {/* X-axis line */}
        <line
          x1={padding.left}
          y1={svgHeight - padding.bottom}
          x2={svgWidth - padding.right}
          y2={svgHeight - padding.bottom}
          stroke="#d1d5db"
          strokeWidth="1"
        />

        {/* X-axis hour labels */}
        {hourMarks.map(hour => {
          const hourDate = new Date(currentTime);
          hourDate.setHours(hour, 0, 0, 0);
          const x = getX(hourDate);
          return (
            <g key={hour}>
              <line
                x1={x}
                y1={svgHeight - padding.bottom}
                x2={x}
                y2={svgHeight - padding.bottom + 3}
                stroke="#9ca3af"
                strokeWidth="1"
              />
              <text
                x={x}
                y={svgHeight - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
                fontFamily="Inter, sans-serif"
              >
                {hour > 12 ? hour - 12 : hour}
              </text>
            </g>
          );
        })}

        {/* Fill under curve */}
        <path d={fillPathD} fill="url(#tideGradient)" />

        {/* Main tide curve */}
        <path
          d={pathD}
          fill="none"
          stroke="#1f2937"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* High/Low tide markers and labels */}
        {tideExtremes
          .filter(e => e.time >= dayStart && e.time <= dayEnd)
          .map((extreme, idx) => {
            const x = getX(extreme.time);
            const y = getY(extreme.height);
            const labelY = extreme.type === 'high' ? y - 12 : y + 16;

            return (
              <g key={idx}>
                {/* Marker dot */}
                <circle
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#1f2937"
                />
                {/* Time and height label */}
                <text
                  x={x}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#6b7280"
                  fontFamily="Inter, sans-serif"
                >
                  {formatTime(extreme.time)}
                </text>
                <text
                  x={x}
                  y={labelY + (extreme.type === 'high' ? -10 : 10)}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#9ca3af"
                  fontFamily="Inter, sans-serif"
                >
                  {extreme.height.toFixed(1)}ft
                </text>
              </g>
            );
          })}

        {/* Current time indicator */}
        {currentY !== null && currentX >= padding.left && currentX <= svgWidth - padding.right && (
          <g>
            {/* Vertical line */}
            <line
              x1={currentX}
              y1={padding.top}
              x2={currentX}
              y2={svgHeight - padding.bottom}
              stroke="#374151"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            {/* Current time label at top */}
            <text
              x={currentX}
              y={padding.top - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#374151"
              fontWeight="600"
              fontFamily="Inter, sans-serif"
            >
              {formatTime(currentTime)}
            </text>
            {/* Current position dot */}
            <circle
              cx={currentX}
              cy={currentY}
              r="5"
              fill="#1f2937"
              stroke="white"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Sun times footer */}
      <div className="flex justify-between items-center mt-3 px-1 text-xs text-gray-500" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            <span className="text-gray-600 font-medium">First light</span>
            <span>{formatTime(lightTimes.firstLight)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600 font-medium">Sunrise</span>
            <span>{formatTime(lightTimes.sunrise)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 10V2M18.4 6.6l-1.4 1.4M22 12h-2M18.4 17.4l-1.4-1.4M12 22v-2M5.6 17.4l1.4-1.4M2 12h2M5.6 6.6l1.4 1.4" />
              <circle cx="12" cy="14" r="4" />
            </svg>
            <span className="text-gray-600 font-medium">Sunset</span>
            <span>{formatTime(lightTimes.sunset)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600 font-medium">Last light</span>
            <span>{formatTime(lightTimes.lastLight)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TideChart;
