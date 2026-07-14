import UserSession from "../models/UserSession.js";
import User from "../models/User.js";

/**
 * Middleware to require user authentication on specific REST routes.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Authentication token required." });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, error: "Invalid authorization format." });
    }

    // Find the session token
    const session = await UserSession.findOne({ token }).lean();
    if (!session) {
      return res.status(401).json({ success: false, error: "Active session not found or expired." });
    }

    // Find the user linked to the session
    const user = await User.findOne({ id: session.userId }).lean();
    if (!user) {
      return res.status(401).json({ success: false, error: "User associated with this session no longer exists." });
    }

    // Attach user information to request
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({ success: false, error: "Internal authentication error." });
  }
};
