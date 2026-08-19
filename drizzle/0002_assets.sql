CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`mime` text NOT NULL,
	`name` text NOT NULL,
	`folder` text,
	`width` integer,
	`height` integer,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_url_unique` ON `assets` (`url`);--> statement-breakpoint
CREATE INDEX `idx_assets_folder` ON `assets` (`folder`);