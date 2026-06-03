import Tracking from "../models/Tracking.js";
import Contact from "../models/Contact.js";
import { decodeLegacyTrackingId } from "../utils/tracking.js";

export const unsubscribeHandler = async (req, res) => {

  try {

    const trackingId = req.params.id;

    const sentEvent = await Tracking
      .findOne({ trackingId, eventType: "sent" })
      .sort({ createdAt: 1 })
      .lean();

    const tracking = await Tracking.create({
      trackingId,
      email: sentEvent?.email || decodeLegacyTrackingId(trackingId),
      subject: sentEvent?.subject,
      campaignName: sentEvent?.campaignName,
      campaignType: sentEvent?.campaignType,
      templateId: sentEvent?.templateId,
      templateSlug: sentEvent?.templateSlug,
      templateName: sentEvent?.templateName,
      senderEmail: sentEvent?.senderEmail,
      senderProvider: sentEvent?.senderProvider,
      deliveryProvider: sentEvent?.deliveryProvider,
      isSubscribed: false,
      eventType: "unsubscribe",
      unsubscribedAt: new Date()
    });

    if (tracking.email) {
      await Contact.findOneAndUpdate(
        {
          email: tracking.email
        },
        {
          $set: {
            status: "unsubscribed",
            unsubscribedAt: new Date(),
            lastActivityAt: new Date()
          }
        }
      );
    }

    console.log("UNSUBSCRIBED:", tracking);

    return res.send(`

      <h2>
        You have been unsubscribed successfully
      </h2>

    `);

  } catch (err) {

    console.error(err);

    return res.status(500).send(
      "Unsubscribe Error"
    );
  }
};
