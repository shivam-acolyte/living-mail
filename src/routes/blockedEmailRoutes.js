import express from "express";
import { listBlockedEmails, blockEmail, unblockEmail } from "../controllers/blockedEmailController.js";

const router = express.Router();

router.get("/", listBlockedEmails);
router.post("/", blockEmail);
router.delete("/:id", unblockEmail);

export default router;
