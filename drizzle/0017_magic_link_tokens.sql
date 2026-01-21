-- Magic Link Verification Tokens Table
CREATE TABLE IF NOT EXISTS `verification_tokens` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `identifier` varchar(320) NOT NULL,
  `token` varchar(64) NOT NULL UNIQUE,
  `expires` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index on identifier for faster lookups by email
CREATE INDEX `idx_verification_tokens_identifier` ON `verification_tokens` (`identifier`);

-- Index on token for faster lookups during verification
CREATE INDEX `idx_verification_tokens_token` ON `verification_tokens` (`token`);
