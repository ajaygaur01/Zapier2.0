import "dotenv/config";
import { PrismaClient } from "@repo/db";
const prisma = new PrismaClient()
import { Kafka } from "kafkajs";
import { processZaprun } from "./processzap";
import Redis from "ioredis"
const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379
});
const TOPIC_NAME = "zap-events"
const kafka = new Kafka({
    clientId: "worker",
    brokers:[process.env.KAFKA_BROKER || "localhost:9092"]
})
const DLQ_TOPIC_NAME = "zap-events-dlq";
const MAX_RETRIES = 3;

async function main() {
const consumer  = kafka.consumer({groupId:"main-worker"})
await consumer.connect()
await consumer.subscribe({topic:TOPIC_NAME , fromBeginning:true})


//this producer is for dlq (dead letter queue) to reprocess failed messages later
const producer = kafka.producer();
await producer.connect();

await consumer.run({
    autoCommit:false,
    eachMessage: async({topic , partition , message}) => {
        const raw = message.value?.toString();
        const offset = (parseInt(message.offset) + 1).toString();

        if(!raw){
            console.warn("Received empty message, skipping and committing offset");
            await consumer.commitOffsets([{ topic, partition, offset }]);
            return;
        }
        let parsed;
        try{
            parsed = JSON.parse(raw);
        }catch(err){
            console.error("Failed to parse message value as JSON:", raw);
            await producer.send({
                topic: DLQ_TOPIC_NAME,
                messages: [{
                    value: JSON.stringify({
                        raw,
                        error: "Invalid JSON",
                        timestamp: new Date().toISOString(),
                    })
                }]
            });
            await consumer.commitOffsets([{ topic, partition, offset }]);
            return;
        }

        const { zapRunId, retryCount = 0 } = parsed;
        console.log("Received zapRunId:", zapRunId, "retryCount:", retryCount);

        if (!zapRunId) {
            console.warn("Empty zapRunId in message, moving to DLQ and committing offset");
            await producer.send({
                topic: DLQ_TOPIC_NAME,
                messages: [{
                    value: JSON.stringify({
                        raw: parsed,
                        error: "Missing zapRunId",
                        timestamp: new Date().toISOString(),
                    })
                }]
            });
            await consumer.commitOffsets([{ topic, partition, offset }]);
            return;
        }


        try {
            await processZaprun(zapRunId);
            
            // Fetch the actual zapRun and zap details
            const zapRun = await prisma.zapRun.findUnique({
                where: { id: zapRunId },
                include: { zap: true }
            });
            
            if (zapRun && zapRun.zap) {
                const userId = zapRun.zap.userId;
                const zapId = zapRun.zapId;
                
                await redis.publish("zap-notification", JSON.stringify({
                    userId: String(userId),
                    zapId: zapId,
                    status: "success",
                    message: "Your zap is processed successfully",
                    timestamp: new Date().toISOString()
                }));
            }
            
            await consumer.commitOffsets([{ topic, partition, offset }]);
            console.log("Done processing zapRunId:", zapRunId);
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Processing failed for zapRunId:", zapRunId, errorMessage);

            if (retryCount < MAX_RETRIES) {
                console.log(`Retrying zapRunId ${zapRunId} with retryCount=${retryCount + 1}`);
                await producer.send({
                    topic: TOPIC_NAME,
                    messages: [{
                        value: JSON.stringify({
                            zapRunId,
                            retryCount: retryCount + 1,
                        })
                    }]
                });
                await consumer.commitOffsets([{ topic, partition, offset }]);
            } else {
                console.log("Max retries reached → sending to DLQ for zapRunId:", zapRunId);
                await producer.send({
                    topic: DLQ_TOPIC_NAME,
                    messages: [{
                        value: JSON.stringify({
                            zapRunId,
                            retryCount,
                            error: errorMessage,
                            timestamp: new Date().toISOString(),
                        })
                    }]
                });
                await consumer.commitOffsets([{ topic, partition, offset }]);
            }
        }
    }
})
}
main().catch(console.error);
