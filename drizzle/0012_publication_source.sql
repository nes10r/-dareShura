ALTER TABLE "user_publications" ADD COLUMN "source_id" text;--> statement-breakpoint
CREATE INDEX "user_publications_source_idx" ON "user_publications" USING btree ("source_id");