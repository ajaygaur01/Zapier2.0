import { Router } from "express";
import { createZap, getZapById, getZaps, createScheduledZap, deleteScheduledZap, getScheduledZap } from "../controllers/zap";
import { authMiddleware } from "../middlewares/authmiddleware";

const router = Router();

router.post("/", authMiddleware, createZap);
router.get("/", authMiddleware, getZaps);
router.get("/:zapId", authMiddleware, getZapById);

router.post("/:zapId/schedule", authMiddleware, createScheduledZap);
router.delete("/:zapId/schedule", authMiddleware, deleteScheduledZap);
router.get("/:zapId/schedule", authMiddleware, getScheduledZap);



export default router;

