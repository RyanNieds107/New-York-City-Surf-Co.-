import { AlertCircle } from "lucide-react";
import { SpotInfoCard } from "@/components/SpotInfoCard";

interface LidoBeachTabsProps {
  activeTab: string;
}

export function LidoBeachTabs({ activeTab }: LidoBeachTabsProps) {
  return (
    <>
      {activeTab === "when-to-go" && (
        <div className="bg-white border-2 border-black">
          {/* Header */}
          <div className="border-b-2 border-black p-3 sm:p-6">
            <div className="flex items-center gap-3 mb-1 sm:mb-2">
              <span className="text-[8px] sm:text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SEASONAL GUIDE</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              WHEN TO PADDLE OUT
            </h3>
          </div>

          {/* Season Cards */}
          <div className="divide-y-2 divide-black">
            {/* Prime Season */}
            <div className="p-3 sm:p-6 bg-emerald-50">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-[10px] sm:text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>SEP-OCT</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <h4 className="text-lg sm:text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>PRIME SEASON</h4>
                    <span className="text-[8px] sm:text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-1.5 sm:px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GO</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Fall offers the highest probability of the "Magic Combo": <span className="font-bold">SE Swell + Northern Winds</span>.
                  </p>
                  <div className="bg-white border-2 border-black p-2 sm:p-4">
                    <span className="text-[8px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>HURRICANE TRACKS</span>
                    <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                      Tropical systems pump in SE swell. Cold fronts provide N/NW winds to groom waves.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Season */}
            <div className="p-3 sm:p-6 bg-amber-50">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-[10px] sm:text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>DEC-MAR</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <h4 className="text-lg sm:text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>SECONDARY</h4>
                    <span className="text-[8px] sm:text-[10px] font-medium tracking-widest bg-amber-500 text-white px-1.5 sm:px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAYBE</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    For hardcore surfers with 5mm wetsuits. Powerful lows bring potential for all-time barrels.
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="bg-white border-2 border-black p-2 sm:p-3">
                      <span className="text-[8px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-0.5 sm:mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>REALITY</span>
                      <p className="text-[10px] sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>NJ often gets better westerly winds.</p>
                    </div>
                    <div className="bg-white border-2 border-black p-2 sm:p-3">
                      <span className="text-[8px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-0.5 sm:mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>KEY</span>
                      <p className="text-[10px] sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Wait for N/NW winds after low passes.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Off Season */}
            <div className="p-3 sm:p-6 bg-red-50">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-[10px] sm:text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>JUN-AUG</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <h4 className="text-lg sm:text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>OFF-SEASON</h4>
                    <span className="text-[8px] sm:text-[10px] font-medium tracking-widest bg-red-500 text-white px-1.5 sm:px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SKIP</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Small waves, afternoon sea breezes. Better for longboards.
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                    <div className="bg-white border-2 border-black p-1.5 sm:p-3">
                      <span className="text-[7px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MOVE</span>
                      <p className="text-[9px] sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Dawn patrol before 8 AM.</p>
                    </div>
                    <div className="bg-white border-2 border-black p-1.5 sm:p-3">
                      <span className="text-[7px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>CROWDS</span>
                      <p className="text-[9px] sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>High. Guards 9-6.</p>
                    </div>
                    <div className="bg-white border-2 border-black p-1.5 sm:p-3">
                      <span className="text-[7px] sm:text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ACCESS</span>
                      <p className="text-[9px] sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Permits needed.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "wave-mechanics" && (
        <div className="bg-white border-2 border-black">
          {/* Header */}
          <div className="border-b-2 border-black p-3 sm:p-6">
            <div className="flex items-center gap-3 mb-1 sm:mb-2">
              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WAVE SCIENCE</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              THE LIDO BUMP
            </h3>
            <p className="mt-2 text-sm sm:text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Lido consistently delivers waves a foot or more bigger than Long Beach down the road. Locals call it the "Lido Bump," and it's all thanks to what's happening beneath the surface.
            </p>
          </div>

          {/* Content Sections */}
          <div className="divide-y-2 divide-black">
            {/* The Jones Inlet Lens */}
            <div className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                <div className="flex items-center gap-3 mb-2 sm:mb-0">
                  <div className="w-12 h-12 bg-black flex items-center justify-center shrink-0">
                    <span className="text-white font-black text-lg" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>01</span>
                  </div>
                  <h4 className="text-xl font-black text-black uppercase sm:hidden" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>THE JONES INLET LENS</h4>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="hidden sm:block text-xl sm:text-2xl font-black text-black uppercase mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>THE JONES INLET LENS</h4>
                  <p className="text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    The massive sand deposit at Jones Inlet acts like a magnifying glass for swell energy. When waves roll in from the southeast, they hit this shallow underwater hill and bend toward Lido, focusing the energy right into the lineup instead of spreading it evenly down the coast.
                  </p>

                  {/* Technical Explanation */}
                  <div className="bg-gray-50 border-2 border-black p-3 sm:p-4 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TECHNICAL</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                      The sand deposit is technically called an <span className="font-bold">ebb-tidal shoal</span>. Because waves move slower in shallow water, the part of a wave hitting the shoal slows down while the part in the deeper channel maintains speed. This causes the wave crest to bend (refraction) and converge toward a focal point—in this case, Lido.
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    While other beaches get the standard swell, Lido gets the concentrated hit. When that fast-moving swell finally hits Lido's steep sandbar close to shore, it jacks up hard and vertical—creating those powerful, hollow A-frames the spot is known for.
                  </p>
                </div>
              </div>
            </div>

            {/* Jones Inlet Shoal Visual */}
            <div className="pt-3 pb-3 sm:p-6 bg-gray-50">
              <div className="flex items-center gap-2 mb-3 sm:mb-4 px-3 sm:px-0">
                <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BATHYMETRY VISUAL</span>
              </div>
              <div className="border-y-2 sm:border-2 border-black overflow-hidden">
                <img
                  src="/Jones Inlet Shoal.png"
                  alt="Jones Inlet Shoal diagram showing wave refraction and the Lido Bump effect"
                  className="w-full"
                  style={{ maxWidth: '100%', height: 'auto', minHeight: '200px' }}
                />
              </div>
            </div>

            {/* No Jetties, No Problem */}
            <div className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                <div className="flex items-center gap-3 mb-2 sm:mb-0 sm:flex-col sm:gap-0">
                  <div className="w-12 h-12 bg-black flex items-center justify-center shrink-0">
                    <span className="text-white font-black text-lg" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>02</span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black text-black uppercase sm:hidden" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>NO JETTIES, NO PROBLEM</h4>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="hidden sm:block text-xl sm:text-2xl font-black text-black uppercase mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>NO JETTIES, NO PROBLEM</h4>
                  <p className="text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Long Beach and Rockaway's rock groins chop up wave lines and kill momentum. Lido's open beach lets swells maintain clean, uninterrupted crests with maximum power. The natural sand movement builds up a middle bar that amplifies those heavy peaks.
                  </p>

                  {/* Bottom Line */}
                  <div className="bg-black p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-medium tracking-widest text-gray-400 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BOTTOM LINE</span>
                    </div>
                    <p className="text-xs sm:text-sm text-white leading-relaxed font-medium" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                      While other beaches get the leftovers, Lido gets the focused hit. When it's on, it's bigger, hollower, and way less forgiving. Paddle accordingly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "offshore-bathymetry" && (
        <SpotInfoCard title="Offshore Bathymetry">
          <div className="space-y-6">
            <p className="text-black leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Content coming soon...
            </p>
          </div>
        </SpotInfoCard>
      )}

      {activeTab === "surf-culture" && (
        <div className="bg-white rounded-none shadow-sm border-2 border-black relative overflow-hidden transition-all duration-200" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`,
        }}>
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-b-2 border-black">
            <h3 className="text-2xl sm:text-3xl font-semibold text-black tracking-tight mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>LOCAL CULTURE & ETIQUETTE</h3>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              The surf culture at Lido Beach is more intense than anywhere else in Western Long Island. Because it gets the best surf, it attracts the best surfers.
            </p>
          </div>
          <div className="px-4 sm:px-8 py-5 sm:py-10">
            <div className="text-sm sm:text-base text-black leading-relaxed space-y-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              <div className="space-y-5 sm:space-y-6">

                {/* The Lineup */}
                <div>
                  <h4 className="text-lg font-black text-black uppercase mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>THE LINEUP</h4>
                  <div className="bg-white border-2 border-black p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                      The lineup is dominated by a dedicated core of Long Beach locals who treat this break as their backyard. This crew is present year-round—from the hurricane swells of September to the freezing, heavy barrels of February—and the hierarchy in the water is established and enforced.
                    </p>
                  </div>
                </div>

                {/* A Note on Etiquette */}
                <div>
                  <h4 className="text-lg font-black text-black uppercase mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>A NOTE ON ETIQUETTE</h4>
                  <div className="space-y-3">
                    <div className="bg-red-50 border-2 border-red-500 p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>High-Performance Zone</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        The space between the main jetties (shown below) is not a learning ground. On days when the surf is working, the lineup becomes a high-performance zone.
                      </p>
                    </div>

                    <div className="bg-amber-50 border-2 border-black p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-medium tracking-widest bg-amber-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>KNOW YOUR LEVEL</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        On days with quality surf, we strongly advise beginner surfers to avoid the area between the jetties entirely. Intermediate surfers new to Lido Beach should start their session outside these main zones to acclimate to the lineup.
                      </p>
                    </div>

                    <div className="bg-red-50 border-2 border-red-500 p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-medium tracking-widest bg-red-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>RESPECT THE LINEUP</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        Dropping in on a local or ditching your board in front of a breaking wave is dangerous and will not be tolerated. Breaching etiquette here doesn't just ruin a wave; it ruins your session.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lido Beach Surfing Zones */}
                <div>
                  <h4 className="text-lg font-black text-black uppercase mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>LIDO BEACH SURFING ZONES</h4>
                  <div className="space-y-3 sm:space-y-4">
                    <img
                      src="/Lido Surf Zones.png"
                      alt="Lido Beach surfing zones map showing the main jetties and surf zones"
                      className="w-full h-auto border-2 border-black"
                    />
                    <div className="bg-gray-50 border-2 border-black p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        The main jetties create distinct zones where the best waves break. Understanding these zones helps you position yourself correctly and respect the established lineup hierarchy.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Local Knowledge Quick Reference */}
                <div>
                  <h4 className="text-lg font-black text-black uppercase mb-2 sm:mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>LOCAL KNOWLEDGE</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white border-2 border-black p-3 sm:p-4">
                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE VIBE</span>
                      <p className="text-xs sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        High intensity. This is the premier break in Western Long Island, and the local talent reflects that.
                      </p>
                    </div>
                    <div className="bg-white border-2 border-black p-3 sm:p-4">
                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE CROWD</span>
                      <p className="text-xs sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        Dominated by the Long Beach crew. The pecking order is strict and strictly enforced.
                      </p>
                    </div>
                    <div className="bg-red-50 border-2 border-red-500 p-3 sm:p-4">
                      <span className="text-[10px] font-medium tracking-widest bg-red-500 text-white px-2 py-0.5 block mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE WARNING</span>
                      <p className="text-xs sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        Not for beginners. The surfing between the two main jetties is high-consequence.
                      </p>
                    </div>
                    <div className="bg-white border-2 border-black p-3 sm:p-4">
                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE RULE</span>
                      <p className="text-xs sm:text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                        If you drop in or ditch your board, expect a bad day. If you are unsure of your ability, do not paddle out here.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
