CREATE TABLE "journal_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"journal_id" text,
	"journal_title" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"opens_at" timestamp with time zone,
	"deadline" timestamp with time zone,
	"topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_searches" (
	"key" text PRIMARY KEY NOT NULL,
	"results" jsonb NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journals" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"issn_l" text,
	"issn" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"publisher" text,
	"homepage" text,
	"is_oa" boolean DEFAULT false NOT NULL,
	"in_doaj" boolean DEFAULT false NOT NULL,
	"apc_usd" integer,
	"h_index" integer,
	"mean_citedness" text,
	"works_count" integer,
	"listed_in" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"calls_url" text,
	"scopus" jsonb,
	"speed" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_calls" ADD CONSTRAINT "journal_calls_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "journal_calls_deadline_idx" ON "journal_calls" USING btree ("deadline");