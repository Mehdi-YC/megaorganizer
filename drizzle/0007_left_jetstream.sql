CREATE TABLE `invoice` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`invoice_date` integer NOT NULL,
	`due_date` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`notes` text,
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
CREATE UNIQUE INDEX `invoice_invoice_number_unique` ON `invoice` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `invoice_userId_idx` ON `invoice` (`user_id`);--> statement-breakpoint
CREATE INDEX `invoice_clientId_idx` ON `invoice` (`client_id`);--> statement-breakpoint
CREATE INDEX `invoice_year_idx` ON `invoice` (`year`);--> statement-breakpoint
CREATE INDEX `invoice_status_idx` ON `invoice` (`status`);--> statement-breakpoint
CREATE TABLE `invoice_client` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`city` text,
	`wilaya` text,
	`country` text DEFAULT 'Algérie',
	`nif` text,
	`nis` text,
	`rc` text,
	`ai` text,
	`n_tva` text,
	`phone` text,
	`email` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoiceClient_userId_idx` ON `invoice_client` (`user_id`);--> statement-breakpoint
CREATE TABLE `invoice_line` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`product_id` text,
	`description` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_price` real DEFAULT 0 NOT NULL,
	`unit` text DEFAULT 'Unité(s)' NOT NULL,
	`tva_rate` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoice`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `invoice_product`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `invoiceLine_invoiceId_idx` ON `invoice_line` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `invoice_product` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`unit_price` real DEFAULT 0 NOT NULL,
	`unit` text DEFAULT 'Unité(s)' NOT NULL,
	`tva_rate` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoiceProduct_userId_idx` ON `invoice_product` (`user_id`);--> statement-breakpoint
CREATE TABLE `invoice_yearly_doc` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`year` integer NOT NULL,
	`doc_type` text NOT NULL,
	`original_name` text NOT NULL,
	`stored_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoiceYearlyDoc_userId_idx` ON `invoice_yearly_doc` (`user_id`);--> statement-breakpoint
CREATE INDEX `invoiceYearlyDoc_year_idx` ON `invoice_yearly_doc` (`year`);--> statement-breakpoint
ALTER TABLE `user` ADD `signature_url` text;--> statement-breakpoint
ALTER TABLE `user` ADD `stamp_url` text;--> statement-breakpoint
ALTER TABLE `user` ADD `brand_name` text;--> statement-breakpoint
ALTER TABLE `user` ADD `brand_tagline` text;--> statement-breakpoint
ALTER TABLE `user` ADD `address` text;--> statement-breakpoint
ALTER TABLE `user` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `user` ADD `nif` text;--> statement-breakpoint
ALTER TABLE `user` ADD `anae` text;--> statement-breakpoint
ALTER TABLE `user` ADD `rc` text;--> statement-breakpoint
ALTER TABLE `user` ADD `nis` text;--> statement-breakpoint
ALTER TABLE `user` ADD `ai` text;