import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/Footer";

export default function SurfAnalysis() {
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
      <main className="container py-8">
        {/* Surf Analysis Card */}
        <Card id="surf-analysis-card" className="bg-white border-black rounded-none shadow-none mb-8 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gray-50 px-8 md:px-12 py-12 md:py-16 border-b-2 border-black">
            {/* GUIDE Badge */}
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '2px' }}>
                GUIDE
              </span>
            </div>
            {/* Main Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight tracking-tight text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
              When Western Long Island Surf Actually Works
            </h1>
            {/* Explanatory Text */}
            <div className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-4xl" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
              Surfing actually "works" in Long Island when two main factors align: a strong swell event (usually from the southeast) and favorable offshore winds (typically from the north or northwest).
            </div>
          </div>

          {/* Content Section */}
          <CardContent className="p-8 md:p-12">
            {/* Methodology Section */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight uppercase" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                The Data
              </h2>
              <div className="bg-gray-50 p-8 md:p-10">
                <p className="text-xl md:text-3xl font-bold leading-relaxed text-black mb-6" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Below is data from 2020 to 2025 tracking every surfable day on Western Long Island, using Lido Beach as the baseline.
                </p>
                <p className="text-base md:text-lg leading-relaxed text-gray-600" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                We counted days with surf at 2 to 3 feet or higher and surfable winds. These are the minimum conditions that make this stretch of coast worth paddling out. Here is what the numbers show.
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* The Headline Section */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                The Headline: Fall Owns Everything
              </h2>

            {/* Stat Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-black text-white p-6 md:p-8 text-center rounded-none">
                <div className="text-4xl md:text-5xl font-black mb-2 tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                 34%
                </div>
                <div className="text-xs md:text-sm text-gray-400 font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  SEPTEMBER DAYS ARE SURFABLE from 2020 to 2025
                </div>
              </div>
              <div className="bg-black text-white p-6 md:p-8 text-center rounded-none">
                <div className="text-4xl md:text-5xl font-black mb-2 tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  18
                </div>
                <div className="text-xs md:text-sm text-gray-400 font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                 Number of Surfable days IN ONE FALL MONTH (SEPT 2023)
                </div>
              </div>
              <div className="bg-black text-white p-6 md:p-8 text-center rounded-none">
                <div className="text-4xl md:text-5xl font-black mb-2 tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  43%
                </div>
                <div className="text-xs md:text-sm text-gray-400 font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  SWING BETWEEN BEST AND WORST YEARS
                </div>
              </div>
            </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* Body Copy */}
            <div className="mb-12 md:mb-16">
              <p className="text-base md:text-lg font-semibold mb-6 leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Nearly 1 out of every 3 September days works. 
              </p>

              <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-5" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                In September, you are not guessing. Roughly every three days, Western Long Island produces legitimate surf. That is a edge, and it only shows up in early fall. Locals know it. Schedules quietly change.
              </p>

              <p className="text-base md:text-lg leading-relaxed text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                That same data-driven reality is why Sean Collins, founder of Surfline, backed hosting the Quiksilver Pro in September. Western Long Island works best then, and in 2011 it proved the point. The swell showed up, the contest ran, and the call paid off.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* One Fall Month Can Outperform an Entire Summer */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                One Fall Month Can Outperform an Entire Summer
              </h2>

              <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-5" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                September 2023 logged 18 surfable days, which was more than most full summers combined. Summer averages roughly 3.8 surfable days per month. One elite fall month can deliver 4–5× that number.
              </p>

              <p className="text-base md:text-lg leading-relaxed text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Western Long Island isn't about steady consistency. It's about explosive windows. One well-tracked tropical run can redefine an entire year.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* The Best Year Beats the Worst Year by ~40% */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                The Best Year Beats the Worst Year by ~40%
              </h2>

              <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                <strong>Best year (2021):</strong> ~80 surfable days<br />
                <strong>Soft year (2024):</strong> ~56 surfable days
              </p>

              <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-5" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                That's a ~43% year-to-year swing.
              </p>

              <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-5" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                This kills a common misconception: "The waves have been worse lately."
              </p>

              <p className="text-base md:text-lg leading-relaxed text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                The data says otherwise. The system isn't degrading—it's high-variance by nature. Atlantic surf is lumpy. Always has been.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* Why These Three Stats Matter */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Why These Three Stats Matter
              </h2>

              <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-5" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Taken together, they tell a clean story:
              </p>

              <div className="space-y-3 mb-5">
                <p className="text-base md:text-lg leading-relaxed text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  <strong>Timing beats averages</strong>
                </p>
                <p className="text-base md:text-lg leading-relaxed text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  <strong>A few windows matter more than a full season</strong>
                </p>
                <p className="text-base md:text-lg leading-relaxed text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  <strong>Year-to-year chaos is normal—not a trend</strong>
                </p>
              </div>

              <p className="text-base md:text-lg leading-relaxed text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                That's the kind of insight that separates local knowledge from generic surf apps.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* Winter - All Hype, Less Reality */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Winter - All Hype, Less Reality
              </h2>

              <div className="bg-black text-white p-6 md:p-8 mb-6 text-center rounded-none">
                <div className="text-4xl md:text-5xl font-black mb-2 tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  4.1
                </div>
                <div className="text-xs md:text-sm text-gray-400 font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  SURFABLE DAYS/MONTH - NEARLY IDENTICAL TO SUMMER
                </div>
              </div>

              <p className="text-base md:text-lg leading-relaxed text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Winter has a reputation it doesn't earn. Yes, Western Long Island gets occasional serious nor'easter swell—big days people talk about for years. But those days are outliers. Most winter storms bring onshore winds during peak swell. By the time winds relax, the energy is fading. Winter feels powerful because the best days are memorable. The data says it's sparse.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* Why New Jersey Wins in Winter */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Why New Jersey Wins in Winter
              </h2>

              <div className="bg-gray-50 p-6 md:p-8 mb-6 border-2 border-black">
                <div className="text-xl md:text-2xl font-black text-black text-center" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  Same swell. Different outcome.
                </div>
              </div>

              <p className="text-base md:text-lg leading-relaxed text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                After major low pressure systems pass, winds shift westerly—offshore for New Jersey, cross/onshore for Western Long Island. New Jersey cleans up immediately after winter storms. Western Long Island usually doesn't. This is why winter surf lore sounds better from Jersey. The wind works in their favor. Western Long Island needs very specific timing. New Jersey needs far less.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* Spring - The Quiet Winner */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Spring - The Quiet Winner
              </h2>

              <div className="bg-black text-white p-6 md:p-8 mb-6 text-center rounded-none">
                <div className="text-4xl md:text-5xl font-black mb-2 tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  5.6
                </div>
                <div className="text-xs md:text-sm text-gray-400 font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  SURFABLE DAYS/MONTH - 35% MORE THAN WINTER
                </div>
              </div>

              <p className="text-base md:text-lg leading-relaxed text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Spring doesn't get the hype. It gets results. March consistently ranks behind only September and October—not because waves are bigger, but because more days actually work. Late-season swell still active. Wind patterns improve meaningfully. Spring is when energy overlaps with cooperation.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* Four Seasons Section */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                The Four Seasons of Western Long Island Surf
              </h2>

            <div className="bg-gray-50 p-6 md:p-8 mb-4 border-l-2 border-black">
              <div className="flex flex-col md:flex-row md:justify-between md:items-baseline mb-4 gap-2">
                <div className="text-xl md:text-2xl font-extrabold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  🍂 Fall (September–November)
                </div>
                <div className="text-lg md:text-xl font-black text-gray-600" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  ~7.8 surfable days/month
                </div>
              </div>
              <div className="text-base md:text-lg text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                The undisputed king. Tropical systems deliver consistent energy while offshore winds show up more often. This is the season that makes or breaks your year.
              </div>
            </div>

            <div className="bg-gray-50 p-6 md:p-8 mb-4 border-l-2 border-black">
              <div className="flex flex-col md:flex-row md:justify-between md:items-baseline mb-4 gap-2">
                <div className="text-xl md:text-2xl font-extrabold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  🌸 Spring (March–May)
                </div>
                <div className="text-lg md:text-xl font-black text-gray-600" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  ~5.6 surfable days/month
                </div>
              </div>
              <div className="text-base md:text-lg text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Reliable and underrated. Late-season storms still fire, winds clean up, and water temps slowly crawl back toward tolerable. Fewer blowouts, more usable days.
              </div>
            </div>

            <div className="bg-gray-50 p-6 md:p-8 mb-4 border-l-2 border-black">
              <div className="flex flex-col md:flex-row md:justify-between md:items-baseline mb-4 gap-2">
                <div className="text-xl md:text-2xl font-extrabold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  ❄️ Winter (December–February)
                </div>
                <div className="text-lg md:text-xl font-black text-gray-600" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  ~4.1 surfable days/month
                </div>
              </div>
              <div className="text-base md:text-lg text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Winter can produce some of the best tubes of the year for the hard core who brave the cold. The primary wave makers during this time are nor'easters and other low-pressure systems.
              </div>
            </div>

            <div className="bg-gray-50 p-6 md:p-8 mb-4 border-l-2 border-black">
              <div className="flex flex-col md:flex-row md:justify-between md:items-baseline mb-4 gap-2">
                <div className="text-xl md:text-2xl font-extrabold text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  ☀️ Summer (June–August)
                </div>
                <div className="text-lg md:text-xl font-black text-gray-600" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  ~3.8 surfable days/month
                </div>
              </div>
              <div className="text-base md:text-lg text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                The weakest average—with the highest ceiling. Most of summer is small and blown out. Then one tropical system tracks right and everything changes overnight.
              </div>
            </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* Best Single Months */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                The Best Single Months on Record
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-5 flex justify-between items-center border-l-2 border-black">
                <div className="font-extrabold text-base md:text-lg text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  September 2023
                </div>
                <div className="font-black text-xl md:text-2xl text-gray-600" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  18
                </div>
              </div>
              <div className="bg-gray-50 p-5 flex justify-between items-center border-l-2 border-black">
                <div className="font-extrabold text-base md:text-lg text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  October 2022
                </div>
                <div className="font-black text-xl md:text-2xl text-gray-600" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  13
                </div>
              </div>
              <div className="bg-gray-50 p-5 flex justify-between items-center border-l-2 border-black">
                <div className="font-extrabold text-base md:text-lg text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  September 2021
                </div>
                <div className="font-black text-xl md:text-2xl text-gray-600" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  12
                </div>
              </div>
              <div className="bg-gray-50 p-5 flex justify-between items-center border-l-2 border-black">
                <div className="font-extrabold text-base md:text-lg text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  October 2020
                </div>
                <div className="font-black text-xl md:text-2xl text-gray-600" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  12
                </div>
              </div>
              <div className="bg-gray-50 p-5 flex justify-between items-center border-l-2 border-black">
                <div className="font-extrabold text-base md:text-lg text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  February 2021
                </div>
                <div className="font-black text-xl md:text-2xl text-gray-600" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  11
                </div>
              </div>
              <div className="bg-gray-50 p-5 flex justify-between items-center border-l-2 border-black">
                <div className="font-extrabold text-base md:text-lg text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  March 2024
                </div>
                <div className="font-black text-xl md:text-2xl text-gray-600" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  11
                </div>
              </div>
              </div>

              <div className="text-base md:text-lg font-semibold leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                The pattern is obvious.<br />
                The biggest months cluster around two engines: tropical energy (late summer–fall) and major cold-season systems (winter–early spring). Everything else is filler.
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* Year-to-Year Section */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Year-to-Year: It's Lumpy by Design
              </h2>

              <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-4" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                <strong>Total surfable days by year:</strong>
              </p>

              <div className="text-base md:text-lg leading-loose font-semibold mb-6" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                2021 — 80 <span className="text-gray-500">(best year)</span><br />
                2020 — 73<br />
                2023 — 72<br />
                2022 — 57<br />
                2024 — 56 <span className="text-gray-500">(soft year)</span>
              </div>

              <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-5" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                There's no smooth trend here. Just high-variance Atlantic chaos.
              </p>

              <p className="text-base md:text-lg leading-relaxed text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Some years get multiple well-tracked storms and cooperative winds. Some don't. That's the reality of surfing this coast—and why short-term memory lies.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* What Actually Makes It Work */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                What Actually Makes Western Long Island Work
              </h2>

              <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-6" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                <strong>Two forces drive everything:</strong>
              </p>

              <div>
              <div className="mb-6 pl-6 border-l-2 border-black">
                <div className="text-xl md:text-2xl font-extrabold mb-2 text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  1. Tropical Systems (Aug–Oct)
                </div>
                <div className="text-base md:text-lg text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  Hurricanes, tropical storms, and their remnants. Higher ceiling. More days where the wind plays nice. This is where the magic happens.
                </div>
              </div>
              <div className="mb-6 pl-6 border-l-2 border-black">
                <div className="text-xl md:text-2xl font-extrabold mb-2 text-black" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  2. Cold-Season Storms (Dec–Mar)
                </div>
                <div className="text-base md:text-lg text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  Nor'easters and winter bombs deliver frequent energy, but wind becomes the gatekeeper. More swell opportunities. Fewer clean days.
                </div>
              </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* Quality vs Quantity */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Quality vs. Quantity
              </h2>

              <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-5" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Western Long Island gets plenty of rideable days—sessions where you get wet, catch waves, and don't regret showing up.
              </p>

              <div className="text-base md:text-lg font-semibold mb-6 leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                But truly special days?<br />
                The shoulder-high-plus, offshore, drop-everything kind?
              </div>

              <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-6" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Those are rare. And they're almost always tied to named events: major hurricanes tracking offshore, standout nor'easters, or perfectly timed swell pulses.
              </p>

              <div className="bg-black text-white p-8 md:p-10 rounded-none">
                <div className="text-lg md:text-xl font-semibold leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  There are lots of windows here.<br />
                  The elite days are the ones you plan your life around.
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* How to Use This Intel */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                How to Use This Intel
              </h2>

              <div className="bg-gray-50 p-8 md:p-10 border-t-2 border-b-2 border-black">
              <div className="mb-6">
                <div className="text-lg md:text-xl font-extrabold text-black mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  Planning a trip?
                </div>
                <div className="text-base md:text-lg text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  Target September or October. Your odds are roughly 3× better than summer.
                </div>
              </div>
              <div className="mb-6">
                <div className="text-lg md:text-xl font-extrabold text-black mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  Live here?
                </div>
                <div className="text-base md:text-lg text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  Start tracking tropical forecasts in August. Watch nor'easter setups December through March. Everything else is gravy.
                </div>
              </div>
              <div>
                <div className="text-lg md:text-xl font-extrabold text-black mb-2" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                  New to Western Long Island?
                </div>
                <div className="text-base md:text-lg text-gray-700 leading-relaxed" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  Don't expect perfection. Expect windows. When one opens, drop everything and go.
                </div>
              </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-12 md:my-16"></div>

            {/* Bottom Line */}
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
                Bottom Line
              </h2>

              <div className="text-base md:text-lg leading-relaxed text-black" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                Western Long Island isn't Rincon. It's not going to deliver world-class waves every week. But if you know when to watch, when to be ready, and what conditions actually matter, this stretch of coast will absolutely reward you.<br /><br />
                <span className="font-bold">The data doesn't lie.</span><br />
                Fall is king. Spring is solid. Everything else is about timing.
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

