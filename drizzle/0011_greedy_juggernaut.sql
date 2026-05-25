CREATE TABLE `email_campaign_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_campaign_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdBy` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`htmlContent` longtext NOT NULL,
	`replyTo` varchar(320),
	`recipients` longtext NOT NULL,
	`intervalMinutes` int NOT NULL DEFAULT 2,
	`status` enum('draft','scheduled','running','completed','cancelled') NOT NULL DEFAULT 'draft',
	`scheduleCronTaskUid` varchar(65),
	`totalRecipients` int NOT NULL DEFAULT 0,
	`sentCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_campaign_id` ON `email_campaign_logs` (`campaignId`);--> statement-breakpoint
CREATE INDEX `idx_recipient` ON `email_campaign_logs` (`recipient`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `email_campaign_logs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_created_by` ON `email_campaigns` (`createdBy`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `email_campaigns` (`status`);--> statement-breakpoint
CREATE INDEX `idx_schedule_cron_task_uid` ON `email_campaigns` (`scheduleCronTaskUid`);