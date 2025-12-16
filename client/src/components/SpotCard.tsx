import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

export type SpotCardProps = {
  name: string;
  score: number;
  label: "Good" | "Fair" | "Poor" | string;
  confidence: "High" | "Medium" | "Low" | string;
  waveHeightFt: number;
  windSummary: string; // e.g. "Offshore · 12 kts"
  periodSummary: string; // e.g. "13s primary"
  lastUpdated: string; // formatted time
  onClick?: () => void; // navigate to detail
};

export function SpotCard({
  name,
  score,
  label,
  confidence,
  waveHeightFt,
  windSummary,
  periodSummary,
  lastUpdated,
  onClick,
}: SpotCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getLabelColor = (label: string) => {
    if (label === "Good" || label === "Excellent") return "text-green-600";
    if (label === "Fair") return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (band: string) => {
    switch (band) {
      case "High":
        return <Badge variant="default" className="bg-green-600 text-xs">High Confidence</Badge>;
      case "Medium":
        return <Badge variant="secondary" className="bg-yellow-600 text-white text-xs">Medium Confidence</Badge>;
      default:
        return <Badge variant="outline" className="border-red-500 text-red-500 text-xs">Low Confidence</Badge>;
    }
  };

  return (
    <Card
      className="bg-white border-black hover:border-black transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Top Row: Name + Score */}
        <div className="flex items-start justify-between mb-3">
          {/* Left: Name + "Today's conditions" */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-black group-hover:text-black transition-colors mb-1">
              {name}
            </h3>
            <p className="text-xs text-black">Today's conditions</p>
          </div>

          {/* Right: Score Circle + Label */}
          <div className="flex flex-col items-end gap-2">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center ${getScoreColor(score)}`}
            >
              <span className="text-xl font-bold text-white">{score}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs font-medium ${getLabelColor(label)}`}>{label}</span>
              {getConfidenceBadge(confidence)}
            </div>
          </div>
        </div>

        {/* Stats Row: Height, Wind, Period */}
        <div className="grid grid-cols-3 gap-2 py-2 px-2 bg-gray-50 rounded-lg mb-2">
          <div className="text-center">
            <p className="text-xs text-black mb-0.5">Height</p>
            <p className="text-sm font-semibold text-black">{waveHeightFt.toFixed(1)} ft</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-black mb-0.5">Wind</p>
            <p className="text-sm font-semibold text-black">{windSummary}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-black mb-0.5">Period</p>
            <p className="text-sm font-semibold text-black">{periodSummary}</p>
          </div>
        </div>

        {/* Bottom: Last Updated + Arrow */}
        <div className="flex items-center justify-between pt-2 border-t border-black">
          <p className="text-xs text-black">Updated {lastUpdated}</p>
          <ArrowRight className="h-4 w-4 text-black group-hover:text-black transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

