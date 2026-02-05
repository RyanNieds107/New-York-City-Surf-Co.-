import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2, Bell, Users, Briefcase, X, ChevronRight, Phone, Store, GraduationCap, Wrench, LogOut } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { ReportFeed } from "@/components/ReportFeed";
import { UserStatsWidget } from "@/components/UserStatsWidget";

export default function Members() {
  const [, setLocation] = useLocation();
  // Use auth hook with redirect - if not authenticated, redirect to login
  const { user, loading, logout } = useAuth({ 
    redirectOnUnauthenticated: true,
    redirectPath: "/login"
  });
  const utils = trpc.useUtils();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Query hooks
  const { data: spots } = trpc.spots.list.useQuery();
  const { data: alerts, refetch: refetchAlerts } = trpc.alerts.list.useQuery(undefined, {
    enabled: !!user,
  });

  // Real-time alerts state
  const [alertSpotId, setAlertSpotId] = useState<number | null>(null);
  const [daysAdvanceNotice, setDaysAdvanceNotice] = useState<number>(7);
  const [minQualityScore, setMinQualityScore] = useState<number>(70);
  const [alertFrequency, setAlertFrequency] = useState<string>("once");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  const [deletingAlertId, setDeletingAlertId] = useState<number | null>(null);
  
  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minWaveHeight, setMinWaveHeight] = useState<number | null>(null);
  const [minPeriod, setMinPeriod] = useState<number | null>(null);
  const [allowedDays, setAllowedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]); // 0=Sun, 6=Sat

  // Crowd report state
  const [crowdSpotId, setCrowdSpotId] = useState<number | null>(null);
  const [crowdLevel, setCrowdLevel] = useState<number>(3);

  const createAlertMutation = trpc.alerts.create.useMutation({
    onSuccess: async () => {
      toast.success("Alert created successfully!");
      // Invalidate cache and refetch to ensure UI updates
      await utils.alerts.list.invalidate();
      await refetchAlerts();
      // Reset form state
      setAlertSpotId(null);
      setDaysAdvanceNotice(7);
      setMinQualityScore(70);
      setAlertFrequency("once");
      setEmailEnabled(false);
      // Reset advanced filters
      setShowAdvancedFilters(false);
      setMinWaveHeight(null);
      setMinPeriod(null);
      setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create alert");
    },
  });

  const deleteAlertMutation = trpc.alerts.delete.useMutation({
    onSuccess: async () => {
      toast.success("Alert deleted");
      setDeletingAlertId(null);
      // Invalidate cache and refetch to ensure UI updates
      await utils.alerts.list.invalidate();
      await refetchAlerts();
    },
    onError: (error) => {
      setDeletingAlertId(null);
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

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // CONDITIONAL RETURNS - must come AFTER all hooks
  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-black" />
          <p className="text-sm text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // If no user after loading, don't render (redirect will happen)
  if (!user) {
    return null;
  }

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that at least one notification method is enabled
    if (!emailEnabled) {
      toast.error("Please enable email notifications to receive alerts");
      return;
    }

    createAlertMutation.mutate({
      spotId: alertSpotId,
      minQualityScore,
      minWaveHeightFt: minWaveHeight ?? undefined,
      minPeriodSec: minPeriod ?? undefined,
      allowedDays,
      emailEnabled,
      smsEnabled: false, // SMS coming soon
      hoursAdvanceNotice: daysAdvanceNotice * 24,
      notificationFrequency: alertFrequency as "once" | "twice" | "threshold" | "realtime",
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
            <div className="flex items-center gap-4 sm:gap-5">
              {/* User email - hidden on very small screens */}
              {user?.email && (
                <span
                  className="hidden sm:block text-xs text-gray-500 truncate max-w-[200px]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  title={user.email}
                >
                  {user.email}
                </span>
              )}
              {/* Sign Out Button */}
              <button
                onClick={async () => {
                  await logout();
                  setLocation("/login");
                }}
                className="text-gray-500 hover:text-black transition-colors text-xs uppercase tracking-wider flex items-center gap-1.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
              {/* Dashboard Link */}
              <button
                onClick={() => setLocation("/dashboard")}
                className="text-gray-900 hover:text-black transition-colors text-xs uppercase tracking-wider flex items-center gap-1"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                All Spots
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10 w-full">
        {/* Tabbed Interface */}
        <Tabs defaultValue="alerts" className="w-full">
          {/* Tab Navigation */}
          <div className="border-b-2 border-black mb-0">
            <TabsList className="bg-transparent p-0 h-auto flex gap-0 min-w-max">
              <TabsTrigger
                value="alerts"
                className="relative data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-black border-2 border-black border-b-0 rounded-none px-3 sm:px-6 py-2.5 sm:py-3 text-[10px] sm:text-xs uppercase tracking-widest font-semibold transition-all -mb-[2px] data-[state=active]:z-10"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Alerts
              </TabsTrigger>
              <TabsTrigger
                value="community"
                className="relative data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-black border-2 border-black border-b-0 border-l-0 rounded-none px-3 sm:px-6 py-2.5 sm:py-3 text-[10px] sm:text-xs uppercase tracking-widest font-semibold transition-all -mb-[2px] data-[state=active]:z-10"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Community
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="relative data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-black border-2 border-black border-b-0 border-l-0 rounded-none px-3 sm:px-6 py-2.5 sm:py-3 text-[10px] sm:text-xs uppercase tracking-widest font-semibold transition-all -mb-[2px] data-[state=active]:z-10"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Services
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-0">
            {/* Header */}
            <div className="bg-white border-2 border-black border-t-0 p-5 sm:p-10">
              <h1 className="text-4xl sm:text-6xl font-black text-black uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Surf Alerts
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest mt-2 sm:mt-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Get notified when conditions are firing
              </p>
            </div>
            <div className="bg-white border-2 border-black border-t-0">
              <form onSubmit={handleCreateAlert}>
                {/* Section 01: Spots */}
                <div className="p-4 sm:p-5 border-b-2 border-gray-200">
                  <div className="text-[10px] sm:text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>01</div>
                  <h3 className="text-lg sm:text-xl font-black text-black uppercase tracking-tight mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Spot
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-600 uppercase tracking-widest mb-3 sm:mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Which break do you want alerts for?
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {spots?.filter(spot => !["Belmar", "Gilgo Beach", "Montauk"].includes(spot.name)).map((spot) => (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => {
                          // Single select: toggle between this spot and deselect
                          setAlertSpotId(alertSpotId === spot.id ? null : spot.id);
                        }}
                        className={`p-3 sm:p-5 text-center transition-all ${
                          alertSpotId === spot.id
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black hover:bg-gray-50"
                        }`}
                        style={{ borderWidth: "2px" }}
                      >
                        <span className="font-bold text-xs sm:text-sm uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {spot.name.toUpperCase()}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAlertSpotId(null)}
                      className={`p-3 sm:p-4 text-left transition-all ${
                        alertSpotId === null
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-50"
                      }`}
                      style={{ borderWidth: "2px", borderStyle: "solid" }}
                    >
                      <div className="font-bold text-xs sm:text-sm uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        BEST SPOT ONLY
                      </div>
                      <div className={`text-[10px] sm:text-[11px] mt-0.5 sm:mt-1 ${alertSpotId === null ? "text-gray-300" : "text-gray-500"}`}>
                        Alerts for whichever beach has the highest quality score
                      </div>
                    </button>
                  </div>
                </div>

                {/* Section 02: Quality Threshold */}
                <div className="p-4 sm:p-5 border-b-2 border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[10px] sm:text-xs text-gray-500 font-semibold tracking-widest mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>02</div>
                      <h3 className="text-lg sm:text-xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                        Quality Threshold
                      </h3>
                    </div>
                    {/* Compact score display */}
                    <div className="text-right">
                      <div
                        className="text-3xl sm:text-4xl font-black leading-none"
                        style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                      >
                        {minQualityScore}+
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {minQualityScore <= 55 ? "Rideable" : minQualityScore <= 65 ? "Decent" : minQualityScore <= 75 ? "Good" : minQualityScore <= 85 ? "Great" : "Epic"}
                      </div>
                    </div>
                  </div>

                  {/* Compact slider bar */}
                  <div
                    className="relative h-8 sm:h-10 cursor-pointer group"
                    onMouseDown={(e) => {
                      setIsSliderDragging(true);
                      // Calculate initial value on click
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percentage = x / rect.width;
                      const value = Math.round((50 + percentage * 45) / 5) * 5;
                      const clampedValue = Math.max(50, Math.min(95, value));
                      setMinQualityScore(clampedValue);
                    }}
                    onMouseMove={(e) => {
                      // Only update if dragging
                      if (!isSliderDragging) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percentage = x / rect.width;
                      const value = Math.round((50 + percentage * 45) / 5) * 5;
                      const clampedValue = Math.max(50, Math.min(95, value));
                      setMinQualityScore(clampedValue);
                    }}
                    onMouseUp={() => setIsSliderDragging(false)}
                    onMouseLeave={() => setIsSliderDragging(false)}
                  >
                    {/* Track background */}
                    <div className="absolute inset-y-2 sm:inset-y-3 left-0 right-0 bg-gray-200 rounded-sm overflow-hidden">
                      {/* Filled portion with gradient */}
                      <div
                        className="h-full transition-all duration-75"
                        style={{
                          width: `${((minQualityScore - 50) / (95 - 50)) * 100}%`,
                          background: 'linear-gradient(to right, #eab308, #84cc16, #22c55e, #16a34a, #059669)',
                        }}
                      />
                    </div>

                    {/* Thumb */}
                    <div
                      className={`absolute top-1/2 w-4 h-6 sm:w-5 sm:h-8 bg-black rounded-sm shadow-md transition-all duration-75 ${isSliderDragging ? 'scale-110' : 'group-hover:scale-110'}`}
                      style={{
                        left: `${((minQualityScore - 50) / (95 - 50)) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />

                    {/* Hidden range input for accessibility */}
                    <input
                      type="range"
                      min="50"
                      max="95"
                      step="5"
                      value={minQualityScore}
                      onChange={(e) => setMinQualityScore(parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      style={{ margin: 0 }}
                    />
                  </div>

                  {/* Minimal labels */}
                  <div className="flex justify-between text-[8px] sm:text-[9px] text-gray-400 uppercase tracking-wider mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span>50</span>
                    <span>95</span>
                  </div>

                  {/* Advanced Filters Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="mt-4 text-xs sm:text-sm text-black font-bold hover:text-gray-600 transition-colors uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {showAdvancedFilters ? '− Hide' : '+ Add'} wave/wind filters
                  </button>

                  {/* Advanced Filters */}
                  {showAdvancedFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-5">
                      {/* Min Wave Height */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-[10px] sm:text-xs text-gray-700 font-semibold uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            Min Wave Height
                          </label>
                          <span className="text-[10px] sm:text-xs text-black font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {minWaveHeight !== null ? `${minWaveHeight}ft` : 'Off'}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="range"
                            min="0"
                            max="6"
                            step="0.5"
                            value={minWaveHeight ?? 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setMinWaveHeight(val === 0 ? null : val);
                            }}
                            className="w-full h-2 bg-gray-200 rounded-sm appearance-none cursor-pointer accent-black"
                          />
                          <div className="flex justify-between text-[8px] text-gray-500 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            <span>Off</span>
                            <span>6ft</span>
                          </div>
                        </div>
                      </div>

                      {/* Min Swell Period */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-[10px] sm:text-xs text-gray-700 font-semibold uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            Min Swell Period
                          </label>
                          <span className="text-[10px] sm:text-xs text-black font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {minPeriod !== null ? `${minPeriod}s` : 'Off'}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="range"
                            min="0"
                            max="16"
                            step="1"
                            value={minPeriod ?? 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setMinPeriod(val === 0 ? null : val < 6 ? 6 : val);
                            }}
                            className="w-full h-2 bg-gray-200 rounded-sm appearance-none cursor-pointer accent-black"
                          />
                          <div className="flex justify-between text-[8px] text-gray-500 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            <span>Off</span>
                            <span>16s</span>
                          </div>
                        </div>
                      </div>

                      {/* Alert Days Filter */}
                      <div>
                        <div className="font-bold text-[10px] sm:text-xs uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Alert Days
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-gray-500 mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Only get alerts for swells on these days
                        </div>
                        {/* Day buttons */}
                        <div className="flex gap-1 sm:gap-2 mb-3">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                if (allowedDays.includes(index)) {
                                  // Don't allow deselecting if it's the last day
                                  if (allowedDays.length > 1) {
                                    setAllowedDays(allowedDays.filter(d => d !== index));
                                  }
                                } else {
                                  setAllowedDays([...allowedDays, index].sort((a, b) => a - b));
                                }
                              }}
                              className={`w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm font-bold transition-all border-2 ${
                                allowedDays.includes(index)
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-black border-gray-300 hover:border-black"
                              }`}
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                        {/* Quick presets */}
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setAllowedDays([0, 6])}
                            className={`px-2 py-1 text-[9px] sm:text-[10px] font-medium border transition-all ${
                              allowedDays.length === 2 && allowedDays.includes(0) && allowedDays.includes(6)
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-gray-300 hover:border-black"
                            }`}
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            Weekends
                          </button>
                          <button
                            type="button"
                            onClick={() => setAllowedDays([1, 2, 3, 4, 5])}
                            className={`px-2 py-1 text-[9px] sm:text-[10px] font-medium border transition-all ${
                              allowedDays.length === 5 && [1,2,3,4,5].every(d => allowedDays.includes(d))
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-gray-300 hover:border-black"
                            }`}
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            Weekdays
                          </button>
                          <button
                            type="button"
                            onClick={() => setAllowedDays([0, 1, 2, 3, 4, 5, 6])}
                            className={`px-2 py-1 text-[9px] sm:text-[10px] font-medium border transition-all ${
                              allowedDays.length === 7
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-gray-300 hover:border-black"
                            }`}
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            All Days
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 03: Forecast Window */}
                <div className="p-4 sm:p-5 border-b-2 border-gray-200">
                  <div className="text-[10px] sm:text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>03</div>
                  <h3 className="text-lg sm:text-xl font-black text-black uppercase tracking-tight mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Forecast Window
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-600 uppercase tracking-widest mb-3 sm:mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    How far ahead should we look?
                  </p>
                  <div className="space-y-2 sm:space-y-3">
                    {[
                      { value: 3, label: "3 Days", desc: "Short-term accuracy", disabled: false },
                      { value: 5, label: "5 Days", desc: "Week-ahead planning", disabled: false },
                      { value: 7, label: "7 Days", desc: "Full week visibility", disabled: false },
                      { value: 10, label: "10 Days", desc: "Coming Soon", disabled: true },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => !option.disabled && setDaysAdvanceNotice(option.value)}
                        disabled={option.disabled}
                        className={`w-full p-3 sm:p-4 text-left transition-all ${
                          option.disabled
                            ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                            : daysAdvanceNotice === option.value
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-50"
                        }`}
                        style={{ borderWidth: "2px" }}
                      >
                        <div className="font-bold text-xs sm:text-sm uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{option.label}</div>
                        <div className={`text-[10px] sm:text-[11px] mt-0.5 sm:mt-1 ${option.disabled ? "text-gray-400" : daysAdvanceNotice === option.value ? "text-gray-300" : "text-gray-500"}`}>{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 04: Alert Frequency */}
                <div className="p-4 sm:p-5 border-b-2 border-gray-200">
                  <div className="text-[10px] sm:text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>04</div>
                  <h3 className="text-lg sm:text-xl font-black text-black uppercase tracking-tight mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Alert Frequency
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-600 uppercase tracking-widest mb-3 sm:mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    How often do you want updates?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: "once", label: "Once Daily", desc: "Morning summary" },
                      { value: "twice", label: "Twice Daily", desc: "AM + PM updates" },
                      { value: "threshold", label: "Threshold Only", desc: "When quality hits minimum" },
                      { value: "realtime", label: "Real-Time", desc: "As forecast updates" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAlertFrequency(option.value)}
                        className={`p-3 sm:p-4 text-left transition-all ${
                          alertFrequency === option.value
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black hover:bg-gray-50"
                        }`}
                        style={{ borderWidth: "2px" }}
                      >
                        <div className="font-bold text-xs sm:text-sm uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{option.label}</div>
                        <div className={`text-[10px] sm:text-[11px] mt-0.5 sm:mt-1 ${alertFrequency === option.value ? "text-gray-300" : "text-gray-500"}`}>{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 05: How Should We Notify You */}
                <div className="p-4 sm:p-5 border-b-2 border-gray-200">
                  <div className="text-[10px] sm:text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>05</div>
                  <h3 className="text-lg sm:text-xl font-black text-black uppercase tracking-tight mb-3 sm:mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    How Should We Notify You?
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setEmailEnabled(!emailEnabled)}
                      className={`p-3 sm:p-4 text-center transition-all border-black ${
                        emailEnabled
                          ? "bg-black text-white"
                          : "bg-white text-black hover:bg-gray-50"
                      }`}
                      style={{ borderWidth: "2px", borderStyle: "solid" }}
                    >
                      <span className="font-bold text-xs sm:text-sm uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Email</span>
                    </button>
                    <button
                      type="button"
                      disabled
                      className="p-3 sm:p-4 text-center transition-all border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                      style={{ borderWidth: "2px", borderStyle: "solid" }}
                    >
                      <span className="font-bold text-xs sm:text-sm uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SMS</span>
                      <span className="block text-[10px] text-gray-400 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Coming Soon</span>
                    </button>
                  </div>
                  {!emailEnabled && (
                    <p className="mt-3 text-[10px] sm:text-xs text-amber-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Please enable email to receive alerts
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="p-4 sm:p-5 bg-black">
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
              <div className="p-5 border-t-2 border-black bg-gray-50">
                <div className="text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ACTIVE</div>
                <h3 className="text-xl font-black text-black uppercase tracking-tight mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  Your Alerts {alerts && alerts.length > 0 ? `(${alerts.length})` : ""}
                </h3>
                {alerts && alerts.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.map((alert) => {
                      const frequencyLabel = {
                        once: "Once Daily",
                        twice: "Twice Daily",
                        threshold: "Threshold Only",
                        realtime: "Real-Time",
                        immediate: "Immediate",
                      }[alert.notificationFrequency || "once"] || alert.notificationFrequency;
                      
                      const notificationMethods = [];
                      if (alert.emailEnabled) notificationMethods.push("Email");
                      if (alert.smsEnabled) notificationMethods.push("SMS");
                      
                      return (
                        <div
                          key={alert.id}
                          className="flex items-center justify-between p-3 bg-white border-2 border-gray-200 hover:border-black transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {alert.spotId ? spots?.find(s => s.id === alert.spotId)?.name : "Best spot only"}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {Math.round((alert.hoursAdvanceNotice || 24) / 24)} day window · {alert.minQualityScore ?? "Any"}+ quality
                            </p>
                            <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {frequencyLabel} · {notificationMethods.join(" + ") || "No notifications"} · Created {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setDeletingAlertId(alert.id);
                              deleteAlertMutation.mutate({ alertId: alert.id });
                            }}
                            disabled={deletingAlertId === alert.id}
                            className={`p-2 transition-all ${deletingAlertId === alert.id ? 'text-gray-300' : 'text-gray-400 hover:text-white hover:bg-black'}`}
                          >
                            {deletingAlertId === alert.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 bg-white border-2 border-gray-200 text-center">
                    <p className="text-sm text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      No alerts yet. Create one above to get notified when conditions match your criteria.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="mt-0">
            <div className="bg-white border-2 border-black border-t-0 p-5 sm:p-10">
              <h1 className="text-4xl sm:text-6xl font-black text-black uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Community Reports
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest mt-2 sm:mt-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                See what surfers are reporting from the water
              </p>
            </div>
            <div className="bg-white border-2 border-black border-t-0 p-6 sm:p-10 space-y-8">
              <UserStatsWidget />

              <div>
                <h2 className="text-2xl font-black uppercase mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  Recent Reports
                </h2>
                <ReportFeed limit={20} />
              </div>
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="mt-0">
            <div className="bg-white border-2 border-black border-t-0 p-5 sm:p-10">
              <h1 className="text-4xl sm:text-6xl font-black text-black uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Services
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest mt-2 sm:mt-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Local expertise & business directory
              </p>
            </div>
            <div className="bg-white border-2 border-black border-t-0">
              {/* Coming Soon Banner */}
              <div className="p-4 sm:p-6 bg-black text-white text-center">
                <p className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Coming Soon
                </p>
              </div>

              {/* Service Categories Preview */}
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {/* Expert Calls */}
                <div className="p-4 sm:p-5 border-2 border-gray-200 hover:border-black transition-all">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                        Expert Calls
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-600 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Book 1-on-1 calls with local surf experts. Get personalized advice on spots, conditions, and technique from surfers who know these breaks inside out.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lessons & Coaching */}
                <div className="p-4 sm:p-5 border-2 border-gray-200 hover:border-black transition-all">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                        Lessons & Coaching
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-600 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Connect with certified instructors for private or group lessons. From beginners to advanced surfers looking to level up.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Local Shops */}
                <div className="p-4 sm:p-5 border-2 border-gray-200 hover:border-black transition-all">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black flex items-center justify-center flex-shrink-0">
                      <Store className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                        Local Shops & Rentals
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-600 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Discover local surf shops, board rentals, and gear. Support the businesses that keep our surf community thriving.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Board Repair */}
                <div className="p-4 sm:p-5 border-2 border-gray-200 hover:border-black transition-all">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black flex items-center justify-center flex-shrink-0">
                      <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                        Board Repair & Ding Fix
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-600 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Find trusted local shapers and repair specialists. Get your board back in the water fast with quality craftsmanship.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Interest CTA */}
              <div className="p-4 sm:p-6 bg-gray-100 border-t-2 border-gray-200">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Are you a local business or expert?
                  </p>
                  <p className="text-xs sm:text-sm text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    We're building a directory of trusted local surf services. Get in touch to be featured when we launch.
                  </p>
                  <a
                    href="mailto:hello@nycsurfco.com?subject=Services Directory Interest"
                    className="inline-block mt-3 sm:mt-4 px-4 sm:px-6 py-2 sm:py-3 bg-black text-white text-[10px] sm:text-xs uppercase tracking-widest font-semibold hover:bg-gray-800 transition-all"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Get In Touch
                  </a>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}

