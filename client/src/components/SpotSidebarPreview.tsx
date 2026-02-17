import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { TideSparkline } from "@/components/TideSparkline";
import { Lock } from "lucide-react";

interface Props {
  spotId: number;
  isAuthenticated: boolean;
}

const monoFont = { fontFamily: "'JetBrains Mono', monospace" };
const displayFont = { fontFamily: "'Bebas Neue', 'Oswald', sans-serif" };

function getConditionsRating(score: number): string {
  if (score >= 91) return "All-Time";
  if (score >= 76) return "Firing";
  if (score >= 60) return "Go Surf";
  if (score >= 40) return "Worth a Look";
  return "Don't Bother";
}

export function SpotSidebarPreview({ spotId, isAuthenticated }: Props) {
  // Conditions data — used for both auth and non-auth (non-auth still needs it for the blurred preview to look real)
  const { data: timelineData } = trpc.forecasts.getTimeline.useQuery(
    { spotId, hours: 24 },
    { staleTime: 30 * 60 * 1000 }
  );

  // Authenticated-only queries
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: alerts } = trpc.alerts.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: spots } = trpc.spots.list.useQuery(undefined, { enabled: isAuthenticated });

  // Dossier from localStorage (authenticated only)
  const [dossierLocation, setDossierLocation] = useState("");
  const [dossierExperienceYears, setDossierExperienceYears] = useState<number | null>(null);
  const [dossierPrimaryBoard, setDossierPrimaryBoard] = useState("");
  const [dossierVolumeL, setDossierVolumeL] = useState("");
  const [dossierWindPreference, setDossierWindPreference] = useState("");
  const [dossierMinWaveHeight, setDossierMinWaveHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !me?.id) return;
    try {
      const raw = localStorage.getItem(`member_dossier_${me.id}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.location === "string") setDossierLocation(parsed.location);
      if (typeof parsed.experienceYears === "number") setDossierExperienceYears(parsed.experienceYears);
      if (typeof parsed.primaryBoard === "string") setDossierPrimaryBoard(parsed.primaryBoard);
      if (typeof parsed.volumeL === "string") setDossierVolumeL(parsed.volumeL);
      if (typeof parsed.windPreference === "string") setDossierWindPreference(parsed.windPreference);
    } catch {
      // ignore
    }
  }, [isAuthenticated, me?.id]);

  useEffect(() => {
    if (!isAuthenticated || !alerts?.length) return;
    const firstAlert = alerts[0];
    if (typeof firstAlert.minWaveHeightFt === "number") {
      setDossierMinWaveHeight(firstAlert.minWaveHeightFt);
    }
  }, [isAuthenticated, alerts]);

  // Derive home break from first alert
  const homeBreak = (() => {
    if (!isAuthenticated || !alerts?.length || !spots) return null;
    const alertSpot = spots.find((s) => s.id === alerts[0].spotId);
    return alertSpot?.name ?? null;
  })();

  // Derive conditions from current timeline point
  const currentPt = timelineData?.timeline?.[0];
  const qualityScore = currentPt?.quality_score ?? 0;
  const windType = currentPt?.windType ?? null;
  const conditionsRating = getConditionsRating(qualityScore);
  const isGo = qualityScore >= 60;
  const nextWindowHours = (() => {
    if (isGo) return 0;
    const nextGo = timelineData?.timeline?.find((pt) => (pt.quality_score ?? 0) >= 60);
    return nextGo ? nextGo.hoursOut : null;
  })();

  // Profile rows — "—" for non-auth
  const profileRows: [string, string][] = [
    ["Symbol", "MEMBER 015/040"],
    ["Location", (isAuthenticated && dossierLocation) || "—"],
    ["Home Break", (isAuthenticated && homeBreak) || "—"],
    ["Experience", isAuthenticated && dossierExperienceYears != null ? `${dossierExperienceYears} yrs` : "—"],
    ["Primary Board", (isAuthenticated && dossierPrimaryBoard) || "—"],
    ["Volume", isAuthenticated && dossierVolumeL ? `${dossierVolumeL}L` : "—"],
    ["Min Height", isAuthenticated && dossierMinWaveHeight != null ? `${dossierMinWaveHeight}ft` : "—"],
    ["Wind Pref", (isAuthenticated && dossierWindPreference) || "—"],
  ];

  return (
    <div className="border-2 border-black bg-white p-4">

      {/* Top — Member Profile (always visible) */}
      <div className="text-[9px] uppercase tracking-widest text-gray-400 mb-3" style={monoFont}>
        Member Profile
      </div>
      <div>
        {profileRows.map(([label, value]) => (
          <div key={label} className="flex justify-between items-baseline py-2 border-b border-gray-100">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide" style={monoFont}>
              {label}
            </span>
            <span className="text-[10px] font-bold text-right max-w-[130px] truncate" style={monoFont}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom — Conditions Rating + Tide (locked for non-auth) */}
      <div className="relative mt-5 pt-4 border-t-2 border-black">

        {/* Blurred content */}
        <div
          style={
            !isAuthenticated
              ? { filter: "blur(4px)", userSelect: "none", pointerEvents: "none" }
              : undefined
          }
        >
          {/* Conditions Rating */}
          <div className="text-[9px] uppercase tracking-widest text-gray-400 mb-2" style={monoFont}>
            Conditions Rating
          </div>
          <div
            className={`text-2xl font-black uppercase leading-none ${isGo ? "text-emerald-600" : "text-orange-700"}`}
            style={displayFont}
          >
            {conditionsRating}
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1" style={monoFont}>
            {isGo
              ? "Active surf window"
              : nextWindowHours != null
              ? `Next window ~${nextWindowHours}h`
              : "No window in 24h"}
          </div>

          {/* Wind type badge */}
          {windType && (
            <div className="mt-2">
              <span
                className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border ${
                  windType === "offshore" || windType === "side-offshore"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : windType === "cross"
                    ? "bg-amber-50 text-amber-700 border-amber-300"
                    : "bg-red-50 text-red-700 border-red-300"
                }`}
                style={monoFont}
              >
                {windType.replace("-", " ")} winds
              </span>
            </div>
          )}

          {/* Tide Sparkline */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <TideSparkline spotId={spotId} />
          </div>
        </div>

        {/* Lock overlay */}
        {!isAuthenticated && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 z-10">
            <Lock className="h-5 w-5 text-black" />
            <div
              className="text-[10px] uppercase tracking-widest text-black font-bold"
              style={monoFont}
            >
              Members Only
            </div>
            <a
              href="/sign-in"
              className="border border-black px-3 py-1.5 text-[10px] uppercase tracking-wider bg-white hover:bg-black hover:text-white transition-colors"
              style={monoFont}
            >
              Join NYC Surf Co →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
