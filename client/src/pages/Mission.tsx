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
            THE MISSION
          </h1>
          <p
            className="text-xl sm:text-2xl text-black font-medium"
            style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
          >
            Eliminate the commute gamble.
          </p>
        </div>

        {/* Content */}
        <div
          className="prose prose-lg max-w-none space-y-6"
          style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
        >

          <p className="text-gray-800 leading-relaxed">
            Generic forecasts are optimized for the West Coast. They ignore the nuances of the South Shore. You waste hours on the A-Train or the LIE because high-volume platforms miss the specific sandbar shifts at Lido and the wind-blocks in Rockaway.
          </p>

          <p className="text-gray-800 leading-relaxed">
            NYC Surf Co. is a high-fidelity decision engine built for the NYC hustle.
          </p>

          <p className="text-gray-800 leading-relaxed">
            We replaced generic modeling with a proprietary algorithm. Our system integrates real-time buoy data with a 20-year historical dataset specific to Western Long Island. We understand how bathymetry, tide, and local wind windows interact at our specific breaks because we have tracked them for two decades.
          </p>

          <p className="text-gray-800 leading-relaxed">
            We do not offer premium tiers or upsells. We provide the founding group of NYC surfers with the intelligence needed to score more and commute less.
          </p>

          <p className="text-gray-800 leading-relaxed font-medium">
            Access the proprietary models for free and stop guessing.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

