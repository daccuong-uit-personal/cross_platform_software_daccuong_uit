-- Add mention_ranges metadata to comments
ALTER TABLE "comments"
ADD COLUMN "mention_ranges" JSONB;
