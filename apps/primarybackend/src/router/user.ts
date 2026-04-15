import { Router } from "express";
import { getCurrentUser, signin, signup } from "../controllers/user";
import { authMiddleware } from "../middlewares/authmiddleware";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/me", authMiddleware, getCurrentUser);

export default router;

