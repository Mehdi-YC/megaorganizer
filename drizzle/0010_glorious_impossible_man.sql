CREATE TABLE `todo` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`due_date` text,
	`due_time` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `todo_userId_idx` ON `todo` (`user_id`);--> statement-breakpoint
CREATE INDEX `todo_dueDate_idx` ON `todo` (`due_date`);--> statement-breakpoint
CREATE INDEX `todo_completed_idx` ON `todo` (`completed`);--> statement-breakpoint
ALTER TABLE `user_settings` ADD `enabled_features` text;