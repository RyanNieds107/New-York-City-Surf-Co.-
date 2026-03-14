import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Send, CheckCircle, XCircle, TestTube, ChevronDown } from "lucide-react";

const monoStyle = { fontFamily: "'JetBrains Mono', monospace" };
const bebasStyle = { fontFamily: "'Bebas Neue', sans-serif" };
const oswaldStyle = { fontFamily: "'Oswald', sans-serif" };

export default function AdminAlerts() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { data: alerts, isLoading: alertsLoading, refetch } = trpc.admin.alerts.getAll.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("NYC Surf Co. Alert");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);

  const [testSpot, setTestSpot] = useState<"Long Beach" | "Rockaway Beach" | "Lido Beach" | "Montauk">("Long Beach");
  const [testWaveHeight, setTestWaveHeight] = useState("5");
  const [testPeriod, setTestPeriod] = useState("10");
  const [testQuality, setTestQuality] = useState("75");

  const sendBulkAlertMutation = trpc.admin.alerts.sendBulkAlert.useMutation({
    onSuccess: (result) => {
      toast.success(`Sent ${result.emailSent} emails${result.smsSent > 0 ? `, ${result.smsSent} SMS` : ""}`);
      setMessage("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send alerts");
    },
  });

  const sendTestAlertMutation = trpc.admin.alerts.sendTestAlert.useMutation({
    onSuccess: (result) => {
      toast.success(`Test email sent to ${result.sentTo}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send test alert");
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

  const waitlistCount = alerts
    ? new Set(
        alerts
          .filter((alert) => alert.userPhone && alert.userSmsOptIn === 1 && alert.userEmail)
          .map((alert) => alert.userEmail!)
      ).size
    : 0;
  const isLive = waitlistCount >= 15;

  const formatPhone = (phone: string | null): string => {
    if (!phone) return "—";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b-2 border-white px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-5xl sm:text-6xl text-white leading-none" style={bebasStyle}>
                ADMIN ALERTS
              </h1>
              <p className="text-gray-400 text-xs mt-2" style={monoStyle}>
                Manage swell alerts · Send bulk or test notifications
              </p>
            </div>
            <button
              onClick={() => setLocation("/dashboard")}
              className="text-gray-500 hover:text-white text-xs uppercase tracking-widest flex-shrink-0 mt-1"
              style={monoStyle}
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-4">

        {/* SMS Waitlist counter */}
        <div className="border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-7xl sm:text-8xl leading-none text-white" style={bebasStyle}>
                {waitlistCount}
                <span className="text-3xl text-gray-500 ml-2" style={oswaldStyle}> / 15 ON WAITLIST</span>
              </div>
              <p className="text-xs mt-2 text-gray-400" style={monoStyle}>
                {isLive
                  ? "✓ SMS alerts are live"
                  : `${15 - waitlistCount} more surfers needed to go live`}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className={`text-[10px] uppercase tracking-widest ${isLive ? "text-green-400" : "text-gray-600"}`} style={monoStyle}>
                SMS {isLive ? "LIVE" : "OFFLINE"}
              </span>
              <div className={`w-3 h-3 rounded-full ${isLive ? "bg-green-400" : "bg-gray-700"}`} />
            </div>
          </div>
          {!isLive && (
            <div className="mt-4 h-1 bg-white/10 w-full">
              <div
                className="h-1 bg-white transition-all"
                style={{ width: `${Math.min((waitlistCount / 15) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Test Alert */}
        <div className="border border-white/20">
          <div className="border-b border-white/20 px-4 py-3 flex items-center gap-2">
            <TestTube className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>Send Test Alert</span>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-xs text-gray-500" style={monoStyle}>
              Preview a swell alert email to <span className="text-gray-300">{user?.email}</span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-gray-500" style={monoStyle}>Spot</label>
                <div className="relative">
                  <select
                    value={testSpot}
                    onChange={(e) => setTestSpot(e.target.value as typeof testSpot)}
                    className="w-full bg-black border border-white/30 text-white text-xs px-3 py-2 pr-8 appearance-none cursor-pointer hover:border-white focus:outline-none focus:border-white"
                    style={monoStyle}
                  >
                    <option value="Long Beach" className="bg-black">Long Beach</option>
                    <option value="Rockaway Beach" className="bg-black">Rockaway Beach</option>
                    <option value="Lido Beach" className="bg-black">Lido Beach</option>
                    <option value="Montauk" className="bg-black">Montauk</option>
                  </select>
                  <ChevronDown className="h-3 w-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-gray-500" style={monoStyle}>Wave Ht (ft)</label>
                <Input
                  type="number"
                  min="1"
                  max="15"
                  value={testWaveHeight}
                  onChange={(e) => setTestWaveHeight(e.target.value)}
                  className="bg-black border-white/30 text-white text-xs focus:border-white"
                  style={monoStyle}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-gray-500" style={monoStyle}>Period (s)</label>
                <Input
                  type="number"
                  min="5"
                  max="20"
                  value={testPeriod}
                  onChange={(e) => setTestPeriod(e.target.value)}
                  className="bg-black border-white/30 text-white text-xs focus:border-white"
                  style={monoStyle}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-gray-500" style={monoStyle}>Quality</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={testQuality}
                  onChange={(e) => setTestQuality(e.target.value)}
                  className="bg-black border-white/30 text-white text-xs focus:border-white"
                  style={monoStyle}
                />
              </div>
            </div>
            <button
              onClick={() => sendTestAlertMutation.mutate({
                spotName: testSpot,
                waveHeightFt: parseFloat(testWaveHeight) || 5,
                periodSec: parseInt(testPeriod) || 10,
                qualityScore: parseInt(testQuality) || 75,
              })}
              disabled={sendTestAlertMutation.isPending}
              className="w-full border border-white/30 text-white text-xs py-2.5 flex items-center justify-center gap-2 hover:bg-white hover:text-black disabled:opacity-40 uppercase tracking-widest transition-colors"
              style={monoStyle}
            >
              {sendTestAlertMutation.isPending
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Sending Test...</>
                : <><TestTube className="h-3 w-3" /> Send Test to My Email</>
              }
            </button>
          </div>
        </div>

        {/* Bulk Alert */}
        <div className="border border-white/20">
          <div className="border-b border-white/20 px-4 py-3">
            <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>Send Bulk Alert</span>
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
                placeholder="Enter your alert message..."
                rows={4}
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
                  SMS {!isLive && "(needs 15 users)"}
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
                : <><Send className="h-3 w-3" /> Send to All</>
              }
            </button>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="border border-white/20">
          <div className="border-b border-white/20 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-widest" style={oswaldStyle}>All Alerts</span>
            {alerts && (
              <span className="text-[10px] text-gray-500 uppercase tracking-widest" style={monoStyle}>
                {alerts.length} total
              </span>
            )}
          </div>

          {alertsLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full bg-white/10" />
              ))}
            </div>
          ) : !alerts || alerts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-600 text-xs uppercase tracking-widest" style={monoStyle}>No alerts found</p>
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
                  {alerts.map((alert) => (
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

      </div>
    </div>
  );
}
