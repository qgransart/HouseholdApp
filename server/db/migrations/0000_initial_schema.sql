CREATE SEQUENCE "public"."sync_rev" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"rev" bigint DEFAULT nextval('sync_rev') NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"owner_member_id" uuid NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "completions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"rev" bigint DEFAULT nextval('sync_rev') NOT NULL,
	"task_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"xp" integer NOT NULL,
	"coins" integer NOT NULL,
	"is_help" boolean NOT NULL,
	"undone_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"rev" bigint DEFAULT nextval('sync_rev') NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"target_member_id" uuid NOT NULL,
	"created_by_member_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by_email" text
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"rev" bigint DEFAULT nextval('sync_rev') NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"daily_budget_min" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"rev" bigint DEFAULT nextval('sync_rev') NOT NULL,
	"reward_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"cost" integer NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL,
	"honored_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"rev" bigint DEFAULT nextval('sync_rev') NOT NULL,
	"completion_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"rev" bigint DEFAULT nextval('sync_rev') NOT NULL,
	"name" text NOT NULL,
	"cost" integer NOT NULL,
	"kind" text NOT NULL,
	"active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"rev" bigint DEFAULT nextval('sync_rev') NOT NULL,
	"task_id" uuid NOT NULL,
	"raised_by" uuid,
	"raised_at" timestamp with time zone NOT NULL,
	"is_automatic" boolean NOT NULL,
	"resolved_by_completion_id" uuid
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"rev" bigint DEFAULT nextval('sync_rev') NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"size" text NOT NULL,
	"duration_min" integer NOT NULL,
	"interval_days" integer,
	"weekly_quota" integer,
	"max_delay_days" integer,
	"signal_label" text,
	"active" boolean NOT NULL,
	"snoozed_until" date,
	"baseline_on" date
);
--> statement-breakpoint
CREATE TABLE "vacations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"rev" bigint DEFAULT nextval('sync_rev') NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completions" ADD CONSTRAINT "completions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacations" ADD CONSTRAINT "vacations_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_household_rev_idx" ON "categories" USING btree ("household_id","rev");--> statement-breakpoint
CREATE INDEX "completions_household_rev_idx" ON "completions" USING btree ("household_id","rev");--> statement-breakpoint
CREATE INDEX "households_rev_idx" ON "households" USING btree ("rev");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_code_hash_unique" ON "invitations" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "members_household_rev_idx" ON "members" USING btree ("household_id","rev");--> statement-breakpoint
CREATE UNIQUE INDEX "members_email_unique" ON "members" USING btree ("email");--> statement-breakpoint
CREATE INDEX "purchases_household_rev_idx" ON "purchases" USING btree ("household_id","rev");--> statement-breakpoint
CREATE INDEX "reactions_household_rev_idx" ON "reactions" USING btree ("household_id","rev");--> statement-breakpoint
CREATE INDEX "rewards_household_rev_idx" ON "rewards" USING btree ("household_id","rev");--> statement-breakpoint
CREATE INDEX "signals_household_rev_idx" ON "signals" USING btree ("household_id","rev");--> statement-breakpoint
CREATE INDEX "tasks_household_rev_idx" ON "tasks" USING btree ("household_id","rev");--> statement-breakpoint
CREATE INDEX "vacations_household_rev_idx" ON "vacations" USING btree ("household_id","rev");