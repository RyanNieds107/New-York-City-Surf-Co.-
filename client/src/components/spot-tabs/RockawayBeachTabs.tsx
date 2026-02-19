import { AlertCircle, Clock, MapPin, Waves, Car, Wind, Droplet } from "lucide-react";
import { SpotInfoCard } from "@/components/SpotInfoCard";

interface RockawayBeachTabsProps {
  activeTab: string;
}

export function RockawayBeachTabs({ activeTab }: RockawayBeachTabsProps) {
  return (
    <>
      {activeTab === "when-to-go" && (
        <div className="bg-white border-2 border-black">
          {/* Header */}
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SEASONAL GUIDE</span>
            </div>
            <h3 className="text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              WHEN TO PADDLE OUT
            </h3>
            <p className="mt-3 text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Rockaway runs on seasonal rhythms. Time it right, and you'll score. Miss the window, and you'll be fighting crowds for crumbs.
            </p>
          </div>

          {/* Season Cards */}
          <div className="divide-y-2 divide-black">
            {/* Prime Season */}
            <div className="p-6 bg-emerald-50">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-emerald-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>SEP-OCT</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>PRIME SEASON</h4>
                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GO</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Fall is the transition period where summer Southerlies fade and winter patterns emerge. Prime time for the "Magic Combo": <span className="font-bold">SE Swell + Northern Wind</span>.
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="bg-white border-2 border-black p-3">
                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>HURRICANE TRACKS</span>
                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Tropical systems pump SE swell. Cold fronts provide N/NW grooming winds.</p>
                    </div>
                    <div className="bg-white border-2 border-black p-3">
                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>IDEAL TRACK</span>
                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Cape Verde storm riding Bermuda High, recurving north. Bill '09, Larry '21, Lee '23.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Season */}
            <div className="p-6 bg-amber-50">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-amber-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>DEC-MAR</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>SECONDARY SEASON</h4>
                    <span className="text-[10px] font-medium tracking-widest bg-amber-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAYBE</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    For hardcore surfers with 5mm wetsuits. Winter brings powerful lows, nor'easters, and offshore winds. All-time barrel potential, but windows are short-lived.
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="bg-white border-2 border-black p-3">
                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE REALITY</span>
                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>NJ often gets the better end as westerly winds prevail.</p>
                    </div>
                    <div className="bg-white border-2 border-black p-3">
                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE KEY</span>
                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Wait for the "backside"—N/NW winds after the low passes east.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Off Season */}
            <div className="p-6 bg-red-50">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-red-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-sm leading-none" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>JUN-AUG</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-2xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>OFF-SEASON</h4>
                    <span className="text-[10px] font-medium tracking-widest bg-red-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SKIP</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    North Atlantic goes quiet. Small, weak pulses. S/SW sea breezes dominate afternoons—choppy, crumbly conditions better suited for longboards.
                  </p>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="bg-white border-2 border-black p-3">
                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE MOVE</span>
                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Dawn patrol before 8 AM when winds are friendliest.</p>
                    </div>
                    <div className="bg-white border-2 border-black p-3">
                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>CROWDS</span>
                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>High-traffic. Lifeguard restrictions 9 AM – 6 PM.</p>
                    </div>
                    <div className="bg-white border-2 border-black p-3">
                      <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE PERK</span>
                      <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Beach access is free. No tags, no passes.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "wave-mechanics" && (
        <SpotInfoCard title="Wave Mechanics">
          <div className="space-y-8">
            {/* Map Section */}
            <div className="space-y-4">
              <img
                src="/Rockaway Lefts.png"
                alt="Rockaway Beach surf break map showing groins, sandbars, and famous lefts"
                className="w-full h-auto border-2 border-black"
              />
              <div className="bg-gray-50 border-2 border-black p-4">
                <h4 className="text-lg font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>SURF BREAK FORMATION</h4>
                <p className="text-sm text-gray-800 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  Nearshore currents moving east to west (green arrows) push sand against groins, creating sandbars at their tips. The groins act as focal points where sand accumulates, forming the sandbars that can produce world-class left-breaking waves.
                </p>
              </div>
            </div>

            {/* Reference Image */}
            <div className="space-y-2">
              <img
                src="/Rockaway Lefts.jpg"
                alt="Reference photo showing what the left breaking waves at Rockaway Beach actually look like"
                className="w-full h-auto border-2 border-black object-cover"
                style={{ maxHeight: '400px' }}
              />
              <p className="text-xs text-gray-600 text-center" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                <strong>Reference:</strong> What the famous left-breaking waves at Rockaway actually look like in action.
              </p>
            </div>

            {/* Period Guide */}
            <div>
              <h4 className="text-xl font-black text-black uppercase mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>PERIOD GUIDE</h4>
              <div className="space-y-4">
                <div className="bg-emerald-50 border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SWEET SPOT</span>
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>7-10s</span>
                  </div>
                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    This is when you get fun, peaky surf. The local's focus is always on the period—this range delivers the best shape at Rockaway.
                  </p>
                </div>
                <div className="bg-amber-50 border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium tracking-widest bg-amber-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WARNING</span>
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>11-12s+</span>
                  </div>
                  <p className="text-sm text-gray-800 mb-2" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    After 11s it starts to get walled up. Loses shape quickly, especially if the swell isn't far enough south. Most long-period days, Rockaway will be dumpy (zero shape; jetty to jetty), while Long Beach will have much better shape.
                  </p>
                  <p className="text-xs text-gray-600 italic" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    "If you think about the way Rockaway faces—south and east—if swell is not far enough south, it loses shape. SE angle is where it starts."
                  </p>
                </div>
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium tracking-widest bg-gray-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ANOMALY</span>
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Hurricane Erin (Aug 2025)</span>
                  </div>
                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Was an exception with 17s period. Typically, there's no way Rockaway can handle a 17s period. The hurricane was more easterly in direction and there were multiple other swells in the water—storm was in the right place at the right time.
                  </p>
                </div>
              </div>
            </div>

            {/* Wind Guide */}
            <div>
              <h4 className="text-xl font-black text-black uppercase mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>WIND GUIDE</h4>
              <div className="space-y-3">
                <div className="bg-white border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>NNW (North-Northwest)</span>
                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DEAD OFFSHORE</span>
                  </div>
                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Best wind direction for Rockaway.</p>
                </div>
                <div className="bg-white border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>N (North)</span>
                  </div>
                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Can be a little too North, but still works.</p>
                </div>
                <div className="bg-white border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>W (West)</span>
                  </div>
                  <p className="text-sm text-gray-800 mb-2" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Even west works at Rockaway.</p>
                  <p className="text-xs text-gray-600 italic" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    "Any day of the year, I'd surf a 10-15 mph W wind over a 10-15 mph east wind"
                  </p>
                </div>
              </div>
            </div>

            {/* Tide Guide */}
            <div>
              <h4 className="text-xl font-black text-black uppercase mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>TIDE GUIDE</h4>
              <div className="space-y-3">
                <div className="bg-red-50 border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplet className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Low Tide</span>
                    <span className="text-[10px] font-medium tracking-widest bg-red-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>AVOID</span>
                  </div>
                  <p className="text-sm text-gray-800 italic" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    "Low tide at Rockaway sucks unless it's pumping surf." On the average day, low tide has zero shape.
                  </p>
                </div>
                <div className="bg-emerald-50 border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplet className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Mid-High Tide</span>
                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PREFERRED</span>
                  </div>
                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    This is the preferred tide for most sessions.
                  </p>
                </div>
                <div className="bg-emerald-50 border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplet className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>High Tide</span>
                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GREAT</span>
                  </div>
                  <p className="text-sm text-gray-800 mb-2" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    "At high tide, there are usually really great waves" - if there's actual swell in the water. If it's a 1.2ft swell, no, but if there's actually swell, high tide is good.
                  </p>
                  <p className="text-xs text-gray-600" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Example: 3.2ft @ 8s on November 10th - "Really fun day of waves"
                  </p>
                </div>
                <div className="bg-blue-50 border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplet className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Wind Swell + Incoming Tide</span>
                    <span className="text-[10px] font-medium tracking-widest bg-blue-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PRO TIP</span>
                  </div>
                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    For incoming wind swell (&lt;10s period), an incoming tide works particularly well at Rockaway. The rising water helps the shorter-period waves find shape on the sandbars.
                  </p>
                </div>
              </div>
            </div>

            {/* Reading Conditions */}
            <div>
              <h4 className="text-xl font-black text-black uppercase mb-4" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>READING CONDITIONS</h4>
              <div className="bg-gray-50 border-2 border-black p-4 space-y-3">
                <p className="text-sm text-gray-800 italic" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  "Reading the buoy's here is way more difficult than California"
                </p>
                <p className="text-sm text-gray-800 italic" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  "The swell periods are really short. I'm always more focused on the period"
                </p>
              </div>
            </div>
          </div>
        </SpotInfoCard>
      )}

      {activeTab === "surf-culture" && (
        <SpotInfoCard title="Surf Culture">
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>WHO IT'S FOR</h4>
              <div className="space-y-3">
                <div className="bg-white border-2 border-black p-4">
                  <p className="text-sm text-gray-800 mb-2" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    <span className="font-bold">Everyone</span> - Beginners often pack the inside, while advanced surfers sit deeper by the jetties and on better sandbars.
                  </p>
                  <div className="bg-amber-50 border-2 border-amber-500 p-3 mt-2">
                    <p className="text-xs text-amber-900 font-semibold" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                      ⚠️ There are certain areas when beginners should not be going out
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>HAZARDS</h4>
              <div className="space-y-3">
                <div className="bg-white border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>General Hazards</span>
                  </div>
                  <ul className="text-sm text-gray-800 space-y-1" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    <li>• Crowds and drop-ins</li>
                    <li>• Surf schools and beginners on soft tops</li>
                    <li>• Rips near the jetties</li>
                    <li>• Boards flying around on busy summer weekends</li>
                  </ul>
                </div>
                <div className="bg-red-50 border-2 border-red-500 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Seasonal Issues</span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    <p><span className="font-semibold">Summertime:</span> All rules are out the window</p>
                    <p><span className="font-semibold">Fall:</span> Water still warm, so you're getting kooks - "People that surf in NYC see 8-10 feet and good, and they just go and are total kooks"</p>
                    <p><span className="font-semibold">Occasional fist fights</span></p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>OFF-SEASON RESTRICTIONS</h4>
              <div className="bg-amber-50 border-2 border-black p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-black" />
                  <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Summer Hours</span>
                  <span className="text-[10px] font-medium tracking-widest bg-amber-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BEFORE 10AM</span>
                </div>
                <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  Can only surf before 10am - designated. This is when lifeguard restrictions are in effect during the summer months.
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>STREET/BREAK GUIDE</h4>
              <div className="space-y-3">
                <div className="bg-white border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>90th Street</span>
                    <span className="text-[10px] font-medium tracking-widest bg-black text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAIN BREAK</span>
                  </div>
                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    The main break, where everyone goes. Has the Surfline cam.
                  </p>
                </div>
                <div className="bg-white border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>90-98th Street</span>
                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BEST SWELLS</span>
                  </div>
                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    All the jetties break — 4 jetties in this stretch get the best of all the swells.
                  </p>
                </div>
                <div className="bg-white border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>70s Street</span>
                  </div>
                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Always a little bit smaller than the main breaks.
                  </p>
                </div>
                <div className="bg-white border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>60s-70s Street</span>
                  </div>
                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Jetties break here too. Now getting more surfers as the main breaks get more crowded.
                  </p>
                </div>
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-black" />
                    <span className="text-sm font-bold text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Uptown</span>
                  </div>
                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Most people don't surf uptown. The action stays concentrated in the 60s through 90s.
                  </p>
                </div>
                <p className="text-xs text-gray-600 italic" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  "The best streets are totally up to opinion"
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>WAVE DIRECTION</h4>
              <div className="bg-gray-50 border-2 border-black p-4 space-y-2">
                <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  "On the right swells, you can get rights and lefts"
                </p>
                <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  "If you're surfing right off the jetty, lefts are usually your only option"
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-black text-black uppercase mb-3" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>VIBE</h4>
              <div className="bg-emerald-50 border-2 border-black p-4 space-y-2">
                <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  For the most part it is mellow. Tons of surfers from NY going there, tons of people that want to surf. For the most part the vibes are good.
                </p>
              </div>
            </div>
          </div>
        </SpotInfoCard>
      )}

      {activeTab === "getting-there" && (
        <div className="bg-white border-2 border-black">
          {/* Header */}
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TRANSIT GUIDE</span>
            </div>
            <h3 className="text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              THE ROCKAWAY PILGRIMAGE
            </h3>
            <p className="mt-3 text-base text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Rockaway is the only place in the world where you'll see a 9-foot longboard on a subway car. Here's how to navigate the trip from the city to the lineup.
            </p>
          </div>

          {/* Transport Options Grid */}
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-black border-b-2 border-black">
            {/* A Train */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-[#0039A6] flex items-center justify-center">
                  <span className="text-white font-black text-sm" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>A</span>
                </div>
                <span className="text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SUBWAY</span>
              </div>
              <h4 className="text-xl font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>THE A TRAIN & SHUTTLE</h4>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                The most iconic way to get here. Cheap, avoids Belt Parkway traffic, drops you blocks from the break.
              </p>
              <div className="space-y-2 text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                <div className="flex gap-2">
                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ROUTE</span>
                  <span className="text-gray-800">Far Rockaway-bound A to Broad Channel, transfer to S shuttle</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>STOPS</span>
                  <span className="text-gray-800">Beach 90th (the scene), 105th (quieter), 116th (end of line)</span>
                </div>
              </div>
            </div>

            {/* Ferry */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-black flex items-center justify-center">
                  <Waves className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>FERRY</span>
              </div>
              <h4 className="text-xl font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>NYC FERRY</h4>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                The fastest way to get your head in the game. 50-minute cruise swaps subway heat for salt-air breeze.
              </p>
              <div className="space-y-2 text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                <div className="flex gap-2">
                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>FROM</span>
                  <span className="text-gray-800">Wall St./Pier 11 or Sunset Park (Brooklyn)</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DROP</span>
                  <span className="text-gray-800">Beach 108th St. 10-min walk to the 90s</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TIP</span>
                  <span className="text-gray-800">Bar on board. Makes the ride back even better.</span>
                </div>
              </div>
            </div>

            {/* Driving */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-black flex items-center justify-center">
                  <Car className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DRIVING</span>
              </div>
              <h4 className="text-xl font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>CAR & PARKING</h4>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Great for winter sessions. A nightmare on summer weekends.
              </p>
              <div className="space-y-2 text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                <div className="flex gap-2">
                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>RULE</span>
                  <span className="text-gray-800">Summer: parked by 7:30 AM or you're circling blocks</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>COST</span>
                  <span className="text-gray-800">Street parking free but limited near breaks</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase w-16 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PERK</span>
                  <span className="text-gray-800">Beach access is free. No tags, no passes.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cheat Sheet */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE CHEAT SHEET</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                <thead>
                  <tr>
                    <th className="border-2 border-black bg-black text-white px-4 py-3 text-left font-black uppercase tracking-wide text-xs" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>METHOD</th>
                    <th className="border-2 border-black bg-black text-white px-4 py-3 text-left font-black uppercase tracking-wide text-xs" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>BEST FOR</th>
                    <th className="border-2 border-black bg-black text-white px-4 py-3 text-left font-black uppercase tracking-wide text-xs" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>THE TRADE-OFF</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-2 border-black px-4 py-3 font-bold text-black">A Train</td>
                    <td className="border-2 border-black px-4 py-3 text-gray-900">The car-less surfer</td>
                    <td className="border-2 border-black px-4 py-3 text-gray-900">A long, gritty commute</td>
                  </tr>
                  <tr>
                    <td className="border-2 border-black px-4 py-3 font-bold text-black">Ferry</td>
                    <td className="border-2 border-black px-4 py-3 text-gray-900">Scenic views & vibes</td>
                    <td className="border-2 border-black px-4 py-3 text-gray-900">Long lines in summer heat</td>
                  </tr>
                  <tr>
                    <td className="border-2 border-black px-4 py-3 font-bold text-black">Car</td>
                    <td className="border-2 border-black px-4 py-3 text-gray-900">Winter / Dawn Patrol</td>
                    <td className="border-2 border-black px-4 py-3 text-gray-900">Summer parking is a blood sport</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
