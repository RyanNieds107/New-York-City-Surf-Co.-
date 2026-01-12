import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2, Bell, Users, MessageSquare, X, ChevronRight, ChevronDown, Check } from "lucide-react";
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
  const [selectedSpots, setSelectedSpots] = useState<number[]>([]);
  const [spotsDropdownOpen, setSpotsDropdownOpen] = useState(false);
  const [daysAdvanceNotice, setDaysAdvanceNotice] = useState<number>(7);
  const [minQualityScore, setMinQualityScore] = useState<number>(70);
  const [alertFrequency, setAlertFrequency] = useState<string>("once");
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
            <div className="bg-white border-2 border-black">
              <form onSubmit={handleCreateAlert}>
                {/* Section 01: Spots */}
                <div className="p-5 border-b-2 border-gray-200">
                  <div className="text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>01</div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tight mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Spots
                  </h3>
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Which breaks do you surf?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {spots?.map((spot) => (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => {
                          if (selectedSpots.includes(spot.id)) {
                            const newSpots = selectedSpots.filter(id => id !== spot.id);
                            setSelectedSpots(newSpots);
                            setAlertSpotId(newSpots.length === 1 ? newSpots[0] : null);
                          } else {
                            const newSpots = [...selectedSpots, spot.id];
                            setSelectedSpots(newSpots);
                            setAlertSpotId(newSpots.length === 1 ? newSpots[0] : null);
                          }
                        }}
                        className={`p-5 border-3 text-center transition-all ${
                          selectedSpots.includes(spot.id)
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black hover:bg-gray-50"
                        }`}
                        style={{ borderWidth: "3px" }}
                      >
                        <span className="font-bold text-sm uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {spot.name.toUpperCase()}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSpots([]);
                        setAlertSpotId(null);
                      }}
                      className={`p-5 text-center transition-all ${
                        selectedSpots.length === 0
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-50"
                      }`}
                      style={{ borderWidth: "3px", borderStyle: "solid" }}
                    >
                      <span className="font-bold text-sm uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        BEST SPOT ONLY
                      </span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    "Best spot only" will alert you to whichever beach has the highest quality score
                  </p>
                </div>

                {/* Section 02: Quality Threshold */}
                <div className="p-5 border-b-2 border-gray-200">
                  <div className="text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>02</div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tight mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Quality Threshold
                  </h3>
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Minimum quality to trigger alert
                  </p>
                  <div className="mb-6">
                    <input
                      type="range"
                      min="50"
                      max="95"
                      step="5"
                      value={minQualityScore}
                      onChange={(e) => setMinQualityScore(parseInt(e.target.value))}
                      className="w-full h-2 bg-black appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_black] [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <div className="flex justify-between mt-2 text-[10px] text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <span>50 - Rideable</span>
                      <span>70 - Good</span>
                      <span>95 - Epic</span>
                    </div>
                  </div>
                  <div className="text-center py-4">
                    <div className="text-6xl font-black leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>{minQualityScore}+</div>
                    <div className="text-xs text-gray-600 uppercase tracking-widest mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {minQualityScore <= 55 ? "Rideable Sessions" : minQualityScore <= 65 ? "Decent Sessions" : minQualityScore <= 75 ? "Good Sessions" : minQualityScore <= 85 ? "Great Sessions" : "Epic Sessions"}
                    </div>
                  </div>
                </div>

                {/* Section 03: Forecast Window */}
                <div className="p-5 border-b-2 border-gray-200">
                  <div className="text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>03</div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tight mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Forecast Window
                  </h3>
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    How far ahead should we look?
                  </p>
                  <div className="space-y-3">
                    {[
                      { value: 3, label: "3 Days", desc: "Short-term accuracy" },
                      { value: 5, label: "5 Days", desc: "Week-ahead planning" },
                      { value: 7, label: "7 Days", desc: "Full week visibility" },
                      { value: 10, label: "10 Days", desc: "Extended outlook for trip planning" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDaysAdvanceNotice(option.value)}
                        className={`w-full p-4 text-left transition-all ${
                          daysAdvanceNotice === option.value
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black hover:bg-gray-50"
                        }`}
                        style={{ borderWidth: "3px" }}
                      >
                        <div className="font-bold text-sm uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{option.label}</div>
                        <div className={`text-[11px] mt-1 ${daysAdvanceNotice === option.value ? "text-gray-300" : "text-gray-500"}`}>{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 04: Alert Frequency */}
                <div className="p-5 border-b-2 border-gray-200">
                  <div className="text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>04</div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tight mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Alert Frequency
                  </h3>
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    How often do you want updates?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "once", label: "Once Daily", desc: "Morning summary" },
                      { value: "twice", label: "Twice Daily", desc: "AM + PM updates" },
                      { value: "threshold", label: "Threshold Only", desc: "When quality hits your minimum" },
                      { value: "realtime", label: "Real-Time", desc: "As forecast updates" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAlertFrequency(option.value)}
                        className={`p-4 text-left transition-all ${
                          alertFrequency === option.value
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black hover:bg-gray-50"
                        }`}
                        style={{ borderWidth: "3px" }}
                      >
                        <div className="font-bold text-sm uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{option.label}</div>
                        <div className={`text-[11px] mt-1 ${alertFrequency === option.value ? "text-gray-300" : "text-gray-500"}`}>{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 05: How Should We Notify You */}
                <div className="p-5 border-b-2 border-gray-200">
                  <div className="text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>05</div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tight mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    How Should We Notify You?
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEmailEnabled(!emailEnabled)}
                      className={`p-4 text-center transition-all ${
                        emailEnabled
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-50"
                      }`}
                      style={{ borderWidth: "3px" }}
                    >
                      <span className="font-bold text-sm uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Email</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmsEnabled(!smsEnabled)}
                      className={`p-4 text-center transition-all ${
                        smsEnabled
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-50"
                      }`}
                      style={{ borderWidth: "3px" }}
                    >
                      <span className="font-bold text-sm uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SMS</span>
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="p-5 bg-black">
                  <Button
                    type="submit"
                    disabled={createAlertMutation.isPending}
                    className="w-full bg-white text-black hover:bg-gray-100 rounded-none uppercase tracking-widest text-base font-black py-5 h-auto transition-all"
                    style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: "2px" }}
                  >
                    {createAlertMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Create Alert"
                    )}
                  </Button>
                </div>
              </form>

              {/* Active Alerts Section */}
              {alerts && alerts.length > 0 && (
                <div className="p-5 border-t-2 border-black bg-gray-50">
                  <div className="text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ACTIVE</div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tight mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Your Alerts ({alerts.length})
                  </h3>
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between p-3 bg-white border-2 border-gray-200 hover:border-black transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {alert.spotId ? spots?.find(s => s.id === alert.spotId)?.name : "All spots"}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {Math.round((alert.hoursAdvanceNotice || 24) / 24)} day window · {alert.minQualityScore}+ quality
                          </p>
                        </div>
                        <button
                          onClick={() => deleteAlertMutation.mutate({ alertId: alert.id })}
                          disabled={deleteAlertMutation.isPending}
                          className="p-2 text-gray-400 hover:text-white hover:bg-black transition-all"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

