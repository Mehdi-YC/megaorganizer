CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`issuer` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_issuer_accountId_uidx` ON `account` (`issuer`,`account_id`);--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `attachment` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`page_id` text NOT NULL,
	`original_name` text NOT NULL,
	`stored_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `page`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attachment_userId_idx` ON `attachment` (`user_id`);--> statement-breakpoint
CREATE INDEX `attachment_pageId_idx` ON `attachment` (`page_id`);--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`icon_color` text,
	`accent_color` text,
	`background_color` text,
	`image_url` text,
	`collapsed` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `expense` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'DZD' NOT NULL,
	`description` text,
	`markdown` text,
	`tags` text,
	`spent_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `expense_userId_idx` ON `expense` (`user_id`);--> statement-breakpoint
CREATE INDEX `expense_spentAt_idx` ON `expense` (`spent_at`);--> statement-breakpoint
CREATE TABLE `page` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`icon_color` text,
	`accent_color` text,
	`background_color` text,
	`markdown` text,
	`image_url` text,
	`cover_image_url` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `page_categoryId_idx` ON `page` (`category_id`);--> statement-breakpoint
CREATE TABLE `reminder` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`markdown` text,
	`due_at` integer NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`snoozed_until` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `reminder_template`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminder_userId_idx` ON `reminder` (`user_id`);--> statement-breakpoint
CREATE INDEX `reminder_templateId_idx` ON `reminder` (`template_id`);--> statement-breakpoint
CREATE INDEX `reminder_dueAt_idx` ON `reminder` (`due_at`);--> statement-breakpoint
CREATE INDEX `reminder_completed_idx` ON `reminder` (`completed`);--> statement-breakpoint
CREATE TABLE `reminder_template` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`markdown` text,
	`icon` text DEFAULT 'fa-bell',
	`icon_color` text,
	`recurrence_type` text NOT NULL,
	`recurrence_config` text,
	`next_due_at` integer,
	`active` integer DEFAULT true NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminderTemplate_userId_idx` ON `reminder_template` (`user_id`);--> statement-breakpoint
CREATE INDEX `reminderTemplate_active_idx` ON `reminder_template` (`active`);--> statement-breakpoint
CREATE INDEX `reminderTemplate_nextDueAt_idx` ON `reminder_template` (`next_due_at`);--> statement-breakpoint
CREATE TABLE `reminder_template_todo` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`text` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `reminder_template`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminderTemplateTodo_templateId_idx` ON `reminder_template_todo` (`template_id`);--> statement-breakpoint
CREATE TABLE `reminder_todo` (
	`id` text PRIMARY KEY NOT NULL,
	`reminder_id` text NOT NULL,
	`text` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`reminder_id`) REFERENCES `reminder`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminderTodo_reminderId_idx` ON `reminder_todo` (`reminder_id`);--> statement-breakpoint
CREATE TABLE `roadmap` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roadmap_edge` (
	`id` text PRIMARY KEY NOT NULL,
	`roadmap_id` text NOT NULL,
	`source_id` text NOT NULL,
	`target_id` text NOT NULL,
	FOREIGN KEY (`roadmap_id`) REFERENCES `roadmap`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `roadmap_node`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `roadmap_node`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `roadmapEdge_roadmapId_idx` ON `roadmap_edge` (`roadmap_id`);--> statement-breakpoint
CREATE TABLE `roadmap_node` (
	`id` text PRIMARY KEY NOT NULL,
	`roadmap_id` text NOT NULL,
	`item_id` text,
	`label` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`x` real DEFAULT 0 NOT NULL,
	`y` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`roadmap_id`) REFERENCES `roadmap`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `tree_element`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `roadmapNode_roadmapId_idx` ON `roadmap_node` (`roadmap_id`);--> statement-breakpoint
CREATE TABLE `running_activity` (
	`activity_id` text PRIMARY KEY NOT NULL,
	`distance` real,
	`elapsed_duration` integer,
	`moving_duration` integer,
	`average_speed` real,
	`max_speed` real,
	`average_pace` real,
	`best_pace` real,
	`elevation_gain` real,
	`elevation_loss` real,
	FOREIGN KEY (`activity_id`) REFERENCES `training_activity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `running_track_point` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`altitude` real,
	`accuracy` real,
	`speed` real,
	`heading` real,
	FOREIGN KEY (`activity_id`) REFERENCES `running_activity`(`activity_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `runningTrackPoint_activityId_idx` ON `running_track_point` (`activity_id`);--> statement-breakpoint
CREATE INDEX `runningTrackPoint_sequence_idx` ON `running_track_point` (`sequence`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tag_userId_idx` ON `tag` (`user_id`);--> statement-breakpoint
CREATE TABLE `tier_list` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tier_list_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`tier_id` text NOT NULL,
	`item_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tier_id`) REFERENCES `tier_list_tier`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `tree_element`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tierListEntry_tierId_idx` ON `tier_list_entry` (`tier_id`);--> statement-breakpoint
CREATE TABLE `tier_list_tier` (
	`id` text PRIMARY KEY NOT NULL,
	`tier_list_id` text NOT NULL,
	`label` text NOT NULL,
	`color` text DEFAULT '#808080' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tier_list_id`) REFERENCES `tier_list`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tierListTier_tierListId_idx` ON `tier_list_tier` (`tier_list_id`);--> statement-breakpoint
CREATE TABLE `training_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`type` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `training_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trainingActivity_sessionId_idx` ON `training_activity` (`session_id`);--> statement-breakpoint
CREATE TABLE `training_activity_item` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`item_id` text NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `training_activity`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `tree_element`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trainingActivityItem_activityId_idx` ON `training_activity_item` (`activity_id`);--> statement-breakpoint
CREATE TABLE `training_exercise_record` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`item_id` text NOT NULL,
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
	FOREIGN KEY (`item_id`) REFERENCES `tree_element`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trainingExerciseRecord_activityId_idx` ON `training_exercise_record` (`activity_id`);--> statement-breakpoint
CREATE TABLE `training_session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration` integer,
	`source_page_id` text,
	`source_node_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_page_id`) REFERENCES `page`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_node_id`) REFERENCES `tree_element`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `trainingSession_userId_idx` ON `training_session` (`user_id`);--> statement-breakpoint
CREATE INDEX `trainingSession_startedAt_idx` ON `training_session` (`started_at`);--> statement-breakpoint
CREATE TABLE `tree_element` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`markdown` text,
	`image_url` text,
	`video_url` text,
	`external_url` text,
	`tags` text,
	`metadata` text,
	`ydk_data` text,
	`favorite` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `treeElement_userId_idx` ON `tree_element` (`user_id`);--> statement-breakpoint
CREATE INDEX `treeElement_type_idx` ON `tree_element` (`type`);--> statement-breakpoint
CREATE TABLE `tree_relationship` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_type` text NOT NULL,
	`parent_id` text NOT NULL,
	`child_type` text NOT NULL,
	`child_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `treeRelationship_parent_idx` ON `tree_relationship` (`parent_type`,`parent_id`);--> statement-breakpoint
CREATE INDEX `treeRelationship_child_idx` ON `tree_relationship` (`child_type`,`child_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`currency` text DEFAULT 'DZD' NOT NULL,
	`currency_rate` real DEFAULT 1 NOT NULL,
	`monthly_spending_limit` real,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_unique` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE INDEX `userSettings_userId_idx` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `ydk_deck` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ydk_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`section` text NOT NULL,
	`card_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `ydk_deck`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ydkEntry_deckId_idx` ON `ydk_entry` (`deck_id`);