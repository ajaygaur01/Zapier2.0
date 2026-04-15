import { Router } from "express";
import { getallActions } from "../controllers/action";

const router = Router();

router.get("/available", getallActions);

export default router;

