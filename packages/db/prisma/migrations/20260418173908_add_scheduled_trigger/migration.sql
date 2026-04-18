-- AlterTable
ALTER TABLE "ZapRun" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "ScheduledTrigger" (
    "id" TEXT NOT NULL,
    "zapId" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledTrigger_zapId_key" ON "ScheduledTrigger"("zapId");

-- CreateIndex
CREATE INDEX "ScheduledTrigger_nextRunAt_isActive_idx" ON "ScheduledTrigger"("nextRunAt", "isActive");

-- AddForeignKey
ALTER TABLE "ScheduledTrigger" ADD CONSTRAINT "ScheduledTrigger_zapId_fkey" FOREIGN KEY ("zapId") REFERENCES "Zap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
