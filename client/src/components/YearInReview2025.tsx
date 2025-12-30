import { year2025Data } from "@/data/yearInReview2025";
import { cn } from "@/lib/utils";

export function YearInReview2025() {
  return (
    <section className="w-full pt-20 pb-16 px-4 md:px-8 relative bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header - matching "Today's NYC Surf" styling */}
        <div className="mb-12">
          <h2 
            className="text-5xl md:text-7xl font-black text-black uppercase tracking-tighter leading-none"
            style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.03em' }}
          >
            2025 at a Glance
          </h2>
          <p 
            className="text-gray-600 text-sm mt-3 tracking-wide"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Surfable days and notable swells across all seasons
          </p>
        </div>

        {/* Seasonal Grid - 4 boxes side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {year2025Data.map((seasonData) => (
            <div
              key={seasonData.season}
              className={cn(
                "bg-white border-2 border-[#e0e0e0] transition-all duration-300 relative overflow-hidden group",
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
                {/* Season Name */}
                <h3
                  className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight leading-none mb-3"
                  style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}
                >
                  {seasonData.season}
                </h3>

                {/* Surfable Days Count */}
                <div className="mb-4">
                  <span
                    className="text-5xl md:text-6xl font-black text-black leading-none"
                    style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.03em' }}
                  >
                    {seasonData.surfableDays}
                  </span>
                  <div
                    className="text-[11px] text-gray-600 tracking-wider mt-1"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    SURFABLE DAYS
                  </div>
                </div>

                {/* Notable Swells */}
                {seasonData.notableSwells.length > 0 && (
                  <div className="pt-4 border-t-2 border-black">
                    <div
                      className="text-[9px] text-gray-600 uppercase tracking-wider mb-2"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Notable Swells
                    </div>
                    <div className="space-y-2">
                      {seasonData.notableSwells.map((swell, index) => (
                        <p
                          key={index}
                          className="text-xs text-black leading-relaxed"
                          style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
                        >
                          {swell}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

