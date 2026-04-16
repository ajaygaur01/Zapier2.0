import { Router } from "express";
import userRouter from "./user";
import zapRouter from "./zap";
import triggerRouter from "./trigger";
import actionRouter from "./action";
import { ratelimiter } from "../middlewares/rateLimiter";
const apiLimiter = ratelimiter({
    windowSeconds: 60,
    maxRequests: 60,           // 60 requests per minute
    keyPrefix: "api"
  });
  const authLimiter = ratelimiter({
    windowSeconds: 60 * 15,    // 15 minutes
    maxRequests: 10,           // only 10 attempts
    keyPrefix: "auth"
  });
const router = Router();

router.use("/api/v1/user", userRouter);
router.use("/api/v1/zap", zapRouter , apiLimiter);
router.use("/api/v1/trigger", triggerRouter);
router.use("/api/v1/action", actionRouter);

export default router;

