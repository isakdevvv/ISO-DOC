-- AlterTable
ALTER TABLE "File" ADD COLUMN     "isManufacturerDoc" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manufacturerName" TEXT,
ADD COLUMN     "productModel" TEXT;

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "kiuvaSignatures" JSONB,
ADD COLUMN     "kiuvaStatus" JSONB;
