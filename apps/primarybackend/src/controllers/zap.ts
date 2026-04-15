import { Prisma, PrismaClient } from "@repo/db";
const prisma = new PrismaClient();

export const createZap = async (req: any, res: any) => {
  try {
    const id = req.id;

    // Step 1: Validate user
    if (!id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const userId =
      typeof id === "number" ? id : parseInt(String(id), 10);

    if (Number.isNaN(userId) || userId < 1) {
      return res.status(403).json({ message: "Invalid user" });
    }

    // Step 2: Extract body
    const { availableTriggerId, actions } = req.body;

    // Step 3: Manual validation
    if (!availableTriggerId || typeof availableTriggerId !== "string") {
      return res.status(400).json({ message: "Invalid triggerId" });
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({ message: "Actions must be a non-empty array" });
    }

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      if (
        !action.availableActionId ||
        typeof action.availableActionId !== "string"
      ) {
        return res.status(400).json({
          message: `Invalid actionId at index ${i}`,
        });
      }

      if (
        typeof action.actionMetadata !== "object" ||
        action.actionMetadata === null
      ) {
        return res.status(400).json({
          message: `Invalid metadata at index ${i}`,
        });
      }
    }

    // Step 4: Transaction
    const zapId = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const zap = await tx.zap.create({
          data: {
            user: { connect: { id: userId } },
            triggerId: "",
            actions: {
              create: actions.map((x: any, index: number) => ({
                actionId: x.availableActionId,
                sortingOrder: index,
                Metadata: x.actionMetadata,
              })),
            },
          },
        });

        const trigger = await tx.trigger.create({
          data: {
            type: { connect: { id: availableTriggerId } },
            zap: { connect: { id: zap.id } },
          },
        });

        await tx.zap.update({
          where: { id: zap.id },
          data: { triggerId: trigger.id },
        });

        return zap.id;
      }
    );

    return res.json({ zapId });

  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};


// GET ALL ZAPS
export const getZaps = async (req: any, res: any) => {
  try {
    const id = req.id;

    // Validate user
    if (!id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Fetch zaps
    const zaps = await prisma.zap.findMany({
      where: { userId },
      include: {
        actions: {
          include: { type: true },
        },
        trigger: {
          include: { type: true },
        },
      },
    });

    return res.json({ zaps });

  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};



// GET SINGLE ZAP
export const getZapById = async (req: any, res: any) => {
  try {
    const id = req.id;

    // Validate user
    if (!id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Extract zapId
    const zapId = Array.isArray(req.params.zapId)
      ? req.params.zapId[0]
      : req.params.zapId;

    if (!zapId || typeof zapId !== "string") {
      return res.status(400).json({ message: "Invalid zap ID" });
    }

    // Fetch zap
    const zap = await prisma.zap.findFirst({
      where: {
        id: zapId,
        userId: userId, // critical security check
      },
      include: {
        actions: {
          include: { type: true },
        },
        trigger: {
          include: { type: true },
        },
      },
    });

    return res.json({ zap });

  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};