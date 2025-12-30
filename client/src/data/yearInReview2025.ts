/**
 * 2025 Year in Review Data
 * Manual input of seasonal surfable days and notable swells
 * 
 * Surfable day definition: Wave height ≥ 2-3ft AND (offshore winds OR light onshore/sideshore < 8mph)
 */

export interface SeasonData {
  season: string;
  surfableDays: number;
  notableSwells: string[];
}

export const year2025Data: SeasonData[] = [
  {
    season: "Winter",
    surfableDays: 2, // Jan (1) + Feb (1)
    notableSwells: ["2/1 swell"]
  },
  {
    season: "Spring",
    surfableDays: 17, // Mar (6) + Apr (7) + May (4)
    notableSwells: [
      "Very solid S swell 3/17-3/18",
      "Solid east swell: 4/12 ESE swell (peaked at 6.8ft 8s 101d)",
      "5/22 ESE swell (peaked at 7ft at 7s)"
    ]
  },
  {
    season: "Summer",
    surfableDays: 5, // Jun (2) + Jul (0) + Aug (3)
    notableSwells: [
      "6/7 is a good example of a solid summer swell (3.4 ft 8 s)",
      "8/21-8/22 = Hurricane Erin - Major swell event"
    ]
  },
  {
    season: "Fall",
    surfableDays: 16, // Sep (5) + Oct (9) + Nov (2)
    notableSwells: [
      "9/30 - start of Hurricane xyz",
      "October 13/14 Noreaster produced big surf."
    ]
  }
];

