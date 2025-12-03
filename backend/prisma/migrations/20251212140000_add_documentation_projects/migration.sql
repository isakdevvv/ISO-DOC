-- CreateEnum
CREATE TYPE "AttachmentCategory" AS ENUM ('MANUFACTURER_DOC', 'CHECKLIST', 'ORDER_DOC', 'OTHER');

-- CreateEnum
CREATE TYPE "GeneratedFileType" AS ENUM ('DOCX', 'PDF', 'MD', 'TXT', 'XLSX');

-- CreateEnum
CREATE TYPE "GeneratedFileSource" AS ENUM ('AI_GENERATED', 'USER_UPLOADED', 'COPIED');

-- AlterTable
ALTER TABLE "Project"
    ADD COLUMN "installerCompany" TEXT,
    ADD COLUMN "offerNumber" TEXT,
    ADD COLUMN "orderNumber" TEXT,
    ADD COLUMN "projectManager" TEXT,
    ADD COLUMN "projectNumber" TEXT,
    ADD COLUMN "siteAddress" TEXT,
    ADD COLUMN "siteName" TEXT;

-- CreateTable
CREATE TABLE "DocumentationAttachment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "category" "AttachmentCategory" NOT NULL,
    "description" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentationGeneratedFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileType" "GeneratedFileType" NOT NULL,
    "source" "GeneratedFileSource" NOT NULL,
    "description" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentationGeneratedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentationAttachment_projectId_idx" ON "DocumentationAttachment"("projectId");

-- CreateIndex
CREATE INDEX "DocumentationGeneratedFile_projectId_idx" ON "DocumentationGeneratedFile"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentationGeneratedFile_projectId_relativePath_key" ON "DocumentationGeneratedFile"("projectId", "relativePath");

-- AddForeignKey
ALTER TABLE "DocumentationAttachment" ADD CONSTRAINT "DocumentationAttachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentationGeneratedFile" ADD CONSTRAINT "DocumentationGeneratedFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
