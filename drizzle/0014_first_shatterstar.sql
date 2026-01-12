ALTER TABLE `forecast_points` ADD `windGustsKts` int;--> statement-breakpoint
ALTER TABLE `swell_alerts` ADD `lastNotifiedScore` int;--> statement-breakpoint
ALTER TABLE `users` ADD `smsOptIn` int DEFAULT 0;