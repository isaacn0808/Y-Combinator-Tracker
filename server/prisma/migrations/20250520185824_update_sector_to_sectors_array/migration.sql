/*
  Warnings:

  - You are about to drop the column `sector` on the `Company` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Company" DROP COLUMN "sector",
ADD COLUMN     "sectors" TEXT[],
ALTER COLUMN "website" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;
