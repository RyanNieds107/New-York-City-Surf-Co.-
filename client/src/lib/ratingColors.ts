/**
 * Universal Rating Color Utilities
 *
 * Provides consistent color schemes for quality ratings across the entire website.
 *
 * Rating Ranges:
 * 0-39:   Don't Bother        Red (bg-red-500)         White    #ef4444
 * 40-59:  Worth a Look        Yellow (bg-yellow-500)   Black    #eab308
 * 60-75:  Go Surf             Lime (bg-lime-500)       Black    #84cc16
 * 76-90:  Firing              Green (bg-green-600)     White    #16a34a
 * 91-100: All-Time            Emerald (bg-emerald-600) White    #059669
 */

/**
 * Get text color class for a rating label
 * Used for displaying rating text (e.g., "Go Surf", "Firing")
 *
 * @param label - Rating label string
 * @returns Tailwind text color class
 */
export function getRatingLabelColor(label: string): string {
  switch (label) {
    case "Don't Bother":
      return "text-red-500";
    case "Worth a Look":
      return "text-yellow-500";
    case "Go Surf":
      return "text-lime-500";
    case "Firing":
      return "text-green-600";
    case "All-Time":
      return "text-emerald-600";
    default:
      return "text-gray-500";
  }
}

/**
 * Get badge background and text color classes for a score
 * Returns an object with bg (background) and text (text color) classes
 *
 * @param score - Quality score (0-100)
 * @returns Object with bg and text Tailwind classes
 */
export function getScoreBadgeColors(score: number): { bg: string; text: string } {
  const s = Math.round(score);

  if (s >= 91) {
    return { bg: "bg-emerald-600", text: "text-white" }; // All-Time
  } else if (s >= 76) {
    return { bg: "bg-green-600", text: "text-white" }; // Firing
  } else if (s >= 60) {
    return { bg: "bg-lime-500", text: "text-black" }; // Go Surf
  } else if (s >= 40) {
    return { bg: "bg-yellow-500", text: "text-black" }; // Worth a Look
  } else {
    return { bg: "bg-red-500", text: "text-white" }; // Don't Bother (0-39)
  }
}

/**
 * Get background color class for a score
 * Used for simple score circles/badges
 *
 * @param score - Quality score (0-100)
 * @returns Tailwind background color class
 */
export function getScoreBackgroundColor(score: number): string {
  if (score >= 76) {
    return "bg-green-600";
  } else if (score >= 60) {
    return "bg-lime-500";
  } else if (score >= 40) {
    return "bg-yellow-500";
  } else {
    return "bg-red-500";
  }
}

/**
 * Get hex color for badge background (for inline styles)
 * Used when you need a hex color value instead of Tailwind class
 *
 * @param score - Quality score (0-100)
 * @returns Hex color string
 */
export function getScoreBadgeHexColor(score: number): string {
  const s = Math.round(score);

  if (s >= 91) {
    return "#059669"; // emerald-600 - All-Time
  } else if (s >= 76) {
    return "#16a34a"; // green-600 - Firing
  } else if (s >= 60) {
    return "#84cc16"; // lime-500 - Go Surf
  } else if (s >= 40) {
    return "#eab308"; // yellow-500 - Worth a Look
  } else {
    return "#ef4444"; // red-500 - Don't Bother (0-39)
  }
}

/**
 * Get text color hex for badge (for inline styles)
 * Returns white or black based on background for contrast
 * - Black text for: Go Surf (lime), Worth a Look (yellow)
 * - White text for: All others (dark backgrounds)
 *
 * @param score - Quality score (0-100)
 * @returns Hex color string (white or black)
 */
export function getScoreBadgeTextHexColor(score: number): string {
  const s = Math.round(score);

  // Black text for light backgrounds (lime, yellow): 40-75
  if (s >= 40 && s <= 75) {
    return "#000000"; // Go Surf (lime) and Worth a Look (yellow)
  } else {
    return "#ffffff"; // White text for all other backgrounds
  }
}
