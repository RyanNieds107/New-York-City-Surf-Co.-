interface SpotContextHeaderProps {
  headline: string;
  description: string;
}

/**
 * Standardized spot context header component.
 * Provides brief, factual context for each surf spot.
 *
 * Typography:
 * - Headline: Bebas Neue, 3xl-4xl, font-black, centered
 * - Description: Inter, lg-base, font-semibold, gray-700, left-aligned
 *
 * Layout:
 * - Gray background (gray-50)
 * - 2px black border
 * - 24px padding (p-6)
 * - 12px vertical spacing between headline and description (space-y-3)
 */
export function SpotContextHeader({ headline, description }: SpotContextHeaderProps) {
  return (
    <div className="bg-gray-50 border-2 border-black">
      <div className="p-6">
        <div className="space-y-3 text-center">
          <p
            className="text-3xl md:text-4xl font-black text-black leading-tight"
            style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}
          >
            {headline}
          </p>
          <p
            className="text-lg md:text-base font-semibold text-gray-700 leading-relaxed text-left"
            style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Spot context content - factual, data-informed descriptions.
 * One sentence only. No marketing language or absolutes.
 * Explains why each spot behaves differently from nearby breaks.
 */
export const SPOT_CONTEXT: Record<string, { headline: string; description: string }> = {
  "Lido Beach": {
    headline: "Long Island's Premier Beach Break",
    description: "Known for deeper offshore bathymetry and sandbars that produce slightly larger, hollower surf than nearby breaks."
  },
  "Long Beach": {
    headline: "New York's Most Accessible Surf",
    description: "Jetty-driven sandbars create consistent peaks that shift with tide and sand movement, offering rideable waves when other spots go flat."
  },
  "Rockaway Beach": {
    headline: "The Heart of the NYC Surf Scene",
    description: "Protected positioning and gradual offshore slope filter chop and favor longer-period swells, producing the cleanest conditions in the metro area."
  },
};
