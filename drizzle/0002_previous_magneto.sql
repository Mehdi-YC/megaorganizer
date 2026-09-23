CREATE TABLE `wikilink` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`raw_target` text NOT NULL,
	`resolved_type` text,
	`resolved_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wikilink_source_idx` ON `wikilink` (`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `wikilink_resolved_idx` ON `wikilink` (`resolved_type`,`resolved_id`);--> statement-breakpoint
CREATE INDEX `wikilink_rawTarget_idx` ON `wikilink` (`raw_target`);--> statement-breakpoint
CREATE INDEX `wikilink_userId_idx` ON `wikilink` (`user_id`);