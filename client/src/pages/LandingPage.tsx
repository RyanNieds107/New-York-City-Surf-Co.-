import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, Waves, ChevronRight, MapPin, Clock, Car, Train, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Footer } from "@/components/Footer";

// ScoreBadge component for consistent score display
type ScoreBadgeProps = {
  score: number;
  label: string;
};

function ScoreBadge({ score, label }: ScoreBadgeProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreGlow = (score: number): string => {
    if (score >= 70) return "shadow-lg shadow-green-500/50";
    if (score >= 40) return "shadow-lg shadow-yellow-500/50";
    return "shadow-lg shadow-red-500/50";
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
          getScoreColor(score),
          getScoreGlow(score)
        )}
      >
        <span className="text-2xl font-bold text-white">{score}</span>
      </div>
      <span className="text-sm font-medium text-black">{label}</span>
    </div>
  );
}

// DistanceDisplay component
type DistanceDisplayProps = {
  spotName: string;
  mode: "driving" | "transit";
};

function DistanceDisplay({ spotName, mode }: DistanceDisplayProps) {
  // Get user location from parent or default to NYC
  const [origin, setOrigin] = useState<string>("40.7580,-73.9855");
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setOrigin(`${position.coords.latitude},${position.coords.longitude}`);
        },
        () => {
          setOrigin("40.7580,-73.9855"); // NYC fallback
        }
      );
    }
  }, []);
  
  // Beach coordinates
  const spotCoordinates: Record<string, string> = {
    "Rockaway Beach": "40.5794,-73.8136",
    "Long Beach": "40.5884,-73.6580",
    "Lido Beach": "40.5890,-73.6250",
  };

  const destination = spotCoordinates[spotName];
  const distanceQuery = trpc.distance.getDistance.useQuery(
    {
      origin: origin,
      destination: destination || "",
      mode,
    },
    {
      enabled: !!destination,
      retry: 1,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  if (!destination) return null;

  if (distanceQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {mode === "driving" ? (
          <Car className="h-4 w-4 animate-pulse" />
        ) : (
          <Train className="h-4 w-4 animate-pulse" />
        )}
        <span>Calculating...</span>
      </div>
    );
  }

  if (distanceQuery.isError || !distanceQuery.data) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
        {mode === "driving" ? <Car className="h-3 w-3" /> : <Train className="h-3 w-3" />}
        <span>Distance unavailable</span>
      </div>
    );
  }

  const { duration, distance } = distanceQuery.data;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600 uppercase tracking-wider font-medium" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
      {mode === "driving" ? (
        <Car className="h-3 w-3 text-gray-500" />
      ) : (
        <Train className="h-3 w-3 text-gray-500" />
      )}
      <span>{duration} • {distance}</span>
    </div>
  );
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [travelMode, setTravelMode] = useState<"driving" | "transit">("driving");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [expandedSpot, setExpandedSpot] = useState<number | null>(null);
  const spotsQuery = trpc.spots.list.useQuery();
  const forecastsQuery = trpc.forecasts.listAll.useQuery();

  // Carousel slides: images
  const slides = [
    { type: "image", src: "/Lido-beach.jpg" },
    { type: "image", src: "/4365.webp" },
    { type: "image", src: "/Long Beach.webp" },
    { type: "image", src: "/Lido Winter.webp" },
    { type: "image", src: "/NorEaster_October_CoryRansom-56.jpg" }
  ];

  // Auto-advance carousel every 3 seconds
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  // Handle manual slide navigation
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Featured spots: Rockaway Beach, Long Beach, Lido Beach
  const featuredSpotNames = ["Rockaway Beach", "Long Beach", "Lido Beach"];
  
  // Get featured spots and their forecasts
  const featuredSpots = spotsQuery.data
    ?.filter((spot) => featuredSpotNames.includes(spot.name))
    .map((spot) => {
      const forecast = forecastsQuery.data?.find((f) => f.spotId === spot.id);
      return { spot, forecast };
    }) || [];

  // Spot descriptions
  const spotDescriptions: Record<string, string> = {
    "Rockaway Beach": "The best break in NYC. Known for its buttery lefts when swells line up.",
    "Long Beach": "Jetty-driven beachbreak that flips quickly with wind and tide.",
    "Lido Beach": "Nearshore bathymetry focuses swell energy on this famous peaky beach break.",
  };

  const scrollToFeatured = () => {
    document.getElementById("featured-spots")?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Get in the water";
    if (score >= 40) return "Fair";
    if (score >= 20) return "Don't go";
    return "Flat";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Fixed overlay that stays visible when scrolling */}
      <header className="fixed top-0 left-0 w-full z-50 bg-transparent">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="h-6 w-6 text-white" />
              <div>
                <Link href="/">
                  <h1 className="text-2xl font-bold text-white hover:text-white/80 cursor-pointer transition-colors" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                    New York City Surf Co.
                  </h1>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setLocation("/dashboard");
                  window.scrollTo(0, 0);
                }}
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/20 hover:border-white/80 bg-transparent text-sm md:text-base px-4 py-2"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                View All Spots
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="relative w-full h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat pt-16 overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Carousel Background */}
        <div className="absolute inset-0">
          {/* Lido Beach Image - Slide 0 */}
          <div 
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out",
              currentSlide === 0 ? "opacity-100" : "opacity-0"
            )}
            style={{
              backgroundImage: "url('/Lido-beach.jpg')"
            }}
          />

          {/* 4365.webp Image - Slide 1 */}
          <div 
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out",
              currentSlide === 2 ? "opacity-100" : "opacity-0"
            )}
            style={{
              backgroundImage: "url('/4365.webp')"
            }}
          />

          {/* Long Beach Image - Slide 3 */}
          <div 
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out",
              currentSlide === 3 ? "opacity-100" : "opacity-0"
            )}
            style={{
              backgroundImage: "url('/Long Beach.webp')"
            }}
          />

          {/* Lido Winter Image - Slide 4 */}
          <div 
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out",
              currentSlide === 4 ? "opacity-100" : "opacity-0"
            )}
            style={{
              backgroundImage: "url('/Lido%20Winter.webp')"
            }}
          />

          {/* NorEaster Image - Slide 5 */}
          <div 
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out",
              currentSlide === 5 ? "opacity-100" : "opacity-0"
            )}
            style={{
              backgroundImage: "url('/NorEaster_October_CoryRansom-56.jpg')"
            }}
          />
        </div>

        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60 z-0"></div>
        
        {/* Content container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto text-center px-4">
          <h1 className="text-[6rem] md:text-[7.5rem] font-black text-white mb-8 uppercase tracking-tight leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
            New York City Surf Co.
          </h1>
          <p className="text-2xl md:text-2xl text-white font-light mb-12">
            Your guide to surfing just outside NYC
          </p>
          <div className="flex justify-center">
            <button
              onClick={scrollToFeatured}
              className="bg-black hover:bg-black/90 text-white px-8 py-4 text-sm font-medium uppercase tracking-tight rounded-none border-none transition-colors flex items-center gap-2"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}
            >
              View today's conditions
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      </section>

      {/* Three Phase Sections - Interactive Expandable Cards */}
      <section className="w-full bg-white">
        <div className="max-w-8xl mx-auto px-6 pt-16 pb-8">
          <div className="grid gap-4 md:grid-cols-3 auto-rows-fr">
            {/* Phase 1 — Forecasting */}
            <div
              className={cn(
                "bg-white border-2 border-[#e0e0e0] transition-all duration-300 group relative overflow-hidden",
                "hover:shadow-lg hover:-translate-y-1",
                "rounded-none"
              )}
              style={{
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Black top border on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-black transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}></div>
              
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-4xl font-black uppercase mb-2 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Forecasting</h3>
                  <p className="text-xs text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Spot-tuned forecasts for the breaks NYC surfers actually surf
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-sm leading-relaxed text-black font-semibold" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Each break behaves differently. We track them separately.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 group/item">
                      <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                      <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}><strong>Rockaway</strong> — Sensitive to wind shifts and crowds</p>
                    </div>
                    <div className="flex items-start gap-2 group/item">
                      <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                      <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}><strong>Long Beach</strong> — Jetty-driven, changes hourly</p>
                    </div>
                    <div className="flex items-start gap-2 group/item">
                      <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                      <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}><strong>Lido</strong> — Known for its swell exposure and Peaky A-Frames</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-6 border-t-2 border-black">
                  <span className="px-3 py-1 border-2 border-black text-xs uppercase font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Hyper-Local</span>
                  <span className="px-3 py-1 border-2 border-black text-xs uppercase font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Spot-Tuned</span>
                  <span className="px-3 py-1 border-2 border-black text-xs uppercase font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Real-Time</span>
                </div>
              </div>
            </div>

            {/* Phase 2 — Culture + Guides */}
            <div
              className={cn(
                "bg-white border-2 border-[#e0e0e0] transition-all duration-300 group relative overflow-hidden",
                "hover:shadow-lg hover:-translate-y-1",
                "rounded-none"
              )}
              style={{
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Black top border on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-black transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}></div>
              
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-4xl font-black uppercase mb-2 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Culture + Guides</h3>
                  <p className="text-xs text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Local intel from those who've been doing it their entire lives
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-sm leading-relaxed text-black font-semibold" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Trains, early mornings, winter suits, and timing your day around one window.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 group/item">
                      <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                      <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>When Western Long Island Surf Actually Works</p>
                    </div>
                    <div className="flex items-start gap-2 group/item">
                      <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                      <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Rockaway via A train</p>
                    </div>
                    <div className="flex items-start gap-2 group/item">
                      <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                      <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Before-work sessions</p>
                    </div>
                    <div className="flex items-start gap-2 group/item">
                      <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                      <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Long Beach sandbars and timing</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-6 border-t-2 border-black">
                  <span className="px-3 py-1 border-2 border-black text-xs uppercase font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Transit Guides</span>
                  <span className="px-3 py-1 border-2 border-black text-xs uppercase font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Timing</span>
                  <span className="px-3 py-1 border-2 border-black text-xs uppercase font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Local Intel</span>
                </div>
              </div>
            </div>

            {/* Phase 3 — Community */}
            <div
              className={cn(
                "bg-white border-2 border-[#e0e0e0] transition-all duration-300 group relative overflow-hidden",
                "hover:shadow-lg hover:-translate-y-1",
                "rounded-none"
              )}
              style={{
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Black top border on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-black transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}></div>
              
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-4xl font-black uppercase mb-2 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Community</h3>
                  <p className="text-xs text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Real intel, zero gatekeeping
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-sm leading-relaxed text-black font-semibold" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Centralizing NYC's huge but scattered surf scene.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 group/item">
                      <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                      <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Session logs</p>
                    </div>
                    <div className="flex items-start gap-2 group/item">
                      <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                      <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Crowd reports</p>
                    </div>
                    <div className="flex items-start gap-2 group/item">
                      <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                      <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Ratings from surfers, not algorithms</p>
                    </div>
                    <div className="flex items-start gap-2 group/item">
                      <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                      <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Charity and community events</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-6 border-t-2 border-black">
                  <span className="px-3 py-1 border-2 border-black text-xs uppercase font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Transparent</span>
                  <span className="px-3 py-1 border-2 border-black text-xs uppercase font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>No Gatekeeping</span>
                  <span className="px-3 py-1 border-2 border-black text-xs uppercase font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Real Intel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Spots Section */}
      <section
        id="featured-spots"
        className="w-full pt-12 pb-8 px-6 md:px-12 bg-white"
      >
        {/* Header - Full Width */}
        <div className="w-full mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">LIVE</span>
            </div>
            <span className="text-xs text-gray-500">•</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Clock className="h-3 w-3" />
              <span>
                {forecastsQuery.data?.[0]?.createdAt
                  ? formatTimestamp(forecastsQuery.data[0].createdAt)
                  : "Just now"}
              </span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-4xl md:text-5xl font-black text-black text-center tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
              Today's NYC Surf at a Glance
            </h2>
            <div className="flex items-center gap-2 bg-white border-2 border-[#e0e0e0] rounded-none p-1">
              <button
                onClick={() => setTravelMode("driving")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-all",
                  travelMode === "driving"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black"
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Car className="h-4 w-4" />
                <span>Driving</span>
              </button>
              <button
                onClick={() => setTravelMode("transit")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-all",
                  travelMode === "transit"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black"
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Train className="h-4 w-4" />
                <span>Transit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Cards Grid - Full Width */}
        {spotsQuery.isLoading || forecastsQuery.isLoading ? (
          <div className="text-2xl md:text-3xl text-black text-center py-12" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Loading spots...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 auto-rows-fr w-full">
            {featuredSpots.map(({ spot, forecast }) => {
              const description = spotDescriptions[spot.name] || "";
              const score = forecast?.probabilityScore != null ? Number(forecast.probabilityScore) : 0;
              const scoreLabel = forecast ? getScoreLabel(score) : "No data";
              const isExpanded = expandedSpot === spot.id;
              
              const getScoreColor = (score: number): string => {
                if (score >= 70) return "bg-green-500";
                if (score >= 40) return "bg-yellow-500";
                return "bg-red-500";
              };

              return (
                <div
                  key={spot.id}
                  className={cn(
                    "bg-white border-2 border-[#e0e0e0] transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col",
                    isExpanded ? "md:col-span-3" : "",
                    "hover:shadow-lg hover:-translate-y-1",
                    "rounded-none"
                  )}
                  style={{
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                  onClick={() => setExpandedSpot(isExpanded ? null : spot.id)}
                >
                  {/* Black top border on hover */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-black transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}></div>
                  
                  <div className="p-8 flex flex-col h-full">
                    {/* TOP THIRD - Beach name + distance (left) | Score badge + label (right) */}
                    <div className="flex-1 flex items-start justify-between mb-4">
                      {/* Left side: Beach name + distance */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-2">
                          <Waves className="h-5 w-5 text-black" />
                          <h3 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                            {spot.name}
                          </h3>
                        </div>
                        <div className="ml-8">
                          <DistanceDisplay spotName={spot.name} mode={travelMode} />
                        </div>
                      </div>
                      {/* Right side: Score badge + label */}
                      <div className="flex flex-col items-end">
                        <div
                          className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 mb-2",
                            getScoreColor(score)
                          )}
                        >
                          <span className="text-xl font-black text-white" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>{score}</span>
                        </div>
                        <span className="text-xs font-bold text-black uppercase" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>{scoreLabel}</span>
                      </div>
                    </div>

                    {/* MIDDLE THIRD - Description text, centered vertically, full width */}
                    <div className="flex-1 flex items-center py-4">
                      <p className="text-sm text-gray-600 leading-relaxed w-full" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>{description}</p>
                    </div>

                    {/* BOTTOM THIRD - Expand button, centered horizontally */}
                    <div className="flex-1 flex items-end justify-center">
                      <button
                        className="bg-black text-white px-4 py-2 uppercase text-xs font-bold flex items-center gap-2 transition-transform duration-300"
                        style={{ 
                          fontFamily: "'JetBrains Mono', monospace",
                          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)"
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSpot(isExpanded ? null : spot.id);
                        }}
                      >
                        {isExpanded ? "Close" : "Expand"}
                        <ChevronDown 
                          className={cn(
                            "h-4 w-4 transition-transform duration-300",
                            isExpanded ? "rotate-180" : ""
                          )}
                          style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
                        />
                      </button>
                    </div>

                      {/* Expanded content */}
                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-300",
                          isExpanded ? "max-h-[2000px] opacity-100 mt-6" : "max-h-0 opacity-0"
                        )}
                        style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
                      >
                        <div className="space-y-8 pt-6 border-t-2 border-black">
                          <div>
                            <h4 className="text-xl font-black uppercase mb-4 text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Current Conditions</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                              <div>
                                <p className="text-xs text-gray-600 uppercase tracking-wider mb-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Score</p>
                                <p className="text-2xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>{score}/100</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 uppercase tracking-wider mb-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Condition</p>
                                <p className="text-lg font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>{scoreLabel}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 uppercase tracking-wider mb-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Probability</p>
                                <p className="text-lg font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  {forecast?.probabilityScore ? `${forecast.probabilityScore}%` : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 uppercase tracking-wider mb-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Last Updated</p>
                                <p className="text-lg font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  {forecast?.createdAt ? formatTimestamp(forecast.createdAt) : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3 mb-6">
                              <div className="flex items-start gap-2 group/item">
                                <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                                <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  <strong>Current Score:</strong> {score}/100 — {scoreLabel}
                                </p>
                              </div>
                              <div className="flex items-start gap-2 group/item">
                                <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                                <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  <strong>Description:</strong> {description}
                                </p>
                              </div>
                              <div className="flex items-start gap-2 group/item">
                                <span className="text-black mt-0.5 transition-transform duration-300 group-hover/item:translate-x-1" style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>›</span>
                                <p className="text-sm leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                                  <strong>Distance:</strong> <DistanceDisplay spotName={spot.name} mode={travelMode} />
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/spot/${spot.id}`);
                              }}
                              className="bg-black text-white hover:bg-gray-900 border-2 border-black uppercase text-xs font-bold px-6 py-3"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              View Full Forecast
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        {/* View All Spots Button - Full Width */}
        <div className="mt-8 text-center w-full">
          <Button
            onClick={() => {
              setLocation("/dashboard");
              window.scrollTo(0, 0);
            }}
            className="!border-2 !border-black bg-black text-white hover:bg-white hover:text-black rounded-none uppercase transition-all duration-300 hover:-translate-y-0.5 group"
            style={{ 
              fontFamily: "'JetBrains Mono', monospace",
              padding: '18px 40px',
              minWidth: '200px',
              fontSize: '1.05rem',
              fontWeight: 700,
              letterSpacing: '1px',
              margin: '24px auto 0'
            }}
          >
            View All Spots
            <ArrowRight className="ml-2 h-5 w-5 text-white group-hover:text-black transition-colors duration-300" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

