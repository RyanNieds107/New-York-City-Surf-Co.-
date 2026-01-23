CREATE TABLE `stormglass_verification` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spotId` int NOT NULL,
	`forecastTimestamp` timestamp NOT NULL,
	`waveHeightFt` decimal(4,1),
	`swellHeightFt` decimal(4,1),
	`source` varchar(16) NOT NULL DEFAULT 'ecmwf',
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stormglass_verification_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_spot_timestamp` UNIQUE(`spotId`,`forecastTimestamp`)
);
--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`identifier` varchar(320) NOT NULL,
	`token` varchar(64) NOT NULL,
	`expires` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `verification_tokens_token_unique` UNIQUE(`token`)
);
