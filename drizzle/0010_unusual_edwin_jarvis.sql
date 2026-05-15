CREATE TABLE `braille_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`contentBraille` longtext,
	`contentText` longtext,
	`contentMusicXml` longtext,
	`language` enum('pt','en','es') NOT NULL DEFAULT 'pt',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `braille_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `country` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `countryCode` varchar(4);--> statement-breakpoint
ALTER TABLE `users` ADD `regionName` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(100);