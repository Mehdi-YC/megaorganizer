DROP INDEX `invoice_invoice_number_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_userId_number_unique` ON `invoice` (`user_id`,`invoice_number`);