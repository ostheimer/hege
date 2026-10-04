CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE TABLE "revier_map_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"revier_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"saved_at" timestamp with time zone NOT NULL,
	"changed_by_membership_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "revier_map_versions" ADD CONSTRAINT "revier_map_versions_revier_id_reviere_id_fk" FOREIGN KEY ("revier_id") REFERENCES "public"."reviere"("id") ON DELETE no action ON UPDATE no action;
