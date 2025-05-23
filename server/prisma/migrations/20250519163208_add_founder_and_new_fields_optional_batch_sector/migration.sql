/*
  Warnings:

  - The values [UNKNOWN] on the enum `CompanyStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `industry` on the `Company` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CompanyStatus_new" AS ENUM ('WATCHING', 'ENGAGED', 'INVESTED', 'PASSED', 'NEW', 'ACTIVE', 'ACQUIRED', 'INACTIVE', 'CLOSED', 'STEALTH', 'legacy_unknown');
ALTER TABLE "Company" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Company" ALTER COLUMN "status" TYPE "CompanyStatus_new" USING ("status"::text::"CompanyStatus_new");
ALTER TYPE "CompanyStatus" RENAME TO "CompanyStatus_old";
ALTER TYPE "CompanyStatus_new" RENAME TO "CompanyStatus";
DROP TYPE "CompanyStatus_old";
ALTER TABLE "Company" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "industry",
ADD COLUMN     "businessModel" TEXT,
ADD COLUMN     "developmentStage" TEXT,
ADD COLUMN     "lastMeetingDate" TIMESTAMP(3),
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "metWith" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "oneLiner" TEXT,
ADD COLUMN     "productStatus" TEXT,
ADD COLUMN     "sector" TEXT,
ALTER COLUMN "status" SET DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "Founder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "linkedIn" TEXT,
    "background" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Founder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Founder_companyId_idx" ON "Founder"("companyId");

-- AddForeignKey
ALTER TABLE "Founder" ADD CONSTRAINT "Founder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
