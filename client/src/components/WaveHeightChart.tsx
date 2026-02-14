import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import type { AreaChartDataPoint } from '@/lib/forecastUtils';

interface WaveHeightChartProps {
  data: AreaChartDataPoint[];
  selectedIndex?: number;
  onPointSelect?: (index: number, point: AreaChartDataPoint) => void;
}

// Color palette matching standard quality score system
// 0-39: Don't Bother (Red), 40-59: Worth a Look (Yellow), 60-75: Go Surf (Lime)
// 76-90: Firing (Green), 91-100: All-Time (Emerald)
const COLORS = {
  dontBother: '#ef4444',   // Red - Don't Bother (0-39)
  worthALook: '#eab308',   // Yellow - Worth a Look (40-59)
  goSurf: '#84cc16',       // Lime - Go Surf (60-75)
  firing: '#16a34a',       // Green - Firing (76-90)
  allTime: '#059669',      // Emerald - All-Time (91-100)
  background: '#f8fafc',   // Light gray-blue background
  dayBandEven: '#f1f5f9',  // Alternating day bands
  dayBandOdd: '#ffffff',
  headerBg: '#f1f5f9',     // Header background
  divider: '#e2e8f0',      // Soft dividers
  text: '#334155',         // Slate text
  textMuted: '#94a3b8',    // Muted text
  nowLine: '#3b82f6',      // Blue for current time
};

interface HoverData {
  index: number;
  x: number;
  y: number;
  point: AreaChartDataPoint;
}

interface DayGroup {
  day: string;
  date: number;
  startIdx: number;
  endIdx: number;
}

export function WaveHeightChart({ data, selectedIndex, onPointSelect }: WaveHeightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 320 });
  const [hover, setHover] = useState<HoverData | null>(null);

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setDimensions({ width, height: 320 });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  // Chart configuration
  const config = useMemo(() => {
    const padding = { top: 45, right: 20, bottom: 50, left: 50 };
    const chartWidth = Math.max(dimensions.width - padding.left - padding.right, 100);
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    return { padding, chartWidth, chartHeight };
  }, [dimensions]);

  // Process data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Group by day and extract date number
    const dayGroups: DayGroup[] = [];
    let currentDay = '';

    data.forEach((point, idx) => {
      if (point.dayLabel !== currentDay) {
        if (currentDay) {
          dayGroups[dayGroups.length - 1].endIdx = idx - 1;
        }
        // Extract date number from timestamp
        const dateNum = new Date(point.timestamp).getDate();
        dayGroups.push({ day: point.dayLabel, date: dateNum, startIdx: idx, endIdx: idx });
        currentDay = point.dayLabel;
      }
    });
    if (dayGroups.length > 0) {
      dayGroups[dayGroups.length - 1].endIdx = data.length - 1;
    }

    // Calculate Y scale
    const maxHeight = Math.max(...data.map(d => d.waveHeight), 2);
    const yMax = Math.ceil(maxHeight / 2) * 2 + 2;

    // Y-axis ticks
    const yTicks: number[] = [];
    for (let i = 2; i <= yMax; i += 2) {
      yTicks.push(i);
    }

    // Find "now" index - closest to current time
    const now = Date.now();
    let nowIndex = 0;
    let minDiff = Infinity;
    data.forEach((point, idx) => {
      const diff = Math.abs(new Date(point.timestamp).getTime() - now);
      if (diff < minDiff) {
        minDiff = diff;
        nowIndex = idx;
      }
    });

    // Get current time label
    const nowPoint = data[nowIndex];
    const nowTimeLabel = nowPoint ? nowPoint.timeLabel : '';

    return { points: data, dayGroups, yMax, yTicks, nowIndex, nowTimeLabel };
  }, [data]);

  // Scale functions
  const xScale = useCallback((idx: number) => {
    if (!chartData) return 0;
    const { padding, chartWidth } = config;
    return padding.left + (idx / Math.max(chartData.points.length - 1, 1)) * chartWidth;
  }, [config, chartData]);

  const yScale = useCallback((value: number) => {
    if (!chartData) return 0;
    const { padding, chartHeight } = config;
    return padding.top + chartHeight - (value / chartData.yMax) * chartHeight;
  }, [config, chartData]);

  // Generate colored segments with smooth cardinal-spline curves (Surf Captain–style rounded UI)
  const CARDINAL_TENSION = 0.5;
  const generateColoredSegments = useCallback(() => {
    if (!chartData || chartData.points.length === 0) return [];

    const segments: { path: string; color: string }[] = [];
    const points = chartData.points;
    const baseY = yScale(0);
    const getX = (idx: number) => xScale(idx);
    const getY = (idx: number) => yScale(points[idx].waveHeight);

    let segmentStart = 0;
    let currentColor = COLORS[points[0].condition];

    for (let i = 1; i <= points.length; i++) {
      const isEnd = i === points.length;
      const colorChanged = !isEnd && COLORS[points[i].condition] !== currentColor;

      if (isEnd || colorChanged) {
        const segmentEnd = isEnd ? i - 1 : i;
        let path = `M ${getX(segmentStart)} ${baseY}`;
        path += ` L ${getX(segmentStart)} ${getY(segmentStart)}`;

        // Cardinal spline through segment points for smooth, rounded peaks/valleys
        const n = segmentEnd - segmentStart;
        if (n >= 1) {
          for (let j = segmentStart; j < segmentEnd; j++) {
            const p0 = j - 1 < segmentStart ? j : j - 1;
            const p1 = j;
            const p2 = j + 1;
            const p3 = j + 2 > segmentEnd ? j + 1 : j + 2;
            const k = (1 - CARDINAL_TENSION) / 6;
            const cp1x = getX(p1) + (getX(p2) - getX(p0)) * k;
            const cp1y = getY(p1) + (getY(p2) - getY(p0)) * k;
            const cp2x = getX(p2) - (getX(p3) - getX(p1)) * k;
            const cp2y = getY(p2) - (getY(p3) - getY(p1)) * k;
            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${getX(p2)} ${getY(p2)}`;
          }
        }

        path += ` L ${getX(segmentEnd)} ${baseY} Z`;
        segments.push({ path, color: currentColor });

        if (!isEnd) {
          segmentStart = i;
          currentColor = COLORS[points[i].condition];
        }
      }
    }

    return segments;
  }, [chartData, xScale, yScale]);

  // Mouse interaction
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!chartData || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let closestIdx = 0;
    let closestDist = Infinity;

    chartData.points.forEach((_, idx) => {
      const pointX = xScale(idx);
      const dist = Math.abs(mouseX - pointX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    const point = chartData.points[closestIdx];
    setHover({
      index: closestIdx,
      x: xScale(closestIdx),
      y: yScale(point.waveHeight),
      point,
    });

    // Call onPointSelect callback
    if (onPointSelect) {
      onPointSelect(closestIdx, point);
    }
  }, [chartData, xScale, yScale, onPointSelect]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!chartData || !svgRef.current || !onPointSelect) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let closestIdx = 0;
    let closestDist = Infinity;

    chartData.points.forEach((_, idx) => {
      const pointX = xScale(idx);
      const dist = Math.abs(mouseX - pointX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    onPointSelect(closestIdx, chartData.points[closestIdx]);
  }, [chartData, xScale, onPointSelect]);

  const handleMouseLeave = useCallback(() => {
    setHover(null);
  }, []);

  // Touch interaction for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    if (!chartData || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;

    let closestIdx = 0;
    let closestDist = Infinity;

    chartData.points.forEach((_, idx) => {
      const pointX = xScale(idx);
      const dist = Math.abs(touchX - pointX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    const point = chartData.points[closestIdx];
    setHover({
      index: closestIdx,
      x: xScale(closestIdx),
      y: yScale(point.waveHeight),
      point,
    });

    // Call onPointSelect callback
    if (onPointSelect) {
      onPointSelect(closestIdx, point);
    }
  }, [chartData, xScale, yScale, onPointSelect]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    if (!chartData || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;

    let closestIdx = 0;
    let closestDist = Infinity;

    chartData.points.forEach((_, idx) => {
      const pointX = xScale(idx);
      const dist = Math.abs(touchX - pointX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    const point = chartData.points[closestIdx];
    setHover({
      index: closestIdx,
      x: xScale(closestIdx),
      y: yScale(point.waveHeight),
      point,
    });

    // Call onPointSelect callback
    if (onPointSelect) {
      onPointSelect(closestIdx, point);
    }
  }, [chartData, xScale, yScale, onPointSelect]);

  const handleTouchEnd = useCallback(() => {
    // Keep the last selected point visible on touch end
    // Don't clear hover on mobile - let the selected point stay
  }, []);

  // Empty state
  if (!data || data.length === 0 || !chartData) {
    return (
      <div
        ref={containerRef}
        className="w-full border border-black bg-white"
      >
        <div className="p-6 border-b-2 border-black">
          <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            WAVE HEIGHT CHART
          </span>
        </div>
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-sm text-gray-500 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            No forecast data available
          </p>
        </div>
      </div>
    );
  }

  const { padding, chartWidth, chartHeight } = config;
  const coloredSegments = generateColoredSegments();
  const nowX = xScale(chartData.nowIndex);

  return (
    <div
      ref={containerRef}
      className="w-full select-none relative bg-white border border-black overflow-hidden"
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: 'crosshair', touchAction: 'none' }}
      >
        <defs>
          {/* Gradient for each condition color - adds subtle depth */}
          <linearGradient id="dontBotherGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.dontBother} stopOpacity={0.9} />
            <stop offset="100%" stopColor={COLORS.dontBother} stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="worthALookGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.worthALook} stopOpacity={0.9} />
            <stop offset="100%" stopColor={COLORS.worthALook} stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="goSurfGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.goSurf} stopOpacity={0.9} />
            <stop offset="100%" stopColor={COLORS.goSurf} stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="firingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.firing} stopOpacity={0.9} />
            <stop offset="100%" stopColor={COLORS.firing} stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="allTimeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.allTime} stopOpacity={0.9} />
            <stop offset="100%" stopColor={COLORS.allTime} stopOpacity={0.7} />
          </linearGradient>
        </defs>

        {/* Day header bar background */}
        <rect
          x={0}
          y={0}
          width={dimensions.width}
          height={padding.top - 5}
          fill={COLORS.headerBg}
        />

        {/* Day columns - alternating backgrounds with subtle rounded corners */}
        {chartData.dayGroups.map((group, i) => {
          const startX = i === 0 ? padding.left : xScale(group.startIdx);
          const endX = i === chartData.dayGroups.length - 1
            ? padding.left + chartWidth
            : xScale(group.endIdx + 1);
          const width = endX - startX;
          const rx = 4;
          const ry = 4;

          return (
            <rect
              key={`bg-${group.day}`}
              x={startX}
              y={padding.top}
              width={width}
              height={chartHeight}
              rx={rx}
              ry={ry}
              fill={i % 2 === 0 ? COLORS.dayBandEven : COLORS.dayBandOdd}
            />
          );
        })}

        {/* Day headers */}
        {chartData.dayGroups.map((group, i) => {
          const startX = i === 0 ? padding.left : xScale(group.startIdx);
          const endX = i === chartData.dayGroups.length - 1
            ? padding.left + chartWidth
            : xScale(group.endIdx + 1);
          const centerX = (startX + endX) / 2;

          return (
            <g key={group.day}>
              {/* Day divider line - subtle */}
              {i > 0 && (
                <line
                  x1={startX}
                  y1={0}
                  x2={startX}
                  y2={padding.top + chartHeight}
                  stroke={COLORS.divider}
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />
              )}
              {/* Day label - e.g., "WED 24" */}
              <text
                x={centerX}
                y={25}
                textAnchor="middle"
                fill={COLORS.text}
                fontSize={12}
                fontWeight={500}
                fontFamily="'JetBrains Mono', monospace"
                letterSpacing="0.05em"
              >
                {group.day.slice(0, 3).toUpperCase()} {group.date}
              </text>
            </g>
          );
        })}

        {/* Y-axis labels */}
        {chartData.yTicks.map(tick => (
          <text
            key={tick}
            x={padding.left - 10}
            y={yScale(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            fill={COLORS.textMuted}
            fontSize={12}
            fontWeight={500}
            fontFamily="'Inter', system-ui, sans-serif"
          >
            {tick}ft
          </text>
        ))}

        {/* Horizontal grid lines - subtle for rounded UI */}
        {chartData.yTicks.map(tick => (
          <line
            key={`grid-${tick}`}
            x1={padding.left}
            y1={yScale(tick)}
            x2={padding.left + chartWidth}
            y2={yScale(tick)}
            stroke={COLORS.divider}
            strokeWidth={1}
            strokeOpacity={0.45}
          />
        ))}

        {/* Colored area segments */}
        {coloredSegments.map((segment, i) => {
          // Map color to gradient
          let gradientId = 'worthALookGradient';
          if (segment.color === COLORS.dontBother) gradientId = 'dontBotherGradient';
          if (segment.color === COLORS.worthALook) gradientId = 'worthALookGradient';
          if (segment.color === COLORS.goSurf) gradientId = 'goSurfGradient';
          if (segment.color === COLORS.firing) gradientId = 'firingGradient';
          if (segment.color === COLORS.allTime) gradientId = 'allTimeGradient';

          return (
            <path
              key={i}
              d={segment.path}
              fill={`url(#${gradientId})`}
            />
          );
        })}

        {/* Baseline - subtle */}
        <line
          x1={padding.left}
          y1={yScale(0)}
          x2={padding.left + chartWidth}
          y2={yScale(0)}
          stroke={COLORS.divider}
          strokeWidth={1}
          strokeOpacity={0.5}
        />

        {/* Current time indicator - vertical line */}
        <line
          x1={nowX}
          y1={padding.top}
          x2={nowX}
          y2={padding.top + chartHeight}
          stroke={COLORS.nowLine}
          strokeWidth={2}
        />

        {/* Current time label */}
        <text
          x={nowX}
          y={padding.top + chartHeight + 18}
          textAnchor="middle"
          fill={COLORS.nowLine}
          fontSize={11}
          fontWeight={600}
          fontFamily="'Inter', system-ui, sans-serif"
        >
          {chartData.nowTimeLabel}
        </text>

        {/* Triangle marker below current time */}
        <polygon
          points={`${nowX - 8},${padding.top + chartHeight + 28} ${nowX + 8},${padding.top + chartHeight + 28} ${nowX},${padding.top + chartHeight + 42}`}
          fill={COLORS.nowLine}
        />

        {/* Selected point indicator */}
        {selectedIndex !== undefined && selectedIndex >= 0 && selectedIndex < chartData.points.length && (
          <>
            <line
              x1={xScale(selectedIndex)}
              y1={padding.top}
              x2={xScale(selectedIndex)}
              y2={padding.top + chartHeight}
              stroke="#ef4444"
              strokeWidth={2}
            />
            <circle
              cx={xScale(selectedIndex)}
              cy={yScale(chartData.points[selectedIndex].waveHeight)}
              r={10}
              fill="#ef4444"
              stroke="#fff"
              strokeWidth={3}
            />
            <circle
              cx={xScale(selectedIndex)}
              cy={yScale(chartData.points[selectedIndex].waveHeight)}
              r={4}
              fill="#fff"
            />
            {/* Red triangle marker below */}
            <polygon
              points={`${xScale(selectedIndex) - 8},${padding.top + chartHeight + 28} ${xScale(selectedIndex) + 8},${padding.top + chartHeight + 28} ${xScale(selectedIndex)},${padding.top + chartHeight + 42}`}
              fill="#ef4444"
            />
          </>
        )}

        {/* Hover elements */}
        {hover && (
          <>
            <line
              x1={hover.x}
              y1={padding.top}
              x2={hover.x}
              y2={padding.top + chartHeight}
              stroke={COLORS.text}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.5}
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r={8}
              fill={COLORS[hover.point.condition]}
              stroke="#fff"
              strokeWidth={3}
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r={4}
              fill="#fff"
            />
          </>
        )}
      </svg>

      {/* Hover tooltip */}
      {hover && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: Math.min(Math.max(hover.x - 80, 10), dimensions.width - 170),
            top: 60,
          }}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3" style={{ minWidth: 160 }}>
            {/* Time label */}
            <div className="text-xs text-gray-500 mb-1">
              {hover.point.dayLabel} at {hover.point.timeLabel}
            </div>

            {/* Wave height */}
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-gray-900">
                {hover.point.waveHeight.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-gray-500">
                ft
              </span>
            </div>

            {/* Swell label */}
            {hover.point.swellLabel && (
              <div className="text-xs text-gray-500 mb-2">
                {hover.point.swellLabel}
              </div>
            )}

            {/* Condition badge */}
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: COLORS[hover.point.condition],
                color: hover.point.condition === 'worthALook' || hover.point.condition === 'goSurf' ? '#000' : '#fff'
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full opacity-80" style={{ backgroundColor: hover.point.condition === 'worthALook' || hover.point.condition === 'goSurf' ? '#000' : '#fff' }} />
              {hover.point.condition === 'dontBother' ? "Don't Bother" :
               hover.point.condition === 'worthALook' ? 'Worth a Look' :
               hover.point.condition === 'goSurf' ? 'Go Surf' :
               hover.point.condition === 'firing' ? 'Firing' :
               'All-Time'}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
        {[
          { key: 'allTime', label: 'All-Time', color: COLORS.allTime },
          { key: 'firing', label: 'Firing', color: COLORS.firing },
          { key: 'goSurf', label: 'Go Surf', color: COLORS.goSurf },
          { key: 'worthALook', label: 'Worth a Look', color: COLORS.worthALook },
          { key: 'dontBother', label: "Don't Bother", color: COLORS.dontBother },
        ].map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 border border-black"
              style={{ backgroundColor: color }}
            />
            <span
              className="text-[9px] font-medium tracking-wide text-black uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
