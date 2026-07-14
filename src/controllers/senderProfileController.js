import nodemailer from "nodemailer";
import SenderProfile from "../models/SenderProfile.js";
import { postgres } from "../config/postgres.js";

/**
 * List all SMTP sender profiles for the logged-in user.
 */
export const listProfiles = async (req, res) => {
  try {
    const profiles = await SenderProfile.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, profiles });
  } catch (error) {
    console.error("List profiles error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Register a new SMTP sender profile.
 */
export const createProfile = async (req, res) => {
  try {
    const { name, host, port, username, password, fromEmail, fromName } = req.body;
    if (!name || !host || !port || !username || !password || !fromEmail) {
      return res.status(400).json({ success: false, error: "All profile fields are required." });
    }

    const cleanHost = String(host || "").trim().replace(/^["']|["']$/g, "");

    // Create the profile
    const profile = await SenderProfile.create({
      name,
      host: cleanHost,
      port: Number(port),
      username,
      password,
      fromEmail,
      fromName: fromName || name,
      userId: req.user.id,
      isActive: false
    });

    // If this is the only profile, set it as active automatically
    const totalProfiles = await SenderProfile.find({ userId: req.user.id }).lean();
    if (totalProfiles.length === 1) {
      await SenderProfile.findByIdAndUpdate(profile.id, { isActive: true });
      profile.isActive = true;
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error("Create profile error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Toggle a sender profile to active status.
 */
export const setActiveProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === "default" || id === "none") {
      await SenderProfile.updateMany({ userId: req.user.id }, { isActive: false });
      return res.json({ success: true });
    }

    // Verify it belongs to the user
    const profile = await SenderProfile.findOne({ id, userId: req.user.id }).lean();
    if (!profile) {
      return res.status(404).json({ success: false, error: "Sender profile not found." });
    }

    // Deactivate all user's profiles
    await SenderProfile.updateMany({ userId: req.user.id }, { isActive: false });

    // Activate the targeted profile
    await SenderProfile.findByIdAndUpdate(id, { isActive: true });

    res.json({ success: true });
  } catch (error) {
    console.error("Set active profile error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete a sender profile.
 */
export const deleteProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Use direct SQL query due to PgModel lacking raw DELETE methods
    const result = await postgres.query(
      "DELETE FROM sender_profiles WHERE id = $1 AND user_id = $2 RETURNING is_active",
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Sender profile not found." });
    }

    const wasActive = result.rows[0].is_active;

    // If we deleted the active profile, mark the next available one as active
    if (wasActive) {
      const remaining = await SenderProfile.find({ userId: req.user.id }).lean();
      if (remaining.length > 0) {
        await SenderProfile.findByIdAndUpdate(remaining[0].id, { isActive: true });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete profile error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Test SMTP connection using user-provided credentials on-the-fly.
 */
export const testProfileConnection = async (req, res) => {
  try {
    const { host, port, username, password } = req.body;
    if (!host || !port || !username || !password) {
      return res.status(400).json({ success: false, error: "Host, port, username, and password are required for verification." });
    }

    const cleanHost = String(host || "").trim().replace(/^["']|["']$/g, "");

    const testTransporter = nodemailer.createTransport({
      host: cleanHost,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user: username,
        pass: password
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000 // 10 second timeout for diagnostic verify
    });

    await testTransporter.verify();

    res.json({ success: true, message: "SMTP connection verified successfully." });
  } catch (error) {
    console.warn("SMTP test connection diagnostics failure:", error.message);
    res.status(400).json({ success: false, error: error.message });
  }
};
