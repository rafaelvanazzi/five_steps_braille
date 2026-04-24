CREATE TABLE `forum_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`namePt` varchar(128) NOT NULL,
	`nameEn` varchar(128) NOT NULL,
	`nameEs` varchar(128) NOT NULL,
	`descriptionPt` text,
	`descriptionEn` text,
	`descriptionEs` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forum_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `forum_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `forum_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topicId` int NOT NULL,
	`userId` int NOT NULL,
	`body` text NOT NULL,
	`hidden` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forum_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forum_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`pinned` boolean NOT NULL DEFAULT false,
	`hidden` boolean NOT NULL DEFAULT false,
	`lastPostAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forum_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_display_names` (
	`userId` int NOT NULL,
	`displayName` varchar(64) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_display_names_userId` PRIMARY KEY(`userId`)
);
