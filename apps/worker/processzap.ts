import "dotenv/config";
import { PrismaClient } from "@repo/db";
const prisma = new PrismaClient()
import { Kafka } from "kafkajs";
import { sendSol } from "./actions/solana";
import { sendEmail } from "./actions/email";
import { sendSlackMessage } from "./actions/slack";
import {parse} from "./actions/parser"
const TOPIC_NAME = "zap-events"
const kafka = new Kafka({
    clientId: "worker",
    brokers:["localhost:9092"]
})
export async function processZaprun(zapRunId: string){

// Step 2 - fetch ZapRun from DB (has webhook payload)
        const zapRun = await prisma.zapRun.findUnique({
            where: {id: zapRunId},
            include:{
                zap:{
                    include:{
                        actions:{
                            include: {type:true},// get action type name
                            orderBy: {sortingOrder: "asc"}  // order matters!
                        }
                    }
                }
            }
        })

        if (!zapRun) {
            console.error("ZapRun not found:", zapRunId);
            return;
        }
        // Step 3 - this is the webhook payload
        // { "name": "John", "email": "john@gmail.com", "amount": "0.5" }
        const triggerPayload = zapRun.metadata;

        console.log("trigger payload:", triggerPayload);
        console.log("actions to run:", zapRun.zap.actions.length);


       // Step 4 - run each action in order
       for(const action of zapRun.zap.actions) {
        const actionType  = action.type.name
        const metadata = (action.Metadata ?? {}) as any

        console.log(`Running action: ${actionType} (order: ${action.sortingOrder})`);
        
        if (actionType === "Email") {
            if (typeof metadata.to !== "string" || typeof metadata.body !== "string") {
                console.error("Invalid/missing metadata for Email action:", metadata);
                continue;
            }
            // resolve templates
            // metadata.to might be "{trigger.email}"
            const to = parse(metadata.to, { trigger: triggerPayload });
            const body = parse(metadata.body, { trigger: triggerPayload });

            console.log("Sending email to:", to);
            await sendEmail(to, body);
        }

        if (actionType === "Solana") {
            if (typeof metadata.to !== "string" || typeof metadata.amount !== "string") {
                console.error("Invalid/missing metadata for Solana action:", metadata);
                continue;
            }
            // resolve templates
            const to = parse(metadata.to, { trigger: triggerPayload });
            const amount = parse(metadata.amount, { trigger: triggerPayload });

            console.log("Sending SOL to:", to, "amount:", amount);
            await sendSol(to, amount);
        }

        if (actionType === "Slack") {
            if (typeof metadata.channel !== "string" || typeof metadata.message !== "string") {
                console.error("Invalid/missing metadata for Slack action:", metadata);
                continue;
            }
            // resolve templates
            const channel = parse(metadata.channel, { trigger: triggerPayload });
            const message = parse(metadata.message, { trigger: triggerPayload });

            console.log("Sending Slack message to:", channel);
            await sendSlackMessage(channel, message);
        }
       }


    }