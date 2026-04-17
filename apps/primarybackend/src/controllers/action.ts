import { Prisma, PrismaClient } from "@repo/db";
const prisma = new PrismaClient()

export const getallActions = async(req: any , res: any) => {
  const availableActions = await prisma.availableActions.findMany({});
  res.json({
    availableActions,
  });
};

