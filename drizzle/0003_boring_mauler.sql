ALTER TABLE `sessions` MODIFY COLUMN `user_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_token_unique` UNIQUE(`token`);