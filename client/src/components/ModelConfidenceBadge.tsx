import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle } from "lucide-react";

export type ModelConfidenceLevel = "HIGH" | "MED" | "LOW" | null;

interface ModelConfidenceBadgeProps {
  confidence: ModelConfidenceLevel;
  showIcon?: boolean;
  size?: "sm" | "md";
}

/**
 * Displays model confidence based on Open-Meteo vs ECMWF agreement.
 *
 * - HIGH: Models agree within 0.5ft → "High Confidence" (green)
 * - MED: Models agree within 1.5ft → No badge (null)
 * - LOW: Models disagree > 1.5ft → "Forecast Uncertain" (yellow)
 */
export function ModelConfidenceBadge({
  confidence,
  showIcon = true,
  size = "sm",
}: ModelConfidenceBadgeProps) {
  // MED or null = no badge displayed
  if (confidence === "MED" || confidence === null) {
    return null;
  }

  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  if (confidence === "HIGH") {
    return (
      <Badge
        variant="default"
        className={`bg-green-600 hover:bg-green-700 text-white ${sizeClasses} inline-flex items-center gap-1`}
      >
        {showIcon && <CheckCircle className={iconSize} />}
        High Confidence
      </Badge>
    );
  }

  if (confidence === "LOW") {
    return (
      <Badge
        variant="default"
        className={`bg-yellow-500 hover:bg-yellow-600 text-black ${sizeClasses} inline-flex items-center gap-1`}
      >
        {showIcon && <AlertTriangle className={iconSize} />}
        Forecast Uncertain
      </Badge>
    );
  }

  return null;
}

/**
 * Inline confidence indicator for use in timeline/hourly views.
 * More compact than the full badge.
 */
export function ModelConfidenceIndicator({
  confidence,
}: {
  confidence: ModelConfidenceLevel;
}) {
  if (confidence === "MED" || confidence === null) {
    return null;
  }

  if (confidence === "HIGH") {
    return (
      <span className="inline-flex items-center text-green-600" title="High Confidence - Models agree">
        <CheckCircle className="h-3 w-3" />
      </span>
    );
  }

  if (confidence === "LOW") {
    return (
      <span className="inline-flex items-center text-yellow-600" title="Forecast Uncertain - Models disagree">
        <AlertTriangle className="h-3 w-3" />
      </span>
    );
  }

  return null;
}
