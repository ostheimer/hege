CREATE TABLE "revier_maps" (
	"revier_id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "revier_maps" ADD CONSTRAINT "revier_maps_revier_id_reviere_id_fk" FOREIGN KEY ("revier_id") REFERENCES "public"."reviere"("id") ON DELETE no action ON UPDATE no action;