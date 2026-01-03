import * as React from "react";

interface ArrowProps {
  /** Rotation in degrees (0 = up, 90 = right, 180 = down, 270 = left) */
  degrees?: number;
  /** Fill color for the arrow */
  color?: string;
  /** Size in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Standard SVG polygon arrow used across the application.
 * See DESIGN_SYSTEM.md for usage guidelines.
 */
export const Arrow = ({
  degrees = 0,
  color = "#1e293b",
  size = 16,
  className,
}: ArrowProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    style={{ transform: `rotate(${degrees}deg)` }}
    className={className}
  >
    <polygon points="8,2 13,14 8,11 3,14" fill={color} />
  </svg>
);

interface WindArrowBadgeProps {
  /** Wind direction in degrees (meteorological: where wind comes FROM) */
  directionDeg: number;
  /** Wind type determines badge color */
  windType: "offshore" | "onshore" | "cross" | "unknown";
  /** Size of the badge container */
  badgeSize?: "sm" | "md";
}

const WIND_BADGE_COLORS = {
  offshore: { bg: "#d1fae5", arrow: "#059669" },
  onshore: { bg: "#fee2e2", arrow: "#dc2626" },
  cross: { bg: "#e0f2fe", arrow: "#64748b" },
  unknown: { bg: "#f1f5f9", arrow: "#64748b" },
};

/**
 * Wind direction arrow inside a colored rounded badge.
 * Badge color indicates wind type (offshore=green, onshore=red, cross=blue).
 */
export const WindArrowBadge = ({
  directionDeg,
  windType,
  badgeSize = "md",
}: WindArrowBadgeProps) => {
  // Wind direction is where it comes FROM, so add 180 to show where it's GOING
  const rotation = (directionDeg + 180) % 360;
  const colors = WIND_BADGE_COLORS[windType] || WIND_BADGE_COLORS.unknown;
  const sizeClasses = badgeSize === "sm" ? "w-6 h-6" : "w-7 h-7";
  const arrowSize = badgeSize === "sm" ? 14 : 16;

  return (
    <div
      className={`${sizeClasses} rounded-lg flex items-center justify-center`}
      style={{ backgroundColor: colors.bg }}
    >
      <Arrow degrees={rotation} color={colors.arrow} size={arrowSize} />
    </div>
  );
};

interface SwellArrowProps {
  /** Swell direction in degrees (where swell comes FROM) */
  directionDeg: number;
  /** Size in pixels */
  size?: number;
  /** Whether this is a secondary swell (lighter color) */
  secondary?: boolean;
}

/**
 * Inline swell direction arrow (no badge).
 */
export const SwellArrow = ({
  directionDeg,
  size = 16,
  secondary = false,
}: SwellArrowProps) => {
  // Swell direction is where it comes FROM, add 180 to show direction of travel
  const rotation = (directionDeg + 180) % 360;
  const color = secondary ? "#94a3b8" : "#1e293b";

  return <Arrow degrees={rotation} color={color} size={size} />;
};

interface TrendArrowProps {
  /** Whether the trend is rising (true) or falling (false) */
  rising: boolean;
  /** Size in pixels */
  size?: number;
  /** Color override */
  color?: string;
}

/**
 * Trend indicator arrow (up for rising, down for falling).
 */
export const TrendArrow = ({ rising, size = 14, color }: TrendArrowProps) => {
  const degrees = rising ? 0 : 180;
  const fillColor = color || (rising ? "#1e293b" : "#94a3b8");

  return <Arrow degrees={degrees} color={fillColor} size={size} />;
};

interface ExpandArrowProps {
  /** Whether the section is expanded */
  expanded: boolean;
  /** Size in pixels */
  size?: number;
}

/**
 * Expand/collapse toggle arrow.
 */
export const ExpandArrow = ({ expanded, size = 12 }: ExpandArrowProps) => (
  <Arrow degrees={expanded ? 0 : 180} color="#64748b" size={size} />
);
