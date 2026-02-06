import { format } from "date-fns";

export function AnnouncementsFeed() {
  // For now, hardcoded announcements
  // Later can be pulled from a database table
  const announcements = [
    {
      id: 1,
      title: "Welcome to Long Island Surf Forecast",
      message: "Set up your surf alerts and start getting notified when the waves are good!",
      date: new Date(),
      type: "info"
    },
    {
      id: 2,
      title: "Share Your Sessions",
      message: "Help the community by submitting post-surf reports with photos and ratings.",
      date: new Date(),
      type: "info"
    }
  ];

  return (
    <div className="space-y-3">
      {announcements.map(announcement => (
        <div key={announcement.id} className="bg-white border-2 border-black p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-bold uppercase mb-1"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {announcement.title}
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed">
                {announcement.message}
              </p>
            </div>
            <span className="text-[10px] text-gray-500 uppercase whitespace-nowrap"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {format(announcement.date, 'MMM d')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
