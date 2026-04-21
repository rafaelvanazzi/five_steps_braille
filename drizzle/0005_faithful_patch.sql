CREATE TABLE `material_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialId` int NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` bigint,
	`mimeType` varchar(128),
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `material_files_id` PRIMARY KEY(`id`)
);
