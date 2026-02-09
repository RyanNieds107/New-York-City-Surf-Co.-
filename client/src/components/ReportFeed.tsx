import { trpc } from "@/lib/trpc";
import { Star, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ReportFeedProps {
  spotId?: number; // If provided, show reports for this spot only
  limit?: number;
}

export function ReportFeed({ spotId, limit = 20 }: ReportFeedProps) {
  const { data: reports, isLoading } = spotId
    ? trpc.reports.getForSpot.useQuery({ spotId, limit })
    : trpc.reports.getRecentReports.useQuery({ limit });

  if (isLoading) {
    return <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border-2 border-gray-200 p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>;
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="bg-white border-2 border-gray-200 p-8 text-center">
        <p className="text-gray-500">No reports yet. Be the first to share!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div key={report.id} className="bg-white border-2 border-black p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-bold text-sm text-black" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {report.user?.name || "Anonymous"}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span>{formatDistanceToNow(new Date(report.sessionDate), { addSuffix: true })}</span>
                {!spotId && 'spot' in report && (
                  <>
                    <span>•</span>
                    <span>{report.spot?.name}</span>
                  </>
                )}
              </div>
            </div>

            {/* Star Rating */}
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= report.starRating
                      ? "fill-yellow-400 stroke-yellow-400"
                      : "stroke-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Photo */}
          {report.photoUrl && (
            <img
              src={report.photoUrl}
              alt="Session"
              className="w-full h-48 object-cover border-2 border-black mb-3"
            />
          )}

          {/* Quick Note */}
          {report.quickNote && (
            <p className="text-sm mb-2 text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              "{report.quickNote}"
            </p>
          )}

          {/* Crowd Level */}
          {report.crowdLevel && (
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <Users className="h-3.5 w-3.5" />
              <span>{["Empty", "Light", "Moderate", "Crowded", "Packed"][report.crowdLevel - 1]}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
