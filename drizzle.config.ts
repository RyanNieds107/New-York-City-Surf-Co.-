import { defineConfig } from "drizzle-kit";

// Prioritize internal Railway URL first for better reliability
const connectionString = process.env.MYSQL_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands. Available env vars: " + Object.keys(process.env).filter(k => k.includes('SQL') || k.includes('DB')).join(', '));
}

export default defineConfig({
  schema: "./drizzle/schema/index.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
