import { PrismaClient } from "@repo/db";
import { Kafka } from "kafkajs";
const TopicName =  "zap-events";
const prisma = new PrismaClient();
async function main() {
    const kafka = new Kafka({
        clientId: "outbox-processor",
        brokers: ["localhost:9092"],
    });

const producer = kafka.producer();
await producer.connect();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let consecutiveFailures = 0;



while (true) {
  try {
    const pendingRows = await prisma.zapRunOutbox.findMany({
      take: 10,
      orderBy: { id: "asc" },
    });

    if (pendingRows.length === 0) {
      consecutiveFailures = 0;
      await sleep(2000);
      continue;
    }

    console.log(`processor: publishing ${pendingRows.length} zap run(s) to Kafka`, pendingRows.map((row) => row.zapRunId));

    await producer.send({
      topic: TopicName,
      messages: pendingRows.map((row) => ({ value: row.zapRunId })),
    });

    console.log(`processor: published ${pendingRows.length} zap run(s), deleting from outbox`);

    await prisma.zapRunOutbox.deleteMany({
      where: { id: { in: pendingRows.map((r) => r.id) } },
    });

    consecutiveFailures = 0;
    await sleep(200);
  } catch (err) {
    consecutiveFailures += 1;
    const backoffMs = Math.min(30_000, 500 * 2 ** Math.min(consecutiveFailures, 6));
    console.error("processor loop error:", err);
    await sleep(backoffMs);
  }
}

}

main().catch((err) => {
  console.error("processor fatal error:", err);
  process.exitCode = 1;
});

