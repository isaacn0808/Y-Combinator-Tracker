/*
  Warnings:

  - The values [EMAIL_RECEIVED,EMAIL_SENT,CALL_LOGGED,MEETING_NOTES] on the enum `InteractionType` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `website` on table `Company` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ycBatch` on table `Company` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sector` on table `Company` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InteractionType_new" AS ENUM ('EMAIL', 'MEETING', 'CALL', 'DEMO', 'YC_APPLICATION_REVIEW', 'GENERAL_NOTE', 'OTHER');
ALTER TABLE "Interaction" ALTER COLUMN "type" TYPE "InteractionType_new" USING ("type"::text::"InteractionType_new");
ALTER TYPE "InteractionType" RENAME TO "InteractionType_old";
ALTER TYPE "InteractionType_new" RENAME TO "InteractionType";
DROP TYPE "InteractionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Company" ALTER COLUMN "website" SET NOT NULL,
ALTER COLUMN "ycBatch" SET NOT NULL,
ALTER COLUMN "sector" SET NOT NULL;
