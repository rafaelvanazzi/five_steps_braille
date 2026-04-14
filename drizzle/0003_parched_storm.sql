ALTER TABLE `materials` ADD `materialType` enum('partitura','atividade') DEFAULT 'atividade' NOT NULL;--> statement-breakpoint
ALTER TABLE `materials` ADD `creatorVision` enum('vidente','pdv') DEFAULT 'vidente' NOT NULL;--> statement-breakpoint
ALTER TABLE `materials` ADD `creatorName` varchar(255);