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
    <div className="bg-white border-2 border-black p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 ${rankColors[stats.rank]} flex items-center justify-center`}>
          <Trophy className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {stats.rank}
          </h3>
          <p className="text-xs text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Top {100 - stats.percentile}% Contributor
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Reports Submitted</span>
          <span className="font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.reportCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Users Helped</span>
          <span className="font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.impactStats.helpedUsers}</span>
        </div>
      </div>

      {stats.reportCount > 0 && (
        <div className="mt-4 pt-4 border-t-2 border-gray-200">
          <p className="text-sm text-gray-600">
            Your {stats.reportCount} {stats.reportCount === 1 ? 'report has' : 'reports have'} helped improve forecasts for the community!
          </p>
        </div>
      )}
    </div>
  );
}
