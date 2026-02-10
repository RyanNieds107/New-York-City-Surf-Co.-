// Barrel export for database layer
// Temporarily re-exports from the monolithic db.ts while we transition to layer-specific modules

// Phase 2 Status: Foundation complete (connection.ts + directory structure created)
// TODO: Split remaining 48 functions from db.ts into layer-specific modules:
//   - server/layers/environmental/db/environmental.db.ts (13 functions)
//   - server/layers/intelligence/db/intelligence.db.ts (4 functions)
//   - server/layers/social/db/social.db.ts (17 functions)
//   - server/layers/retention/db/retention.db.ts (14 functions)

// Connection management (already split)
export { getDb, checkWindGustsKtsColumnExists, closeDb } from './connection';

// Temporary: Re-export all functions from monolithic server/db.ts
// These will be moved to layer-specific modules in a future iteration
// For now, imports can use either 'server/db' or 'server/db/index' - both work
export {
  // User functions (Social layer - to be moved)
  upsertUser,
  getUserByOpenId,
  getUserById,
  getUserByEmail,

  // Spot functions (Environmental layer - to be moved)
  getAllSpots,
  getSpotById,
  createSpot,

  // Buoy functions (Environmental layer - to be moved)
  getLatestBuoyReading,
  insertBuoyReading,

  // Forecast functions (Intelligence layer - to be moved)
  getLatestForecastForSpot,
  getAllLatestForecasts,
  insertForecast,
  deleteForecastsBySpotId,

  // Crowd report functions (Social layer - to be moved)
  getRecentCrowdReports,
  getAverageCrowdLevel,
  insertCrowdReport,

  // Forecast point functions (Environmental layer - to be moved)
  insertForecastPoint,
  insertForecastPoints,
  getForecastTimeline,
  getLatestModelRunTime,
  isForecastDataStale,
  deleteForecastPointsBySpotAndModelRun,
  deleteForecastPointsBySpotOlderThan,
  deleteAllForecastPointsForSpot,

  // Swell alert functions (Retention layer - to be moved)
  getAllSwellAlertsForUser,
  getSwellAlertById,
  getAllActiveSwellAlerts,
  getAllSwellAlertsWithUsers,
  createSwellAlert,
  updateSwellAlert,
  deleteSwellAlert,
  updateAlertLastScore,
  getActiveAlertUserCount,
  checkIfAlertAlreadySent,
  logSwellAlertSent,
  updateSwellAlertLogEmailSent,
  updateSwellAlertLogSmsSent,
  getLastAlertNotificationTime,

  // Stormglass verification functions (Environmental layer - to be moved)
  upsertStormglassVerification,
  insertStormglassVerificationBatch,
  getStormglassVerification,
  getLatestStormglassFetchTime,

  // Forecast view functions (Social layer - to be moved)
  trackForecastView,
  getPendingReportPrompts,
  markPromptSent,

  // Surf report functions (Social layer - to be moved)
  insertSurfReport,
  findConditionsForSession,
  createSurfReportValidation,
  getReportsForSpot,
  getAverageCrowdFromSurfReports,
  getReportsForUser,
  getUserReportCount,
  getRecentReports,
} from '../db';
