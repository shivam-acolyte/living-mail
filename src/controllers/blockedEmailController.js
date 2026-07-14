import BlockedEmail from "../models/BlockedEmail.js";
import { postgres } from "../config/postgres.js";

export const listBlockedEmails = async (req, res) => {
  try {
    const list = await BlockedEmail.find({}).sort({ createdAt: -1 }).lean();
    res.json({ success: true, list });
  } catch (error) {
    console.error("List blocked emails error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const blockEmail = async (req, res) => {
  try {
    const { email, reason } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }
    const cleanEmail = String(email).trim().toLowerCase();

    // Check duplicate
    const existing = await BlockedEmail.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, error: "Email is already blocked" });
    }

    const blocked = await BlockedEmail.create({
      email: cleanEmail,
      reason: reason || "Admin Blocked"
    });

    res.json({ success: true, blocked });
  } catch (error) {
    console.error("Block email error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const unblockEmail = async (req, res) => {
  try {
    const { id } = req.params;
    await postgres.query("DELETE FROM blocked_emails WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Unblock email error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
