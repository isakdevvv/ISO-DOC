-- Create enums for legal/source classification
CREATE TYPE "LegalClass" AS ENUM ('A', 'B', 'C');
CREATE TYPE "IngestionMode" AS ENUM ('FULLTEXT', 'FULLTEXT_INTERNAL_ONLY', 'METADATA_ONLY');

-- Add classification columns to files
ALTER TABLE "File"
    ADD COLUMN "legalClass" "LegalClass" NOT NULL DEFAULT 'A',
    ADD COLUMN "ingestionMode" "IngestionMode" NOT NULL DEFAULT 'FULLTEXT';
