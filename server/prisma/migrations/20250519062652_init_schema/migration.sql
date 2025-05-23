-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'ACQUIRED', 'INACTIVE', 'CLOSED', 'STEALTH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('EMAIL_RECEIVED', 'EMAIL_SENT', 'CALL_LOGGED', 'MEETING_NOTES', 'YC_APPLICATION_REVIEW', 'GENERAL_NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "MetricName" AS ENUM ('MRR', 'ARR', 'USER_COUNT', 'CUSTOMER_COUNT', 'GROWTH_RATE_MOM', 'GROWTH_RATE_WOW', 'BURN_RATE', 'RUNWAY', 'FUNDING_TOTAL', 'VALUATION', 'OTHER');

-- CreateEnum
CREATE TYPE "EvaluationCategory" AS ENUM ('PROBLEM', 'SOLUTION', 'TEAM', 'MARKET_SIZE', 'BUSINESS_MODEL', 'TRACTION', 'COMPETITION', 'DIFFERENTIATION', 'INVESTMENT_POTENTIAL');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "ycBatch" TEXT,
    "description" TEXT,
    "industry" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'UNKNOWN',
    "foundedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" "MetricName" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "valueString" TEXT,
    "dateRecorded" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "notes" TEXT,
    "participants" TEXT[],
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "evaluationDate" TIMESTAMP(3) NOT NULL,
    "evaluator" TEXT,
    "overallNotes" TEXT,
    "problemScore" INTEGER,
    "solutionScore" INTEGER,
    "teamScore" INTEGER,
    "marketScore" INTEGER,
    "businessModelScore" INTEGER,
    "tractionScore" INTEGER,
    "competitionScore" INTEGER,
    "differentiationScore" INTEGER,
    "investmentPotentialScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpdateLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "source" TEXT,
    "userId" TEXT,

    CONSTRAINT "UpdateLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Evaluation_companyId_evaluationDate_idx" ON "Evaluation"("companyId", "evaluationDate");

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateLog" ADD CONSTRAINT "UpdateLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
