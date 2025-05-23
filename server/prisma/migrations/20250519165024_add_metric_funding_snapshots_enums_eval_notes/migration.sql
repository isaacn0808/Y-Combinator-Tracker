/*
  Warnings:

  - The `developmentStage` column on the `Company` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `productStatus` column on the `Company` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ProductStatusVal" AS ENUM ('pre-launch', 'BETA', 'LIVE');

-- CreateEnum
CREATE TYPE "DevelopmentStageVal" AS ENUM ('idea', 'mvp', 'pmf', 'growth', 'scale');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "funding_raised" TEXT,
ADD COLUMN     "funding_runway" TEXT,
ADD COLUMN     "funding_stage" TEXT,
ADD COLUMN     "funding_valuation" TEXT,
ADD COLUMN     "metrics_burnRate" TEXT,
ADD COLUMN     "metrics_growthRate" TEXT,
ADD COLUMN     "metrics_revenue" TEXT,
ADD COLUMN     "metrics_userCount" TEXT,
DROP COLUMN "developmentStage",
ADD COLUMN     "developmentStage" "DevelopmentStageVal",
DROP COLUMN "productStatus",
ADD COLUMN     "productStatus" "ProductStatusVal";

-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "businessModelNotes" TEXT,
ADD COLUMN     "competitionNotes" TEXT,
ADD COLUMN     "differentiationNotes" TEXT,
ADD COLUMN     "investmentPotentialNotes" TEXT,
ADD COLUMN     "marketNotes" TEXT,
ADD COLUMN     "problemNotes" TEXT,
ADD COLUMN     "solutionNotes" TEXT,
ADD COLUMN     "teamNotes" TEXT,
ADD COLUMN     "tractionNotes" TEXT;
