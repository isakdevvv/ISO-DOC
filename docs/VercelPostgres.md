# Vercel Postgres Setup for Hybrid RAG

Use these steps to keep everything inside the Vercel/Neon stack while enabling both pgvector and PostgreSQL full-text search.

## 1. Provision the database
- In Vercel, create a **Vercel Postgres** database (backed by Neon) in an EU region.
- Copy the `DATABASE_URL` that Vercel provides; this is what the backend already expects.

## 2. Enable pgvector
1. Open the "Data" tab → "Connect" → "Open in Neon".
2. In the SQL editor run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
   This matches the `extensions = [vector]` line in `prisma/schema.prisma` and unlocks 1,536-dim embeddings for `DocumentSegment.embedding`.

## 3. Full-text search index
The Prisma migration `20251204123000_add_document_segment_fts_index` now creates the recommended GIN index automatically when you run `prisma migrate deploy`. If you ever need to recreate it manually, run:
```sql
CREATE INDEX IF NOT EXISTS "DocumentSegment_content_tsv_idx"
ON "DocumentSegment" USING GIN (to_tsvector('simple', coalesce("content", '')));
```

## 4. Environment variables
- `DATABASE_URL` – point to the Vercel Postgres instance.
- `RAG_ENABLE_LEXICAL` (default `true`) – flip to `false` if you want vector-only search.
- `RAG_HYBRID_VECTOR_WEIGHT` / `RAG_HYBRID_LEXICAL_WEIGHT` – tune how much weight each modality gets (defaults `0.65` / `0.35`).
- `RAG_FTS_DICTIONARY` – set to `simple`, `english`, `norwegian`, etc. to pick the dictionary Vercel Postgres should use for FTS normalization.

## 5. Deploy Prisma schema
After the DB is ready run migrations as usual:
```bash
cd backend
npx prisma migrate deploy
```
The ingestion/indexing pipeline will now push embeddings + text into Vercel Postgres, and the updated `RagService` will fan out hybrid (vector + lexical) queries without extra services.
