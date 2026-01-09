import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2, Bell, Users, MessageSquare, X, ChevronRight } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Members() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: spots } = trpc.spots.list.useQuery();
  const { data: alerts, refetch: refetchAlerts } = trpc.alerts.list.useQuery(undefined, {
    enabled: !!user,
  });

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Real-time alerts state
  const [alertSpotId, setAlertSpotId] = useState<number | null>(null);
  const [daysAdvanceNotice, setDaysAdvanceNotice] = useState<number>(7);
  const [minQualityScore, setMinQualityScore] = useState<number>(60);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);

  // Crowd report state
  const [crowdSpotId, setCrowdSpotId] = useState<number | null>(null);
  const [crowdLevel, setCrowdLevel] = useState<number>(3);

  const createAlertMutation = trpc.alerts.create.useMutation({
    onSuccess: () => {
      toast.success("Alert created successfully!");
      refetchAlerts();
      setAlertSpotId(null);
      setDaysAdvanceNotice(7);
      setMinQualityScore(60);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create alert");
    },
  });

  const deleteAlertMutation = trpc.alerts.delete.useMutation({
    onSuccess: () => {
      toast.success("Alert deleted");
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete alert");
    },
  });

  const submitCrowdMutation = trpc.crowd.submit.useMutation({
    onSuccess: () => {
      toast.success("Report submitted!");
      setCrowdSpotId(null);
      setCrowdLevel(3);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit report");
    },
  });

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    createAlertMutation.mutate({
      spotId: alertSpotId,
      minQualityScore,
      emailEnabled,
      hoursAdvanceNotice: daysAdvanceNotice * 24,
    });
  };

  const handleSubmitCrowdReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crowdSpotId) {
      toast.error("Please select a spot");
      return;
    }
    submitCrowdMutation.mutate({
      spotId: crowdSpotId,
      crowdLevel,
    });
  };

  const selectStyles = "w-full bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all";
  const labelStyles = "block text-[10px] font-semibold uppercase tracking-widest text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <Logo logoSize="h-9 sm:h-10" showLink={true} />
            <button
              onClick={() => setLocation("/dashboard")}
              className="text-gray-600 hover:text-black transition-colors text-xs uppercase tracking-wider flex items-center gap-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              All Spots
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Compact Header */}
        <div className="mb-6">
          <h1
            className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight"
            style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
          >
            Member Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
            Alerts, community, and crowd reports
          </p>
        </div>

        {/* Tabbed Interface */}
        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="w-full sm:w-auto bg-white border border-gray-200 p-1 rounded-none h-auto mb-6">
            <TabsTrigger
              value="alerts"
              className="flex-1 sm:flex-none data-[state=active]:bg-black data-[state=active]:text-white rounded-none px-4 py-2 text-xs uppercase tracking-wider transition-all"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <Bell className="h-3.5 w-3.5 mr-2" />
              Alerts
            </TabsTrigger>
            <TabsTrigger
              value="community"
              className="flex-1 sm:flex-none data-[state=active]:bg-black data-[state=active]:text-white rounded-none px-4 py-2 text-xs uppercase tracking-wider transition-all"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <Users className="h-3.5 w-3.5 mr-2" />
              Community
            </TabsTrigger>
            <TabsTrigger
              value="crowd"
              className="flex-1 sm:flex-none data-[state=active]:bg-black data-[state=active]:text-white rounded-none px-4 py-2 text-xs uppercase tracking-wider transition-all"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-2" />
              Crowd Reports
            </TabsTrigger>
          </TabsList>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-0">
            <div className="bg-white border border-gray-200 p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Alert Form */}
                <div>
                  <h2
                    className="text-lg font-black text-black uppercase tracking-tight mb-4"
                    style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                  >
                    Create New Alert
                  </h2>
                  <form onSubmit={handleCreateAlert} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Spot
                        </label>
                        <select
                          value={alertSpotId || ""}
                          onChange={(e) => setAlertSpotId(e.target.value ? parseInt(e.target.value) : null)}
                          className={selectStyles}
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          <option value="">All spots</option>
                          {spots?.map((spot) => (
                            <option key={spot.id} value={spot.id}>{spot.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Days Notice
                        </label>
                        <select
                          value={daysAdvanceNotice}
                          onChange={(e) => setDaysAdvanceNotice(parseInt(e.target.value))}
                          className={selectStyles}
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          <option value="1">1 day</option>
                          <option value="3">3 days</option>
                          <option value="5">5 days</option>
                          <option value="7">7 days</option>
                          <option value="14">14 days</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Min Quality
                        </label>
                        <select
                          value={minQualityScore}
                          onChange={(e) => setMinQualityScore(parseInt(e.target.value))}
                          className={selectStyles}
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          <option value="40">40+ Fair</option>
                          <option value="60">60+ Good</option>
                          <option value="70">70+ Great</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={emailEnabled}
                          onChange={(e) => setEmailEnabled(e.target.checked)}
                          className="h-4 w-4 rounded-none border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-sm text-gray-600 group-hover:text-black transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
                          Email
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={smsEnabled}
                          onChange={(e) => setSmsEnabled(e.target.checked)}
                          className="h-4 w-4 rounded-none border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-sm text-gray-600 group-hover:text-black transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
                          SMS
                        </span>
                      </label>
                    </div>

                    <Button
                      type="submit"
                      disabled={createAlertMutation.isPending}
                      className="w-full bg-black text-white hover:bg-gray-900 rounded-none uppercase tracking-wider text-xs font-semibold py-3 h-auto transition-all"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {createAlertMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Create Alert"
                      )}
                    </Button>
                  </form>
                </div>

                {/* Active Alerts */}
                <div>
                  <h2
                    className="text-lg font-black text-black uppercase tracking-tight mb-4"
                    style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                  >
                    Active Alerts
                    {alerts && alerts.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-gray-500">({alerts.length})</span>
                    )}
                  </h2>
                  {alerts && alerts.length > 0 ? (
                    <div className="space-y-2">
                      {alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 group hover:border-gray-200 transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate" style={{ fontFamily: "'Inter', sans-serif" }}>
                              {alert.spotId ? spots?.find(s => s.id === alert.spotId)?.name : "All spots"}
                            </p>
                            <p className="text-xs text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {Math.round((alert.hoursAdvanceNotice || 24) / 24)}d · {alert.minQualityScore}+
                            </p>
                          </div>
                          <button
                            onClick={() => deleteAlertMutation.mutate({ alertId: alert.id })}
                            disabled={deleteAlertMutation.isPending}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-300">
                      <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600" style={{ fontFamily: "'Inter', sans-serif" }}>
                        No alerts yet
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="mt-0">
            <div className="bg-white border border-gray-200 p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-gray-500" />
                </div>
                <h2
                  className="text-xl font-black text-black uppercase tracking-tight mb-2"
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                >
                  Community Hub
                </h2>
                <p className="text-sm text-gray-600 mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Connect with NYC surfers. Share conditions, tips, and session reports.
                </p>
                <span
                  className="inline-block px-4 py-2 bg-gray-200 text-gray-600 text-xs uppercase tracking-wider font-semibold"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Coming Soon
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Crowd Report Tab */}
          <TabsContent value="crowd" className="mt-0">
            <div className="bg-white border border-gray-200 p-6">
              <div className="max-w-md">
                <h2
                  className="text-lg font-black text-black uppercase tracking-tight mb-2"
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                >
                  Submit Crowd Report
                </h2>
                <p className="text-sm text-gray-600 mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Help other surfers know what to expect.
                </p>
                <form onSubmit={handleSubmitCrowdReport} className="space-y-4">
                  <div>
                    <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Spot
                    </label>
                    <select
                      value={crowdSpotId || ""}
                      onChange={(e) => setCrowdSpotId(e.target.value ? parseInt(e.target.value) : null)}
                      className={selectStyles}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      required
                    >
                      <option value="">Select a spot...</option>
                      {spots?.map((spot) => (
                        <option key={spot.id} value={spot.id}>{spot.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Crowd Level
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setCrowdLevel(level)}
                          className={`py-3 text-sm font-medium transition-all border ${
                            crowdLevel === level
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                          }`}
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <span>Empty</span>
                      <span>Packed</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitCrowdMutation.isPending}
                    className="w-full bg-black text-white hover:bg-gray-900 rounded-none uppercase tracking-wider text-xs font-semibold py-3 h-auto transition-all"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {submitCrowdMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Submit Report"
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}

