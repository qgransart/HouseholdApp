ALTER TABLE "households" ADD COLUMN "settings" jsonb DEFAULT '{"duel":false}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "notification_prefs" jsonb DEFAULT '{"morning":true,"morningTime":"08:00","evening":true,"eveningTime":"19:00","alerts":true}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "rewards" ADD COLUMN "emoji" text DEFAULT '🎁' NOT NULL;--> statement-breakpoint
ALTER TABLE "rewards" ADD COLUMN "unlock" text;