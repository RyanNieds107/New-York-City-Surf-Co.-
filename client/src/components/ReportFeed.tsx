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
    <div className="divide-y divide-gray-100 border-2 border-black">
      {reports.map((report) => (
        <div key={report.id} className="bg-white px-3 py-2.5">
          {/* Row: name/meta on left, stars on right */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-xs text-black truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {report.user?.name || "Anonymous"}
              </span>
              <span className="text-gray-400 text-xs">·</span>
              <span className="text-xs text-gray-500 truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {formatDistanceToNow(new Date(report.sessionDate), { addSuffix: true })}
              </span>
              {!spotId && 'spot' in report && (
                <>
                  <span className="text-gray-400 text-xs">·</span>
                  <span className="text-xs text-gray-500 truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{report.spot?.name}</span>
                </>
              )}
            </div>
            <div className="flex gap-0.5 flex-shrink-0">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= report.starRating
                      ? "fill-yellow-400 stroke-yellow-400"
                      : "stroke-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Note + crowd on same line */}
          {(report.quickNote || report.crowdLevel) && (
            <div className="flex items-center gap-3 mt-0.5">
              {report.quickNote && (
                <p className="text-xs text-gray-500 italic truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  "{report.quickNote}"
                </p>
              )}
              {report.crowdLevel && (
                <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                  <Users className="h-3 w-3" />
                  <span>{["Empty", "Light", "Moderate", "Crowded", "Packed"][report.crowdLevel - 1]}</span>
                </div>
              )}
            </div>
          )}

          {/* Photo (kept but smaller) */}
          {report.photoUrl && (
            <img
              src={report.photoUrl}
              alt="Session"
              className="w-full h-32 object-cover border border-gray-200 mt-2"
            />
          )}
        </div>
      ))}
    </div>
  );
}
