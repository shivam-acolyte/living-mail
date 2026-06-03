import sendTrackingEmail
from "../services/emailService.js";
import { SuppressedEmailError } from "../services/suppressionService.js";
import {
  createBulkEmailCampaign,
  getBulkEmailCampaign,
  pauseBulkEmailCampaign,
  resumeBulkEmailCampaign
} from "../services/bulkEmailService.js";
import { resolveRecipients } from "../services/contactService.js";
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
         senderEmail,
         replyTo,
         replyToEmail
      } = req.body;

      if (!email) {

         return res.status(400).json({
            success: false,
            message: "Email is required"
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
            senderEmail,
            replyTo: replyTo || replyToEmail
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
      senderEmail,
      replyTo,
      replyToEmail,
      scheduledAt
    } = req.body;

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
      senderEmail,
      replyTo: replyTo || replyToEmail,
      scheduledAt
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
      senderEmail,
      replyTo,
      replyToEmail,
      scheduledAt,
      saveContacts,
      listId,
      saveListId,
      listName,
      tags
    } = req.body;

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
      senderEmail,
      replyTo: replyTo || replyToEmail,
      scheduledAt
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
