/*
  Warnings:

  - Added the required column `url` to the `FileVariant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IngestionJobType" AS ENUM ('NORMALIZE_FILE', 'EXTRACT_TEXT', 'BUILD_STRUCTURED', 'INDEX_EMBEDDINGS');

-- CreateEnum
CREATE TYPE "IngestionJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "originalUrl" TEXT,
ADD COLUMN     "uploadedBy" TEXT;

-- AlterTable
ALTER TABLE "FileVariant" ADD COLUMN     "url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "componentId" TEXT,
ADD COLUMN     "externalAccess" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "NodeApiKey" ADD COLUMN     "accessLevel" TEXT NOT NULL DEFAULT 'READ',
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "maxCallsPerDay" INTEGER;

-- AlterTable
ALTER TABLE "NodeRevision" ADD COLUMN     "newData" JSONB,
ADD COLUMN     "previousData" JSONB;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "tsValue" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "taskTemplateId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "agentSettings" JSONB;

-- CreateTable
CREATE TABLE "ComponentType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "defaultFacts" JSONB,
    "defaultMetadata" JSONB,
    "fields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "componentTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT,
    "serialNumber" TEXT,
    "manufacturer" TEXT,
    "installDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "facts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "nodeId" TEXT,
    "fileId" TEXT,
    "jobType" "IngestionJobType" NOT NULL DEFAULT 'NORMALIZE_FILE',
    "status" "IngestionJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "metadata" JSONB,
    "correlationId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComponentType_code_key" ON "ComponentType"("code");

-- CreateIndex
CREATE INDEX "Component_projectId_idx" ON "Component"("projectId");

-- CreateIndex
CREATE INDEX "Component_tenantId_idx" ON "Component"("tenantId");

-- CreateIndex
CREATE INDEX "Component_componentTypeId_idx" ON "Component"("componentTypeId");

-- CreateIndex
CREATE INDEX "IngestionJob_fileId_idx" ON "IngestionJob"("fileId");

-- CreateIndex
CREATE INDEX "IngestionJob_projectId_idx" ON "IngestionJob"("projectId");

-- CreateIndex
CREATE INDEX "IngestionJob_nodeId_idx" ON "IngestionJob"("nodeId");

-- CreateIndex
CREATE INDEX "Node_componentId_idx" ON "Node"("componentId");

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_componentTypeId_fkey" FOREIGN KEY ("componentTypeId") REFERENCES "ComponentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "TaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
