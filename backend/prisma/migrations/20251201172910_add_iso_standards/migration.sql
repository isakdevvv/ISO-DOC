-- CreateTable
CREATE TABLE "IsoStandard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "filePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "standardId" TEXT,
    "publicationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsoStandard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsoStandardChunk" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "clauseNumber" TEXT,
    "isoStandardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IsoStandardChunk_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IsoStandardChunk" ADD CONSTRAINT "IsoStandardChunk_isoStandardId_fkey" FOREIGN KEY ("isoStandardId") REFERENCES "IsoStandard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
