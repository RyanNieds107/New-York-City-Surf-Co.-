import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Loader2, Send, CheckCircle, XCircle, ChevronDown,
  Users, Eye, BarChart2, Bell, FileText, TrendingUp
} from "lucide-react";

const monoStyle = { fontFamily: "'JetBrains Mono', monospace" };
const bebasStyle = { fontFamily: "'Bebas Neue', sans-serif" };
const oswaldStyle = { fontFamily: "'Oswald', sans-serif" };

type Tab = "overview" | "users" | "alerts" | "broadcast";

export default function AdminAlerts() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: alerts, isLoading: alertsLoading } = trpc.admin.alerts.getAll.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  const { data: analytics, isLoading: analyticsLoading } = trpc.admin.analytics.getStats.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("NYC Surf Co. Alert");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);

  const sendBulkAlertMutation = trpc.admin.alerts.sendBulkAlert.useMutation({
    onSuccess: (result) => {
      toast.success(`Sent ${result.emailSent} emails${result.smsSent > 0 ? `, ${result.smsSent} SMS` : ""}`);
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

  const smsOptInCount = analytics?.smsOptIns ?? 0;
  const isLive = smsOptInCount >= 15;

  const formatPhone = (phone: string | null): string => {
    if (!phone) return "—";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    if (digits.length === 11 && digits.startsWith("1")) return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    return phone;
  };

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

  const handleSendBulkAlert = () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    sendBulkAlertMutation.mutate({
      message: message.trim(),
      subject: subject.trim(),
      sendEmail,
      sendSMS: sendSMS && isLive,
    });
  };

  // Derive surf plan yes% from popup stats
  const popupStats = analytics?.popupStats ?? [];
  const yesCount = popupStats.find(p => p.response === "yes")?.count ?? 0;
  const totalPopupResponded = popupStats.filter(p => p.response !== "pending").reduce((s, p) => s + p.count, 0);
  const surfPlanYesPct = totalPopupResponded > 0 ? Math.round((yesCount / totalPopupResponded) * 100) : 0;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "OVERVIEW", icon: <BarChart2 className="h-3 w-3" /> },
    { id: "users", label: "USERS", icon: <Users className="h-3 w-3" /> },
    { id: "alerts", label: "ALERTS", icon: <Bell className="h-3 w-3" /> },
    { id: "broadcast", label: "BROADCAST", icon: <Send className="h-3 w-3" /> },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b-2 border-white px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-5xl sm:text-6xl text-white leading-none" style={bebasStyle}>
                ADMIN
              </h1>
              <p className="text-gray-400 text-xs mt-2" style={monoStyle}>
                NYC Surf Co. · Business Intelligence
              </p>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <button
                onClick={() => setLocation("/admin/forecasts")}
                className="text-gray-500 hover:text-white text-xs uppercase tracking-widest"
                style={monoStyle}
              >
                Forecasts →
              </button>
              <button
                onClick={() => setLocation("/dashboard")}
                className="text-gray-500 hover:text-white text-xs uppercase tracking-widest flex-shrink-0"
                style={monoStyle}
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/20 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[10px] uppercase tracking-widest border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-white text-white"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
              style={monoStyle}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-4">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <>
            {/* Stat Cards */}
            {analyticsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-24 bg-white/10" />
                ))}
              </div>
            ) : analytics ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    icon={<Users className="h-3.5 w-3.5" />}
                    label="Total Members"
                    value={analytics.totalUsers}
                    sub={`+${analytics.newLast7Days} this week`}
                    highlight={false}
                  />
                  <StatCard
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                    label="Active (30d)"
                    value={analytics.activeLast30Days}
                    sub={`of ${analytics.totalUsers} total`}
                    highlight={analytics.activeLast30Days > 0}
                  />
                  <StatCard
                    icon={<Users className="h-3.5 w-3.5" />}
                    label="New (30d)"
                    value={analytics.newLast30Days}
                    sub={`+${analytics.newLast7Days} last 7 days`}
                    highlight={analytics.newLast30Days > 0}
                  />
                  <StatCard
                    icon={<Eye className="h-3.5 w-3.5" />}
                    label="Views (7d)"
                    value={analytics.viewsLast7Days}
                    sub={`${analytics.uniqueViewers} unique viewers`}
                    highlight={false}
                  />
                  <StatCard
                    icon={<BarChart2 className="h-3.5 w-3.5" />}
                    label="Avg Session"
                    value={analytics.avgSessionSec > 0 ? `${Math.round(analytics.avgSessionSec)}s` : "—"}
                    sub="time on forecast page"
                    highlight={false}
                    isString
                  />
                  <StatCard
                    icon={<Bell className="h-3.5 w-3.5" />}
                    label="Alert Subscribers"
                    value={analytics.alertUsers}
                    sub={`${analytics.activeAlerts} active alerts`}
                    highlight={analytics.alertUsers > 0}
                  />
                  <StatCard
                    icon={<FileText className="h-3.5 w-3.5" />}
                    label="Surf Reports"
                    value={analytics.totalReports}
                    sub={analytics.avgRating > 0 ? `avg ${analytics.avgRating}★ rating` : "no ratings yet"}
                    highlight={false}
                  />
                  <StatCard
                    icon={<CheckCircle className="h-3.5 w-3.5" />}
                    label='Surf Plan "Yes"'
                    value={`${surfPlanYesPct}%`}
                    sub={`${yesCount} of ${totalPopupResponded} responded`}
                    highlight={surfPlanYesPct >= 50}
                    isString
                  />
                </div>

                {/* SMS Progress */}
                <div className="border border-white/20 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-gray-500" style={monoStyle}>SMS Waitlist</span>
                      <div className="text-4xl leading-none text-white mt-1" style={bebasStyle}>
                        {smsOptInCount}
                        <span className="text-xl text-gray-500 ml-2" style={oswaldStyle}>/ 15 OPT-INS</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-[10px] uppercase tracking-widest ${isLive ? "text-green-400" : "text-gray-600"}`} style={monoStyle}>
                        SMS {isLive ? "LIVE" : "OFFLINE"}
                      </span>
                      <div className={`w-3 h-3 rounded-full ${isLive ? "bg-green-400" : "bg-gray-700"}`} />
                    </div>
                  </div>
                  <div className="h-1 bg-white/10 w-full">
                    <div
                      className="h-1 bg-white transition-all"
                      style={{ width: `${Math.min((smsOptInCount / 15) * 100, 100)}%` }}
                    />
                  </div>
                  {!isLive && (
                    <p className="text-xs mt-2 text-gray-600" style={monoStyle}>
                      {15 - smsOptInCount} more opt-ins needed to go live
                    </p>
                  )}
                </div>

                {/* Top Spots */}
                {analytics.topSpots.length > 0 && (
                  <div className="border border-white/20">
                    <div className="border-b border-white/20 px-4 py-3">
                      <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>
                        Top Spots by Views · Last 30 Days
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      {analytics.topSpots.map((spot, i) => {
                        const max = analytics.topSpots[0]?.viewCount ?? 1;
                        const pct = Math.round((spot.viewCount / max) * 100);
                        return (
                          <div key={spot.name} className="flex items-center gap-3">
                            <span className="text-[10px] text-gray-600 w-4" style={monoStyle}>{i + 1}</span>
                            <span className="text-xs text-gray-300 w-36 flex-shrink-0" style={monoStyle}>{spot.name}</span>
                            <div className="flex-1 h-1 bg-white/10">
                              <div className="h-1 bg-white/60" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-400 w-16 text-right" style={monoStyle}>
                              {spot.viewCount} views
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Surf Plan Funnel */}
                {popupStats.length > 0 && (
                  <div className="border border-white/20">
                    <div className="border-b border-white/20 px-4 py-3">
                      <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>
                        Surf Plan Popup · Response Breakdown
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {popupStats.map(p => (
                        <div key={p.response} className="border border-white/10 p-3">
                          <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1" style={monoStyle}>
                            {p.response}
                          </div>
                          <div className="text-2xl text-white" style={bebasStyle}>{p.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="border border-white/20 p-8 text-center">
                <p className="text-gray-600 text-xs uppercase tracking-widest" style={monoStyle}>Failed to load analytics</p>
              </div>
            )}
          </>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === "users" && (
          <div className="border border-white/20">
            <div className="border-b border-white/20 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>All Members</span>
              {analytics && (
                <span className="text-[10px] text-gray-500 uppercase tracking-widest" style={monoStyle}>
                  {analytics.totalUsers} total
                </span>
              )}
            </div>
            {analyticsLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-10 w-full bg-white/10" />
                ))}
              </div>
            ) : !analytics?.allUsers?.length ? (
              <div className="py-12 text-center">
                <p className="text-gray-600 text-xs uppercase tracking-widest" style={monoStyle}>No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={monoStyle}>
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Email</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Name</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Auth</th>
                      <th className="text-center px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">SMS</th>
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
                        <td className="px-4 py-2 text-white max-w-[180px] truncate">{u.email || "—"}</td>
                        <td className="px-4 py-2 text-gray-300">{u.name || "—"}</td>
                        <td className="px-4 py-2 text-gray-500">
                          {u.loginMethod?.includes("google") ? "Google" : u.loginMethod?.includes("magic") ? "Email" : u.loginMethod || "—"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {u.smsOptIn === 1
                            ? <CheckCircle className="h-3.5 w-3.5 text-green-400 inline" />
                            : <XCircle className="h-3.5 w-3.5 text-gray-700 inline" />
                          }
                        </td>
                        <td className="px-4 py-2 text-center text-gray-300">{u.viewCount || "—"}</td>
                        <td className="px-4 py-2 text-center text-gray-300">{u.reportCount || "—"}</td>
                        <td className="px-4 py-2 text-center">
                          {u.alertCount > 0
                            ? <span className="text-green-400">{u.alertCount}</span>
                            : <span className="text-gray-700">—</span>
                          }
                        </td>
                        <td className="px-4 py-2 text-gray-500">{formatTimeAgo(u.lastSignedIn)}</td>
                        <td className="px-4 py-2 text-gray-600">
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

        {/* ── ALERTS TAB ── */}
        {activeTab === "alerts" && (
          <div className="border border-white/20">
            <div className="border-b border-white/20 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>Alert Subscribers</span>
              {alerts && (
                <span className="text-[10px] text-gray-500 uppercase tracking-widest" style={monoStyle}>
                  {alerts.length} total
                </span>
              )}
            </div>
            {alertsLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-10 w-full bg-white/10" />
                ))}
              </div>
            ) : !alerts || alerts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-600 text-xs uppercase tracking-widest" style={monoStyle}>No alerts configured</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={monoStyle}>
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Email</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Phone</th>
                      <th className="text-center px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">SMS</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Spot</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Criteria</th>
                      <th className="text-left px-4 py-2 text-gray-500 uppercase tracking-widest text-[10px] font-normal">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map(alert => (
                      <tr key={alert.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-2 text-white">{alert.userEmail || "—"}</td>
                        <td className="px-4 py-2 text-gray-300">{formatPhone(alert.userPhone)}</td>
                        <td className="px-4 py-2 text-center">
                          {alert.userSmsOptIn === 1
                            ? <CheckCircle className="h-3.5 w-3.5 text-green-400 inline" />
                            : <XCircle className="h-3.5 w-3.5 text-gray-600 inline" />
                          }
                        </td>
                        <td className="px-4 py-2 text-gray-300">{alert.spotName || "All Spots"}</td>
                        <td className="px-4 py-2 text-gray-400">{formatCriteria(alert)}</td>
                        <td className="px-4 py-2 text-gray-500">
                          {new Date(alert.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
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
              <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>Send Bulk Alert</span>
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
                  placeholder="Alert subject"
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
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    id="send-email"
                    checked={sendEmail}
                    onCheckedChange={setSendEmail}
                  />
                  <span className="text-xs text-gray-300 uppercase tracking-widest" style={monoStyle}>Email</span>
                </label>
                <label className={`flex items-center gap-2 ${!isLive ? "opacity-40" : "cursor-pointer"}`}>
                  <Switch
                    id="send-sms"
                    checked={sendSMS && isLive}
                    onCheckedChange={(checked) => setSendSMS(checked)}
                    disabled={!isLive}
                  />
                  <span className="text-xs text-gray-300 uppercase tracking-widest" style={monoStyle}>
                    SMS {!isLive && `(${smsOptInCount}/15)`}
                  </span>
                </label>
              </div>
              <button
                onClick={handleSendBulkAlert}
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

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
  isString = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
  highlight: boolean;
  isString?: boolean;
}) {
  return (
    <div className="border border-white/20 p-4">
      <div className="flex items-center gap-1.5 text-gray-500 mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {label}
        </span>
      </div>
      <div
        className={`text-3xl leading-none ${highlight ? "text-green-400" : "text-white"}`}
        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
      >
        {isString ? value : typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-[10px] text-gray-600 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {sub}
      </div>
    </div>
  );
}
