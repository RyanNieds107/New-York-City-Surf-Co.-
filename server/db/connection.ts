import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;
let _windGustsKtsColumnExists: boolean | null = null; // Cache column existence check

// Check if windGustsKts column exists in the database
export async function checkWindGustsKtsColumnExists(): Promise<boolean> {
  if (_windGustsKtsColumnExists !== null) {
    return _windGustsKtsColumnExists; // Return cached result
  }

  try {
    const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      console.warn('[checkWindGustsKtsColumnExists] No database URL, assuming column does not exist');
      _windGustsKtsColumnExists = false;
      return false;
    }

    const connection = await mysql.createConnection(dbUrl);
    const [rows] = await connection.execute(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forecast_points' AND COLUMN_NAME = 'windGustsKts'`
    );
    await connection.end();

    const count = (rows as any[])[0]?.count ?? 0;
    _windGustsKtsColumnExists = count > 0;
    console.log(`[checkWindGustsKtsColumnExists] Column windGustsKts exists: ${_windGustsKtsColumnExists}`);
    return _windGustsKtsColumnExists;
  } catch (error: any) {
    console.warn('[checkWindGustsKtsColumnExists] Error checking column existence:', error.message);
    _windGustsKtsColumnExists = false;
    return false;
  }
}

// Retry helper for database connections during Railway startup
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelayMs: number = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isConnectionError =
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('connect ETIMEDOUT');

      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }

      const delay = initialDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`[Database] Connection attempt ${attempt}/${maxRetries} failed (${error.code || error.message}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  // Prioritize internal Railway URL first for better reliability
  // MYSQL_URL points to mysql.railway.internal (faster, more reliable, internal network)
  // DATABASE_URL is the external proxy (turntable.proxy.rlwy.net) which can timeout
  const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

  if (!_db && dbUrl) {
    await retryWithBackoff(async () => {
      // Create a connection pool with proper configuration for Railway
      // mysql2 createPool can accept a connection string as first argument with options as second
      _pool = mysql.createPool(dbUrl, {
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        // Connection timeout settings
        connectTimeout: 60000, // 60 seconds - allows Railway internal network to be ready
        acquireTimeout: 60000, // 60 seconds for acquiring connection from pool
      });

      // Test the connection immediately to catch connection issues early
      const testConnection = await _pool.getConnection();
      await testConnection.ping();
      testConnection.release();

      _db = drizzle(_pool);

      // Log which URL type is being used for debugging
      const urlType = dbUrl.includes('internal') || dbUrl.includes('.railway.internal')
        ? 'Internal Railway URL'
        : dbUrl.includes('proxy.rlwy.net')
          ? 'External Railway Proxy'
          : 'Custom URL';
      console.log(`[Database] Connection pool created successfully (${urlType})`);

      // Run auto-migrations for new columns
      await runAutoMigrations(_pool);
    }, 5, 2000); // 5 retries, starting with 2 second delay
  }
  return _db;
}

/**
 * Auto-migrations: Add new columns to existing tables if they don't exist.
 * This allows schema changes without manual database intervention.
 */
async function runAutoMigrations(pool: mysql.Pool): Promise<void> {
  try {
    const connection = await pool.getConnection();

    // Check if swellPeriodS column exists in stormglass_verification
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'stormglass_verification' AND COLUMN_NAME = 'swellPeriodS'`
    ) as any[];

    if (columns.length === 0) {
      console.log("[Migration] Adding swellPeriodS and swellDirectionDeg columns to stormglass_verification...");
      await connection.query(
        `ALTER TABLE stormglass_verification
         ADD COLUMN swellPeriodS INT NULL,
         ADD COLUMN swellDirectionDeg INT NULL`
      );
      console.log("[Migration] Columns added successfully");
    }

    connection.release();
  } catch (error: any) {
    // Don't fail startup if migration fails - log and continue
    console.warn("[Migration] Auto-migration warning:", error.message);
  }
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}
