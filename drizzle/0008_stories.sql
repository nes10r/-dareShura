CREATE TABLE "stories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"bg" text DEFAULT 'brand' NOT NULL,
	"image_mime" text,
	"image_data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_views" (
	"story_id" text NOT NULL,
	"user_id" text NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stories_expires_idx" ON "stories" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "stories_user_idx" ON "stories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_views_uq" ON "story_views" USING btree ("story_id","user_id");