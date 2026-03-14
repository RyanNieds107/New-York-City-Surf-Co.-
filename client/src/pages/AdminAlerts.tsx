import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Send, Users, Eye, BarChart2, Bell, FileText, TrendingUp, Waves } from "lucide-react";

const monoStyle = { fontFamily: "'JetBrains Mono', monospace" };
const bebasStyle = { fontFamily: "'Bebas Neue', sans-serif" };
const oswaldStyle = { fontFamily: "'Oswald', sans-serif" };

type Tab = "users" | "overview" | "alerts" | "broadcast" | "swelllog";

export default function AdminAlerts() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("users");

  const { data: alerts, isLoading: alertsLoading } = trpc.admin.alerts.getAll.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  const { data: analytics, isLoading: analyticsLoading } = trpc.admin.analytics.getStats.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  const { data: bigSwellDays, isLoading: swellLoading } = trpc.admin.analytics.getBigSwellDays.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" && activeTab === "swelllog" }
  );

  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("NYC Surf Co. Alert");
  const [sendEmail, setSendEmail] = useState(true);

  const sendBulkAlertMutation = trpc.admin.alerts.sendBulkAlert.useMutation({
    onSuccess: (result) => {
      toast.success(`Sent ${result.emailSent} emails`);
      setMessage("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send alerts");
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="border-2 border-white p-8 max-w-md w-full mx-4 text-center">
          <h1 className="text-4xl text-white mb-4" style={bebasStyle}>ACCESS DENIED</h1>
          <p className="text-gray-400 mb-6" style={monoStyle}>You must be an admin to access this page.</p>
          <button
            onClick={() => setLocation("/dashboard")}
            className="bg-white text-black px-6 py-2 font-bold uppercase tracking-widest text-sm hover:bg-gray-200"
            style={monoStyle}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const formatCriteria = (alert: NonNullable<typeof alerts>[0]): string => {
    const criteria = [];
    if (alert.minWaveHeightFt) criteria.push(`${alert.minWaveHeightFt}ft+`);
    if (alert.minQualityScore) criteria.push(`Q${alert.minQualityScore}+`);
    if (alert.minPeriodSec) criteria.push(`${alert.minPeriodSec}s+`);
    if (alert.idealWindOnly === 1) criteria.push("ideal wind");
    return criteria.length > 0 ? criteria.join(" · ") : "default";
  };

  const formatTimeAgo = (date: Date | string): string => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "users", label: "MEMBERS" },
    { id: "overview", label: "OVERVIEW" },
    { id: "alerts", label: "ALERTS" },
    { id: "broadcast", label: "BROADCAST" },
    { id: "swelllog", label: "SWELL LOG" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b-2 border-white px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-5xl sm:text-6xl text-white leading-none" style={bebasStyle}>ADMIN</h1>
            <p className="text-gray-400 text-xs mt-2" style={monoStyle}>NYC Surf Co.</p>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <button onClick={() => setLocation("/admin/forecasts")} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest" style={monoStyle}>
              Forecasts →
            </button>
            <button onClick={() => setLocation("/dashboard")} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest" style={monoStyle}>
              ← Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/20 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-[10px] uppercase tracking-widest border-b-2 transition-colors ${
                activeTab === tab.id ? "border-white text-white" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
              style={monoStyle}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-4">

        {/* ── MEMBERS TAB ── */}
        {activeTab === "users" && (
          <div className="border border-white/20">
            <div className="border-b border-white/20 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>Members</span>
              {analytics && (
                <span className="text-[10px] text-gray-500 uppercase tracking-widest" style={monoStyle}>
                  {analytics.totalUsers} total · {analytics.activeLast30Days} active this month
                </span>
              )}
            </div>
            {analyticsLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/10" />)}
              </div>
            ) : !analytics?.allUsers?.length ? (
              <div className="py-12 text-center">
                <p className="text-gray-600 text-xs uppercase tracking-widest" style={monoStyle}>No members yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={monoStyle}>
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Email</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Name</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Auth</th>
                      <th className="text-center px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Views</th>
                      <th className="text-center px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Reports</th>
                      <th className="text-center px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Alerts</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Last Seen</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.allUsers.map(u => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-2.5 text-white max-w-[200px] truncate">{u.email || "—"}</td>
                        <td className="px-4 py-2.5 text-gray-300">{u.name || "—"}</td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {u.loginMethod?.includes("google") ? "Google" : u.loginMethod?.includes("magic") ? "Email" : u.loginMethod || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-center text-gray-300">{u.viewCount || <span className="text-gray-700">—</span>}</td>
                        <td className="px-4 py-2.5 text-center text-gray-300">{u.reportCount || <span className="text-gray-700">—</span>}</td>
                        <td className="px-4 py-2.5 text-center">
                          {u.alertCount > 0
                            ? <span className="text-green-400">{u.alertCount}</span>
                            : <span className="text-gray-700">—</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-gray-400">{formatTimeAgo(u.lastSignedIn)}</td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          analyticsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 bg-white/10" />)}
            </div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard icon={<Users className="h-3.5 w-3.5" />} label="Total Members" value={analytics.totalUsers} sub={`+${analytics.newLast7Days} this week`} />
                <StatCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Active (30d)" value={analytics.activeLast30Days} sub={`of ${analytics.totalUsers} members`} highlight />
                <StatCard icon={<Users className="h-3.5 w-3.5" />} label="New (30d)" value={analytics.newLast30Days} sub={`+${analytics.newLast7Days} last 7 days`} />
                <StatCard icon={<Eye className="h-3.5 w-3.5" />} label="Views (7d)" value={analytics.viewsLast7Days} sub={`${analytics.uniqueViewers} unique visitors`} />
                <StatCard icon={<Bell className="h-3.5 w-3.5" />} label="Alert Subscribers" value={analytics.alertUsers} sub={`${analytics.activeAlerts} active alerts`} />
                <StatCard icon={<FileText className="h-3.5 w-3.5" />} label="Surf Reports" value={analytics.totalReports} sub={analytics.avgRating > 0 ? `avg ${analytics.avgRating}★` : "none yet"} />
              </div>

              {analytics.topSpots.length > 0 && (
                <div className="border border-white/20">
                  <div className="border-b border-white/20 px-4 py-3">
                    <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>Top Spots · Last 30 Days</span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {analytics.topSpots.map((spot, i) => {
                      const max = analytics.topSpots[0]?.viewCount ?? 1;
                      const pct = Math.round((spot.viewCount / max) * 100);
                      return (
                        <div key={spot.name} className="flex items-center gap-3">
                          <span className="text-[10px] text-gray-700 w-3" style={monoStyle}>{i + 1}</span>
                          <span className="text-xs text-gray-300 w-32 flex-shrink-0" style={monoStyle}>{spot.name}</span>
                          <div className="flex-1 h-px bg-white/10">
                            <div className="h-px bg-white/50" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-500 w-14 text-right" style={monoStyle}>{spot.viewCount} views</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="border border-white/20 p-8 text-center">
              <p className="text-gray-600 text-xs uppercase tracking-widest" style={monoStyle}>Failed to load analytics</p>
            </div>
          )
        )}

        {/* ── ALERTS TAB ── */}
        {activeTab === "alerts" && (
          <div className="border border-white/20">
            <div className="border-b border-white/20 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>Alert Subscribers</span>
              {alerts && (
                <span className="text-[10px] text-gray-500 uppercase tracking-widest" style={monoStyle}>{alerts.length} total</span>
              )}
            </div>
            {alertsLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full bg-white/10" />)}
              </div>
            ) : !alerts?.length ? (
              <div className="py-12 text-center">
                <p className="text-gray-600 text-xs uppercase tracking-widest" style={monoStyle}>No alerts configured</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={monoStyle}>
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Email</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Spot</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Criteria</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map(alert => (
                      <tr key={alert.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-2.5 text-white">{alert.userEmail || "—"}</td>
                        <td className="px-4 py-2.5 text-gray-300">{alert.spotName || "All Spots"}</td>
                        <td className="px-4 py-2.5 text-gray-400">{formatCriteria(alert)}</td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {new Date(alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── SWELL LOG TAB ── */}
        {activeTab === "swelllog" && (
          <div className="border border-white/20">
            <div className="border-b border-white/20 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>Historic Big Swell Days</span>
              {bigSwellDays && (
                <span className="text-[10px] text-gray-500 uppercase tracking-widest" style={monoStyle}>
                  {bigSwellDays.length} events · 5ft+ · 7s+ period · offshore wind
                </span>
              )}
            </div>
            {swellLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/10" />)}
              </div>
            ) : !bigSwellDays?.length ? (
              <div className="py-12 text-center">
                <Waves className="h-6 w-6 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-600 text-xs uppercase tracking-widest" style={monoStyle}>No firing days recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={monoStyle}>
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Date</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Buoy</th>
                      <th className="text-right px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Peak Height</th>
                      <th className="text-right px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Period</th>
                      <th className="text-right px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Swell Dir</th>
                      <th className="text-right px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Wind</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bigSwellDays.map((day, i) => (
                      <tr key={`${day.date}-${day.buoyId}`} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-2.5 text-gray-300">
                          {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-2.5 text-gray-400">{day.spotName}</td>
                        <td className={`px-4 py-2.5 text-right font-bold ${day.peakHeightFt >= 6 ? "text-white" : "text-gray-300"}`}>
                          {day.peakHeightFt}ft
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-400">
                          {day.periodSec ? `${day.periodSec}s` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-400">
                          {day.directionDeg != null ? `${day.directionDeg}° ${degreesToCardinal(day.directionDeg)}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-green-400">
                          {day.windDirDeg != null ? `${degreesToCardinal(day.windDirDeg)} offshore` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── BROADCAST TAB ── */}
        {activeTab === "broadcast" && (
          <div className="border border-white/20">
            <div className="border-b border-white/20 px-4 py-3">
              <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>Send Bulk Email</span>
              <p className="text-[10px] text-gray-500 mt-1" style={monoStyle}>
                Broadcast to all {analytics?.totalUsers ?? "—"} members
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-gray-500" style={monoStyle}>Subject</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                  className="bg-black border-white/30 text-white text-xs focus:border-white"
                  style={monoStyle}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-gray-500" style={monoStyle}>Message</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message..."
                  rows={5}
                  className="bg-black border-white/30 text-white text-xs resize-none focus:border-white"
                  style={monoStyle}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="send-email" checked={sendEmail} onCheckedChange={setSendEmail} />
                <span className="text-xs text-gray-300 uppercase tracking-widest" style={monoStyle}>Email</span>
              </div>
              <button
                onClick={() => {
                  if (!message.trim()) { toast.error("Please enter a message"); return; }
                  sendBulkAlertMutation.mutate({ message: message.trim(), subject: subject.trim(), sendEmail, sendSMS: false });
                }}
                disabled={sendBulkAlertMutation.isPending || !message.trim()}
                className="w-full bg-white text-black text-xs py-3 flex items-center justify-center gap-2 font-bold hover:bg-gray-200 disabled:opacity-40 uppercase tracking-widest transition-colors"
                style={monoStyle}
              >
                {sendBulkAlertMutation.isPending
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
                  : <><Send className="h-3 w-3" /> Send to All Members</>
                }
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function degreesToCardinal(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function StatCard({
  icon, label, value, sub, highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className="border border-white/20 p-4">
      <div className="flex items-center gap-1.5 text-gray-500 mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
      </div>
      <div className={`text-3xl leading-none ${highlight ? "text-green-400" : "text-white"}`} style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] text-gray-600 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sub}</div>
    </div>
  );
}
