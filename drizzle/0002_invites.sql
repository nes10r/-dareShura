CREATE TABLE "invites" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_id" text;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invites_expires_idx" ON "invites" USING btree ("expires_at");