ALTER TABLE "reviereinrichtungen" ADD COLUMN "orientation_degrees" double precision;--> statement-breakpoint
ALTER TABLE "reviereinrichtungen" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "reviereinrichtungen" ADD COLUMN "created_by_membership_id" text;--> statement-breakpoint
ALTER TABLE "reviereinrichtungen" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reviereinrichtungen" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reviereinrichtungen" ADD CONSTRAINT "reviereinrichtungen_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;
