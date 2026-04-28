CREATE TABLE `forum_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`emoji` enum('thumbsup','heart','bulb','music','hands','question') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forum_reactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_post_user_emoji` UNIQUE(`postId`,`userId`,`emoji`)
);
--> statement-breakpoint
CREATE TABLE `forum_topic_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topicId` int NOT NULL,
	`viewCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forum_topic_views_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_topic_view` UNIQUE(`topicId`)
);
