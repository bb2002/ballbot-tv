CREATE TABLE `recordings` (
	`id` text PRIMARY KEY NOT NULL,
	`streamer_id` text NOT NULL,
	`stream_id` text,
	`title` text NOT NULL,
	`description` text,
	`video_key` text NOT NULL,
	`thumbnail_key` text,
	`duration` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`streamer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stream_id`) REFERENCES `streams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recordings_streamer_idx` ON `recordings` (`streamer_id`);