/**
 * Tide Phase Adjustment for Wave Height
 * 
 * Simplified tide adjustment based on phase:
 * - High/rising tide = fatter waves = -0.5ft
 * - Low/falling tide = hollower, steeper waves = +0.5ft
 */

/**
 * Get tide nudge adjustment based on tide phase
 * 
 * @param tidePhase - Tide phase: 'high', 'low', 'rising', 'falling', or null
 * @returns Adjustment in feet (+0.5 for hollow, -0.5 for fat, 0 if no data)
 */
export function getTideNudge(tidePhase: string | null): number {
  if (!tidePhase) return 0;
  
  // High/rising tide = fatter waves = -0.5ft
  if (tidePhase === 'high' || tidePhase === 'rising') {
    return -0.5;
  }
  
  // Low/falling tide = hollower waves = +0.5ft
  if (tidePhase === 'low' || tidePhase === 'falling') {
    return 0.5;
  }
  
  return 0;
}
