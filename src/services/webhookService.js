import crypto from "crypto";
import WebhookSubscription from "../models/WebhookSubscription.js";
import WebhookLog from "../models/WebhookLog.js";

/**
 * Dispatches an event to all subscribed webhooks in a non-blocking background task.
 * 
 * @param {string} eventType The name of the event (e.g. 'email.open', 'email.click')
 * @param {object} payload The data payload associated with the event
 */
export const dispatchWebhookEvent = (eventType, payload) => {
  // Fire-and-forget: run asynchronously to avoid blocking the main server threads
  (async () => {
    try {
      // Find all active subscriptions
      const subscriptions = await WebhookSubscription.find({ active: true });
      if (!subscriptions || subscriptions.length === 0) {
        return;
      }

      // Filter subscriptions that are subscribed to this event type
      const targetSubs = subscriptions.filter((sub) => {
        const events = sub.subscribedEvents || [];
        return events.includes(eventType);
      });

      if (targetSubs.length === 0) {
        return;
      }

      const eventId = crypto.randomUUID();
      const webhookPayload = {
        id: eventId,
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload
      };

      const bodyStr = JSON.stringify(webhookPayload);

      for (const sub of targetSubs) {
        const signature = crypto
          .createHmac("sha256", sub.secret || "secret")
          .update(bodyStr)
          .digest("hex");

        const startTime = Date.now();
        let responseStatus = null;
        let responseBody = "";
        let errorMessage = null;

        try {
          const response = await fetch(sub.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Acolyte-Signature": signature
            },
            body: bodyStr,
            signal: AbortSignal.timeout(5000) // 5 seconds timeout
          });

          responseStatus = response.status;
          responseBody = await response.text();
        } catch (err) {
          errorMessage = err.message;
        }

        const durationMs = Date.now() - startTime;

        // Log the webhook delivery details
        await WebhookLog.create({
          subscriptionId: sub.id,
          eventType,
          url: sub.url,
          requestPayload: webhookPayload,
          responseStatus,
          responseBody: responseBody.slice(0, 2000), // Protect database against oversized responses
          errorMessage,
          durationMs
        });
      }
    } catch (error) {
      console.error("Error in dispatchWebhookEvent background task:", error);
    }
  })();
};
