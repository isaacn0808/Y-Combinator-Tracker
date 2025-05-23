/*
  Warnings:

  - Made the column `description` on table `Company` required. This step will fail if there are existing NULL values in that column.
  - Made the column `foundedDate` on table `Company` required. This step will fail if there are existing NULL values in that column.
  - Made the column `businessModel` on table `Company` required. This step will fail if there are existing NULL values in that column.
  - Made the column `oneLiner` on table `Company` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Company" ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "foundedDate" SET NOT NULL,
ALTER COLUMN "businessModel" SET NOT NULL,
ALTER COLUMN "oneLiner" SET NOT NULL;
