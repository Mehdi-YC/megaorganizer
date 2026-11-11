CREATE INDEX `reminder_userId_dueAt_idx` ON `reminder` (`user_id`,`due_at`);--> statement-breakpoint
CREATE INDEX `todo_userId_dueDate_idx` ON `todo` (`user_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `todo_userId_completed_idx` ON `todo` (`user_id`,`completed`);--> statement-breakpoint
CREATE INDEX `trainingSession_userId_startedAt_idx` ON `training_session` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `treeElement_userId_updatedAt_idx` ON `tree_element` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `treeElement_userId_type_idx` ON `tree_element` (`user_id`,`type`);