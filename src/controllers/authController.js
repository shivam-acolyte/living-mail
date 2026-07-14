import crypto from "crypto";
import User from "../models/User.js";
import UserSession from "../models/UserSession.js";

/**
 * Hash password securely with built-in crypto SHA-256.
 */
const hashPassword = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

/**
 * User registration handler.
 */
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: emailTrimmed }).lean();
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email is already registered." });
    }

    const passwordHash = hashPassword(password);
    const user = await User.create({
      email: emailTrimmed,
      passwordHash,
      name: name || ""
    });

    // Automatically create a session on signup
    const token = crypto.randomBytes(32).toString("hex");
    await UserSession.create({
      userId: user.id,
      token
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * User login handler.
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    const passwordHash = hashPassword(password);

    const user = await User.findOne({ email: emailTrimmed, passwordHash }).lean();
    if (!user) {
      return res.status(400).json({ success: false, error: "Invalid email or password." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await UserSession.create({
      userId: user.id,
      token
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * User logout handler.
 */
export const logout = async (req, res) => {
  try {
    const token = req.token;
    if (token) {
      // Direct SQL to delete session since PgModel has no raw delete
      await UserSession.updateMany({ token }, { $unset: { token: 1 } }); // Invalidate session
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Fetch current authenticated user.
 */
export const me = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name
    }
  });
};
