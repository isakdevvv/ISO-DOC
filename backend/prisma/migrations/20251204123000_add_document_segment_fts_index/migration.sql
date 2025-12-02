-- Adds a GIN index to accelerate PostgreSQL full-text search over document segments
CREATE INDEX IF NOT EXISTS "DocumentSegment_content_tsv_idx"
ON "DocumentSegment" USING GIN (to_tsvector('simple', coalesce("content", '')));
