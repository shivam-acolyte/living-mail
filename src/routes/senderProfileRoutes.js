import express from "express";
import {
  listProfiles,
  createProfile,
  setActiveProfile,
  deleteProfile,
  testProfileConnection
} from "../controllers/senderProfileController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", listProfiles);
router.post("/", createProfile);
router.patch("/:id/active", setActiveProfile);
router.delete("/:id", deleteProfile);
router.post("/test", testProfileConnection);

export default router;
