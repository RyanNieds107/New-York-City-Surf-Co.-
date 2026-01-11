#!/usr/bin/env node
/**
 * Setup script to add JWT_SECRET to .env file
 * 
 * This script will:
 * 1. Check if .env file exists, create it if it doesn't
 * 2. Check if JWT_SECRET already exists in .env
 * 3. Add JWT_SECRET if it's missing
 * 
 * Usage: tsx scripts/setup-env.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const envPath = join(rootDir, ".env");

const JWT_SECRET = "b33162d605035178dc4163b06b38334662f5ffd829433043df8edf4bc13d01f7";

function main() {
  console.log("🔧 Setting up .env file...\n");

  // Check if .env exists
  let envContent = "";
  if (existsSync(envPath)) {
    console.log("✓ Found existing .env file");
    envContent = readFileSync(envPath, "utf-8");
  } else {
    console.log("⚠ .env file not found, creating new one...");
  }

  // Check if JWT_SECRET already exists
  const jwtSecretRegex = /^JWT_SECRET=.*$/m;
  if (jwtSecretRegex.test(envContent)) {
    console.log("✓ JWT_SECRET already exists in .env file");
    console.log("  (Skipping to avoid overwriting existing value)\n");
    
    // Show current value (masked for security)
    const match = envContent.match(jwtSecretRegex);
    if (match) {
      const currentValue = match[0].split("=")[1]?.trim() || "";
      if (currentValue.length > 0) {
        const masked = currentValue.substring(0, 8) + "..." + currentValue.substring(currentValue.length - 8);
        console.log(`  Current value: ${masked}`);
      }
    }
    return;
  }

  // Add JWT_SECRET to .env
  const lines = envContent.split("\n").filter(line => line.trim() !== "");
  
  // Add JWT_SECRET at the top if file is empty, or after any comments at the top
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("#")) {
      insertIndex = i + 1;
    } else {
      break;
    }
  }

  // If no comments, add a header comment
  if (insertIndex === 0 && lines.length === 0) {
    lines.push("# JWT Secret for session token signing and verification");
  }

  lines.splice(insertIndex, 0, `JWT_SECRET=${JWT_SECRET}`);
  
  // Ensure file ends with newline
  const newContent = lines.join("\n") + "\n";
  
  writeFileSync(envPath, newContent, "utf-8");
  console.log("✓ Added JWT_SECRET to .env file");
  console.log("✓ JWT_SECRET configured for local development\n");
  console.log("✅ Setup complete! You can now login locally.\n");
}

main();
