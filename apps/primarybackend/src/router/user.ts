import { Router } from "express";
import { getCurrentUser, signin, signup } from "../controllers/user";
import { authMiddleware } from "../middlewares/authmiddleware";
import { ratelimiter } from "../middlewares/rateLimiter";

const authLimiter = ratelimiter({
    windowSeconds: 60 * 15,    // 15 minutes
    maxRequests: 10,           // only 10 attempts
    keyPrefix: "auth"
  });

const router = Router();

router.post("/signup", authLimiter, signup);
router.post("/signin", authLimiter, signin);
router.get("/me", authMiddleware, getCurrentUser);

export default router;

