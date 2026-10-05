CREATE TABLE "app_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conferences" (
	"id" text PRIMARY KEY NOT NULL,
	"source_url" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"image" text,
	"published_at" timestamp with time zone NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"deadline" timestamp with time zone,
	"deadlines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"format" text,
	"location" text,
	"fee" text,
	"fee_note" text,
	"overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conferences_source_url_unique" UNIQUE("source_url")
);
--> statement-breakpoint
CREATE INDEX "conferences_starts_idx" ON "conferences" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "conferences_published_idx" ON "conferences" USING btree ("published_at");