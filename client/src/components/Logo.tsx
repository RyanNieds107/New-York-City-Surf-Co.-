import React from "react";
import { Link } from "wouter";

interface LogoProps {
  logoSize?: string;
  textSize?: string;
  textColor?: string;
  showLink?: boolean;
  className?: string;
}

export function Logo({ 
  logoSize = "h-32 w-32", 
  textSize = "text-2xl",
  textColor = "text-black",
  showLink = false,
  className = ""
}: LogoProps) {
  // Determine if we need white version based on textColor prop
  const isWhite = textColor?.includes("white") || textColor === "text-white";
  
  // Extract height from logoSize and use w-auto for width
  const heightClass = logoSize.split(' ').find(cls => cls.startsWith('h-')) || 'h-10';
  const logoClassName = `${heightClass} w-auto`;
  
  const logoContent = (
    <div className={`flex items-center gap-0 ${className}`} style={{ lineHeight: 0, margin: 0 }}>
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
          // Apply filter to invert black to white when needed
          filter: isWhite ? "brightness(0) invert(1)" : "none",
        }}
      />
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
