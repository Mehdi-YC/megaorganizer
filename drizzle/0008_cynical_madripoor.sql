ALTER TABLE `invoice` ADD `payment_mode` text DEFAULT 'Virement bancaire / Chèque';--> statement-breakpoint
ALTER TABLE `invoice` ADD `payment_conditions` text DEFAULT '30% au démarrage, le solde à la livraison';--> statement-breakpoint
ALTER TABLE `user` ADD `rib` text;