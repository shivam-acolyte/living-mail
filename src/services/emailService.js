
import ampTemplate from "../templates/ampTemplate.js";
import htmlTemplate from "../templates/htmlTemplate.js";
import AmpTemplate from "../models/AmpTemplate.js";
import Contact from "../models/Contact.js";
import Tracking from "../models/Tracking.js";
import SenderProfile from "../models/SenderProfile.js";
import nodemailer from "nodemailer";
import {
  renderTrackedFormTemplate,
  renderTrackedTemplate
} from "../utils/generateAmpTemplate.js";
import { assertEmailIsSendable } from "./suppressionService.js";
import { generateTrackingId } from "../utils/tracking.js";
import { validateTemplate } from "../utils/templateValidator.js";

const getSavedTemplate = async ({ templateId, templateSlug }) => {
  if (templateId) {
    return AmpTemplate.findOne({
      _id: templateId,
      isActive: true
    });
  }

  if (templateSlug) {
    return AmpTemplate.findOne({
      slug: templateSlug,
      isActive: true
    });
  }

  return null;
};

const dynamicTransporterCache = new Map();
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// Background Garbage Collector to clean up idle connection pools
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of dynamicTransporterCache.entries()) {
    if (now - cached.lastUsed > IDLE_TIMEOUT_MS) {
      console.log(`Closing idle SMTP pool for profile key: ${key}`);
      try {
        cached.transporter.close();
      } catch (err) {
        console.error("Failed to close transporter:", err);
      }
      dynamicTransporterCache.delete(key);
    }
  }
}, 60000).unref();

const getActiveSenderProfileTransporter = async (senderEmail, userId) => {
  try {
    const query = { isActive: true };
    if (userId) {
      query.userId = userId;
    }
    if (senderEmail) {
      query.fromEmail = senderEmail;
    }
    const activeProfile = await SenderProfile.findOne(query).lean();
    if (activeProfile) {
      const profileIdStr = String(activeProfile.id || activeProfile._id);
      
      const configHash = JSON.stringify({
        host: activeProfile.host,
        port: activeProfile.port,
        username: activeProfile.username,
        password: activeProfile.password
      });

      const cached = dynamicTransporterCache.get(profileIdStr);

      if (!cached || cached.hash !== configHash) {
        if (cached?.transporter) {
          console.log(`Closing old transporter pool for profile: ${activeProfile.name}`);
          try {
            cached.transporter.close();
          } catch (err) {
            console.error("Error closing old dynamic transporter:", err);
          }
        }

        console.log(`Creating new dynamic pooled SMTP transporter for profile: ${activeProfile.name}`);
        const dynamicTransporter = nodemailer.createTransport({
          host: String(activeProfile.host || "").trim().replace(/^["']|["']$/g, ""),
          port: Number(activeProfile.port),
          secure: Number(activeProfile.port) === 465,
          pool: true, // Enable pooling for production scalability
          maxConnections: Number(process.env.SMTP_POOL_MAX_CONNECTIONS || 50),
          maxMessages: Number(process.env.SMTP_POOL_MAX_MESSAGES || 1000),
          rateDelta: Number(process.env.SMTP_RATE_DELTA_MS || 1000),
          rateLimit: Number(process.env.SMTP_RATE_LIMIT_PER_SECOND || 400),
          auth: {
            user: activeProfile.username,
            pass: activeProfile.password
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        dynamicTransporterCache.set(profileIdStr, {
          transporter: dynamicTransporter,
          hash: configHash,
          lastUsed: Date.now()
        });
      } else {
        cached.lastUsed = Date.now();
      }

      return {
        transporter: dynamicTransporterCache.get(profileIdStr).transporter,
        from: `"${activeProfile.fromName || "Sender"}" <${activeProfile.fromEmail}>`,
        senderEmail: activeProfile.fromEmail
      };
    } else if (senderEmail) {
      // If a specific profile becomes inactive or deleted, remove only that one from cache
      const staleCached = Array.from(dynamicTransporterCache.entries()).find(
        ([_, val]) => val.transporter.options?.auth?.user === senderEmail
      );
      if (staleCached) {
        try {
          staleCached[1].transporter.close();
        } catch (err) {
          console.error("Error closing inactive transporter:", err);
        }
        dynamicTransporterCache.delete(staleCached[0]);
      }
    }
  } catch (error) {
    console.warn("Failed to retrieve active SMTP profile from DB:", error.message);
  }
  return null;
};

const sendTrackingEmail = async (
  userEmail,
  subject,
  campaignName,
  campaignType,
  options = {}
) => {
  try {
    await assertEmailIsSendable(userEmail);

    const trackingId = generateTrackingId(userEmail, campaignName);
    const savedTemplate = await getSavedTemplate(options);

    if ((options.templateId || options.templateSlug) && !savedTemplate) {
      throw new Error("Template not found or inactive");
    }

    if (savedTemplate) {
      const validation = validateTemplate({
        subject: subject || savedTemplate.subject,
        html: savedTemplate.html,
        amp: savedTemplate.amp,
        formHtml: savedTemplate.formHtml,
        variables: savedTemplate.variables,
        sourceJson: savedTemplate.sourceJson,
        providedVariables: {
          ...(options.variables || {}),
          email: userEmail,
          subject,
          campaignName,
          campaignType
        }
      });

      if (!validation.valid) {
        throw new Error(`Template validation failed: ${validation.errors.map((issue) => issue.message).join("; ")}`);
      }
    }

    const renderedTemplate = savedTemplate
      ? renderTrackedTemplate({
          template: savedTemplate,
          trackingId,
          email: userEmail,
          subject,
          campaignName,
          campaignType,
          variables: options.variables
        })
      : null;
    const renderedFormHtml = savedTemplate?.formHtml
      ? renderTrackedFormTemplate({
          template: savedTemplate,
          trackingId,
          email: userEmail,
          subject,
          campaignName,
          campaignType,
          variables: options.variables
        })
      : "";

    const activeProfileData = await getActiveSenderProfileTransporter(options.senderEmail, options.userId);
    if (!activeProfileData) {
      throw new Error("No active SMTP profile configured. Please add and activate an SMTP profile in SMTP Settings.");
    }
    const mailTransporter = activeProfileData.transporter;

    // Verify SMTP connection unless a bulk worker is using the pooled transport.
    if (!options.skipVerify) {
      await mailTransporter.verify();
      console.log("SMTP CONNECTED");
    }

    const senderEmail = activeProfileData.senderEmail;
    const fromAddress = activeProfileData.from;

    const replyTo = options.replyTo || options.replyToEmail || senderEmail;

    const mailOptions = {
      from: fromAddress,

      to: userEmail,

      subject: renderedTemplate?.subject || subject,

      replyTo,

      text:
        renderedTemplate?.text ||
        "Your email client does not support HTML or AMP emails.",

      headers: {
        "X-Tracking-Id": trackingId
      },

      html:
        renderedTemplate?.html ||
        htmlTemplate(trackingId, subject, campaignName, campaignType),

      amp: savedTemplate
        ? renderedTemplate?.amp || undefined
        : ampTemplate(trackingId, subject, campaignName, campaignType),
    };

    const info = await mailTransporter.sendMail(mailOptions);

    await Tracking.create({
      trackingId,
      email: userEmail,
      subject: renderedTemplate?.subject || subject,
      campaignName,
      campaignType,
      templateId: savedTemplate?._id?.toString(),
      templateSlug: savedTemplate?.slug,
      templateName: savedTemplate?.name,
      renderedFormHtml,
      messageId: info.messageId,
      senderEmail,
      senderProvider: options.senderProvider || process.env.SENDER_PROVIDER || "smtp",
      deliveryProvider: options.deliveryProvider || process.env.DELIVERY_PROVIDER || "smtp",
      eventType: "sent",
      sentAt: new Date(),
      metadata: options.abVariant ? { abVariant: options.abVariant } : {}
    });

    await Contact.findOneAndUpdate(
      {
        email: String(userEmail).trim().toLowerCase()
      },
      {
        $set: {
          lastActivityAt: new Date()
        }
      }
    );

    console.log("EMAIL SENT:", info.messageId);

    return info;

  } catch (err) {
    console.error("EMAIL ERROR:", err);
    throw err;
  }
};

export default sendTrackingEmail;
