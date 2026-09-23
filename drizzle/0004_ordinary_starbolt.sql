PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reminder` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text,
	`title` text NOT NULL,
	`description` text,
	`markdown` text,
	`due_at` integer NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`snoozed_until` integer,
	`notified_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `reminder_template`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_reminder`("id", "user_id", "template_id", "title", "description", "markdown", "due_at", "completed", "completed_at", "snoozed_until", "notified_at", "created_at", "updated_at") SELECT "id", "user_id", "template_id", "title", "description", "markdown", "due_at", "completed", "completed_at", "snoozed_until", "notified_at", "created_at", "updated_at" FROM `reminder`;--> statement-breakpoint
DROP TABLE `reminder`;--> statement-breakpoint
ALTER TABLE `__new_reminder` RENAME TO `reminder`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `reminder_userId_idx` ON `reminder` (`user_id`);--> statement-breakpoint
CREATE INDEX `reminder_templateId_idx` ON `reminder` (`template_id`);--> statement-breakpoint
CREATE INDEX `reminder_dueAt_idx` ON `reminder` (`due_at`);--> statement-breakpoint
CREATE INDEX `reminder_completed_idx` ON `reminder` (`completed`);