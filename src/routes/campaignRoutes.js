import express from "express";
import {
  cancelCampaign,
  duplicateCampaign,
  exportFailedRecipientsCsv,
  getCampaignActivity,
  getCampaignStats,
  listCampaignRecipients,
  listCampaigns,
  rescheduleCampaign,
  retryFailedCampaignRecipients,
  sendCampaignNow
} from "../controllers/campaignController.js";
import {
  pauseBulkEmailController,
  resumeBulkEmailController
} from "../controllers/emailController.js";

const router = express.Router();

router.get("/", listCampaigns);
router.get("/:id/stats", getCampaignStats);
router.get("/:id/recipients", listCampaignRecipients);
router.get("/:id/activity", getCampaignActivity);
router.get("/:id/failed.csv", exportFailedRecipientsCsv);
router.post("/:id/duplicate", duplicateCampaign);
router.post("/:id/reschedule", rescheduleCampaign);
router.post("/:id/send-now", sendCampaignNow);
router.post("/:id/cancel", cancelCampaign);
router.post("/:id/retry-failed", retryFailedCampaignRecipients);
router.post("/:id/pause", pauseBulkEmailController);
router.post("/:id/resume", resumeBulkEmailController);

export default router;
