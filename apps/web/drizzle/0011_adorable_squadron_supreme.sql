CREATE TABLE "platform_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"target_user_id" text,
	"target_membership_id" text,
	"impersonation_session_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_audit_log" ADD CONSTRAINT "platform_audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_audit_log" ADD CONSTRAINT "platform_audit_log_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_audit_actor_idx" ON "platform_audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "platform_audit_target_idx" ON "platform_audit_log" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "platform_audit_created_at_idx" ON "platform_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_impersonation_idx" ON "platform_audit_log" USING btree ("impersonation_session_id");--> statement-breakpoint
UPDATE "memberships"
SET "role" = 'platform-admin'
FROM "users"
WHERE "memberships"."user_id" = "users"."id"
  AND lower("users"."email") = 'andreas@ostheimer.at';
