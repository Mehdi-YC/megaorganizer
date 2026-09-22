CREATE TABLE `timer_step` (
	`id` text PRIMARY KEY NOT NULL,
	`timer_template_id` text NOT NULL,
	`parent_id` text,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`duration_sec` integer,
	`group_rounds` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`timer_template_id`) REFERENCES `timer_template`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `timer_step`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `timerStep_templateId_idx` ON `timer_step` (`timer_template_id`);--> statement-breakpoint
CREATE INDEX `timerStep_parentId_idx` ON `timer_step` (`parent_id`);--> statement-breakpoint
CREATE TABLE `timer_template` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`rounds` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `timerTemplate_userId_idx` ON `timer_template` (`user_id`);