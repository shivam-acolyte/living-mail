import transporter from "../config/mailer.js";
import ampTemplate from "../templates/ampTemplate.js";
import htmlTemplate from "../templates/htmlTemplate.js";
import AmpTemplate from "../models/AmpTemplate.js";
import Contact from "../models/Contact.js";
import Tracking from "../models/Tracking.js";
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

    // Verify SMTP connection unless a bulk worker is using the pooled transport.
    if (!options.skipVerify) {
      await transporter.verify();
      console.log("SMTP CONNECTED");
    }

    const senderEmail = options.senderEmail || process.env.SMTP_FROM;
    const replyTo = options.replyTo || options.replyToEmail || senderEmail;

    const mailOptions = {
      from: `<${senderEmail}>`,

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

    const info = await transporter.sendMail(mailOptions);

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
      sentAt: new Date()
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
