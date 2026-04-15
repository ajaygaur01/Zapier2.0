import { Router } from "express";
import userRouter from "./user";
import zapRouter from "./zap";
import triggerRouter from "./trigger";
import actionRouter from "./action";

const router = Router();

router.use("/api/v1/user", userRouter);
router.use("/api/v1/zap", zapRouter);
router.use("/api/v1/trigger", triggerRouter);
router.use("/api/v1/action", actionRouter);

export default router;

