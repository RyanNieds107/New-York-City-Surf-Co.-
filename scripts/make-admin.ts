#!/usr/bin/env node
/**
 * Set a user's role to admin by email.
 * Requires DATABASE_URL or MYSQL_URL in .env.
 *
 * Usage: pnpm tsx scripts/make-admin.ts your@email.com
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getDb, getUserByEmail } from "../server/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: pnpm tsx scripts/make-admin.ts <email>");
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("Database not available. Set MYSQL_URL or DATABASE_URL in .env");
    process.exit(1);
  }

  const user = await getUserByEmail(email);
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  if (user.role === "admin") {
    console.log(`${email} is already an admin.`);
    return;
  }

  await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
  console.log(`✓ ${email} is now an admin.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
