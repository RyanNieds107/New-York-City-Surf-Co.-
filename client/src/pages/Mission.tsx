import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Mission() {
  const [, setLocation] = useLocation();
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
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

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Page Header */}
        <div className="mb-12">
          <h1
            className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-black text-black uppercase tracking-tighter md:tracking-tight mb-4"
            style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.03em' }}
          >
            <span className="block md:whitespace-nowrap">We take the uncertainty out of surfing just outside of NYC</span>
          </h1>
          <p
            className="text-sm text-gray-600 uppercase tracking-wider"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            New York City Surf Co.
          </p>
        </div>

        {/* Content */}
        <div
          className="prose prose-lg max-w-none space-y-6"
          style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
        >

          {/* Paragraph 1 */}
          <p className="text-gray-800 leading-relaxed">
            You know the drill: Check <strong>Surfline</strong> at 5am. Looks promising. Drive an hour or take the LIRR/MTA. Get to the beach and it's a <strong>blown-out mess</strong> or <strong>waist-high slop</strong> when the forecast said head-high and clean. You check <strong>Surfline</strong> again. The forecast hasn't budged. What gives?
          </p>

          {/* Paragraph 2 */}
          <p className="text-gray-800 leading-relaxed">
            <strong>Surfline</strong> isn't built for us. They're optimized for California and Hawaii (where their revenue comes from). East Coast surfers, especially Long Island, get generic forecasts that miss the nuances of our breaks. You're paying <strong>$100+ a year</strong> for data that doesn't account for how <strong>Lido runs bigger than Long Beach</strong>, or how <strong>W winds and high tide work well for Rockaway</strong>.
          </p>

          {/* Paragraph 3 */}
          <p className="text-gray-800 leading-relaxed">
            <strong>NYC Surf Co.</strong> is built by <strong>Long Island surfers, for Long Island surfers</strong>. We've lived through the <strong>blown sessions</strong>, the <strong>wasted gas money</strong>, the frustration of <strong>inaccurate forecasts</strong>. We've also scored those <strong>magic days</strong> that came out of nowhere because we know these breaks.
          </p>

          <p className="text-gray-800 leading-relaxed">
            We combine <strong>real-time buoy data</strong>, <strong>offshore weather models</strong>, and <strong>10+ years of historical observations</strong> with an algorithm designed specifically for <strong>Long Island's bathymetry, wind patterns, and swell windows</strong>. The result: <strong>forecasts that actually match what you'll find when you paddle out</strong>.
          </p>

          {/* Closing */}
          <p className="text-gray-800 leading-relaxed font-medium">
            <strong>No premium tiers. No upsells.</strong> Just accurate forecasts so you know if it's <strong>worth the commute</strong>.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

