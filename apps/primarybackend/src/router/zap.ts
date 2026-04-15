import { Router } from "express";
import { createZap, getZapById, getZaps } from "../controllers/zap";
import { authMiddleware } from "../middlewares/authmiddleware";

const router = Router();

router.post("/", authMiddleware, createZap);
router.get("/", authMiddleware, getZaps);
router.get("/:zapId", authMiddleware, getZapById);

export default router;

