import { Car } from "lucide-react";
import { SpotInfoCard } from "@/components/SpotInfoCard";

interface MontaukTabsProps {
  activeTab: string;
}

export function MontaukTabs({ activeTab }: MontaukTabsProps) {
  return (
    <>
      {activeTab === "when-to-go" && (
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-3 sm:p-6">
            <div className="flex items-center gap-3 mb-1 sm:mb-2">
              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SEASONAL GUIDE</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              WHEN TO PADDLE OUT
            </h3>
            <p className="mt-2 text-sm sm:text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Montauk is the most exposed break on Long Island. That's a blessing in small summers and a curse in big winters — but when it aligns, it's the best surf within 150 miles of NYC.
            </p>
          </div>

          <div className="divide-y-2 divide-black">
            {/* Prime Season */}
            <div className="p-3 sm:p-6 bg-emerald-50">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="min-w-[48px] sm:min-w-[56px]">
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-emerald-700 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PRIME</span>
                  <p className="text-xs sm:text-sm font-bold text-black mt-0.5">Sep – Nov</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Hurricane and nor'easter season delivers the goods. SE–S groundswells stack up on Ditch Plains while NW winds clean it up offshore. Water temps hover 62–72°F — a 3/2 handles it. The crowds thin out after Labor Day but the swell heats up. This is your window.
                  </p>
                </div>
              </div>
            </div>

            {/* Secondary Season */}
            <div className="p-3 sm:p-6 bg-blue-50">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="min-w-[48px] sm:min-w-[56px]">
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-blue-700 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SOLID</span>
                  <p className="text-xs sm:text-sm font-bold text-black mt-0.5">Dec – Mar</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Winter nor'easters can deliver powerful overhead-plus surf, but the exposure that makes Montauk great also makes it unsurfable in onshore NE winds. Watch for W–NW wind windows behind passing lows. 5/4 with hood, boots, and gloves are non-negotiable by January.
                  </p>
                </div>
              </div>
            </div>

            {/* Off Season */}
            <div className="p-3 sm:p-6 bg-gray-50">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="min-w-[48px] sm:min-w-[56px]">
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>FLAT</span>
                  <p className="text-xs sm:text-sm font-bold text-black mt-0.5">Jun – Aug</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Summer is hit or miss. Tropical systems can fire it up on short notice, but long flat spells are common. The crowds are at their absolute peak. Go early if you go — Ditch Plains can get 200+ surfers on a good summer day.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "getting-there" && (
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-3 sm:p-6">
            <div className="flex items-center gap-3 mb-1 sm:mb-2">
              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ACCESS & PARKING</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              GETTING THERE
            </h3>
          </div>

          <div className="divide-y-2 divide-black">
            <div className="p-3 sm:p-6">
              <div className="flex items-start gap-3">
                <Car className="h-5 w-5 mt-0.5 flex-shrink-0 text-black" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-black uppercase tracking-wide mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>By Car</p>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    ~2.5 hrs from NYC via I-495 E (LIE) to NY-27 E (Sunrise Hwy / Montauk Hwy). Head straight into Montauk village and follow signs to Ditch Plains Beach. Free street parking on Ditch Plains Rd — arrive early, it fills by 8am on summer weekends.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 mt-0.5 flex-shrink-0 flex items-center justify-center">
                  <span className="text-xs font-black text-black">🚂</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-black uppercase tracking-wide mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>By Train (LIRR)</p>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    The LIRR Montauk Branch runs from Penn Station to Montauk (~3 hrs). Ditch Plains is a 10-min cab or rideshare from Montauk station. Surfboard bags with boards get charged as oversized luggage — check LIRR policies before you go. Summer weekend trains book fast.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-6 bg-amber-50">
              <p className="text-[10px] font-bold tracking-widest text-amber-700 uppercase mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LOCAL NOTE</p>
              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Montauk is a surf town — locals rip and they know the break better than anyone. Be respectful in the lineup, call your waves fairly, and don't crowd the peak. The vibe at Ditch Plains is generally friendly but the patience wears thin on crowded summer weekends.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "wave-mechanics" && (
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-3 sm:p-6">
            <div className="flex items-center gap-3 mb-1 sm:mb-2">
              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BREAK ANALYSIS</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              WAVE MECHANICS
            </h3>
          </div>

          <div className="divide-y-2 divide-black">
            <SpotInfoCard
              title="Ditch Plains"
              description="The main break. A cobblestone-bottom point break / beach break hybrid that produces long lefts and punchy rights depending on sandbar position. Works best on SE–S swell at 8–14s. Mid-tide incoming is the sweet spot — low tide exposes the rocks, high tide flattens the faces."
            />
            <SpotInfoCard
              title="Montauk Point"
              description="The point itself generates heavy, ledging waves in big NE–E swells. Experts only. The boulders are unforgiving and the current can be brutal. When it's firing, it's one of the best waves on the East Coast."
            />
            <SpotInfoCard
              title="Swell Window"
              description="Montauk's exposure is its greatest asset. With no barrier islands blocking the fetch, it picks up E, SE, S, and even SSW groundswells that die on the south shore. The optimal window is 90°–180° at 8s or longer. NE–E swells (45°–90°) also work but are partially shadowed by Block Island and require more period."
            />
            <SpotInfoCard
              title="Tides"
              description="Mid-tide incoming is ideal at Ditch Plains — enough water to cover the rocks, not so much that the waves go fat. At dead low you're surfing rocks. At dead high the waves shoal but tend to close out. The tidal range at Montauk (~3–4ft) means tide timing matters more here than at the south shore beaches."
            />
          </div>
        </div>
      )}

      {activeTab === "surf-culture" && (
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-3 sm:p-6">
            <div className="flex items-center gap-3 mb-1 sm:mb-2">
              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LINEAGE & SCENE</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              SURF CULTURE
            </h3>
          </div>

          <div className="divide-y-2 divide-black">
            <div className="p-3 sm:p-6">
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Montauk has been a surf destination since the 1960s when East Coast surfers discovered that the exposed tip of Long Island picks up swell that the rest of the island never sees. Ditch Plains has a legitimate local crew — many have been surfing it for decades — and a culture that values commitment and respect in the lineup.
              </p>
            </div>
            <div className="p-3 sm:p-6">
              <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE SCENE</p>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Summer Montauk is a different animal — the Hamptons crowd brings money and crowds but not always wave knowledge. The post-Labor Day shoulder season is when the real Ditch Plains shows up: less traffic, better swell, and the year-rounders who actually care about the surf.
              </p>
            </div>
            <div className="p-3 sm:p-6 bg-gray-50">
              <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LINEAGE</p>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Ditch Plains is arguably the birthplace of East Coast surf culture. The area was documented in early surf magazines in the 1960s and has produced competitive surfers at the national level. If you're driving 2.5 hours from the city, you're joining a long tradition of surf pilgrims doing exactly the same thing.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
