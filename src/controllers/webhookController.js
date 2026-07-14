import crypto from "crypto";
import WebhookSubscription from "../models/WebhookSubscription.js";
import WebhookLog from "../models/WebhookLog.js";
import { postgres } from "../config/postgres.js";

/**
 * List all webhook subscriptions.
 */
export const listSubscriptions = async (req, res) => {
  try {
    const subscriptions = await WebhookSubscription.find({}).sort({ createdAt: -1 }).lean();
    res.json({ success: true, subscriptions });
  } catch (error) {
    console.error("List subscriptions error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Register a new webhook subscription.
 */
export const createSubscription = async (req, res) => {
  try {
    const { url, subscribedEvents } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }

    const secret = "whsec_" + crypto.randomBytes(16).toString("hex");
    const subscription = await WebhookSubscription.create({
      url,
      secret,
      subscribedEvents: subscribedEvents || [],
      active: true
    });

    res.json({ success: true, subscription });
  } catch (error) {
    console.error("Create subscription error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Toggle active state of a webhook subscription.
 */
export const toggleSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    const subscription = await WebhookSubscription.findByIdAndUpdate(id, {
      active: Boolean(active)
    });

    res.json({ success: true, subscription });
  } catch (error) {
    console.error("Toggle subscription error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete a webhook subscription and its logs.
 */
export const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    // Use direct SQL query as PgModel doesn't expose DELETE operations
    await postgres.query("DELETE FROM webhook_subscriptions WHERE id = $1", [id]);
    await postgres.query("DELETE FROM webhook_logs WHERE subscription_id = $1", [id]);

    res.json({ success: true });
  } catch (error) {
    console.error("Delete subscription error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Retrieve delivery logs (optionally filtered by subscription).
 */
export const getLogs = async (req, res) => {
  try {
    const { subscriptionId } = req.query;
    const query = {};
    
    if (subscriptionId) {
      query.subscriptionId = subscriptionId;
    }

    const logs = await WebhookLog.find(query).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, logs });
  } catch (error) {
    console.error("Get logs error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Ping test an endpoint by sending a signed mock payload.
 */
export const testWebhook = async (req, res) => {
  try {
    const { url, eventType } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }

    const testSecret = "whsec_test_secret_123456";
    const mockPayload = {
      id: crypto.randomUUID(),
      event: eventType || "email.open",
      timestamp: new Date().toISOString(),
      data: {
        email: "test-recipient@example.com",
        campaignName: "Test Webhook Campaign",
        campaignType: "ab-split",
        subject: "Hello from Acolyte Test Sender!",
        metadata: {
          abVariant: "A"
        },
        openedAt: new Date().toISOString(),
        clickedUrl: "https://example.com/click-test",
        formFields: {
          feedback: "This is a test submission."
        }
      }
    };

    const bodyStr = JSON.stringify(mockPayload);
    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(bodyStr)
      .digest("hex");

    const startTime = Date.now();
    let responseStatus = null;
    let responseBody = "";
    let errorMessage = null;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Acolyte-Signature": signature
        },
        body: bodyStr,
        signal: AbortSignal.timeout(5000)
      });

      responseStatus = response.status;
      responseBody = await response.text();
    } catch (err) {
      errorMessage = err.message;
    }

    const durationMs = Date.now() - startTime;

    res.json({
      success: true,
      sentPayload: mockPayload,
      responseStatus,
      responseBody,
      durationMs,
      error: errorMessage
    });
  } catch (error) {
    console.error("Test webhook error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
