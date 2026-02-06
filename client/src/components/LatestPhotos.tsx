import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

export function LatestPhotos() {
  const { data: reports } = trpc.reports.getRecentReports.useQuery(12);

  // Filter reports that have photos
  const reportsWithPhotos = reports?.filter(r => r.photoUrl) || [];

  if (reportsWithPhotos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No photos yet. Submit a surf report with a photo to get started!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {reportsWithPhotos.map(report => (
        <div key={report.id} className="group relative aspect-square overflow-hidden border-2 border-black bg-gray-100">
          <img
            src={report.photoUrl}
            alt={`${report.spotName} - ${format(new Date(report.sessionDate), 'MMM d')}`}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
              <p className="text-xs font-bold uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {report.spotName}
              </p>
              <p className="text-[10px]">
                {format(new Date(report.sessionDate), 'MMM d, yyyy')}
              </p>
              {report.starRating && (
                <p className="text-[10px]">
                  {'⭐'.repeat(report.starRating)}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
