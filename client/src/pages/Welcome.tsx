import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { CheckCircle2, Bell, FileText, Waves, Users, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

const BEACH_OPTIONS = [
  "Lido Beach",
  "Long Beach",
  "Rockaway Beach",
  "Montauk",
];

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [selectedBeach, setSelectedBeach] = useState<string | null>(null);
  const [alertCreated, setAlertCreated] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const spotsQuery = trpc.spots.list.useQuery();
  const createAlertMutation = trpc.alerts.create.useMutation({
    onSuccess: () => setAlertCreated(true),
  });

  const features = [
    {
      icon: <Bell className="h-6 w-6 text-white" />,
      title: "Swell Alerts",
      description: "Set custom thresholds — wave height, period, quality score — and get emailed the moment your spots are firing.",
    },
    {
      icon: <Waves className="h-6 w-6 text-white" />,
      title: "Live Forecasts",
      description: "Hourly conditions for Long Island's best breaks. Current swell, tide, wind, and a 7-day outlook in one place.",
    },
    {
      icon: <FileText className="h-6 w-6 text-white" />,
      title: "Session Reports",
      description: "Log your sessions and rate conditions. See what the community surfed and find out which spots were actually going off.",
    },
    {
      icon: <Users className="h-6 w-6 text-white" />,
      title: "Community",
      description: "Share clips, compare notes, and stay connected with a small crew of Long Island surfers who know what matters.",
    },
  ];

  function handleBeachSelect(beach: string) {
    setSelectedBeach(beach);
  }

  function handleSetAlert() {
    if (!selectedBeach || !spotsQuery.data) return;

    const spot = spotsQuery.data.find(
      (s) => s.name.toLowerCase() === selectedBeach.toLowerCase()
    );
    if (!spot) return;

    createAlertMutation.mutate({
      spotId: spot.id,
      minWaveHeightFt: 3,
      minPeriodSec: 8,
      emailEnabled: true,
      smsEnabled: false,
      hoursAdvanceNotice: 24,
      notificationFrequency: "once",
    });
  }

  const alertDone = alertCreated || skipped;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <Logo
              logoSize="h-10 sm:h-12 md:h-14"
              textSize="text-xl sm:text-2xl md:text-3xl lg:text-4xl"
              textColor="text-black hover:text-gray-600"
              showLink={true}
            />
            <button
              onClick={() => setLocation("/")}
              className="text-black hover:text-gray-600 transition-colors text-sm uppercase tracking-wide"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">

        {/* Welcome Header */}
        <div className="text-center mb-14">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <CheckCircle2 className="h-16 w-16 sm:h-20 sm:w-20 text-green-500" />
            </div>
          </div>
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-black text-black uppercase tracking-tight mb-4 leading-none"
            style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
          >
            You're In.
          </h1>
          <p
            className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto leading-relaxed"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Welcome to the Long Island Surf Forecast members portal — private beta access.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          {features.map((f) => (
            <div
              key={f.title}
              className="border-2 border-black p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-black">{f.icon}</div>
                <h2
                  className="text-xl sm:text-2xl font-black uppercase tracking-wide"
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                >
                  {f.title}
                </h2>
              </div>
              <p
                className="text-gray-600 text-sm leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t-2 border-black mb-10" />

        {/* Home Break Onboarding */}
        <div className="mb-12">
          {!alertDone ? (
            <>
              <div className="mb-6">
                <p
                  className="text-xs text-gray-400 uppercase tracking-widest mb-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  One quick thing
                </p>
                <h2
                  className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight"
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                >
                  Which beach do you surf most?
                </h2>
                <p
                  className="text-sm text-gray-500 mt-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  We'll set up a swell alert so you know when it's firing.
                </p>
              </div>

              {/* Beach Pill Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                {BEACH_OPTIONS.map((beach) => (
                  <button
                    key={beach}
                    onClick={() => handleBeachSelect(beach)}
                    className={`px-5 py-2.5 border-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                      selectedBeach === beach
                        ? "bg-black text-white border-black"
                        : "bg-white text-black border-black hover:bg-gray-100"
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {beach}
                  </button>
                ))}
              </div>

              {/* Confirm or Skip */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSetAlert}
                  disabled={
                    !selectedBeach ||
                    createAlertMutation.isPending ||
                    !spotsQuery.data
                  }
                  className="bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none uppercase tracking-widest font-bold py-5 px-8 text-sm disabled:opacity-40"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {createAlertMutation.isPending ? "Setting up..." : "Set My Alert"}
                  {!createAlertMutation.isPending && <Bell className="ml-2 h-4 w-4" />}
                </Button>
                <button
                  onClick={() => setSkipped(true)}
                  className="text-xs text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Skip for now
                </button>
              </div>

              {createAlertMutation.isError && (
                <p
                  className="mt-3 text-xs text-red-500"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Something went wrong. You can set up alerts from the Members Portal.
                </p>
              )}
            </>
          ) : alertCreated ? (
            <div className="flex items-start gap-3 border-2 border-green-500 p-5">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p
                  className="text-sm font-bold text-black uppercase tracking-wide"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Alert set for {selectedBeach}
                </p>
                <p
                  className="text-xs text-gray-500 mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  You'll get an email when waves hit 3ft+ with 8s+ period. Adjust anytime in settings.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={() => setLocation("/members")}
            className="bg-black text-white hover:bg-gray-800 border-2 border-black rounded-none uppercase tracking-widest font-bold py-6 px-12 text-sm sm:text-base"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Enter Members Portal
            <ArrowRight className="ml-3 h-4 w-4" />
          </Button>
          <p
            className="mt-4 text-xs text-gray-400 uppercase tracking-widest"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Private Beta — Long Island Only
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
