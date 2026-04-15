import { Router } from "express";
import { availabletriggers } from "../controllers/trigger";

const router = Router();

router.get("/available", availabletriggers);

export default router;

