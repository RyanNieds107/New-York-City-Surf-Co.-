import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { CheckCircle2, Bell, FileText, Waves, Users, ArrowRight } from "lucide-react";

export default function Welcome() {
  const [, setLocation] = useLocation();

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
