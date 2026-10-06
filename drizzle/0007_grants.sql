CREATE TABLE "grant_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"grant_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"required_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_size" integer,
	"respond_by" timestamp with time zone,
	"mode" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grant_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"matched_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "grants" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_url" text,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"image" text,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"deadline" timestamp with time zone,
	"amount" text,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "skills" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "grant_groups" ADD CONSTRAINT "grant_groups_grant_id_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grant_groups" ADD CONSTRAINT "grant_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grant_invitations" ADD CONSTRAINT "grant_invitations_group_id_grant_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."grant_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grant_invitations" ADD CONSTRAINT "grant_invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grant_groups_grant_idx" ON "grant_groups" USING btree ("grant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grant_invitations_group_user_uq" ON "grant_invitations" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "grant_invitations_user_idx" ON "grant_invitations" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "grants_published_idx" ON "grants" USING btree ("published_at");