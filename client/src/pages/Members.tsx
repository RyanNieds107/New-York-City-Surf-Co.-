import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2, Bell, Users, ShoppingBag, Home, X, ChevronRight, Phone, Store, GraduationCap, Wrench, LogOut, Video, Link2, Upload, ExternalLink, Waves } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { ReportFeed } from "@/components/ReportFeed";
import { UserStatsWidget } from "@/components/UserStatsWidget";
import { ReportDatePicker } from "@/components/ReportDatePicker";
import { LatestPhotos } from "@/components/LatestPhotos";
import { AnnouncementsFeed } from "@/components/AnnouncementsFeed";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function Members() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  // Use auth hook with redirect - if not authenticated, redirect to login
  const { user, loading, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login"
  });
  const utils = trpc.useUtils();

  // Tab navigation from URL
  const urlParams = new URLSearchParams(search);
  const tabFromUrl = urlParams.get('tab') || 'home';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Query hooks
  const { data: spots } = trpc.spots.list.useQuery();
  const { data: alerts, refetch: refetchAlerts } = trpc.alerts.list.useQuery(undefined, {
    enabled: !!user,
  });
  const currentConditionsQuery = trpc.forecasts.getCurrentConditionsForAll.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
  });
  const recentReportsQuery = trpc.reports.getRecentReports.useQuery({ limit: 12 }, {
    enabled: !!user,
  });

  // Real-time alerts state
  const [alertSpotIds, setAlertSpotIds] = useState<number[]>([]);
  const [bestSpotOnly, setBestSpotOnly] = useState(false);
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

  // Report submission state
  const [reportSpotId, setReportSpotId] = useState<number | null>(null);
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [wakeThreshold, setWakeThreshold] = useState<number>(75);
  const [mediaPostType, setMediaPostType] = useState<"my_youtube" | "shared_youtube" | "session_media">("my_youtube");
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [communityMediaPosts, setCommunityMediaPosts] = useState<Array<{
    id: string;
    type: "my_youtube" | "shared_youtube" | "session_media";
    title: string;
    url: string;
    caption?: string;
    author: string;
    createdAt: string;
  }>>([
    {
      id: "seed-1",
      type: "shared_youtube",
      title: "Perfect Long Beach Morning Session",
      url: "https://www.youtube.com/watch?v=0rRLS3A5VwA",
      caption: "Clean lines and classic winter shape setup.",
      author: "NYC Surf Co.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    },
  ]);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [dossierName, setDossierName] = useState("");
  const [dossierEmail, setDossierEmail] = useState("");
  const [dossierHomeBreak, setDossierHomeBreak] = useState<"Lido Beach" | "Long Beach" | "Rockaway Beach">("Lido Beach");
  const [dossierExperienceYears, setDossierExperienceYears] = useState<number>(20);
  const [dossierLocation, setDossierLocation] = useState("");
  const [dossierPrimaryBoard, setDossierPrimaryBoard] = useState("");
  const [dossierVolumeL, setDossierVolumeL] = useState("");
  const [dossierMinWaveHeight, setDossierMinWaveHeight] = useState<number>(2);
  const [dossierWindPreference, setDossierWindPreference] = useState("OFFSHORE");

  const dossierStorageKey = user ? `member_dossier_${user.id}` : null;

  const createAlertMutation = trpc.alerts.create.useMutation({
    onSuccess: async () => {
      toast.success("Alert created successfully!");
      // Invalidate cache and refetch to ensure UI updates
      await utils.alerts.list.invalidate();
      await refetchAlerts();
      // Reset form state
      setAlertSpotIds([]);
      setBestSpotOnly(false);
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

  const updateAlertMutation = trpc.alerts.update.useMutation({
    onSuccess: async () => {
      await utils.alerts.list.invalidate();
      await refetchAlerts();
    },
  });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
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

  useEffect(() => {
    if (!user) return;
    setDossierName(user.name || "");
    setDossierEmail(user.email || "");
  }, [user]);

  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    const dossierAlert = alerts[0];
    const alertSpot = spots?.find((spot) => spot.id === dossierAlert.spotId)?.name;
    if (alertSpot === "Lido Beach" || alertSpot === "Long Beach" || alertSpot === "Rockaway Beach") {
      setDossierHomeBreak(alertSpot);
    }
    if (typeof dossierAlert.minWaveHeightFt === "number") {
      setDossierMinWaveHeight(dossierAlert.minWaveHeightFt);
    }
  }, [alerts, spots]);

  useEffect(() => {
    if (!dossierStorageKey) return;
    const raw = localStorage.getItem(dossierStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        experienceYears?: number;
        location?: string;
        primaryBoard?: string;
        volumeL?: string;
        windPreference?: string;
      };
      if (typeof parsed.experienceYears === "number") setDossierExperienceYears(parsed.experienceYears);
      if (typeof parsed.location === "string") setDossierLocation(parsed.location);
      if (typeof parsed.primaryBoard === "string") setDossierPrimaryBoard(parsed.primaryBoard);
      if (typeof parsed.volumeL === "string") setDossierVolumeL(parsed.volumeL);
      if (typeof parsed.windPreference === "string") setDossierWindPreference(parsed.windPreference);
    } catch {
      // Ignore malformed local storage.
    }
  }, [dossierStorageKey]);

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

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that at least one notification method is enabled
    if (!emailEnabled) {
      toast.error("Please enable email notifications to receive alerts");
      return;
    }

    // Validate that at least one spot is selected or "Best Spot Only" is chosen
    if (alertSpotIds.length === 0 && !bestSpotOnly) {
      toast.error("Please select at least one spot or choose 'Best Spot Only'");
      return;
    }

    // If "Best Spot Only" is selected, create a single alert with null spotId
    if (bestSpotOnly) {
      createAlertMutation.mutate({
        spotId: null,
        minQualityScore,
        minWaveHeightFt: minWaveHeight ?? undefined,
        minPeriodSec: minPeriod ?? undefined,
        allowedDays,
        emailEnabled,
        smsEnabled: false,
        hoursAdvanceNotice: daysAdvanceNotice * 24,
        notificationFrequency: alertFrequency as "once" | "twice" | "threshold" | "realtime",
      });
    } else {
      // Create an alert for each selected spot
      for (const spotId of alertSpotIds) {
        createAlertMutation.mutate({
          spotId,
          minQualityScore,
          minWaveHeightFt: minWaveHeight ?? undefined,
          minPeriodSec: minPeriod ?? undefined,
          allowedDays,
          emailEnabled,
          smsEnabled: false,
          hoursAdvanceNotice: daysAdvanceNotice * 24,
          notificationFrequency: alertFrequency as "once" | "twice" | "threshold" | "realtime",
        });
      }
    }
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

  const handleNavigateToReport = () => {
    if (!reportSpotId) {
      toast.error("Please select a spot");
      return;
    }

    const sessionDate = new Date(reportDate);
    sessionDate.setHours(12, 0, 0, 0);

    setLocation(`/report/submit?spotId=${reportSpotId}&sessionDate=${sessionDate.toISOString()}`);
  };

  const selectStyles = "w-full bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all";
  const labelStyles = "block text-[10px] font-semibold uppercase tracking-widest text-gray-700 mb-1.5";
  const navigateToTab = (value: string) => {
    setActiveTab(value);
    setLocation(`/members?tab=${value}`);
  };

  const homeBreakEntry = currentConditionsQuery.data?.find((item) => item.spot?.name === dossierHomeBreak);
  const homeBreakCurrent = homeBreakEntry?.currentConditions;
  const homeBreakScore = homeBreakCurrent?.qualityScore ?? homeBreakCurrent?.probabilityScore ?? 0;
  const homeBreakStatus = homeBreakScore >= 60 ? "GO" : "STANDBY";
  const waveHeightFt = homeBreakCurrent?.breakingWaveHeightFt ?? homeBreakCurrent?.dominantSwellHeightFt ?? 1.5;
  const homeBreakWaveLabel = `${Math.max(1, Math.floor(waveHeightFt))}-${Math.max(2, Math.ceil(waveHeightFt))}FT`;
  const homeBreakWindSpeed = Math.round(homeBreakCurrent?.windSpeedMph ?? 14);
  const formatCardinal = (deg: number | null | undefined) => {
    if (deg === null || deg === undefined) return "S";
    const cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(deg / 22.5) % 16;
    return cardinals[index];
  };
  const windDirection = formatCardinal(homeBreakCurrent?.windDirectionDeg ?? null);
  const latestPhotoReport = recentReportsQuery.data?.find((report) => Boolean(report.photoUrl));
  const nextWindowHours = homeBreakStatus === "GO" ? 0 : Math.max(1, Math.round((70 - homeBreakScore) / 3));
  const intensityPct = Math.max(8, Math.min(100, Math.round((homeBreakScore / 95) * 100)));
  const recentSessions = (recentReportsQuery.data || []).filter((report) => Boolean(report.photoUrl)).slice(0, 3);
  const qualityHeatMap = (currentConditionsQuery.data || [])
    .map((item) => ({
      spotId: item.spot?.id ?? 0,
      spotName: item.spot?.name || "Unknown",
      score: item.currentConditions?.qualityScore ?? item.currentConditions?.probabilityScore ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const topSignals = qualityHeatMap.slice(0, 3);
  const crowdLabelByLevel = ["Empty", "Light", "Moderate", "Crowded", "Packed"];
  const crowdIntelText = (recentReportsQuery.data || [])
    .filter((report) => report.spot?.name === dossierHomeBreak && report.crowdLevel)
    .slice(0, 1)
    .map((report) => crowdLabelByLevel[(report.crowdLevel || 3) - 1])[0] || "Light";
  const getTier = (score: number) => {
    if (score >= 80) return "FIRING";
    if (score >= 65) return "PRIME";
    return "MARGINAL";
  };
  const getTierColor = (score: number) => {
    if (score >= 80) return "bg-emerald-600";
    if (score >= 65) return "bg-amber-500";
    return "bg-gray-400";
  };
  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) {
        const id = parsed.pathname.replace("/", "");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.hostname.includes("youtube.com")) {
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      return null;
    } catch {
      return null;
    }
  };
  const isLikelyVideo = (url: string) => /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url);
  const isLikelyImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url);

  const handleSubmitMediaPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim()) {
      toast.error("Add a title for your post");
      return;
    }
    if (!mediaUrl.trim()) {
      toast.error("Add a YouTube or media link");
      return;
    }

    if (mediaPostType === "my_youtube" || mediaPostType === "shared_youtube") {
      if (!getYouTubeEmbedUrl(mediaUrl.trim())) {
        toast.error("Please use a valid YouTube link");
        return;
      }
    }

    setCommunityMediaPosts((current) => [
      {
        id: `media-${Date.now()}`,
        type: mediaPostType,
        title: mediaTitle.trim(),
        url: mediaUrl.trim(),
        caption: mediaCaption.trim() || undefined,
        author: user?.name || user?.email || "Local Member",
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);

    setMediaTitle("");
    setMediaUrl("");
    setMediaCaption("");
    setMediaPostType("my_youtube");
    toast.success("Media post shared with the community");
  };

  const handleUpdateDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spots || !user) return;

    const selectedSpot = spots.find((spot) => spot.name === dossierHomeBreak);
    if (!selectedSpot) {
      toast.error("Please select a valid home break");
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        name: dossierName.trim(),
        email: dossierEmail.trim(),
      });

      const dossierAlert = alerts?.[0];
      if (dossierAlert) {
        await updateAlertMutation.mutateAsync({
          alertId: dossierAlert.id,
          spotId: selectedSpot.id,
          minWaveHeightFt: dossierMinWaveHeight,
        });
      } else {
        await createAlertMutation.mutateAsync({
          spotId: selectedSpot.id,
          minWaveHeightFt: dossierMinWaveHeight,
          minQualityScore: 60,
          emailEnabled: false,
          smsEnabled: false,
          hoursAdvanceNotice: 24,
          notificationFrequency: "once",
        });
      }

      if (dossierStorageKey) {
        localStorage.setItem(
          dossierStorageKey,
          JSON.stringify({
            experienceYears: dossierExperienceYears,
            location: dossierLocation,
            primaryBoard: dossierPrimaryBoard,
            volumeL: dossierVolumeL,
            windPreference: dossierWindPreference,
          })
        );
      }

      toast.success("Dossier updated");
      setIsDossierOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update dossier";
      toast.error(message);
    }
  };

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
                <button
                  type="button"
                  onClick={() => setIsDossierOpen(true)}
                  className="hidden sm:block text-xs text-gray-500 truncate max-w-[220px] hover:text-black transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  title={user.email}
                >
                  {user.email}
                </button>
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

      <Sheet open={isDossierOpen} onOpenChange={setIsDossierOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl border-l border-white/30 bg-white/70 backdrop-blur-xl"
        >
          <SheetHeader>
            <SheetTitle
              className="text-xl font-black uppercase tracking-tight text-black"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
            >
              MEMBER DOSSIER [015/040]
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleUpdateDossier} className="mt-6 space-y-5">
            <section className="border border-black/15 bg-white/60 p-4">
              <div className="text-[10px] uppercase tracking-widest text-gray-700 mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Identity Intel
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Name</label>
                  <input
                    value={dossierName}
                    onChange={(e) => setDossierName(e.target.value)}
                    className={selectStyles}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Email</label>
                  <input
                    type="email"
                    value={dossierEmail}
                    onChange={(e) => setDossierEmail(e.target.value)}
                    className={selectStyles}
                    placeholder="Email"
                  />
                </div>
              </div>
            </section>

            <section className="border border-black/15 bg-white/60 p-4">
              <div className="text-[10px] uppercase tracking-widest text-gray-700 mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Operational Parameters
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Home Break</label>
                  <select
                    value={dossierHomeBreak}
                    onChange={(e) => setDossierHomeBreak(e.target.value as "Lido Beach" | "Long Beach" | "Rockaway Beach")}
                    className={selectStyles}
                  >
                    <option value="Lido Beach">Lido</option>
                    <option value="Long Beach">Long Beach</option>
                    <option value="Rockaway Beach">Rockaway</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Board Volume (L)</label>
                  <input
                    value={dossierVolumeL}
                    onChange={(e) => setDossierVolumeL(e.target.value)}
                    className={selectStyles}
                    placeholder="29.6"
                  />
                </div>
                <div>
                  <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Surf Experience (Years)</label>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={dossierExperienceYears}
                    onChange={(e) => setDossierExperienceYears(Number(e.target.value) || 0)}
                    className={selectStyles}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Primary Board</label>
                  <input
                    value={dossierPrimaryBoard}
                    onChange={(e) => setDossierPrimaryBoard(e.target.value)}
                    className={selectStyles}
                    placeholder="JS Monsta 10"
                  />
                </div>
              </div>
            </section>

            <section className="border border-black/15 bg-white/60 p-4">
              <div className="text-[10px] uppercase tracking-widest text-gray-700 mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Alert Thresholds
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Min Height (ft)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={12}
                    value={dossierMinWaveHeight}
                    onChange={(e) => setDossierMinWaveHeight(Number(e.target.value) || 0)}
                    className={selectStyles}
                  />
                </div>
                <div>
                  <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Wind Preference</label>
                  <input
                    value={dossierWindPreference}
                    onChange={(e) => setDossierWindPreference(e.target.value)}
                    className={selectStyles}
                    placeholder="OFFSHORE, WNW"
                  />
                </div>
              </div>
            </section>

            <Button
              type="submit"
              disabled={updateProfileMutation.isPending || updateAlertMutation.isPending || createAlertMutation.isPending}
              className="w-full bg-black text-white hover:bg-gray-800 border border-black uppercase tracking-widest"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {updateProfileMutation.isPending || updateAlertMutation.isPending || createAlertMutation.isPending
                ? "UPDATING"
                : "UPDATE DOSSIER"}
            </Button>

            <p className="text-[10px] text-gray-600 uppercase tracking-wide text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Precision in data leads to certainty in the water.
            </p>
          </form>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-10 w-full">
        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={(value) => {
          navigateToTab(value);
        }} className="w-full">
          {/* Tab Navigation - horizontal scroll on mobile */}
          <div className="border-b border-gray-300 mb-3 sm:mb-5 overflow-x-auto">
            <TabsList className="bg-transparent p-0 h-auto flex gap-0 min-w-max w-full sm:w-auto">
              <TabsTrigger
                value="home"
                className="relative data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-800 border border-gray-400 border-b-0 first:rounded-tl-lg rounded-none px-3 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-widest font-semibold transition-all -mb-[1px] data-[state=active]:z-10 whitespace-nowrap flex-1 sm:flex-initial flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Home className="h-4 w-4 sm:h-4 sm:w-4" />
                <span>Home</span>
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                className="relative data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-800 border border-gray-400 border-b-0 border-l-0 rounded-none px-3 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-widest font-semibold transition-all -mb-[1px] data-[state=active]:z-10 whitespace-nowrap flex-1 sm:flex-initial flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Bell className="h-4 w-4 sm:h-4 sm:w-4" />
                <span>Alerts</span>
              </TabsTrigger>
              <TabsTrigger
                value="community"
                className="relative data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-800 border border-gray-400 border-b-0 border-l-0 rounded-none px-3 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-widest font-semibold transition-all -mb-[1px] data-[state=active]:z-10 whitespace-nowrap flex-1 sm:flex-initial flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Waves className="h-4 w-4 sm:h-4 sm:w-4" />
                <span>Swell Reports</span>
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="relative data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-800 border border-gray-400 border-b-0 border-l-0 rounded-none px-3 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-widest font-semibold transition-all -mb-[1px] data-[state=active]:z-10 whitespace-nowrap flex-1 sm:flex-initial flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <ShoppingBag className="h-4 w-4 sm:h-4 sm:w-4" />
                <span>Gear</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Home Tab */}
          <TabsContent value="home" className="mt-0">
            <div className="bg-white border-2 border-black p-3 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
                <div>
                  <h1
                    className="text-2xl sm:text-4xl md:text-6xl font-black text-black uppercase tracking-tight leading-none"
                    style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                  >
                    NYC Surf Co. | Founding 40 Private Beta
                  </h1>
                  <p
                    className="text-[10px] sm:text-xs md:text-sm text-gray-700 uppercase tracking-wide sm:tracking-widest mt-1.5 sm:mt-2 max-w-3xl"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    High-fidelity intel for Lido, Long Beach, and Rockaway. Built by surfers for the first 40 locals. Backed by 20+ years of experience
                  </p>
                </div>
                <div
                  className="self-start text-[10px] sm:text-xs text-gray-500 border border-black px-2.5 py-1 uppercase tracking-wider whitespace-nowrap"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  MEMBER: 15/40
                </div>
              </div>

              <div className="mb-4 sm:mb-6 border-2 border-black bg-white">
                <div className="border-b border-gray-300 px-3 sm:px-4 py-2.5">
                  <h2
                    className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black"
                    style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                  >
                    Member Dossier
                  </h2>
                </div>
                <form onSubmit={handleUpdateDossier} className="p-3 sm:p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <section className="border border-gray-300 p-3">
                      <div className="text-[10px] uppercase tracking-widest text-gray-700 mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Identity Intel
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Name</label>
                          <input value={dossierName} onChange={(e) => setDossierName(e.target.value)} className={selectStyles} />
                        </div>
                        <div>
                          <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Email</label>
                          <input type="email" value={dossierEmail} onChange={(e) => setDossierEmail(e.target.value)} className={selectStyles} />
                        </div>
                        <div>
                          <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Location</label>
                          <input
                            value={dossierLocation}
                            onChange={(e) => setDossierLocation(e.target.value)}
                            className={selectStyles}
                            placeholder="Long Island, NY"
                          />
                        </div>
                        <div className="border border-black px-3 py-2 bg-gray-50">
                          <div className="text-[10px] uppercase tracking-wider text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            Service Record: MEMBER 015 / 040
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-gray-700 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            Local Status: VERIFIED
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="border border-gray-300 p-3">
                      <div className="text-[10px] uppercase tracking-widest text-gray-700 mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Operational Parameters
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Home Break</label>
                          <select
                            value={dossierHomeBreak}
                            onChange={(e) => setDossierHomeBreak(e.target.value as "Lido Beach" | "Long Beach" | "Rockaway Beach")}
                            className={selectStyles}
                          >
                            <option value="Lido Beach">Lido</option>
                            <option value="Long Beach">Long Beach</option>
                            <option value="Rockaway Beach">Rockaway</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Experience (Years)</label>
                          <input
                            type="number"
                            min={0}
                            max={80}
                            value={dossierExperienceYears}
                            onChange={(e) => setDossierExperienceYears(Number(e.target.value) || 0)}
                            className={selectStyles}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Primary Board</label>
                            <input value={dossierPrimaryBoard} onChange={(e) => setDossierPrimaryBoard(e.target.value)} className={selectStyles} />
                          </div>
                          <div>
                            <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Volume (L)</label>
                            <input value={dossierVolumeL} onChange={(e) => setDossierVolumeL(e.target.value)} className={selectStyles} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Min Wave Height (ft)</label>
                            <input
                              type="number"
                              step="0.5"
                              min={0}
                              max={12}
                              value={dossierMinWaveHeight}
                              onChange={(e) => setDossierMinWaveHeight(Number(e.target.value) || 0)}
                              className={selectStyles}
                            />
                          </div>
                          <div>
                            <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Preferred Wind Directions</label>
                            <input value={dossierWindPreference} onChange={(e) => setDossierWindPreference(e.target.value)} className={selectStyles} placeholder="OFFSHORE, WNW" />
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="mt-4">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending || updateAlertMutation.isPending || createAlertMutation.isPending}
                      className="w-full bg-black text-white hover:bg-gray-800 border border-black uppercase tracking-widest"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {updateProfileMutation.isPending || updateAlertMutation.isPending || createAlertMutation.isPending ? "UPDATING" : "UPDATE DOSSIER"}
                    </Button>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wide text-center mt-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Precision in data leads to certainty in the water.
                    </p>
                  </div>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch">
                <div className="space-y-3 sm:space-y-4">
                  <button
                    type="button"
                    onClick={() => setLocation("/spot/1")}
                    className="w-full border-2 border-black p-3 sm:p-4 text-left hover:bg-gray-50 transition-colors min-h-[300px]"
                  >
                    <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      The {dossierHomeBreak} Verdict
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`h-2 w-2 rounded-full ${homeBreakStatus === "GO" ? "bg-emerald-500" : "bg-gray-500"}`} />
                      <span className="text-[10px] uppercase tracking-wider text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Live
                      </span>
                    </div>
                    <div
                      className={`text-4xl sm:text-5xl font-black uppercase leading-none ${homeBreakStatus === "GO" ? "text-emerald-600" : "text-orange-700"}`}
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                    >
                      {homeBreakStatus}
                    </div>
                    <p className="mt-1.5 text-[11px] sm:text-xs uppercase tracking-wide text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {homeBreakStatus === "GO" ? "Window is active now. Strike at first light." : `Turns FAIR in ${nextWindowHours} hours.`}
                    </p>
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500 mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        <span>Intensity Meter</span>
                        <span>{Math.round(homeBreakScore)} / 95</span>
                      </div>
                      <div className="h-2 border border-black bg-gray-200">
                        <div
                          className={`h-full ${homeBreakStatus === "GO" ? "bg-emerald-600" : "bg-orange-600"}`}
                          style={{ width: `${intensityPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Wave Height
                        </div>
                        <div className="text-lg sm:text-xl md:text-2xl font-black uppercase leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                          {homeBreakWaveLabel}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Wind
                        </div>
                        <div className="text-base sm:text-lg md:text-2xl font-black uppercase leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                          {homeBreakWindSpeed}MPH {windDirection}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToTab("alerts");
                        }}
                        className="bg-black text-white hover:bg-gray-800 border border-black uppercase tracking-wider text-xs"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        Open Alerts
                      </Button>
                    </div>
                  </button>
                </div>

                <div className="border-2 border-black p-3 sm:p-4 bg-white min-h-[300px] flex flex-col justify-center">
                  <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-2 text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Surf Cams
                  </div>
                  <div
                    className="text-4xl sm:text-5xl font-black uppercase leading-none text-center text-gray-300"
                    style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                  >
                    Coming Soon
                  </div>
                  <p className="mt-3 text-[11px] sm:text-xs uppercase tracking-wide text-gray-500 text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Live camera feeds for your home break will be available here.
                  </p>
                </div>
              </div>

              <div className="mt-3 sm:mt-4 border-2 border-black bg-white">
                  <div className="p-3 sm:p-4 border-b border-gray-300">
                    <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 sm:mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Local Media Board
                    </div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-black uppercase leading-none mb-1.5 sm:mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                      Post Community Media
                    </div>
                    <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Share your own YouTube, favorite clips, and session photos/videos.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitMediaPost} className="p-3 sm:p-4 border-b border-gray-300 space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { value: "my_youtube", label: "My YouTube", icon: Video },
                        { value: "shared_youtube", label: "Favorite YouTube", icon: Link2 },
                        { value: "session_media", label: "Session Photo/Video", icon: Upload },
                      ].map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setMediaPostType(option.value as "my_youtube" | "shared_youtube" | "session_media")}
                            className={`border px-2.5 py-2 text-left transition-all ${
                              mediaPostType === option.value
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-gray-300 hover:border-black"
                            }`}
                          >
                            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              <Icon className="h-3.5 w-3.5" />
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      value={mediaTitle}
                      onChange={(e) => setMediaTitle(e.target.value)}
                      placeholder="Title"
                      className={`${selectStyles} py-2`}
                    />
                    <input
                      type="url"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder={mediaPostType === "session_media" ? "Photo/video URL" : "YouTube URL"}
                      className={`${selectStyles} py-2`}
                    />
                    <textarea
                      value={mediaCaption}
                      onChange={(e) => setMediaCaption(e.target.value)}
                      rows={2}
                      placeholder="Caption (optional)"
                      className={`${selectStyles} py-2 resize-y`}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-black text-white hover:bg-gray-800 border border-black uppercase tracking-wider text-xs"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Post to Local Media
                    </Button>
                  </form>

                  <div className="p-3 sm:p-4 space-y-3 max-h-[460px] overflow-y-auto">
                    {communityMediaPosts.slice(0, 3).map((post) => {
                      const embedUrl = getYouTubeEmbedUrl(post.url);
                      const showYouTube = Boolean(embedUrl) && (post.type === "my_youtube" || post.type === "shared_youtube");
                      const showImage = post.type === "session_media" && isLikelyImage(post.url);
                      const showVideo = post.type === "session_media" && isLikelyVideo(post.url);
                      return (
                        <article key={post.id} className="border border-black p-2.5">
                          <div className="mb-2">
                            <h3 className="text-sm font-black uppercase leading-tight text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                              {post.title}
                            </h3>
                            <p className="text-[9px] uppercase tracking-wider text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {post.author} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                            </p>
                          </div>

                          {showYouTube && embedUrl && (
                            <div className="mb-2 border border-black overflow-hidden">
                              <iframe
                                src={embedUrl}
                                title={post.title}
                                className="w-full aspect-video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                              />
                            </div>
                          )}

                          {showImage && (
                            <img src={post.url} alt={post.title} className="w-full h-40 object-cover border border-black mb-2" />
                          )}

                          {showVideo && (
                            <video controls className="w-full h-40 object-cover border border-black mb-2">
                              <source src={post.url} />
                            </video>
                          )}

                          {!showYouTube && !showImage && !showVideo && (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors mb-2"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              Open Media
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}

                          {post.caption && (
                            <p className="text-xs text-gray-700" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                              {post.caption}
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-0">
            {/* Header */}
            <div className="bg-white border-2 border-black border-t-0 p-4 sm:p-6 md:p-10">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-black uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Surf Alerts
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide sm:tracking-widest mt-2 sm:mt-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Get notified when conditions are firing
              </p>
            </div>
            <div className="bg-white border-2 border-black border-t-0">
              <form onSubmit={handleCreateAlert}>
                {/* Section 01: Spots */}
                <div className="p-4 sm:p-5 border-b-2 border-gray-200">
                  <div className="text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>01</div>
                  <h3 className="text-xl sm:text-xl font-black text-black uppercase tracking-tight mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Spot
                  </h3>
                  <p className="text-xs text-gray-600 uppercase tracking-wide sm:tracking-widest mb-3 sm:mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Which breaks do you want alerts for? (Select multiple)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {spots?.filter(spot => !["Belmar", "Gilgo Beach", "Montauk"].includes(spot.name)).map((spot) => (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => {
                          // Multi-select: toggle spot in/out of array
                          // If selecting a spot, clear "Best Spot Only"
                          setBestSpotOnly(false);
                          if (alertSpotIds.includes(spot.id)) {
                            setAlertSpotIds(alertSpotIds.filter(id => id !== spot.id));
                          } else {
                            setAlertSpotIds([...alertSpotIds, spot.id]);
                          }
                        }}
                        className={`p-3 sm:p-4 md:p-5 text-center transition-all min-h-[52px] sm:min-h-[56px] ${
                          alertSpotIds.includes(spot.id)
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black hover:bg-gray-50"
                        }`}
                        style={{ borderWidth: "2px" }}
                      >
                        <span className="font-bold text-xs sm:text-sm uppercase tracking-wide sm:tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {spot.name.toUpperCase()}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        // Toggle "Best Spot Only" and clear individual selections
                        setBestSpotOnly(!bestSpotOnly);
                        if (!bestSpotOnly) {
                          setAlertSpotIds([]);
                        }
                      }}
                      className={`p-3 sm:p-4 text-left transition-all min-h-[52px] sm:min-h-[56px] ${
                        bestSpotOnly
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-50"
                      }`}
                      style={{ borderWidth: "2px", borderStyle: "solid" }}
                    >
                      <div className="font-bold text-xs sm:text-sm uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        BEST SPOT ONLY
                      </div>
                      <div className={`text-[10px] sm:text-[11px] mt-1 ${bestSpotOnly ? "text-gray-300" : "text-gray-500"}`}>
                        Alerts for whichever beach has the highest quality score
                      </div>
                    </button>
                  </div>
                </div>

                {/* Section 02: Quality Threshold */}
                <div className="p-4 sm:p-5 border-b-2 border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs text-gray-500 font-semibold tracking-widest mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>02</div>
                      <h3 className="text-xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                        Quality Threshold
                      </h3>
                    </div>
                    {/* Compact score display */}
                    <div className="text-right">
                      <div
                        className="text-4xl font-black leading-none"
                        style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                      >
                        {minQualityScore}+
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {minQualityScore <= 55 ? "Rideable" : minQualityScore <= 65 ? "Decent" : minQualityScore <= 75 ? "Good" : minQualityScore <= 85 ? "Great" : "Epic"}
                      </div>
                    </div>
                  </div>

                  {/* Compact slider bar - increased height for mobile */}
                  <div
                    className="relative h-10 sm:h-10 cursor-pointer group"
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
                    <div className="absolute inset-y-3 left-0 right-0 bg-gray-200 rounded-sm overflow-hidden">
                      {/* Filled portion with gradient */}
                      <div
                        className="h-full transition-all duration-75"
                        style={{
                          width: `${((minQualityScore - 50) / (95 - 50)) * 100}%`,
                          background: 'linear-gradient(to right, #eab308, #84cc16, #22c55e, #16a34a, #059669)',
                        }}
                      />
                    </div>

                    {/* Thumb - larger for mobile */}
                    <div
                      className={`absolute top-1/2 w-5 h-8 bg-black rounded-sm shadow-md transition-all duration-75 ${isSliderDragging ? 'scale-110' : 'group-hover:scale-110'}`}
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
                  <div className="flex justify-between text-[9px] text-gray-400 uppercase tracking-wider mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span>50</span>
                    <span>95</span>
                  </div>

                  {/* Advanced Filters Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="mt-4 text-sm text-black font-bold hover:text-gray-600 transition-colors uppercase tracking-wider py-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {showAdvancedFilters ? '− Hide' : '+ Add'} wave/wind filters
                  </button>

                  {/* Advanced Filters */}
                  {showAdvancedFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-5">
                      {/* Min Wave Height */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-xs text-gray-700 font-semibold uppercase tracking-wide sm:tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            Min Wave Height
                          </label>
                          <span className="text-xs text-black font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-xs text-gray-700 font-semibold uppercase tracking-wide sm:tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            Min Swell Period
                          </label>
                          <span className="text-xs text-black font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
                        <div className="font-bold text-xs uppercase tracking-wider mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Alert Days
                        </div>
                        <div className="text-[10px] text-gray-500 mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Only get alerts for swells on these days
                        </div>
                        {/* Day buttons - larger for mobile */}
                        <div className="flex gap-2 mb-3">
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
                              className={`flex-1 h-10 sm:w-9 sm:h-9 sm:flex-initial text-sm font-bold transition-all border-2 ${
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
                            className={`px-3 py-2 text-[10px] font-medium border transition-all ${
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
                            className={`px-3 py-2 text-[10px] font-medium border transition-all ${
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
                            className={`px-3 py-2 text-[10px] font-medium border transition-all ${
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
                  <div className="text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>03</div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tight mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Forecast Window
                  </h3>
                  <p className="text-xs text-gray-600 uppercase tracking-wide sm:tracking-widest mb-3 sm:mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    How far ahead should we look?
                  </p>
                  <div className="space-y-3">
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
                        className={`w-full p-4 text-left transition-all min-h-[60px] ${
                          option.disabled
                            ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                            : daysAdvanceNotice === option.value
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-50"
                        }`}
                        style={{ borderWidth: "2px" }}
                      >
                        <div className="font-bold text-sm uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{option.label}</div>
                        <div className={`text-[11px] mt-1 ${option.disabled ? "text-gray-400" : daysAdvanceNotice === option.value ? "text-gray-300" : "text-gray-500"}`}>{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 04: Alert Frequency */}
                <div className="p-4 sm:p-5 border-b-2 border-gray-200">
                  <div className="text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>04</div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tight mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Alert Frequency
                  </h3>
                  <p className="text-xs text-gray-600 uppercase tracking-wide sm:tracking-widest mb-3 sm:mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    How often do you want updates?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        className={`p-4 text-left transition-all min-h-[60px] ${
                          alertFrequency === option.value
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black hover:bg-gray-50"
                        }`}
                        style={{ borderWidth: "2px" }}
                      >
                        <div className="font-bold text-sm uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{option.label}</div>
                        <div className={`text-[11px] mt-1 ${alertFrequency === option.value ? "text-gray-300" : "text-gray-500"}`}>{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 05: How Should We Notify You */}
                <div className="p-4 sm:p-5 border-b-2 border-gray-200">
                  <div className="text-xs text-gray-500 font-semibold tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>05</div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tight mb-3 sm:mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    How Should We Notify You?
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEmailEnabled(!emailEnabled)}
                      className={`p-4 text-center transition-all border-black min-h-[56px] ${
                        emailEnabled
                          ? "bg-black text-white"
                          : "bg-white text-black hover:bg-gray-50"
                      }`}
                      style={{ borderWidth: "2px", borderStyle: "solid" }}
                    >
                      <span className="font-bold text-sm uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Email</span>
                    </button>
                    <button
                      type="button"
                      disabled
                      className="p-4 text-center transition-all border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed min-h-[56px]"
                      style={{ borderWidth: "2px", borderStyle: "solid" }}
                    >
                      <span className="font-bold text-sm uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SMS</span>
                      <span className="block text-[10px] text-gray-400 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Coming Soon</span>
                    </button>
                  </div>
                  {!emailEnabled && (
                    <p className="mt-3 text-xs text-amber-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Please enable email to receive alerts
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="p-4 sm:p-5 bg-black">
                  <Button
                    type="submit"
                    disabled={createAlertMutation.isPending}
                    className="w-full bg-white text-black hover:bg-gray-100 rounded-none uppercase tracking-widest text-lg font-black py-6 h-auto transition-all"
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
            <div className="bg-white border-2 border-black border-t-0 p-4 sm:p-10">
              <h1 className="text-3xl sm:text-6xl font-black text-black uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Human-In-The-Loop Swell Tracking
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide sm:tracking-widest mt-2 sm:mt-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Session-by-session reporting from locals in the lineup
              </p>
            </div>
            <div className="bg-white border-2 border-black border-t-0 p-4 sm:p-10 space-y-6 sm:space-y-8">
              {/* Report Submission Card */}
              <div className="bg-white border-2 border-black">
                <div className="p-4 sm:p-6 border-b-2 border-gray-200">
                  <h3 className="text-2xl font-black uppercase mb-2 text-black"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    + Log Swell Report
                  </h3>
                  <p className="text-xs text-gray-800 uppercase tracking-wide sm:tracking-widest"
                     style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Track how the swell actually showed up at your spot
                  </p>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                  {/* Spot Selector */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide sm:tracking-widest text-gray-700 mb-2"
                           style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Which Spot?
                    </label>
                    <select
                      value={reportSpotId ?? ""}
                      onChange={(e) => setReportSpotId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full bg-white border-2 border-black px-4 py-4 text-sm font-bold uppercase text-black"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <option value="">Select a spot...</option>
                      {spots?.filter(s => !["Belmar", "Gilgo Beach", "Montauk"].includes(s.name)).map(spot => (
                        <option key={spot.id} value={spot.id}>
                          {spot.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Picker */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide sm:tracking-widest text-gray-700 mb-2"
                           style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Session Date
                    </label>
                    <ReportDatePicker
                      selectedDate={reportDate}
                      onDateChange={setReportDate}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleNavigateToReport}
                    disabled={!reportSpotId}
                    className="w-full bg-black text-white hover:bg-gray-800 border-2 border-black py-6 text-lg font-black uppercase"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    Continue to Report Form →
                  </Button>
                </div>
              </div>

              <UserStatsWidget />

              <div>
                <h2 className="text-2xl font-black uppercase mb-4 text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  Recent Reports
                </h2>
                <ReportFeed limit={20} />
              </div>
            </div>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="services" className="mt-0">
            <div className="bg-white border-2 border-black border-t-0 p-4 sm:p-10">
              <h1 className="text-3xl sm:text-6xl font-black text-black uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Marketplace
              </h1>
              <p className="text-xs sm:text-sm text-gray-800 uppercase tracking-wide sm:tracking-widest mt-2 sm:mt-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Local shops, services & surf gear
              </p>
            </div>
            <div className="bg-white border-2 border-black border-t-0">
              {/* Coming Soon Banner */}
              <div className="p-4 sm:p-6 bg-black text-white text-center">
                <p className="text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Coming Soon
                </p>
              </div>

              {/* Service Categories Preview */}
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {/* Expert Calls */}
                <div className="p-4 sm:p-5 border-2 border-gray-200 hover:border-black transition-all">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 bg-black flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                        Expert Calls
                      </h3>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Book 1-on-1 calls with local surf experts. Get personalized advice on spots, conditions, and technique from surfers who know these breaks inside out.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lessons & Coaching */}
                <div className="p-4 sm:p-5 border-2 border-gray-200 hover:border-black transition-all">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 bg-black flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                        Lessons & Coaching
                      </h3>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Connect with certified instructors for private or group lessons. From beginners to advanced surfers looking to level up.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Local Shops */}
                <div className="p-4 sm:p-5 border-2 border-gray-200 hover:border-black transition-all">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 bg-black flex items-center justify-center flex-shrink-0">
                      <Store className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                        Local Shops & Rentals
                      </h3>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Discover local surf shops, board rentals, and gear. Support the businesses that keep our surf community thriving.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Board Repair */}
                <div className="p-4 sm:p-5 border-2 border-gray-200 hover:border-black transition-all">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 bg-black flex items-center justify-center flex-shrink-0">
                      <Wrench className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                        Board Repair & Ding Fix
                      </h3>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Find trusted local shapers and repair specialists. Get your board back in the water fast with quality craftsmanship.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Interest CTA */}
              <div className="p-4 sm:p-6 bg-gray-100 border-t-2 border-gray-200">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide sm:tracking-widest mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Are you a local business or expert?
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed px-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    We're building a directory of trusted local surf services. Get in touch to be featured when we launch.
                  </p>
                  <a
                    href="mailto:rniederreither@gmail.com?subject=Services Directory Interest"
                    className="inline-block mt-4 px-6 py-3 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-gray-800 transition-all"
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

