import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2, Bell, Users, ShoppingBag, Home, X, ChevronRight, Phone, Store, GraduationCap, Wrench, LogOut, Video, Link2, Upload, ExternalLink, Waves, Info } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { ReportFeed } from "@/components/ReportFeed";
import { UserStatsWidget } from "@/components/UserStatsWidget";
import { ReportDatePicker } from "@/components/ReportDatePicker";
import { LatestPhotos } from "@/components/LatestPhotos";
import { AnnouncementsFeed } from "@/components/AnnouncementsFeed";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TideSparkline } from "@/components/TideSparkline";
import { formatSurfHeight } from "@/lib/forecastUtils";

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
  const { data: memberInfo } = trpc.auth.memberInfo.useQuery();
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
  }>>([]);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);
  const [dossierName, setDossierName] = useState("");
  const [dossierEmail, setDossierEmail] = useState("");
  const [dossierHomeBreak, setDossierHomeBreak] = useState<"Lido Beach" | "Long Beach" | "Rockaway Beach">("Lido Beach");
  const [dossierExperienceYears, setDossierExperienceYears] = useState<number>(20);
  const [dossierLocation, setDossierLocation] = useState("");
  const [dossierPrimaryBoard, setDossierPrimaryBoard] = useState("");
  const [dossierVolumeL, setDossierVolumeL] = useState("");
  const [dossierMinWaveHeight, setDossierMinWaveHeight] = useState<number>(2);
  const [dossierWindPreference, setDossierWindPreference] = useState("OFFSHORE");
  const [dossierMinQualityScore, setDossierMinQualityScore] = useState<number>(60);

  // Depends on dossierHomeBreak state — must come after useState declarations
  const homeBreakSpotIdEarly = spots?.find((s) => s.name === dossierHomeBreak)?.id;
  const { data: timelineData } = trpc.forecasts.getTimeline.useQuery(
    { spotId: homeBreakSpotIdEarly!, hours: 168 },
    { enabled: homeBreakSpotIdEarly != null, staleTime: 30 * 60 * 1000 }
  );

  const memberLabel = user
    ? `${String(memberInfo?.memberNumber ?? 0).padStart(3, '0')}/${String(memberInfo?.totalCount ?? 40).padStart(3, '0')}`
    : "015/040";

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
        minQualityScore?: number;
      };
      if (typeof parsed.experienceYears === "number") setDossierExperienceYears(parsed.experienceYears);
      if (typeof parsed.location === "string") setDossierLocation(parsed.location);
      if (typeof parsed.primaryBoard === "string") setDossierPrimaryBoard(parsed.primaryBoard);
      if (typeof parsed.volumeL === "string") setDossierVolumeL(parsed.volumeL);
      if (typeof parsed.windPreference === "string") setDossierWindPreference(parsed.windPreference);
      if (typeof parsed.minQualityScore === "number") setDossierMinQualityScore(parsed.minQualityScore);
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
  const bebasStyle = { fontFamily: "'Bebas Neue', 'Oswald', sans-serif" };
  const monoStyle = { fontFamily: "'JetBrains Mono', monospace" };
  const navigateToTab = (value: string) => {
    setActiveTab(value);
    setLocation(`/members?tab=${value}`);
  };

  const homeBreakEntry = currentConditionsQuery.data?.find((item) => item.spot?.name === dossierHomeBreak);
  const homeBreakCurrent = homeBreakEntry?.currentConditions;
  const homeBreakSpotId = homeBreakSpotIdEarly;
  const homeBreakScore = homeBreakCurrent?.qualityScore ?? homeBreakCurrent?.probabilityScore ?? 0;
  const homeBreakStatus = homeBreakScore >= 60 ? "GO" : "STANDBY";
  const waveHeightFt = homeBreakCurrent?.breakingWaveHeightFt ?? homeBreakCurrent?.dominantSwellHeightFt ?? 1.5;
  const homeBreakWaveLabel = formatSurfHeight(waveHeightFt).toUpperCase();
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
  const intensityPct = Math.max(8, Math.min(100, Math.round(homeBreakScore)));
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
    if (score >= 91) return "ALL-TIME";
    if (score >= 76) return "FIRING";
    if (score >= 60) return "GO SURF";
    if (score >= 40) return "WORTH A LOOK";
    return "DON'T BOTHER";
  };
  const getTierColor = (score: number) => {
    if (score >= 91) return "bg-emerald-600";
    if (score >= 76) return "bg-green-600";
    if (score >= 60) return "bg-lime-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };
  const getObjectiveTier = (score: number): string => {
    if (score >= 91) return "ALL-TIME";
    if (score >= 76) return "FIRING";
    if (score >= 60) return "GO SURF";
    if (score >= 40) return "WORTH A LOOK";
    return "DON'T BOTHER";
  };
  const getObjectiveTierColor = (score: number): string => {
    if (score >= 91) return "text-emerald-600";
    if (score >= 76) return "text-green-600";
    if (score >= 60) return "text-lime-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-500";
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
            minQualityScore: dossierMinQualityScore,
          })
        );
      }

      toast.success("Profile updated");
      setIsDossierOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    }
  };

  // --- Helper functions ---
  const windMatchesPref = (windType: string | null | undefined, windPref: string): boolean => {
    if (!windType) return false;
    const pref = windPref.toLowerCase();
    const wt = windType.toLowerCase();
    if (pref.includes("offshore")) return wt === "offshore" || wt === "side-offshore";
    if (pref.includes("any") || pref.includes("all")) return true;
    return wt.includes(pref) || pref.includes(wt);
  };

  const getPersonalizedVerdict = (
    waveHeightFt: number,
    windType: string | null | undefined,
    minWaveHeight: number,
    windPref: string,
    minQualityScore: number,
    currentScore: number,
    nextSession: { day: string; waveLabel: string } | null
  ): { text: string; status: 'go' | 'marginal' | 'standby' } => {
    const heightOk = waveHeightFt >= minWaveHeight;
    const windOk = windMatchesPref(windType, windPref);
    const scoreOk = currentScore >= minQualityScore;
    if (!heightOk && nextSession) return { text: `Below your minimum. Next window: ${nextSession.day} — ${nextSession.waveLabel}.`, status: 'standby' };
    if (!heightOk) return { text: "Below your minimum. Not your day.", status: 'standby' };
    if (!scoreOk) return { text: `Quality score (${Math.round(currentScore)}) is below your ${minQualityScore} threshold. Not worth it.`, status: 'marginal' };
    if (!windOk) return { text: "Waves are there but winds aren't ideal for you. Worth checking live.", status: 'marginal' };
    return { text: "Your conditions. Get in the water.", status: 'go' };
  };

  const getLocalIntel = (
    score: number,
    current: typeof homeBreakCurrent,
    homeBreak: string
  ): string | null => {
    if (!current) return null;

    const windType = current.windType;
    const windSpeed = current.windSpeedMph ?? 0;
    const windDir = current.windDirectionDeg ?? null;
    const tidePhase = current.tidePhase;
    const period = current.dominantSwellPeriodS ?? 0;
    const breakingHt = current.breakingWaveHeightFt ?? current.dominantSwellHeightFt ?? 0;
    const swellDir = current.dominantSwellDirectionDeg ?? null;
    const secPeriod = 0;
    const secHt = 0;

    const isLido = homeBreak === "Lido Beach";
    const isLongBeach = homeBreak === "Long Beach";
    const isRockaway = homeBreak === "Rockaway Beach";

    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const month = now.getMonth();
    const isWinter = month >= 10 || month <= 2; // Nov–Mar

    const isSESwell = swellDir !== null && swellDir >= 110 && swellDir <= 175;
    const isEastWrap = swellDir !== null && swellDir >= 90 && swellDir <= 105;
    const isWestBlocked = swellDir !== null && swellDir >= 247.5 && swellDir <= 330;
    const isWNWWind = windDir !== null && windDir >= 285 && windDir <= 315;
    const isNNWOffshore = windDir !== null && (windDir >= 310 || windDir <= 34);
    const isNEWind = windDir !== null && windDir >= 35 && windDir <= 60;
    const hasSecondaryGroundswell = secHt >= 1.5 && secPeriod >= 8 && period < 7;
    const isHighTide = tidePhase === 'high';
    const isFallingTide = tidePhase === 'falling';
    const isRisingTide = tidePhase === 'rising';
    const isSmall = breakingHt < 2;
    const isOnshoreStrong = windType === 'onshore' && windSpeed > 7;
    const isCross = windType === 'cross';
    const isOffshore = windType === 'offshore' || windType === 'side-offshore';
    const isLargeSwell = breakingHt >= 5;
    const hurricaneSwell = score >= 70 && breakingHt >= 6;

    // Global overrides — checked first regardless of rating
    if (period >= 12) {
      return "Long period swell. The canyon is going to focus this. Breaking height will be bigger than the buoy numbers look.";
    }
    if (isWNWWind && isRockaway) {
      return "WNW is actually a solid angle for Rockaway given how deep it sits in the Bight. Better here than it would be at Lido or Long Beach today.";
    }
    if (hurricaneSwell) {
      return "Hurricane swells are the most overhyped days of the year here. Expect crowds, closeouts, and a lot of people who don't know what they're doing. Manage expectations.";
    }

    // All-Time
    if (score >= 91) {
      return "One of maybe five days a year on the south shore. You already know what to do.";
    }

    // Firing
    if (score >= 76) {
      if (isLargeSwell && (!isWinter || isWeekend)) {
        return "Big swell but expect Rockaway to be a zoo by 8am. These are the most overcrowded days of the year. Paddle out early or go to Lido.";
      }
      return "This is a real day. N/NW wind, SE groundswell, mid-tide. These don't come together often on Long Island.";
    }

    // Go Surf
    if (score >= 60) {
      if (isSESwell && isLido) {
        return "SE groundswell is what the Hudson Canyon was made for. Lido is going to be the best option today.";
      }
      if (isSESwell && isLongBeach) {
        return "SE swell hitting the jetty sandbars at Long Beach at the right angle. Worth the trip.";
      }
      if (isOffshore && isNNWOffshore && isRisingTide) {
        return "North wind offshore and tide coming in. Mid-tide is the sweet spot at these breaks. Go.";
      }
      return "Wind is offshore and the swell has period behind it. Conditions are lined up.";
    }

    // Worth a Look
    if (score >= 40) {
      if (isCross && breakingHt >= 2) {
        return "Swell is real but cross winds are adding texture. Manageable if you don't mind choppy conditions.";
      }
      if (isEastWrap) {
        return "East wrap swell. Lost some energy coming around the island. Less organized than it looks on paper.";
      }
      if (hasSecondaryGroundswell) {
        return "There's some groundswell underneath the chop. More shape in the sets than the numbers suggest.";
      }
      if (isNEWind && isSmall) {
        return "NE offshore helps on bigger days. At this size it's not doing much grooming.";
      }
      if (isFallingTide) {
        return "Tide is dropping and the sandbars are going shallow. Go now or wait for the next push.";
      }
      return "Swell is real but cross winds are adding texture. Manageable if you don't mind choppy conditions.";
    }

    // Don't Bother
    if (isOnshoreStrong) {
      return "Onshore wind above 7mph makes these beach breaks unrideable. That's the whole story today.";
    }
    if (isCross && isFallingTide) {
      return "Cross winds and a dropping tide. Nothing is going to hold up.";
    }
    if (isSmall && period < 7) {
      return "Wind swell with no period behind it. These aren't real waves.";
    }
    if (isHighTide && isLongBeach) {
      return "High tide is swamping the sandbars at Long Beach. Come back on the drop.";
    }
    if (isWestBlocked) {
      return "Wrong swell angle for the south shore. The NY Bight is blocking most of the energy.";
    }
    if (isSmall) {
      return "Too small for current conditions. Wait for the next swell.";
    }

    return null;
  };

  type NextSession = {
    day: string; waveLabel: string; windType: string;
    period: number | null; score: number; tags: string[];
  };

  const findNextBestSession = (
    timeline: NonNullable<typeof timelineData>["timeline"],
    minWaveHeight: number,
    windPref: string
  ): NextSession | null => {
    if (!timeline?.length) return null;
    const today = new Date().toDateString();

    const byDay = new Map<string, typeof timeline>();
    for (const pt of timeline) {
      const key = new Date(pt.forecastTimestamp).toDateString();
      if (key === today) continue;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(pt);
    }

    type TimelinePt = NonNullable<typeof timelineData>["timeline"][number];
    const days = Array.from(byDay.entries()).map(([dateStr, pts]) => ({
      dateStr,
      best: pts.reduce((a: TimelinePt, b: TimelinePt) => (a.quality_score ?? 0) > (b.quality_score ?? 0) ? a : b),
    }));

    const match = days.find(({ best }) => {
      const ht = best.breakingWaveHeightFt ?? best.dominantSwellHeightFt ?? 0;
      return ht >= minWaveHeight && windMatchesPref(best.windType, windPref);
    });

    const candidate = match ?? [...days].sort((a, b) => (b.best.quality_score ?? 0) - (a.best.quality_score ?? 0))[0];
    if (!candidate) return null;

    const { dateStr, best } = candidate;
    const waveHt = best.breakingWaveHeightFt ?? best.dominantSwellHeightFt ?? 0;
    const tags: string[] = [];
    const wt = best.windType?.toLowerCase() ?? "";
    if (wt === "offshore" || wt === "side-offshore") tags.push("OFFSHORE WINDOW");
    else if (wt === "cross") tags.push("CROSS WINDS");
    if (waveHt >= minWaveHeight) tags.push("MEETS YOUR MIN");
    const sc = best.quality_score ?? 0;
    if (sc >= 76) tags.push("FIRING");
    else if (sc >= 60) tags.push("CLEAN");

    return {
      day: new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" }).toUpperCase(),
      waveLabel: formatSurfHeight(waveHt).toUpperCase(),
      windType: (best.windType ?? "").replace("-", " ").toUpperCase(),
      period: best.dominantSwellPeriodS ?? null,
      score: Math.round(sc),
      tags,
    };
  };

  const getConditionTags = (): string[] => {
    const tags: string[] = [];
    const wt = homeBreakCurrent?.windType?.toLowerCase() ?? "";
    const tide = homeBreakCurrent?.tidePhase?.toLowerCase() ?? "";
    const waveHt = homeBreakCurrent?.breakingWaveHeightFt ?? homeBreakCurrent?.dominantSwellHeightFt ?? 0;
    if (wt === "offshore" || wt === "side-offshore") tags.push("OFFSHORE WINDOW");
    else if (wt === "cross") tags.push("CROSS WINDS");
    else if (wt === "onshore") tags.push("ONSHORE");
    if (tide.includes("rising") || tide.includes("flood") || tide.includes("incoming")) tags.push("INCOMING TIDE");
    else if (tide.includes("high")) tags.push("HIGH TIDE");
    else if (tide.includes("low")) tags.push("LOW TIDE");
    else if (tide.includes("falling") || tide.includes("ebb") || tide.includes("outgoing")) tags.push("OUTGOING TIDE");
    if (waveHt < dossierMinWaveHeight) tags.push("BELOW MIN");
    if (homeBreakScore >= 80) tags.push("CROWD ALERT");
    else if (homeBreakScore >= 65 && (wt === "offshore" || wt === "side-offshore")) tags.push("CLEAN");
    return tags;
  };

  // --- Computed derived values ---
  const nextSession = findNextBestSession(timelineData?.timeline ?? [], dossierMinWaveHeight, dossierWindPreference);
  const verdict = getPersonalizedVerdict(waveHeightFt, homeBreakCurrent?.windType, dossierMinWaveHeight, dossierWindPreference, dossierMinQualityScore, homeBreakScore, nextSession);
  const localIntel = getLocalIntel(homeBreakScore, homeBreakCurrent, dossierHomeBreak);
  const conditionTags = getConditionTags();

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
          className="w-full sm:max-w-xl border-l border-white/30 bg-white/70 backdrop-blur-xl flex flex-col"
        >
          <SheetHeader className="flex-shrink-0">
            <SheetTitle
              className="text-xl font-black uppercase tracking-tight text-black"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
            >
              CUSTOM PROFILE [{memberLabel}]
            </SheetTitle>
          </SheetHeader>

          <div className="overflow-y-auto flex-1 px-1 pb-6">
          <form onSubmit={handleUpdateDossier} className="space-y-5">
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
                <div>
                  <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Location</label>
                  <input
                    value={dossierLocation}
                    onChange={(e) => setDossierLocation(e.target.value)}
                    className={selectStyles}
                    placeholder="Long Island, NY"
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
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelStyles} style={{ fontFamily: "'JetBrains Mono', monospace" }}>Min Quality Score</label>
                    <span className="text-xs font-bold text-black" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{dossierMinQualityScore}+</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={90}
                    step={5}
                    value={dossierMinQualityScore}
                    onChange={(e) => setDossierMinQualityScore(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-sm appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between text-[8px] text-gray-500 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span>40 — Anything goes</span>
                    <span>90 — Elite only</span>
                  </div>
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
                : "UPDATE PROFILE"}
            </Button>

            <p className="text-[10px] text-gray-600 uppercase tracking-wide text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Precision in data leads to certainty in the water.
            </p>
          </form>
          </div>
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
                className="relative data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-900 border border-gray-400 border-b-0 first:rounded-tl-lg rounded-none px-3 sm:px-5 py-2 sm:py-2.5 text-xs uppercase tracking-wide sm:tracking-widest font-semibold transition-all -mb-[1px] data-[state=active]:z-10 whitespace-nowrap flex-1 sm:flex-initial flex-row items-center justify-center gap-1.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Home className="h-3.5 w-3.5" />
                <span>Home</span>
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                className="relative data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-900 border border-gray-400 border-b-0 border-l-0 rounded-none px-3 sm:px-5 py-2 sm:py-2.5 text-xs uppercase tracking-wide sm:tracking-widest font-semibold transition-all -mb-[1px] data-[state=active]:z-10 whitespace-nowrap flex-1 sm:flex-initial flex-row items-center justify-center gap-1.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Alerts</span>
              </TabsTrigger>
              <TabsTrigger
                value="community"
                className="relative data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-900 border border-gray-400 border-b-0 border-l-0 rounded-none px-3 sm:px-5 py-2 sm:py-2.5 text-xs uppercase tracking-wide sm:tracking-widest font-semibold transition-all -mb-[1px] data-[state=active]:z-10 whitespace-nowrap flex-1 sm:flex-initial flex-row items-center justify-center gap-1.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Waves className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Swell </span><span>Reports</span>
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="relative data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-900 border border-gray-400 border-b-0 border-l-0 rounded-none px-3 sm:px-5 py-2 sm:py-2.5 text-xs uppercase tracking-wide sm:tracking-widest font-semibold transition-all -mb-[1px] data-[state=active]:z-10 whitespace-nowrap flex-1 sm:flex-initial flex-row items-center justify-center gap-1.5"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Gear</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Home Tab */}
          <TabsContent value="home" className="mt-0">
            {/* Identity Header Bar */}
            <div className="bg-white border-2 border-black p-3 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1
                    className="text-xl sm:text-4xl font-black text-black uppercase tracking-tight leading-none"
                    style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                  >
                    <span className="block sm:inline">{dossierName || "SURFER"} · {dossierHomeBreak}</span>
                    <span className="block sm:inline sm:before:content-['·'] sm:before:mx-1">MEMBER {memberLabel}</span>
                  </h1>
                  <p
                    className="text-[9px] sm:text-[10px] text-gray-700 uppercase tracking-widest mt-1"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    NYC Surf Co. · {dossierLocation || "Long Island, NY"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsDossierOpen(true)}
                    className="border border-black px-2 sm:px-3 py-1.5 text-[10px] uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <span className="hidden sm:inline">Customize Your Profile</span>
                    <span className="sm:hidden">Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToTab("alerts")}
                    className="border border-black px-2 sm:px-3 py-1.5 text-[10px] uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors flex items-center gap-1"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <Bell className="h-3 w-3" />
                    <span className="hidden sm:inline">Alerts</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Two-Column Financial Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] border-2 border-t-0 border-black bg-white">

              {/* LEFT: Main Content */}
              <div className="lg:border-r-2 lg:border-black flex flex-col">

                {/* Hero: Personalized verdict */}
                <div className="px-4 py-4 border-b-2 border-black">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[8px] uppercase tracking-widest text-gray-500" style={monoStyle}>
                        Personalized · {dossierHomeBreak}
                      </div>
                      <div className="text-[8px] text-gray-400 mt-0.5" style={monoStyle}>
                        {dossierMinWaveHeight}ft+ · {dossierWindPreference} · {dossierMinQualityScore}+ score
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${verdict.status === 'go' ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                      <span className="text-[8px] uppercase tracking-wide text-gray-500" style={monoStyle}>
                        {verdict.status === 'go' ? "Active window" : `Est. +${nextWindowHours}h`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 inline-block ${
                          verdict.status === 'go' ? "bg-emerald-600 text-white"
                          : verdict.status === 'marginal' ? "bg-red-600 text-white"
                          : "bg-red-700 text-white"
                        }`}
                        style={monoStyle}
                      >
                        {verdict.status === 'go' ? 'GO' : verdict.status === 'marginal' ? "DON'T BOTHER" : 'STANDBY'}
                      </span>
                      <div className="text-[10px] text-gray-800 font-medium uppercase tracking-wide mt-2 leading-snug" style={monoStyle}>
                        {verdict.text}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[8px] uppercase tracking-wider text-gray-400 mb-0.5" style={monoStyle}>Wave Ht</div>
                      <div className="text-3xl sm:text-4xl font-black leading-none text-gray-900" style={bebasStyle}>
                        {homeBreakWaveLabel}
                      </div>
                    </div>
                  </div>

                  {localIntel && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-[12px] text-gray-700 leading-relaxed" style={monoStyle}>
                        {localIntel}
                      </p>
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="h-1 bg-gray-100">
                      <div
                        className={`h-full transition-all ${homeBreakScore >= 70 ? "bg-emerald-500" : homeBreakScore >= 50 ? "bg-amber-500" : "bg-red-400"}`}
                        style={{ width: `${intensityPct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[8px] text-gray-400 mt-0.5" style={monoStyle}>
                      Score {Math.round(homeBreakScore)}/100
                      <TooltipProvider delayDuration={300}>
                        <Tooltip open={scoreInfoOpen} onOpenChange={setScoreInfoOpen}>
                          <TooltipTrigger asChild>
                            <span
                              className="cursor-pointer text-gray-400 hover:text-gray-700 transition-colors p-1 -m-1"
                              onClick={() => setScoreInfoOpen(o => !o)}
                            >
                              <Info className="h-4 w-4" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[240px] text-[10px] normal-case tracking-normal font-normal leading-relaxed">
                            Forecast rating (0–100) based on wave shape, swell quality, wind, and tide alignment, personalized to your quality preferences.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>

                {/* Next Session */}
                <div className="px-4 py-4 border-b-2 border-black">
                  <div className="text-[8px] uppercase tracking-widest text-gray-500 mb-2" style={monoStyle}>
                    Next Session · {dossierHomeBreak}
                  </div>
                  {nextSession ? (
                    <div className={`border-l-4 px-3 py-2.5 ${
                      nextSession.score >= 70 ? "border-l-emerald-500 bg-emerald-50"
                      : nextSession.score >= 50 ? "border-l-amber-400 bg-amber-50"
                      : "border-l-red-400 bg-red-50"
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-2xl font-black uppercase leading-none text-gray-900" style={bebasStyle}>{nextSession.day}</div>
                          <div className="text-[9px] uppercase tracking-wide text-gray-600 mt-0.5" style={monoStyle}>
                            {nextSession.waveLabel} · {nextSession.windType}{nextSession.period ? ` · ${nextSession.period}s` : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-3xl font-black leading-none ${nextSession.score >= 70 ? "text-emerald-600" : nextSession.score >= 50 ? "text-amber-500" : "text-red-600"}`} style={bebasStyle}>{nextSession.score}</div>
                          <div className="text-[8px] text-gray-500" style={monoStyle}>/100</div>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-1.5 flex-wrap">
                        {nextSession.tags.map(tag => (
                          <span key={tag} className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 border ${
                            ["OFFSHORE WINDOW", "CLEAN", "FIRING"].includes(tag) ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : ["CROSS WINDS", "INCOMING TIDE"].includes(tag) ? "bg-amber-50 text-amber-700 border-amber-300"
                            : ["BELOW MIN", "ONSHORE"].includes(tag) ? "bg-red-50 text-red-700 border-red-300"
                            : "bg-white/70 text-gray-700 border-gray-300"
                          }`} style={monoStyle}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-gray-400 uppercase tracking-wide" style={monoStyle}>
                      No matching session in next 7 days.
                    </div>
                  )}
                  <button onClick={() => setLocation(`/spot/${homeBreakSpotId ?? 1}`)}
                    className="mt-2 text-[9px] uppercase tracking-wider text-gray-400 hover:text-black transition-colors flex items-center gap-0.5"
                    style={monoStyle}>
                    Full Forecast <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Current Conditions — dark slab */}
                {(() => {
                  const periodS = homeBreakCurrent?.dominantSwellPeriodS;
                  const periodDesc = periodS == null ? "" : periodS >= 14 ? "long-period groundswell" : periodS >= 12 ? "groundswell — powerful" : periodS >= 10 ? "sweet spot for WLI breaks" : periodS >= 7 ? "mid-period — some shape" : "wind swell — choppy";
                  const swellDirDeg = homeBreakCurrent?.dominantSwellDirectionDeg;
                  const swellDirDesc = swellDirDeg == null ? "" : (swellDirDeg >= 135 && swellDirDeg <= 225) ? "favorable for LI south shore" : (swellDirDeg >= 90 && swellDirDeg < 135) ? "angled — manageable" : "suboptimal angle";
                  const windTypeRaw = homeBreakCurrent?.windType || "";
                  const windTypeDesc = windTypeRaw.includes("offshore") ? "clean, glassy faces" : windTypeRaw.includes("onshore") ? "blown out, choppy" : windTypeRaw.includes("cross") ? "some texture, rideable" : "";
                  const tidePhase = (homeBreakCurrent?.tidePhase || "").toLowerCase();
                  const tideDesc = tidePhase === "rising" ? "building — most breaks improve" : tidePhase === "falling" ? "dropping — watch shallows" : tidePhase === "high" ? "full tide — slower, fatter" : tidePhase === "low" ? "low — exposed, more punch" : "";
                  const htFt = homeBreakCurrent?.breakingWaveHeightFt ?? homeBreakCurrent?.dominantSwellHeightFt;
                  const waveDesc = htFt == null ? "" : htFt >= 8 ? "overhead+ — consequential" : htFt >= 5 ? "head-high — solid" : htFt >= 3 ? "chest to shoulder — fun" : htFt >= 1.5 ? "waist to chest — playful" : "knee-high — beginner only";
                  const stats = [
                    { label: "Wave Ht", value: homeBreakWaveLabel, desc: waveDesc },
                    { label: "Period", value: periodS ? `${periodS}s` : "—", desc: periodDesc },
                    { label: "Swell Dir", value: swellDirDeg != null ? `${swellDirDeg}° ${formatCardinal(swellDirDeg)}` : "—", desc: swellDirDesc },
                    { label: "Wind", value: `${homeBreakWindSpeed}mph ${windDirection}`, desc: windTypeDesc },
                    { label: "Tide", value: homeBreakCurrent?.tidePhase ? homeBreakCurrent.tidePhase.toUpperCase() : "—", desc: tideDesc },
                    { label: "Wind Type", value: windTypeRaw ? windTypeRaw.replace("-", " ").toUpperCase() : "—", desc: "" },
                  ];
                  return (
                    <div className="bg-slate-700 px-4 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[8px] uppercase tracking-widest text-slate-300" style={monoStyle}>
                          Current Conditions
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${homeBreakCurrent ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                          <span className="text-[8px] uppercase tracking-wide text-slate-300" style={monoStyle}>
                            {homeBreakCurrent ? "Live" : "Awaiting"}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
                        {stats.map(({ label, value, desc }) => (
                          <div key={label}>
                            <div className="text-[8px] uppercase tracking-widest text-slate-400 mb-0.5" style={monoStyle}>{label}</div>
                            <div className="text-xl font-black leading-none text-white uppercase" style={bebasStyle}>{value}</div>
                            {desc && <div className="text-[8px] text-slate-400 mt-0.5 leading-tight" style={monoStyle}>{desc}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Surf Cams placeholder — fills remaining height */}
                <div className="px-4 py-4 border-t-2 border-black flex-1 flex flex-col justify-center items-center min-h-[80px] sm:min-h-[120px]">
                  <div className="text-[9px] uppercase tracking-widest text-gray-400 mb-1" style={monoStyle}>Surf Cams</div>
                  <div className="text-3xl font-black uppercase leading-none text-gray-200" style={bebasStyle}>Coming Soon</div>
                  <div className="text-[9px] text-gray-400 mt-1.5 text-center" style={monoStyle}>
                    Live feeds for your favorite Long Island breaks
                  </div>
                </div>

              </div>

              {/* RIGHT: Member Dossier Sidebar */}
              <div className="p-4 border-t-2 border-black lg:border-t-0">
                {/* Desktop-only: profile rows + conditions rating */}
                <div className="hidden lg:block">
                  <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Member Profile
                  </div>
                  <div className="space-y-0">
                    {([
                      ["Symbol", `MEMBER ${memberLabel}`],
                      ["Location", dossierLocation || "—"],
                      ["Home Break", dossierHomeBreak],
                      ["Experience", `${dossierExperienceYears} yrs`],
                      ["Primary Board", dossierPrimaryBoard || "—"],
                      ["Volume", dossierVolumeL ? `${dossierVolumeL}L` : "—"],
                      ["Min Height", `${dossierMinWaveHeight}ft`],
                      ["Wind Pref", dossierWindPreference || "—"],
                      ["Min Score", `${dossierMinQualityScore}+`],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="flex justify-between items-baseline py-2 border-b border-gray-100">
                        <span className="text-[10px] text-gray-700 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {label}
                        </span>
                        <span className="text-[10px] font-bold text-right max-w-[130px] truncate text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Conditions Rating (like Analyst Consensus) */}
                  <div className="mt-5 pt-4 border-t-2 border-black">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[9px] uppercase tracking-widest text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Raw Conditions · Objective
                      </div>
                    </div>
                    <div
                      className={`text-2xl font-black uppercase leading-none ${getObjectiveTierColor(homeBreakScore)}`}
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                    >
                      {getObjectiveTier(homeBreakScore)}
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5" style={monoStyle}>
                      {Math.round(homeBreakScore)}/100 · {homeBreakStatus === "GO" ? "Active window" : `Est. +${nextWindowHours}h`}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {conditionTags.length > 0 ? conditionTags.map(tag => (
                        <span key={tag} className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border ${
                          ["OFFSHORE WINDOW", "CLEAN", "FIRING"].includes(tag) ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : ["CROSS WINDS", "INCOMING TIDE"].includes(tag) ? "bg-amber-50 text-amber-700 border-amber-300"
                          : ["BELOW MIN", "ONSHORE"].includes(tag) ? "bg-red-50 text-red-700 border-red-300"
                          : "bg-gray-100 text-gray-600 border-gray-300"
                        }`} style={monoStyle}>{tag}</span>
                      )) : (
                        <span className="text-[9px] uppercase tracking-wider text-gray-400" style={monoStyle}>No active signals</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Always visible: Tide Sparkline */}
                <div className="mt-0 lg:mt-3 pt-0 lg:pt-3 lg:border-t lg:border-gray-100">
                  <TideSparkline spotId={homeBreakSpotId} />
                </div>

                {/* View full forecast CTA */}
                <button
                  onClick={() => setLocation("/spot/1")}
                  className="mt-4 w-full border border-black px-3 py-2 text-[10px] uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Full Forecast
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Local Media Board — Post form left, video feed right */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-2 border-black border-t-0">
              {/* LEFT: Post form */}
              <div className="border-b-2 md:border-b-0 md:border-r-2 border-black">
                <div className="p-4 border-b-2 border-black">
                  <div className="text-[8px] uppercase tracking-widest text-gray-700 mb-1" style={monoStyle}>
                    Local Media Board
                  </div>
                  <div className="text-2xl font-black uppercase leading-none text-black" style={bebasStyle}>
                    Post Community Media
                  </div>
                  <p className="text-[9px] uppercase tracking-wide text-gray-700 mt-1" style={monoStyle}>
                    Share YouTube clips, favorites, and session photos/videos.
                  </p>
                </div>

                <form onSubmit={handleSubmitMediaPost} className="p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-1.5">
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
                          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-wider" style={monoStyle}>
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
                    style={monoStyle}
                  >
                    Post to Local Media
                  </Button>
                </form>
              </div>

              {/* RIGHT: Video feed */}
              <div className="flex flex-col p-4 border-t-2 md:border-t-0 border-black">
                <div className="mb-4">
                  <h2 className="text-2xl font-black uppercase text-black leading-tight" style={bebasStyle}>Community Feed</h2>
                  <p className="text-[9px] uppercase tracking-wider text-gray-500 mt-0.5" style={monoStyle}>Share your favorite local surf clips, sessions, and stoke</p>
                </div>
                <div className="overflow-y-auto max-h-[600px] flex flex-col gap-0">
                {communityMediaPosts.map((post) => {
                  const embedUrl = getYouTubeEmbedUrl(post.url);
                  const showYouTube = Boolean(embedUrl) && (post.type === "my_youtube" || post.type === "shared_youtube");
                  const showImage = post.type === "session_media" && isLikelyImage(post.url);
                  const showVideo = post.type === "session_media" && isLikelyVideo(post.url);
                  return (
                    <article key={post.id} className="border border-black p-2.5 flex flex-col flex-1">
                      <div className="mb-2">
                        <h3 className="text-sm font-black uppercase leading-tight text-black" style={bebasStyle}>
                          {post.title}
                        </h3>
                        <p className="text-[9px] uppercase tracking-wider text-gray-500" style={monoStyle}>
                          {post.author} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {showYouTube && embedUrl && (
                        <div className="flex-1 border border-black overflow-hidden mb-2">
                          <iframe
                            src={embedUrl}
                            title={post.title}
                            className="w-full h-full min-h-[200px]"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                          />
                        </div>
                      )}
                      {showImage && (
                        <img src={post.url} alt={post.title} className="flex-1 w-full object-cover border border-black mb-2" />
                      )}
                      {showVideo && (
                        <video controls className="flex-1 w-full object-cover border border-black mb-2">
                          <source src={post.url} />
                        </video>
                      )}
                      {!showYouTube && !showImage && !showVideo && (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors mb-2"
                          style={monoStyle}
                        >
                          Open Media <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {post.caption && (
                        <p className="text-[10px] text-gray-600 mt-auto pt-2" style={monoStyle}>{post.caption}</p>
                      )}
                    </article>
                  );
                })}
                </div>
                {communityMediaPosts.length === 0 && (
                  <div className="text-[9px] text-gray-400 uppercase tracking-wide" style={monoStyle}>
                    No posts yet. Be the first to share.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-0">
            {/* Header */}
            <div className="bg-white border-2 border-black border-t-0 px-4 py-3 sm:px-6">
              <h1 className="text-xl sm:text-4xl font-black text-black uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Surf Alerts
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Get notified when conditions are firing
              </p>
            </div>
            <div className="bg-white border-2 border-black border-t-0">
              <form onSubmit={handleCreateAlert}>
                {/* Section 01: Spots */}
                <div className="p-3 sm:p-4 border-b-2 border-gray-200">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-[10px] text-gray-400 font-semibold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>01</span>
                    <h3 className="text-base font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Spot</h3>
                    <span className="hidden sm:inline text-[10px] text-gray-500 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>— select multiple</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {spots?.filter(spot => !["Belmar", "Gilgo Beach", "Montauk"].includes(spot.name)).map((spot) => (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => {
                          setBestSpotOnly(false);
                          if (alertSpotIds.includes(spot.id)) {
                            setAlertSpotIds(alertSpotIds.filter(id => id !== spot.id));
                          } else {
                            setAlertSpotIds([...alertSpotIds, spot.id]);
                          }
                        }}
                        className={`px-2 py-2 text-center transition-all ${
                          alertSpotIds.includes(spot.id)
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black hover:bg-gray-50"
                        }`}
                        style={{ borderWidth: "2px" }}
                      >
                        <span className="font-bold text-[10px] sm:text-xs uppercase leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {spot.name.toUpperCase()}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setBestSpotOnly(!bestSpotOnly);
                        if (!bestSpotOnly) setAlertSpotIds([]);
                      }}
                      className={`px-2 py-2 text-left transition-all ${
                        bestSpotOnly
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black hover:bg-gray-50"
                      }`}
                      style={{ borderWidth: "2px", borderStyle: "solid" }}
                    >
                      <div className="font-bold text-xs uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BEST SPOT ONLY</div>
                      <div className={`text-[10px] mt-0.5 ${bestSpotOnly ? "text-gray-300" : "text-gray-500"}`}>
                        Highest quality score
                      </div>
                    </button>
                  </div>
                </div>

                {/* Section 02: Quality Threshold */}
                <div className="p-3 sm:p-4 border-b-2 border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] text-gray-400 font-semibold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>02</span>
                      <h3 className="text-base font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Quality Threshold</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
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
                    className="mt-2 text-xs text-black font-bold hover:text-gray-600 transition-colors uppercase tracking-wider py-1"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {showAdvancedFilters ? '− Hide' : '+ Add'} wave/wind filters
                  </button>

                  {/* Advanced Filters */}
                  {showAdvancedFilters && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                      {/* Min Wave Height */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
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
                        <div className="flex justify-between items-center mb-1.5">
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
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-bold text-xs uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Alert Days</span>
                          <span className="text-[10px] text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>— only alert on these days</span>
                        </div>
                        <div className="flex gap-1.5 mb-2">
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
                              className={`flex-1 h-8 sm:w-8 sm:h-8 sm:flex-initial text-xs font-bold transition-all border-2 ${
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
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setAllowedDays([0, 6])}
                            className={`px-2.5 py-1 text-[10px] font-medium border transition-all ${
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
                            className={`px-2.5 py-1 text-[10px] font-medium border transition-all ${
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
                            className={`px-2.5 py-1 text-[10px] font-medium border transition-all ${
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
                <div className="p-3 sm:p-4 border-b-2 border-gray-200">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-[10px] text-gray-400 font-semibold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>03</span>
                    <h3 className="text-base font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Forecast Window</h3>
                    <span className="hidden sm:inline text-[10px] text-gray-500 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>— how far ahead?</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                        className={`px-2 py-2 text-left transition-all ${
                          option.disabled
                            ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                            : daysAdvanceNotice === option.value
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black hover:bg-gray-50"
                        }`}
                        style={{ borderWidth: "2px" }}
                      >
                        <div className="font-bold text-xs uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{option.label}</div>
                        <div className={`text-[10px] mt-0.5 ${option.disabled ? "text-gray-400" : daysAdvanceNotice === option.value ? "text-gray-300" : "text-gray-500"}`}>{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 04: Alert Frequency */}
                <div className="p-3 sm:p-4 border-b-2 border-gray-200">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-[10px] text-gray-400 font-semibold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>04</span>
                    <h3 className="text-base font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Alert Frequency</h3>
                    <span className="hidden sm:inline text-[10px] text-gray-500 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>— how often?</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
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
                        className={`px-2 py-2 text-left transition-all ${
                          alertFrequency === option.value
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black hover:bg-gray-50"
                        }`}
                        style={{ borderWidth: "2px" }}
                      >
                        <div className="font-bold text-xs uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{option.label}</div>
                        <div className={`text-[10px] mt-0.5 ${alertFrequency === option.value ? "text-gray-300" : "text-gray-500"}`}>{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 05: How Should We Notify You */}
                <div className="p-3 sm:p-4 border-b-2 border-gray-200">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-[10px] text-gray-400 font-semibold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>05</span>
                    <h3 className="text-base font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Notify Via</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEmailEnabled(!emailEnabled)}
                      className={`px-2 py-2 text-center transition-all border-black ${
                        emailEnabled
                          ? "bg-black text-white"
                          : "bg-white text-black hover:bg-gray-50"
                      }`}
                      style={{ borderWidth: "2px", borderStyle: "solid" }}
                    >
                      <span className="font-bold text-xs uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Email</span>
                    </button>
                    <button
                      type="button"
                      disabled
                      className="px-2 py-2 text-center transition-all border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                      style={{ borderWidth: "2px", borderStyle: "solid" }}
                    >
                      <span className="font-bold text-xs uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SMS</span>
                      <span className="block text-[10px] text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Coming Soon</span>
                    </button>
                  </div>
                  {!emailEnabled && (
                    <p className="mt-2 text-xs text-amber-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Please enable email to receive alerts
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="p-3 sm:p-4 bg-black">
                  <Button
                    type="submit"
                    disabled={createAlertMutation.isPending}
                    className="w-full bg-white text-black hover:bg-gray-100 rounded-none uppercase tracking-widest text-base font-black py-3 h-auto transition-all"
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
              <div className="p-3 sm:p-4 border-t-2 border-black bg-gray-50">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Active</span>
                  <h3 className="text-base font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    Your Alerts {alerts && alerts.length > 0 ? `(${alerts.length})` : ""}
                  </h3>
                </div>
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
            <div className="bg-white border-2 border-black border-t-0 px-4 py-3 sm:px-6">
              <h1 className="text-xl sm:text-4xl font-black text-black uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Human-In-The-Loop Swell Tracking
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Session-by-session reporting from locals in the lineup
              </p>
            </div>
            <div className="bg-white border-2 border-black border-t-0 p-4 sm:p-6 space-y-4">
              {/* Report Submission Card */}
              <div className="bg-white border-2 border-black p-3 sm:p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black uppercase text-black"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    + Log Swell Report
                  </h3>
                  <span className="hidden sm:inline text-xs text-gray-500 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    — track how swell showed up at your spot
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Spot Selector */}
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1"
                           style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Spot
                    </label>
                    <select
                      value={reportSpotId ?? ""}
                      onChange={(e) => setReportSpotId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full bg-white border-2 border-black px-3 py-2 text-sm font-bold uppercase text-black"
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
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1"
                           style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Date
                    </label>
                    <ReportDatePicker
                      selectedDate={reportDate}
                      onDateChange={setReportDate}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="sm:col-span-1 flex items-end">
                    <Button
                      onClick={handleNavigateToReport}
                      disabled={!reportSpotId}
                      className="w-full bg-black text-white hover:bg-gray-800 border-2 border-black py-2 text-sm font-black uppercase"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      Continue →
                    </Button>
                  </div>
                </div>
              </div>

              <UserStatsWidget />

              <div>
                <h2 className="text-lg font-black uppercase mb-2 text-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  Recent Reports
                </h2>
                <ReportFeed limit={20} />
              </div>
            </div>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="services" className="mt-0">
            <div className="bg-white border-2 border-black border-t-0 px-4 py-3 sm:px-6 flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-4xl font-black text-black uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  Marketplace
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Local shops, services & surf gear
                </p>
              </div>
              <span className="flex-shrink-0 text-[10px] bg-black text-white px-2 py-1 uppercase tracking-widest font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Coming Soon
              </span>
            </div>
            <div className="bg-white border-2 border-black border-t-0 p-4 sm:p-6">
              {/* Service Categories — 2-col grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { icon: <Phone className="h-4 w-4 text-white" />, title: "Expert Calls", desc: "1-on-1 calls with locals who know these breaks inside out." },
                  { icon: <GraduationCap className="h-4 w-4 text-white" />, title: "Lessons & Coaching", desc: "Private or group lessons from certified instructors." },
                  { icon: <Store className="h-4 w-4 text-white" />, title: "Local Shops & Rentals", desc: "Board rentals and gear from local surf shops." },
                  { icon: <Wrench className="h-4 w-4 text-white" />, title: "Board Repair", desc: "Trusted shapers and ding repair specialists." },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 p-3 border border-gray-200 hover:border-black transition-all">
                    <div className="w-7 h-7 bg-black flex items-center justify-center flex-shrink-0">
                      {icon}
                    </div>
                    <div>
                      <p className="text-sm font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Business Interest CTA */}
              <div className="mt-3 flex items-center justify-between gap-4 px-3 py-2.5 bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Local business or expert? Get featured when we launch.
                </p>
                <a
                  href="mailto:rniederreither@gmail.com?subject=Services Directory Interest"
                  className="flex-shrink-0 px-4 py-1.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-gray-800 transition-all"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Get In Touch
                </a>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}

