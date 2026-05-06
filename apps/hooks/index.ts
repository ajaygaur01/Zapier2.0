// CI/CD Test Change
import express from "express";
import { Prisma, PrismaClient } from "@repo/db";
const app = express();
app.use(express.json());
const prisma = new PrismaClient();
import { ratelimiter } from "./middleware/rateLimiter";

const webhookLimiter = ratelimiter({
  windowSeconds: 60,
  maxRequests: 100,
  keyPrefix: "webhook"
});


app.post("/hooks/catch/:userId/:zapId",webhookLimiter ,async (req, res) => {
  const { userId, zapId } = req.params;
  const body = req.body;

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const zapRun = await tx.zapRun.create({
        data: {
          metadata: typeof body === "object" && body !== null ? body : {},
          zapId,
        },
      });

      await tx.zapRunOutbox.create({
        data: {
          zapRunId: zapRun.id,
        },
      });
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error, "error in hooks");
    res.status(500).json({ success: false });
  }

});

app.listen(8000, () => {
  console.log("hooks port running on 8000");
});