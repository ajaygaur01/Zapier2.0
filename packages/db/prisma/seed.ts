import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // Check if actions already exist
  const existingActions = await prisma.availableActions.findMany();

  if (existingActions.length === 0) {
    // Seed initial actions
    await prisma.availableActions.create({
      data: {
        name: "Email",
        image: "📧",
      },
    });

    await prisma.availableActions.create({
      data: {
        name: "Solana",
        image: "◎",
      },
    });

    await prisma.availableActions.create({
      data: {
        name: "Slack",
        image: "💬",
      },
    });

    console.log("✅ Seeded available actions: Email, Solana, Slack");
  } else {
    // Check if Slack action exists, if not add it
    const slackAction = await prisma.availableActions.findFirst({
      where: { name: "Slack" },
    });

    if (!slackAction) {
      await prisma.availableActions.create({
        data: {
          name: "Slack",
          image: "💬",
        },
      });
      console.log("✅ Added Slack action to available actions");
    } else {
      console.log("✅ Slack action already exists");
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
