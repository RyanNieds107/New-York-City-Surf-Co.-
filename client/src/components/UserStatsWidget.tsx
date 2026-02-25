import { trpc } from "@/lib/trpc";
import { Trophy, Users, TrendingUp } from "lucide-react";

export function UserStatsWidget() {
  const { data: stats, isLoading } = trpc.reports.getUserStats.useQuery();

  if (isLoading) {
    return <div className="bg-white border-2 border-gray-200 p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>;
  }

  if (!stats) return null;

  const rankColors = {
    Bronze: "bg-amber-700",
    Silver: "bg-gray-400",
    Gold: "bg-yellow-400",
    Diamond: "bg-blue-400",
  };

  return (
    <div className="bg-white border-2 border-black px-3 py-2.5 flex items-center gap-3">
      <div className={`w-8 h-8 flex-shrink-0 ${rankColors[stats.rank]} flex items-center justify-center`}>
        <Trophy className="h-4 w-4 text-white" />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-base font-black uppercase text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          {stats.rank}
        </span>
        <span className="text-xs text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          · Top {100 - stats.percentile}% Contributor
        </span>
      </div>
      <div className="ml-auto flex items-center gap-4 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <span className="text-gray-500">{stats.reportCount} <span className="text-gray-400">reports</span></span>
        <span className="text-gray-500">{stats.impactStats.helpedUsers} <span className="text-gray-400">helped</span></span>
      </div>
    </div>
  );
}
