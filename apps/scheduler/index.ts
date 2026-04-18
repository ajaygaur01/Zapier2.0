import "dotenv/config";
import Redis from "ioredis"
import {PrismaClient} from "@repo/db"
const prisma  = new PrismaClient()
import parser from "cron-parser";

const redis  = new Redis({
    host: "localhost",
    port:6379
})
// unique ID for this instance
// when running multiple instances each gets different ID

const INSTANCE_ID = `scheduler-${Date.now()}`
const LOCK_KEY = "scheduler:lock";
const LOCK_TTL_SECONDS = 55;
const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds

console.log(`Scheduler starting with instanceId: ${INSTANCE_ID}`);


//STEP A: Try to grab the Redis lock

async function acquirelock(): Promise <boolean> {

    const result = await redis.set(
        LOCK_KEY,
        INSTANCE_ID,
        "EX",// set Expiry
        LOCK_TTL_SECONDS,
        "NX"// only set if Not eXists
      );

// result is "OK" if we got the lock
// result is null if someone else has it
    return result === "OK";
}
// STEP B: Calculate next run time from cron

function getNextRunTime(cronExpression: string): Date {
    const interval = parser.parse(cronExpression, {
      currentDate: new Date(),
    });
    return interval.next().toDate();
  }
// STEP C: Main processing function  
async function processScheduledTriggers() {
    console.log(`[${INSTANCE_ID}] Checking for scheduled triggers...`);

    // try to get lock
    const hasLock = await acquirelock();

    if (!hasLock) {
        // another instance is running, skip this cycle
        console.log(`[${INSTANCE_ID}] Lock not acquired, skipping`);
        return;
    }

    console.log(`[${INSTANCE_ID}] Lock acquired, processing...`);

    try {
        const now = new Date();

        // find all triggers that are due
        const dueTriggers = await prisma.scheduledTrigger.findMany({
            where: {
                isActive: true,
                nextRunAt: {
                    lte: now    // less than or equal to now = overdue
                }
            }
        });

        console.log(`[${INSTANCE_ID}] Found ${dueTriggers.length} due triggers`);

        // process each one
        for (const trigger of dueTriggers) {
            try {
                await prisma.$transaction(async (tx) => {

                    // 1. create ZapRun (same as hooks service)
                    const zapRun = await tx.zapRun.create({
                        data: {
                            zapId: trigger.zapId,
                            metadata: {
                                triggeredBy: "scheduler",
                                scheduledAt: now.toISOString(),
                                cronExpression: trigger.cronExpression
                            }
                        }
                    });

                    // 2. create ZapRunOutbox (processor will pick this up)
                    await tx.zapRunOutbox.create({
                        data: {
                            zapRunId: zapRun.id
                        }
                    });

                    // 3. update this trigger's next run time
                    const nextRunAt = getNextRunTime(trigger.cronExpression);

                    await tx.scheduledTrigger.update({
                        where: { id: trigger.id },
                        data: {
                            lastRunAt: now,
                            nextRunAt: nextRunAt
                        }
                    });

                    console.log(
                        `[${INSTANCE_ID}] Triggered zapId: ${trigger.zapId}`,
                        `Next run: ${nextRunAt.toISOString()}`
                    );
                });

            } catch (error) {
                // if one zap fails, continue with others
                console.error(
                    `[${INSTANCE_ID}] Failed to trigger zapId: ${trigger.zapId}`,
                    error
                );
            }
        }

    } catch (error) {
        console.error(`[${INSTANCE_ID}] Error processing triggers:`, error);
    }
}

// ─────────────────────────────────────────
// STEP D: Start the scheduler loop
// ─────────────────────────────────────────
async function main() {
    console.log("Scheduler started");

    // run immediately on startup
    await processScheduledTriggers();

    // then run every 60 seconds
    setInterval(processScheduledTriggers, POLL_INTERVAL_MS);
}

// handle shutdown gracefully
process.on("SIGTERM", async () => {
    console.log("Shutting down scheduler");
    await redis.quit();
    await prisma.$disconnect();
    process.exit(0);
});

main().catch(console.error);