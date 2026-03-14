import { useState } from "react";
import { Car, X } from "lucide-react";
import { SpotInfoCard } from "@/components/SpotInfoCard";

interface MontaukTabsProps {
  activeTab: string;
}

const MAP_SPOTS = [
  { id: "ditch-plains",  label: "Ditch Plains",          x: "68.0%", y: "60.0%" },
  { id: "turtles",       label: "Turtles / Turtle Cove",  x: "92.4%", y: "13.4%" },
  { id: "camp-hero",     label: "Camp Hero",              x: "89.4%", y: "24.9%" },
  { id: "poles",         label: "Poles",                  x: "63.0%", y: "63.5%" },
  { id: "trailer-park",  label: "Trailer Park",           x: "57.8%", y: "65.0%" },
  { id: "terrace",       label: "Terrace",                x: "42.0%", y: "71.5%" },
  { id: "hither-hills",  label: "Hither Hills",           x: "10.8%", y: "84.0%" },
];

const SPOT_CONTENT: Record<string, { title: string; body: React.ReactNode }> = {
  "ditch-plains": {
    title: "Ditch Plains",
    body: (
      <>
        <p>Arguably the most consistent surf spot on Long Island, Ditch Plains breaks over rock and cobblestone with a reefy left point that produces the A-frame shape the spot is famous for. <strong>E, ESE, and SE swells (90° to 150°) are the bullseye</strong>, hitting the reef at the ideal angle for organized, shapely peaks. SW swells still produce surf but tend to be softer and less defined.</p>
        <p><strong>NNW is the gold standard wind</strong> for offshore conditions. Uniquely for Long Island, Ditch can handle NE winds that would blow out most breaks, making it worth checking even during nor'easter setups. It's a longboard haven and even waist high surf can be exceptional when the shape is dialed in. Mid tide incoming is the sweet spot, with enough water over the rocks and the faces still steep enough to ride.</p>
      </>
    ),
  },
  "turtles": {
    title: "Turtles / Turtle Cove",
    body: (
      <>
        <p>Nestled beneath the Montauk Point Lighthouse, Turtles is a crumbly right point break and Long Island's closest thing to a big wave spot, <strong>capable of holding faces approaching 20 feet</strong>. It needs at least head high swell to work properly, with S and SSE being the most productive directions. N and NW winds are ideal offshore, and the spot can stay clean during fall NE events.</p>
        <p>Tricky currents, a rocky bottom, and a strong local presence make this spot demanding. Fishing activity in the area attracts sharks. The main takeoff zone carries heavy local priority — approach with awareness.</p>
      </>
    ),
  },
  "camp-hero": {
    title: "Camp Hero",
    body: (
      <p>A somewhat hidden spot that requires navigating rugged cliffs to reach the beach — <strong>the payoff is one of the least crowded lineups in Montauk</strong>. Camp Hero features reefs that break both ways on SE swells, giving regular and goofy-foot surfers options on the same day. Closeouts become common when the swell gets large, so it's at its best on moderate, clean groundswell.</p>
    ),
  },
  "terrace": {
    title: "Terrace (Kirk Park Beach)",
    body: (
      <p>Centrally located in Montauk village, Terrace is built over a sand covered reef with sandbars capable of producing legitimate tubes. <strong>E swells favor goofy-foot surfers; S swells work better for regulars.</strong> It's widely regarded as one of the best south facing breaks on Long Island and wakes up hard during hurricane season. N and NW winds are ideal for clean conditions.</p>
    ),
  },
  "poles": {
    title: "Poles",
    body: (
      <p>Just west of Ditch Plains, Poles features shifty reef sculpted peaks across multiple takeoff zones. It doesn't offer the consistency of Ditch or the power of Turtles, but on medium to large swells it delivers long and forgiving rides. <strong>During hurricane season the outside sections can produce some of the longest waves in the area.</strong> Significantly less crowded than Ditch or Terrace, and smaller days are approachable for developing surfers. Originally called Fortress, named after WWII era bunkers on the bluff.</p>
    ),
  },
  "trailer-park": {
    title: "Trailer Park",
    body: (
      <p>Down the beach from Ditch Plains, Trailer Park delivers crumbly rollers over a mix of sand and rock bottom. <strong>It's a natural overflow when Ditch gets overcrowded</strong> and is well suited to longboards and alternative craft. Be aware of large boulders scattered through the lineup that pose a real risk to boards and bodies.</p>
    ),
  },
  "hither-hills": {
    title: "Hither Hills",
    body: (
      <p>The least reliable surf in Montauk, typically characterized by a sucky shore break that can be board-snappingly powerful when large. <strong>Its main appeal is the relative lack of crowds.</strong> Worth a look if every other spot in Montauk is maxed out, but don't make a special trip for it.</p>
    ),
  },
};

export function MontaukTabs({ activeTab }: MontaukTabsProps) {
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);

  function handleSpotClick(id: string) {
    setSelectedSpot(prev => prev === id ? null : id);
  }

  const spot = selectedSpot ? SPOT_CONTENT[selectedSpot] : null;

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

            <div className="p-3 sm:p-6 bg-blue-50">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="min-w-[48px] sm:min-w-[56px]">
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-blue-700 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SOLID</span>
                  <p className="text-xs sm:text-sm font-bold text-black mt-0.5">Dec – Feb</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Winter nor'easters can deliver powerful overhead-plus surf, and this is when the biggest XXL swells arrive. The exposure that makes Montauk great also makes it unsurfable in onshore NE winds. Watch for W and NW wind windows behind passing lows. 5/4 with hood, boots, and gloves are non-negotiable by January.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-6 bg-teal-50">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="min-w-[48px] sm:min-w-[56px]">
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-teal-700 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SHOULDER</span>
                  <p className="text-xs sm:text-sm font-bold text-black mt-0.5">Mar – May</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    March and April can still catch the tail end of winter SW and SE swells before things quiet down. Crowds are minimal and the water is warming, though a 4/3 is still required early on. Swell frequency drops as spring progresses, but late season systems occasionally surprise. A generally underrated window for uncrowded surf.
                  </p>
                </div>
              </div>
            </div>

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

          {/* Map */}
          <div className="relative overflow-hidden">
            <img
              src="/montauk_surf_map_stylized.png"
              alt="Montauk Surf Spot Map"
              className="w-full block"
            />
            {!selectedSpot && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 pointer-events-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Tap a spot to explore
              </div>
            )}
            {MAP_SPOTS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSpotClick(s.id)}
                title={s.label}
                aria-label={s.label}
                style={{ position: "absolute", left: s.x, top: s.y, transform: "translate(-50%, -50%)" }}
                className={`w-9 h-9 rounded-full transition-all duration-150 active:scale-90 focus:outline-none
                  ${selectedSpot === s.id
                    ? "ring-2 ring-white bg-white/30 scale-110"
                    : "hover:ring-2 hover:ring-white/70 hover:bg-white/20"
                  }`}
              />
            ))}
          </div>

          {/* Drop-down spot panel — grid-rows trick animates to exact content height */}
          <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${selectedSpot ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="overflow-hidden">
              {spot && (
                <div key={selectedSpot} className="border-t-2 border-black animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 pt-5 pb-3">
                    <h3
                      className="text-2xl sm:text-3xl font-semibold text-black tracking-tight"
                      style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: "-0.01em" }}
                    >
                      {spot.title.toUpperCase()}
                    </h3>
                    <button
                      onClick={() => setSelectedSpot(null)}
                      className="p-1 hover:bg-gray-100 active:scale-90 transition-all"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4 text-black" />
                    </button>
                  </div>
                  <div
                    className="px-4 sm:px-6 md:px-8 pb-6 text-sm sm:text-base text-black leading-relaxed space-y-3"
                    style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                  >
                    {spot.body}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Always-visible general info */}
          <div className="border-t-2 border-black divide-y-2 divide-black">
            <SpotInfoCard title="Swell Window">
              <p>Montauk's exposure is its greatest asset. With no barrier islands blocking the fetch, it picks up E, SE, S, and SSW groundswells that die on the south shore. <strong>The optimal window is 90° to 180° at 8 seconds or longer</strong>, with E and ESE angles hitting the Ditch Plains reef at the ideal angle for A-frames. NE swells (45° to 90°) also work but are partially shadowed by Block Island and require more period to punch through.</p>
            </SpotInfoCard>
            <SpotInfoCard title="Tides">
              <p>Mid tide incoming is ideal at Ditch Plains: enough water to cover the rocks, not so much that the waves go fat. At dead low you're surfing rocks. At dead high the waves shoal but tend to close out. <strong>The tidal range at Montauk (3 to 4 feet) means tide timing matters more here than at the south shore beaches.</strong></p>
            </SpotInfoCard>
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
