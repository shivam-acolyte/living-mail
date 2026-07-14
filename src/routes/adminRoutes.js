import express from "express";
import { getCampaignSummary } from "../controllers/adminController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/campaign-summary", requireAuth, getCampaignSummary);

export default router;
