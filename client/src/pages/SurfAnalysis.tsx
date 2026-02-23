import { ArrowLeft, Calendar, TrendingUp, Waves, Wind, Sun, Snowflake, Leaf, Flower2, BarChart3, Target, Zap, Clock } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";

const MONO = { fontFamily: "'JetBrains Mono', monospace" };
const BOLD = { fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: "-0.02em" };
const BODY = { fontFamily: "'Inter', 'Roboto', sans-serif" };

function SectionHeader({ icon: Icon, title, label }: { icon: React.ElementType; title: string; label: string }) {
  return (
    <div className="flex items-center gap-3 p-4 border-b-2 border-black">
      <div className="w-7 h-7 bg-black flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <h2 className="text-lg font-black text-black uppercase flex-1 min-w-0" style={BOLD}>{title}</h2>
      <span className="hidden sm:inline ml-auto text-[10px] font-medium tracking-widest text-gray-400 shrink-0" style={MONO}>{label}</span>
    </div>
  );
}

export default function SurfAnalysis() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const seasons = [
    { name: "Fall",   tag: "GO",     months: "SEPT–NOV", days: "7.8", desc: "Tropical systems + offshore winds. The season that makes or breaks your year.",               bg: "bg-emerald-50", accent: "bg-emerald-600", icon: Leaf },
    { name: "Spring", tag: "MAYBE",  months: "MAR–MAY",  days: "5.6", desc: "Late storms still fire, winds clean up. 35% more surfable than winter.",                      bg: "bg-amber-50",   accent: "bg-amber-500",  icon: Flower2 },
    { name: "Winter", tag: "SPARSE", months: "DEC–FEB",  days: "4.1", desc: "Nor'easters bring swell but wind kills the clean days.",                                       bg: "",              accent: "bg-gray-600",   icon: Snowflake },
    { name: "Summer", tag: "SKIP",   months: "JUN–AUG",  days: "3.8", desc: "Flattest average. Then one tropical system tracks right and everything changes overnight.",     bg: "bg-red-50",     accent: "bg-red-500",    icon: Sun },
  ];

  const yearData = [
    { year: "2021", days: 80, highlight: "emerald" },
    { year: "2020", days: 73, highlight: null },
    { year: "2023", days: 72, highlight: null },
    { year: "2022", days: 57, highlight: null },
    { year: "2024", days: 56, highlight: "red" },
  ];

  const bestMonths = [
    { days: 18, label: "SEPT 2023" },
    { days: 13, label: "OCT 2022" },
    { days: 12, label: "SEPT 2021" },
    { days: 12, label: "OCT 2020" },
    { days: 11, label: "FEB 2021" },
    { days: 11, label: "MAR 2024" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white sticky top-0 z-10 border-b border-black">
        <div className="container py-3">
          <Link href="/dashboard">
            <button className="flex items-center gap-2 text-black hover:underline">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm" style={BODY}>Back to Dashboard</span>
            </button>
          </Link>
        </div>
      </header>

      <main className="container py-6 space-y-4">

        {/* Hero */}
        <div className="border-2 border-black">
          <div className="p-5">
            <div className="text-[10px] font-medium tracking-widest text-gray-400 mb-1.5" style={MONO}>
              GUIDE · 5 YEARS OF DATA (2020–2025) · LIDO BEACH BASELINE
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-black uppercase" style={BOLD}>
              When Western Long Island Surf Actually Works
            </h1>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed max-w-2xl" style={BODY}>
              Two things have to line up: a strong swell event (usually from the SE) and favorable offshore winds (N or NW). They don't do it often. When they do, you move.
            </p>
          </div>
        </div>

        {/* Key Findings */}
        <div className="border-2 border-black">
          <SectionHeader icon={TrendingUp} title="Fall Owns Everything" label="KEY FINDINGS" />

          <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black">
            {[
              { stat: "34%", sub: "SEPT DAYS\nSURFABLE" },
              { stat: "18",  sub: "BEST MONTH\nSEPT 2023" },
              { stat: "43%", sub: "YR-TO-YR\nVARIANCE" },
            ].map(({ stat, sub }) => (
              <div key={stat} className="p-3 sm:p-4 text-center">
                <div className="text-3xl font-black text-black" style={BOLD}>{stat}</div>
                <div className="text-[10px] font-medium tracking-wide text-gray-500 uppercase leading-tight mt-1 whitespace-pre-line" style={MONO}>{sub}</div>
              </div>
            ))}
          </div>

          <div className="p-4">
            <p className="text-sm text-gray-700 leading-relaxed" style={BODY}>
              Nearly <strong>1 in 3 September days</strong> produces rideable surf. You're not guessing—every three days, the coast delivers. That's an edge only early fall offers.
            </p>
          </div>
        </div>

        {/* Why These Numbers Matter */}
        <div className="border-2 border-black">
          <SectionHeader icon={Target} title="Why These Numbers Matter" label="INSIGHT" />
          <div className="divide-y divide-black/15">
            {[
              { n: "01", title: "Timing Beats Averages",  body: "One fall month can outperform an entire summer. September 2023 logged 18 surfable days—more than most full summers combined." },
              { n: "02", title: "Windows Over Seasons",   body: "A few key windows matter more than a full season. One well-tracked tropical run can redefine an entire year." },
              { n: "03", title: "Chaos Is Normal",        body: "Year-to-year swings (~43%) aren't a trend—it's high-variance Atlantic chaos. The system isn't degrading. Always has been this way." },
            ].map(({ n, title, body }) => (
              <div key={n} className="p-4 flex items-start gap-3">
                <div className="w-6 h-6 bg-black flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white font-black text-[11px]" style={BOLD}>{n}</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-black uppercase" style={BOLD}>{title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed mt-0.5" style={BODY}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Four Seasons — compact table */}
        <div className="border-2 border-black">
          <SectionHeader icon={Calendar} title="The Four Seasons" label="SEASONAL DATA" />
          <div className="divide-y-2 divide-black">
            {seasons.map(({ name, tag, months, days, desc, bg, accent, icon: Icon }) => (
              <div key={name} className={`flex ${bg}`}>
                <div className={`${accent} w-1.5 shrink-0`} />
                <div className="flex items-center gap-3 p-3 sm:p-4 flex-1 min-w-0">
                  <div className={`w-9 h-9 ${accent} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-base font-black text-black uppercase" style={BOLD}>{name}</span>
                      <span className={`text-[9px] font-medium tracking-widest ${accent} text-white px-1.5 py-0.5`} style={MONO}>{tag}</span>
                      <span className="text-[10px] font-medium tracking-widest text-gray-400" style={MONO}>{months}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-snug" style={BODY}>{desc}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-2xl font-black text-black leading-none" style={BOLD}>{days}</div>
                    <div className="text-[9px] font-medium tracking-widest text-gray-500 mt-0.5" style={MONO}>DAYS/MO</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historical: Best Months + Year Totals side by side */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Best Months leaderboard */}
          <div className="border-2 border-black flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b-2 border-black">
              <div className="w-7 h-7 bg-black flex items-center justify-center shrink-0">
                <BarChart3 className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-black text-black uppercase flex-1 min-w-0" style={BOLD}>Best Single Months</h2>
              <span className="hidden sm:inline text-[10px] font-medium tracking-widest text-gray-400 shrink-0" style={MONO}>HISTORICAL</span>
            </div>
            <div className="divide-y divide-black/15 flex-1">
              {bestMonths.map(({ days, label }, i) => (
                <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-[10px] text-gray-400 w-4 text-right shrink-0" style={MONO}>{i + 1}</span>
                  <span className="text-xl font-black text-black w-8 shrink-0" style={BOLD}>{days}</span>
                  <span className="text-[10px] font-medium tracking-widest text-gray-500" style={MONO}>{label}</span>
                  {i === 0 && <span className="ml-auto text-[9px] font-medium tracking-widest bg-emerald-600 text-white px-1.5 py-0.5" style={MONO}>RECORD</span>}
                </div>
              ))}
            </div>
            <div className="p-3 bg-gray-50 border-t-2 border-black">
              <p className="text-[9px] text-gray-500 tracking-wide" style={MONO}>TROPICAL ENERGY + COLD-SEASON SYSTEMS</p>
            </div>
          </div>

          {/* Year totals — CSS bar chart */}
          <div className="border-2 border-black flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b-2 border-black">
              <div className="w-7 h-7 bg-black flex items-center justify-center shrink-0">
                <BarChart3 className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-black text-black uppercase flex-1 min-w-0" style={BOLD}>Year Totals</h2>
              <span className="hidden sm:inline text-[10px] font-medium tracking-widest text-gray-400 shrink-0" style={MONO}>ANNUAL DATA</span>
            </div>
            <div className="p-4 space-y-3 flex-1">
              {yearData.map(({ year, days, highlight }) => (
                <div key={year} className="flex items-center gap-3">
                  <span className="text-[10px] font-medium tracking-widest text-gray-500 w-9 shrink-0" style={MONO}>{year}</span>
                  <div className="flex-1 h-5 bg-gray-100 relative overflow-hidden">
                    <div
                      className={`h-full transition-all ${highlight === "emerald" ? "bg-emerald-600" : highlight === "red" ? "bg-red-500" : "bg-black"}`}
                      style={{ width: `${(days / 80) * 100}%` }}
                    />
                  </div>
                  <span className="text-base font-black text-black w-8 text-right shrink-0" style={BOLD}>{days}</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-gray-50 border-t-2 border-black">
              <p className="text-[9px] text-gray-500 tracking-wide" style={MONO}>NO SMOOTH TREND. HIGH-VARIANCE ATLANTIC CHAOS.</p>
            </div>
          </div>
        </div>

        {/* NJ Reality Check + Drivers side by side */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* NJ Reality Check */}
          <div className="border-2 border-black">
            <div className="flex items-center gap-3 p-4 border-b-2 border-black">
              <div className="w-7 h-7 bg-black flex items-center justify-center shrink-0">
                <Snowflake className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-black text-black uppercase flex-1 min-w-0" style={BOLD}>Why NJ Wins in Winter</h2>
              <span className="hidden sm:inline text-[10px] font-medium tracking-widest text-gray-400 shrink-0" style={MONO}>REALITY CHECK</span>
            </div>
            <div className="divide-y divide-black/15">
              <div className="p-4">
                <div className="text-[9px] font-medium tracking-widest text-gray-500 uppercase mb-1.5" style={MONO}>THE PROBLEM</div>
                <p className="text-xs text-gray-700 leading-relaxed" style={BODY}>After major low pressure passes, winds shift westerly—offshore for NJ, cross/onshore for Western Long Island.</p>
              </div>
              <div className="p-4">
                <div className="text-[9px] font-medium tracking-widest text-gray-500 uppercase mb-1.5" style={MONO}>THE RESULT</div>
                <p className="text-xs text-gray-700 leading-relaxed" style={BODY}>New Jersey cleans up immediately after winter storms. Western Long Island usually doesn't. The wind works in their favor.</p>
              </div>
            </div>
          </div>

          {/* Drivers */}
          <div className="border-2 border-black">
            <div className="flex items-center gap-3 p-4 border-b-2 border-black">
              <div className="w-7 h-7 bg-black flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-black text-black uppercase flex-1 min-w-0" style={BOLD}>What Actually Makes It Work</h2>
              <span className="hidden sm:inline text-[10px] font-medium tracking-widest text-gray-400 shrink-0" style={MONO}>DRIVERS</span>
            </div>
            <div className="divide-y divide-black/15">
              {[
                { Icon: Waves, accent: "bg-emerald-600", title: "Tropical Systems",    range: "AUG–OCT", body: "Higher ceiling. More days where wind plays nice. This is where the magic happens." },
                { Icon: Wind,  accent: "bg-gray-600",    title: "Cold-Season Storms",  range: "DEC–MAR", body: "Nor'easters deliver energy, but wind becomes the gatekeeper. More swell, fewer clean days." },
              ].map(({ Icon, accent, title, range, body }) => (
                <div key={title} className="p-4 flex items-start gap-3">
                  <div className={`w-7 h-7 ${accent} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-black text-black uppercase" style={BOLD}>{title}</h3>
                      <span className="text-[9px] text-gray-400" style={MONO}>{range}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed" style={BODY}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tactics */}
        <div className="border-2 border-black">
          <SectionHeader icon={Clock} title="How to Use This Intel" label="TACTICS" />
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x-2 divide-black">
            {[
              { label: "PLANNING A TRIP?", body: "Target September or October. Your odds are roughly 3× better than summer." },
              { label: "LIVE HERE?",        body: "Track tropical forecasts from August. Watch nor'easter setups Dec–Mar. Everything else is gravy." },
              { label: "NEW TO THE AREA?", body: "Don't expect perfection. Expect windows. When one opens—drop everything and go." },
            ].map(({ label, body }) => (
              <div key={label} className="p-4">
                <div className="text-[9px] font-medium tracking-widest text-gray-500 uppercase mb-1.5" style={MONO}>{label}</div>
                <p className="text-xs text-gray-700 leading-relaxed" style={BODY}>{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Perspective + Bottom Line */}
        <div className="border-2 border-black">
          <div className="p-5 border-b border-black/20">
            <div className="text-[9px] font-medium tracking-widest text-gray-400 mb-1.5" style={MONO}>PERSPECTIVE</div>
            <p className="text-sm text-gray-700 leading-relaxed" style={BODY}>
              Western Long Island gets plenty of rideable days. <strong>Truly elite sessions?</strong> Shoulder-high-plus, offshore, drop-everything surf? Rare. Almost always tied to named events. You have to be ready for them.
            </p>
          </div>
          <div className="bg-black p-5">
            <div className="text-[9px] font-medium tracking-widest text-gray-500 mb-2" style={MONO}>BOTTOM LINE</div>
            <p className="text-sm text-white leading-relaxed" style={BODY}>
              Western Long Island isn't Rincon. It won't deliver world-class waves every week. But if you know when to watch, when to be ready, and what conditions actually matter, this coast will absolutely reward you. <strong className="text-white">The data doesn't lie.</strong> Fall is king. Spring is solid. Everything else is about timing.
            </p>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
