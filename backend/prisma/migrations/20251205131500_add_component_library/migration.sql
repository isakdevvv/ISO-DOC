-- Add tsValue to projects
ALTER TABLE "Project" ADD COLUMN "tsValue" DOUBLE PRECISION;

-- Component library tables
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

CREATE UNIQUE INDEX "ComponentType_code_key" ON "ComponentType"("code");

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
    CONSTRAINT "Component_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Component_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Component_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Component_componentTypeId_fkey" FOREIGN KEY ("componentTypeId") REFERENCES "ComponentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Component_projectId_idx" ON "Component"("projectId");
CREATE INDEX "Component_tenantId_idx" ON "Component"("tenantId");
CREATE INDEX "Component_componentTypeId_idx" ON "Component"("componentTypeId");

-- Link nodes and maintenance events to components
ALTER TABLE "Node" ADD COLUMN "componentId" TEXT;
CREATE INDEX "Node_componentId_idx" ON "Node"("componentId");
ALTER TABLE "Node" ADD CONSTRAINT "Node_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Refresh ingestion job enums
ALTER TYPE "IngestionJobType" RENAME TO "IngestionJobType_old";
CREATE TYPE "IngestionJobType" AS ENUM ('NORMALIZE_FILE', 'EXTRACT_TEXT', 'BUILD_STRUCTURED', 'INDEX_EMBEDDINGS');
ALTER TABLE "IngestionJob"
    ALTER COLUMN "jobType" TYPE "IngestionJobType"
    USING (
        CASE
            WHEN "jobType"::text = 'UPLOAD_ORIGINAL' THEN 'NORMALIZE_FILE'
            ELSE "jobType"::text
        END
    )::"IngestionJobType";
DROP TYPE "IngestionJobType_old";

ALTER TYPE "IngestionJobStatus" RENAME TO "IngestionJobStatus_old";
CREATE TYPE "IngestionJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
ALTER TABLE "IngestionJob"
    ALTER COLUMN "status" TYPE "IngestionJobStatus"
    USING (
        CASE
            WHEN "status"::text IN ('WAITING_UPLOAD', 'READY') THEN 'PENDING'
            ELSE "status"::text
        END
    )::"IngestionJobStatus";
DROP TYPE "IngestionJobStatus_old";

-- Column updates on ingestion jobs
ALTER TABLE "IngestionJob" RENAME COLUMN "payload" TO "metadata";
ALTER TABLE "IngestionJob" RENAME COLUMN "finishedAt" TO "completedAt";
ALTER TABLE "IngestionJob" DROP COLUMN "uploadUrl";
ALTER TABLE "IngestionJob" DROP COLUMN "checksum";
ALTER TABLE "IngestionJob" ADD COLUMN "correlationId" TEXT;

-- Index adjustments
DROP INDEX IF EXISTS "IngestionJob_tenantId_status_jobType_idx";
CREATE INDEX "IngestionJob_nodeId_idx" ON "IngestionJob"("nodeId");
