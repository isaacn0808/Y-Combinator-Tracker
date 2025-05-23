-- CreateIndex
CREATE INDEX "Metric_companyId_name_idx" ON "Metric"("companyId", "name");

-- CreateIndex
CREATE INDEX "Metric_dateRecorded_idx" ON "Metric"("dateRecorded");
