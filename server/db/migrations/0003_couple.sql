CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"rev" bigint DEFAULT nextval('sync_rev') NOT NULL,
	"task_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"claimed_on" date NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"trade_id" uuid
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"rev" bigint DEFAULT nextval('sync_rev') NOT NULL,
	"proposed_by" uuid NOT NULL,
	"proposed_to" uuid NOT NULL,
	"request_task_id" uuid NOT NULL,
	"offer_task_id" uuid,
	"coins" integer NOT NULL,
	"due_on" date NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "notification_prefs" SET DEFAULT '{"morning":true,"morningTime":"08:00","evening":true,"eveningTime":"19:00","alerts":true,"recap":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claims_household_rev_idx" ON "claims" USING btree ("household_id","rev");--> statement-breakpoint
CREATE INDEX "trades_household_rev_idx" ON "trades" USING btree ("household_id","rev");