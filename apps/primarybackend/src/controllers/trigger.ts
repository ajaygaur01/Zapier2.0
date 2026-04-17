import { Prisma, PrismaClient } from "@repo/db";
const prisma = new PrismaClient()


export const availabletriggers = async(req:any , res:any) => {
  const availableTriggers = await prisma.availableTriggers.findMany({});
  res.json({
    availableTriggers,
  });
};