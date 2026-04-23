CREATE TABLE `event_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`country` varchar(100) NOT NULL,
	`instrument` varchar(100) NOT NULL,
	`brailleLevel` enum('none','basic','intermediate','advanced') NOT NULL,
	`isVisuallyImpaired` boolean NOT NULL DEFAULT false,
	`motivation` text,
	`waitlisted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_event_user` UNIQUE(`eventId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`eventDate` timestamp NOT NULL,
	`format` enum('online','presencial','hibrido') NOT NULL DEFAULT 'online',
	`targetAudience` enum('videntes','pdv','ambos') NOT NULL DEFAULT 'ambos',
	`maxSpots` int NOT NULL DEFAULT 100,
	`meetingLink` text,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`pastEventText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
