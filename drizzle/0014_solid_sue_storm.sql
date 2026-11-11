PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoice` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`invoice_date` integer NOT NULL,
	`due_date` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`payment_mode` text DEFAULT 'Bank transfer / Check',
	`payment_conditions` text DEFAULT '30% upfront, balance on delivery',
	`notes` text,
	`show_tva_stamp` integer DEFAULT true NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`tva_amount` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`year` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `invoice_client`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_invoice`("id", "user_id", "client_id", "invoice_number", "invoice_date", "due_date", "status", "payment_mode", "payment_conditions", "notes", "show_tva_stamp", "subtotal", "tva_amount", "total", "year", "created_at", "updated_at") SELECT "id", "user_id", "client_id", "invoice_number", "invoice_date", "due_date", "status", "payment_mode", "payment_conditions", "notes", "show_tva_stamp", "subtotal", "tva_amount", "total", "year", "created_at", "updated_at" FROM `invoice`;--> statement-breakpoint
DROP TABLE `invoice`;--> statement-breakpoint
ALTER TABLE `__new_invoice` RENAME TO `invoice`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `invoice_userId_idx` ON `invoice` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_userId_number_unique` ON `invoice` (`user_id`,`invoice_number`);--> statement-breakpoint
CREATE INDEX `invoice_clientId_idx` ON `invoice` (`client_id`);--> statement-breakpoint
CREATE INDEX `invoice_year_idx` ON `invoice` (`year`);--> statement-breakpoint
CREATE INDEX `invoice_status_idx` ON `invoice` (`status`);