import { Prisma, PrismaClient } from "@repo/db";
const prisma = new PrismaClient()


export const availabletriggers = async(req:any , res:any) => {
const availabletriggers = await prisma.availableTriggers.findMany({})
res.json({
    availabletriggers
})
}