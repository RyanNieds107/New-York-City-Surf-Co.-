interface SpotContextHeaderProps {
  headline: string;
  description?: string;
}

/**
 * Compact spot context tagline component.
 * Provides brief, factual context for each surf spot in a minimal design.
 */
export function SpotContextHeader({ headline }: SpotContextHeaderProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <div className="h-px flex-1 bg-gray-300" />
      <p
        className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-[0.2em] whitespace-nowrap"
        style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
      >
        {headline}
      </p>
      <div className="h-px flex-1 bg-gray-300" />
    </div>
  );
}

/**
 * Spot context content - factual, data-informed descriptions.
 * One sentence only. No marketing language or absolutes.
 * Explains why each spot behaves differently from nearby breaks.
 */
export const SPOT_CONTEXT: Record<string, { headline: string; description?: string }> = {
  "Lido Beach": {
    headline: "Long Island's Premier Beach Break",
  },
  "Long Beach": {
    headline: "New York's Most Accessible Surf",
  },
  "Rockaway Beach": {
    headline: "The Heart of the NYC Surf Scene",
  },
};
