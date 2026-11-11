CREATE TABLE `exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`muscle_group` text DEFAULT 'other' NOT NULL,
	`secondary_muscles` text,
	`equipment` text,
	`description` text,
	`image_urls` text,
	`image_files` text,
	`builtin_key` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_builtin_key_unique` ON `exercise` (`builtin_key`);--> statement-breakpoint
CREATE INDEX `exercise_userId_idx` ON `exercise` (`user_id`);--> statement-breakpoint
CREATE INDEX `exercise_muscleGroup_idx` ON `exercise` (`muscle_group`);--> statement-breakpoint
CREATE TABLE `program` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `program_userId_idx` ON `program` (`user_id`);--> statement-breakpoint
CREATE TABLE `program_block` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`title` text NOT NULL,
	`weekdays` text DEFAULT '[]' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `programBlock_programId_idx` ON `program_block` (`program_id`);--> statement-breakpoint
CREATE TABLE `program_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`block_id` text NOT NULL,
	`kind` text DEFAULT 'exercise' NOT NULL,
	`title` text,
	`exercise_id` text,
	`sets` integer,
	`reps` text,
	`weight` real,
	`unit` text DEFAULT 'kg',
	`notes` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`block_id`) REFERENCES `program_block`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `programEntry_blockId_idx` ON `program_entry` (`block_id`);--> statement-breakpoint
CREATE INDEX `programEntry_exerciseId_idx` ON `program_entry` (`exercise_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_training_exercise_record` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`item_id` text,
	`exercise_id` text,
	`sets` integer,
	`reps` text,
	`weight` real,
	`unit` text DEFAULT 'kg',
	`rpe` real,
	`rest_time` integer,
	`notes` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `training_activity`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `tree_element`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_training_exercise_record`("id", "activity_id", "item_id", "exercise_id", "sets", "reps", "weight", "unit", "rpe", "rest_time", "notes", "position", "created_at") SELECT "id", "activity_id", "item_id", NULL, "sets", "reps", "weight", "unit", "rpe", "rest_time", "notes", "position", "created_at" FROM `training_exercise_record`;--> statement-breakpoint
DROP TABLE `training_exercise_record`;--> statement-breakpoint
ALTER TABLE `__new_training_exercise_record` RENAME TO `training_exercise_record`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `trainingExerciseRecord_activityId_idx` ON `training_exercise_record` (`activity_id`);