import Tracking from "../models/Tracking.js";
import Contact from "../models/Contact.js";
import { decodeLegacyTrackingId } from "../utils/tracking.js";

export const unsubscribeHandler = async (req, res) => {
  try {
    const trackingId = req.params.id;

    if (req.method === "POST") {
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
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed Successfully</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: #f8fafc;
              margin: 0;
            }
            .box {
              background: white;
              padding: 40px;
              border-radius: 16px;
              text-align: center;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              max-width: 400px;
              width: 100%;
              box-sizing: border-box;
            }
            h2 {
              color: #16a34a;
              margin-top: 0;
              margin-bottom: 8px;
            }
            p {
              color: #64748b;
              font-size: 14px;
              line-height: 1.5;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>Unsubscribed Successfully</h2>
            <p>You have been unsubscribed from our mailing list. You will no longer receive marketing emails from us.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Render GET confirmation page
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Confirm Unsubscribe</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #f8fafc;
            margin: 0;
          }
          .box {
            background: white;
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            max-width: 400px;
            width: 100%;
            box-sizing: border-box;
          }
          h2 {
            color: #1e293b;
            margin-top: 0;
            margin-bottom: 12px;
          }
          p {
            color: #64748b;
            margin-top: 0;
            margin-bottom: 28px;
            font-size: 14px;
            line-height: 1.5;
          }
          .btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            transition: background 0.2s, transform 0.1s;
            width: 100%;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
            box-sizing: border-box;
          }
          .btn:hover {
            background: #1d4ed8;
          }
          .btn:active {
            transform: scale(0.98);
          }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>Unsubscribe</h2>
          <p>Are you sure you want to unsubscribe? You will no longer receive any newsletter or marketing emails from us.</p>
          <form method="POST">
            <button type="submit" class="btn">Unsubscribe</button>
          </form>
        </div>
      </body>
      </html>
    `);

  } catch (err) {
    console.error(err);
    return res.status(500).send("Unsubscribe Error");
  }
};
