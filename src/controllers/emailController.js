import sendTrackingEmail
from "../services/emailService.js";
import { SuppressedEmailError } from "../services/suppressionService.js";
import {
  createBulkEmailCampaign,
  getBulkEmailCampaign,
  pauseBulkEmailCampaign,
  resumeBulkEmailCampaign
} from "../services/bulkEmailService.js";
import { resolveRecipients, upsertContact } from "../services/contactService.js";
import SenderProfile from "../models/SenderProfile.js";
import {
  importRecipientsFromSource,
  previewRecipientImport,
  saveImportedRecipientsToContacts
} from "../services/recipientImportService.js";

export const sendEmailController =
async (req, res) => {

   try {

      const {
         email,
         subject,
         campaignName,
         campaignType,
         templateId,
         templateSlug,
         variables,
         replyTo,
         replyToEmail
      } = req.body;

      if (!email) {

         return res.status(400).json({
            success: false,
            message: "Email is required"
         });

      }

      const activeProfile = await SenderProfile.findOne({ isActive: true, userId: req.user.id }).lean();
      if (!activeProfile) {
         return res.status(400).json({
            success: false,
            message: "No active SMTP profile configured. Please add and activate an SMTP profile in SMTP Settings."
         });
      }

      await sendTrackingEmail(
         email,
         subject,
         campaignName,
         campaignType,
         {
            templateId,
            templateSlug,
            variables,
            senderEmail: activeProfile.fromEmail,
            userId: req.user.id,
            replyTo: replyTo || replyToEmail || activeProfile.fromEmail
         }
      );

      res.json({
         success: true,
         message: "Tracking email sent"
      });

   } catch (error) {

      console.log(error);

      if (error instanceof SuppressedEmailError || error?.code === "EMAIL_SUPPRESSED") {
         return res.status(200).json({
            success: true,
            skipped: true,
            message: "Email not sent because recipient is unsubscribed or suppressed"
         });
      }

      res.status(500).json({
         success: false,
         message: error.message,
         error: error.message
      });

   }

};

export const createBulkEmailController = async (req, res) => {
  try {
    const {
      recipients,
      emails,
      listId,
      segment,
      subject,
      campaignName,
      campaignType,
      templateId,
      templateSlug,
      variables,
      replyTo,
      replyToEmail,
      scheduledAt,
      excludedEmails
    } = req.body;

    const activeProfile = await SenderProfile.findOne({ isActive: true, userId: req.user.id }).lean();
    if (!activeProfile) {
      return res.status(400).json({
        success: false,
        message: "No active SMTP profile configured. Please add and activate an SMTP profile in SMTP Settings."
      });
    }

    const resolvedRecipients = await resolveRecipients({
      recipients,
      emails,
      listId,
      segment
    });

    const campaign = await createBulkEmailCampaign({
      recipients: resolvedRecipients,
      subject,
      campaignName,
      campaignType,
      templateId,
      templateSlug,
      variables,
      senderEmail: activeProfile.fromEmail,
      replyTo: replyTo || replyToEmail || activeProfile.fromEmail,
      scheduledAt,
      excludedEmails
    });

    return res.status(201).json({
      success: true,
      message: "Bulk email campaign queued",
      campaign
    });
  } catch (error) {
    console.error("BULK EMAIL CREATE ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const previewBulkEmailImportController = async (req, res) => {
  try {
    const preview = await previewRecipientImport(
      req.body || {},
      Number(req.query.limit) || 25
    );

    return res.json({
      success: true,
      preview
    });
  } catch (error) {
    console.error("BULK EMAIL IMPORT PREVIEW ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const createBulkEmailImportController = async (req, res) => {
  try {
    const {
      subject,
      campaignName,
      campaignType,
      templateId,
      templateSlug,
      variables,
      replyTo,
      replyToEmail,
      scheduledAt,
      saveContacts,
      listId,
      saveListId,
      listName,
      tags,
      excludedEmails
    } = req.body;

    const activeProfile = await SenderProfile.findOne({ isActive: true, userId: req.user.id }).lean();
    if (!activeProfile) {
      return res.status(400).json({
        success: false,
        message: "No active SMTP profile configured. Please add and activate an SMTP profile in SMTP Settings."
      });
    }

    const importResult = await importRecipientsFromSource(req.body || {});

    if (!importResult.recipients.length) {
      return res.status(400).json({
        success: false,
        message: "No valid recipients found",
        importResult
      });
    }

    const savedContacts = saveContacts
      ? await saveImportedRecipientsToContacts({
        recipients: importResult.recipients,
        listId: saveListId || listId,
        listName,
        tags,
        source: importResult.source
      })
      : null;

    const campaign = await createBulkEmailCampaign({
      recipients: importResult.recipients,
      subject,
      campaignName,
      campaignType,
      templateId,
      templateSlug,
      variables,
      senderEmail: activeProfile.fromEmail,
      replyTo: replyTo || replyToEmail || activeProfile.fromEmail,
      scheduledAt,
      excludedEmails
    });

    return res.status(201).json({
      success: true,
      message: "Imported recipients and queued bulk email campaign",
      campaign,
      importSummary: {
        source: importResult.source,
        imported: importResult.recipients.length,
        failed: importResult.failed,
        duplicates: importResult.duplicates,
        savedContacts
      }
    });
  } catch (error) {
    console.error("BULK EMAIL IMPORT SEND ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getBulkEmailController = async (req, res) => {
  try {
    const result = await getBulkEmailCampaign(req.params.id);

    if (!result.campaign) {
      return res.status(404).json({
        success: false,
        message: "Bulk email campaign not found"
      });
    }

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("BULK EMAIL GET ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const pauseBulkEmailController = async (req, res) => {
  try {
    const campaign = await pauseBulkEmailCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Bulk email campaign not found"
      });
    }

    return res.json({
      success: true,
      message: "Bulk email campaign paused",
      campaign
    });
  } catch (error) {
    console.error("BULK EMAIL PAUSE ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const resumeBulkEmailController = async (req, res) => {
  try {
    const campaign = await resumeBulkEmailCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Bulk email campaign not found"
      });
    }

    return res.json({
      success: true,
      message: "Bulk email campaign resumed",
      campaign
    });
  } catch (error) {
    console.error("BULK EMAIL RESUME ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const thankYou = async (req, res) => {

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Thank You</title>

      <style>
        body{
          font-family:Arial;
          display:flex;
          justify-content:center;
          align-items:center;
          height:100vh;
          background:#f8fafc;
          margin:0;
        }

        .box{
          background:white;
          padding:40px;
          border-radius:16px;
          text-align:center;
          box-shadow:0 4px 20px rgba(0,0,0,0.1);
        }

        h1{
          color:#178218;
        }
      </style>
    </head>

    <body>

      <div class="box">

        <h1>Thank You!</h1>

        <p>Your form has been submitted successfully.</p>

      </div>

    </body>
    </html>
  `);

}

export const sendWelcomeEmailController = async (req, res) => {
   try {
      const {
         email,
         subject,
         campaignName,
         campaignType,
         templateId,
         templateSlug,
         variables,
         replyTo,
         replyToEmail,
         firstName,
         lastName,
         phone,
         company,
         tags
      } = req.body || {};

      if (!email) {
         return res.status(400).json({
            success: false,
            message: "Email is required"
         });
      }

      const contactTags = Array.isArray(tags) ? [...tags, "website-signup"] : ["website-signup"];

      // Upsert the contact record in database
      await upsertContact({
         email,
         firstName,
         lastName,
         phone,
         company,
         tags: contactTags,
         source: "website"
      });

      // Find an active SMTP sender profile
      let activeProfile = await SenderProfile.findOne({ isActive: true }).lean();
      if (!activeProfile) {
         // Fallback to any sender profile if none are specifically active
         activeProfile = await SenderProfile.findOne().lean();
      }

      if (!activeProfile) {
         return res.status(400).json({
            success: false,
            message: "No active SMTP profile configured. Please set up an SMTP profile in SMTP Settings."
         });
      }

      const mergedVariables = {
         firstName,
         lastName,
         phone,
         company,
         ...(variables || {})
      };

      await sendTrackingEmail(
         email,
         subject || "Welcome!",
         campaignName || "Welcome Campaign",
         campaignType || "welcome",
         {
            templateId,
            templateSlug,
            variables: mergedVariables,
            senderEmail: activeProfile.fromEmail,
            userId: activeProfile.userId,
            replyTo: replyTo || replyToEmail || activeProfile.fromEmail
         }
      );

      res.json({
         success: true,
         message: "Welcome email sent"
      });

   } catch (error) {
      console.error("Welcome email send error:", error);

      if (error instanceof SuppressedEmailError || error?.code === "EMAIL_SUPPRESSED") {
         return res.status(200).json({
            success: true,
            skipped: true,
            message: "Welcome email not sent because recipient is unsubscribed or suppressed"
         });
      }

      res.status(500).json({
         success: false,
         message: error.message,
         error: error.message
      });
   }
};
