CREATE TABLE `streams` (
	`id` text PRIMARY KEY NOT NULL,
	`streamer_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`is_public` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'live' NOT NULL,
	`agora_channel` text NOT NULL,
	`thumbnail_key` text,
	`viewer_count` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`streamer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `streams_agora_channel_unique` ON `streams` (`agora_channel`);--> statement-breakpoint
CREATE INDEX `streams_status_idx` ON `streams` (`status`);--> statement-breakpoint
CREATE INDEX `streams_streamer_idx` ON `streams` (`streamer_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`subscriber_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subscriber_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `subscriptions_unique_idx` ON `subscriptions` (`subscriber_id`,`channel_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`channel_name` text NOT NULL,
	`email` text NOT NULL,
	`profile_image_key` text,
	`is_verified` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);