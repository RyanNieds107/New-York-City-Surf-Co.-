import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, TrendingUp, Waves, Wind, Sun, Snowflake, Leaf, Flower2, BarChart3, Target, Zap, Clock } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";

export default function SurfAnalysis() {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white sticky top-0 z-10 border-b border-black">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="flex items-center gap-2 text-black hover:underline">
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>Back to Dashboard</span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 space-y-6">

        {/* Hero Section */}
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GUIDE</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              When Western Long Island Surf Actually Works
            </h1>
            <p className="mt-3 text-sm text-gray-700 leading-relaxed max-w-2xl" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Surfing "works" in Long Island when two factors align: a strong swell event (usually from the southeast) and favorable offshore winds (typically from the north or northwest).
            </p>
          </div>
          <div className="p-4 bg-gray-50">
            <p className="text-[10px] text-gray-500 tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              BASED ON 5 YEARS OF HISTORICAL DATA (2020–2025) · LIDO BEACH BASELINE
            </p>
          </div>
        </div>

        {/* The Headline Stats */}
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>KEY FINDINGS</span>
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              Fall Owns Everything
            </h2>
          </div>

          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x-2 divide-black">
            <div className="p-6 text-center">
              <div className="text-3xl font-black text-black mb-1" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>34%</div>
              <div className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                SEPTEMBER DAYS SURFABLE
              </div>
            </div>
            <div className="p-6 text-center">
              <div className="text-3xl font-black text-black mb-1" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>18</div>
              <div className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                BEST MONTH (SEPT 2023)
              </div>
            </div>
            <div className="p-6 text-center">
              <div className="text-3xl font-black text-black mb-1" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>43%</div>
              <div className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                YEAR-TO-YEAR VARIANCE
              </div>
            </div>
          </div>

          <div className="border-t-2 border-black p-6">
            <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Nearly 1 in 3 September days works. In September, you're not guessing—roughly every three days, Western Long Island produces legitimate surf. That's an edge, and it only shows up in early fall.
            </p>
          </div>
        </div>

        {/* Why These Stats Matter */}
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>INSIGHT</span>
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              Why These Numbers Matter
            </h2>
          </div>

          <div className="divide-y-2 divide-black">
            <div className="p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-black flex items-center justify-center shrink-0">
                <span className="text-white font-black text-sm" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>01</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-black uppercase mb-1" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Timing Beats Averages</h3>
                <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  One fall month can outperform an entire summer. September 2023 logged 18 surfable days—more than most full summers combined.
                </p>
              </div>
            </div>
            <div className="p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-black flex items-center justify-center shrink-0">
                <span className="text-white font-black text-sm" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>02</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-black uppercase mb-1" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Windows Over Seasons</h3>
                <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  A few key windows matter more than a full season. One well-tracked tropical run can redefine an entire year.
                </p>
              </div>
            </div>
            <div className="p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-black flex items-center justify-center shrink-0">
                <span className="text-white font-black text-sm" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>03</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-black uppercase mb-1" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Chaos Is Normal</h3>
                <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  Year-to-year swings (~43%) aren't a trend—it's high-variance Atlantic chaos. The system isn't degrading. Always has been this way.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Seasonal Breakdown */}
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SEASONAL DATA</span>
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              The Four Seasons
            </h2>
          </div>

          <div className="divide-y-2 divide-black">
            {/* Fall */}
            <div className="p-6 bg-emerald-50">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-emerald-600 flex items-center justify-center shrink-0">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Fall</h3>
                    <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GO</span>
                  </div>
                  <div className="text-[10px] font-medium tracking-widest text-gray-500 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SEPT–NOV · 7.8 DAYS/MONTH</div>
                  <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    The undisputed king. Tropical systems deliver consistent energy while offshore winds show up more often. This is the season that makes or breaks your year.
                  </p>
                </div>
              </div>
            </div>

            {/* Spring */}
            <div className="p-6 bg-amber-50">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-amber-500 flex items-center justify-center shrink-0">
                  <Flower2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Spring</h3>
                    <span className="text-[10px] font-medium tracking-widest bg-amber-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAYBE</span>
                  </div>
                  <div className="text-[10px] font-medium tracking-widest text-gray-500 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAR–MAY · 5.6 DAYS/MONTH</div>
                  <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Reliable and underrated. Late-season storms still fire, winds clean up, and water temps slowly crawl back toward tolerable. 35% more surfable than winter.
                  </p>
                </div>
              </div>
            </div>

            {/* Winter */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gray-600 flex items-center justify-center shrink-0">
                  <Snowflake className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Winter</h3>
                    <span className="text-[10px] font-medium tracking-widest bg-gray-600 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SPARSE</span>
                  </div>
                  <div className="text-[10px] font-medium tracking-widest text-gray-500 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DEC–FEB · 4.1 DAYS/MONTH</div>
                  <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    Has a reputation it doesn't earn. Occasional serious nor'easter swell, but most storms bring onshore winds during peak energy. By the time winds relax, swell is fading.
                  </p>
                </div>
              </div>
            </div>

            {/* Summer */}
            <div className="p-6 bg-red-50">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-red-500 flex items-center justify-center shrink-0">
                  <Sun className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-black text-black uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Summer</h3>
                    <span className="text-[10px] font-medium tracking-widest bg-red-500 text-white px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SKIP</span>
                  </div>
                  <div className="text-[10px] font-medium tracking-widest text-gray-500 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>JUN–AUG · 3.8 DAYS/MONTH</div>
                  <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                    The weakest average—with the highest ceiling. Most of summer is small and blown out. Then one tropical system tracks right and everything changes overnight.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Winter Reality Check */}
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <Snowflake className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>REALITY CHECK</span>
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              Why New Jersey Wins in Winter
            </h2>
          </div>

          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-black">
            <div className="p-6">
              <div className="text-[10px] font-medium tracking-widest text-gray-500 uppercase mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE PROBLEM</div>
              <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                After major low pressure systems pass, winds shift westerly—offshore for New Jersey, cross/onshore for Western Long Island.
              </p>
            </div>
            <div className="p-6">
              <div className="text-[10px] font-medium tracking-widest text-gray-500 uppercase mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>THE RESULT</div>
              <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                New Jersey cleans up immediately after winter storms. Western Long Island usually doesn't. The wind works in their favor.
              </p>
            </div>
          </div>
        </div>

        {/* Best Months on Record */}
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>HISTORICAL</span>
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              Best Single Months on Record
            </h2>
          </div>

          <div className="divide-y-2 divide-black">
            <div className="grid grid-cols-2 md:grid-cols-3 divide-x-2 divide-black">
              <div className="p-4">
                <div className="text-xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>18</div>
                <div className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SEPT 2023</div>
              </div>
              <div className="p-4">
                <div className="text-xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>13</div>
                <div className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>OCT 2022</div>
              </div>
              <div className="p-4">
                <div className="text-xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>12</div>
                <div className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SEPT 2021</div>
              </div>
              <div className="p-4">
                <div className="text-xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>12</div>
                <div className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>OCT 2020</div>
              </div>
              <div className="p-4">
                <div className="text-xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>11</div>
                <div className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>FEB 2021</div>
              </div>
              <div className="p-4">
                <div className="text-xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>11</div>
                <div className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAR 2024</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t-2 border-black">
            <p className="text-[10px] text-gray-500 tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              PATTERN: TROPICAL ENERGY (LATE SUMMER–FALL) + MAJOR COLD-SEASON SYSTEMS (WINTER–EARLY SPRING)
            </p>
          </div>
        </div>

        {/* Year-to-Year Data */}
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ANNUAL DATA</span>
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              Year-to-Year Totals
            </h2>
          </div>

          <div className="divide-y-2 divide-black">
            <div className="grid grid-cols-5 divide-x-2 divide-black">
              <div className="p-4 text-center bg-emerald-50">
                <div className="text-xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>80</div>
                <div className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>2021</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>73</div>
                <div className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>2020</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>72</div>
                <div className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>2023</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>57</div>
                <div className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>2022</div>
              </div>
              <div className="p-4 text-center bg-red-50">
                <div className="text-xl font-black text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>56</div>
                <div className="text-[10px] font-medium tracking-widest text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>2024</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t-2 border-black">
            <p className="text-[10px] text-gray-500 tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              NO SMOOTH TREND. JUST HIGH-VARIANCE ATLANTIC CHAOS.
            </p>
          </div>
        </div>

        {/* What Makes It Work */}
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DRIVERS</span>
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              What Actually Makes It Work
            </h2>
          </div>

          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-black">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-emerald-600 flex items-center justify-center">
                  <Waves className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>AUG–OCT</span>
              </div>
              <h3 className="text-lg font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Tropical Systems</h3>
              <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Hurricanes, tropical storms, and remnants. Higher ceiling. More days where wind plays nice. This is where the magic happens.
              </p>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gray-600 flex items-center justify-center">
                  <Wind className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DEC–MAR</span>
              </div>
              <h3 className="text-lg font-black text-black uppercase mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Cold-Season Storms</h3>
              <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Nor'easters and winter bombs deliver frequent energy, but wind becomes the gatekeeper. More swell opportunities. Fewer clean days.
              </p>
            </div>
          </div>
        </div>

        {/* Quality vs Quantity */}
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PERSPECTIVE</span>
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              Quality vs. Quantity
            </h2>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-700 leading-relaxed mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Western Long Island gets plenty of rideable days—sessions where you get wet, catch waves, and don't regret showing up.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              <strong>But truly special days?</strong> The shoulder-high-plus, offshore, drop-everything kind? Those are rare. Almost always tied to named events.
            </p>
          </div>

          <div className="bg-black p-6">
            <p className="text-sm text-white leading-relaxed font-medium" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              There are lots of windows here. The elite days are the ones you plan your life around.
            </p>
          </div>
        </div>

        {/* How to Use This */}
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>TACTICS</span>
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
              How to Use This Intel
            </h2>
          </div>

          <div className="divide-y-2 divide-black">
            <div className="p-6">
              <div className="text-[10px] font-medium tracking-widest text-gray-500 uppercase mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PLANNING A TRIP?</div>
              <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Target September or October. Your odds are roughly 3× better than summer.
              </p>
            </div>
            <div className="p-6">
              <div className="text-[10px] font-medium tracking-widest text-gray-500 uppercase mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LIVE HERE?</div>
              <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Start tracking tropical forecasts in August. Watch nor'easter setups December through March. Everything else is gravy.
              </p>
            </div>
            <div className="p-6">
              <div className="text-[10px] font-medium tracking-widest text-gray-500 uppercase mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>NEW TO THE AREA?</div>
              <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Don't expect perfection. Expect windows. When one opens, drop everything and go.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="bg-black p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-medium tracking-widest text-gray-400 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BOTTOM LINE</span>
          </div>
          <p className="text-sm text-white leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
            Western Long Island isn't Rincon. It won't deliver world-class waves every week. But if you know when to watch, when to be ready, and what conditions actually matter, this stretch of coast will absolutely reward you. <strong className="text-white">The data doesn't lie.</strong> Fall is king. Spring is solid. Everything else is about timing.
          </p>
        </div>

      </main>
      <Footer />
    </div>
  );
}
