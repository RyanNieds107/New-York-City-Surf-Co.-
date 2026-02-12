import React from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface LogoProps {
  logoSize?: string;
  textSize?: string;
  textColor?: string;
  showLink?: boolean;
  className?: string;
  showLiveIntel?: boolean;
}

export function Logo({
  logoSize = "h-32",
  textSize = "text-2xl",
  textColor = "text-black",
  showLink = false,
  className = "",
  showLiveIntel = false,
}: LogoProps) {
  // Determine if we need white version based on textColor prop
  const isWhite = textColor?.includes("white") || textColor === "text-white";
  const buoyBreakingHeightsQuery = trpc.buoy.getBreakingHeightsForSpots.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
  });
  const buoyQuery = trpc.buoy.get44065.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
  });

  // Pass through logoSize directly to support responsive classes like "h-10 sm:h-12 md:h-14"
  const logoClassName = `${logoSize} w-auto`;

  const windDirection = (() => {
    const deg = buoyQuery.data?.windDirectionDeg;
    if (deg === null || deg === undefined) return "N/A";
    const cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(deg / 22.5) % 16;
    return cardinals[index];
  })();
  const rockawayHeight = buoyBreakingHeightsQuery.data?.["Rockaway Beach"]?.height ?? buoyQuery.data?.waveHeight ?? null;
  const rockawayPeriod = buoyQuery.data?.dominantPeriod ?? null;
  const windMph = buoyQuery.data?.windSpeedKts != null ? Math.round(buoyQuery.data.windSpeedKts * 1.15) : null;
  const liveLine = `${rockawayHeight != null ? `${rockawayHeight.toFixed(1)}FT` : "N/A"} @ ${rockawayPeriod != null ? `${Math.round(rockawayPeriod)}S` : "N/A"} • ${windMph != null ? `${windMph}MPH` : "N/A"} ${windDirection}`;
  
  const logoContent = (
    <div className={`flex flex-col items-start gap-3 ${className}`} style={{ margin: 0 }}>
      <img
        src="/Final Logo (Black).png"
        alt="New York City Surf Co. Logo"
        className={logoClassName}
        style={{
          objectFit: "contain",
          objectPosition: "center",
          display: "block",
          backgroundColor: "transparent",
          margin: 0,
          padding: 0,
          lineHeight: 0,
          filter: isWhite ? "brightness(0) invert(1)" : "none",
        }}
      />
      {showLiveIntel && (
        <div
          className={cn(
            "flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wider",
            isWhite ? "text-white/85" : "text-gray-700"
          )}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>Live Rockaway:</span>
          <span className={isWhite ? "text-white/75" : "text-gray-600"}>{liveLine}</span>
        </div>
      )}
    </div>
  );

  if (showLink) {
    return (
      <Link href="/">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
