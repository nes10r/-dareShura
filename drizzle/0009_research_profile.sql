CREATE TABLE "collab_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"topic" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"requester_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"work_id" text NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"venue" text,
	"doi" text,
	"url" text,
	"type" text,
	"cited_by" integer DEFAULT 0 NOT NULL,
	"open_access" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "orcid" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "scholar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "open_to_collab" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "openalex_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "research_stats" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pubs_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "collab_requests" ADD CONSTRAINT "collab_requests_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_requests" ADD CONSTRAINT "collab_requests_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_publications" ADD CONSTRAINT "user_publications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collab_requests_to_idx" ON "collab_requests" USING btree ("to_user_id","status");--> statement-breakpoint
CREATE INDEX "collab_requests_from_idx" ON "collab_requests" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "user_publications_user_idx" ON "user_publications" USING btree ("user_id","year");