import express from "express";
import {
  listSubscriptions,
  createSubscription,
  toggleSubscription,
  deleteSubscription,
  getLogs,
  testWebhook
} from "../controllers/webhookController.js";

const router = express.Router();

router.get("/", listSubscriptions);
router.post("/", createSubscription);
router.patch("/:id/toggle", toggleSubscription);
router.delete("/:id", deleteSubscription);
router.get("/logs", getLogs);
router.post("/test", testWebhook);

export default router;
