import BulkEmailCampaign from "../models/BulkEmailCampaign.js";
import BulkEmailRecipient from "../models/BulkEmailRecipient.js";
import Tracking from "../models/Tracking.js";
import { toCsv } from "../utils/csv.js";
import {
  cancelBulkEmailCampaign,
  duplicateBulkEmailCampaign,
  rescheduleBulkEmailCampaign,
  retryFailedBulkEmailCampaign,
  sendBulkEmailCampaignNow
} from "../services/bulkEmailService.js";

const safeRate = (value, total) => {
  if (!total) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
};

const getCampaignTrackingMatch = (campaign) => ({
  campaignName: campaign.campaignName,
  ...(campaign.templateId ? { templateId: campaign.templateId } : {}),
  ...(campaign.templateSlug ? { templateSlug: campaign.templateSlug } : {})
});

const normalizeStats = (eventRows, campaign) => {
  const counts = Object.fromEntries(eventRows.map((row) => [row._id, row]));
  const sent = campaign.sent || counts.sent?.total || 0;
  const delivered = counts.delivered?.total || 0;
  const uniqueOpens = counts.open?.unique || 0;
  const uniqueClicks = counts.click?.unique || 0;
  const uniqueForms = counts.form_submit?.unique || 0;
  const bounces = counts.bounce?.total || 0;
  const unsubscribes = counts.unsubscribe?.total || 0;
  const spamComplaints = counts.spam_complaint?.total || 0;
  const deliveredOrSent = delivered || sent;

  return {
    totalRecipients: campaign.totalRecipients,
    sent,
    failed: campaign.failed,
    skipped: campaign.skipped,
    delivered,
    totalOpens: counts.open?.total || 0,
    uniqueOpens,
    totalClicks: counts.click?.total || 0,
    uniqueClicks,
    totalForms: counts.form_submit?.total || 0,
    uniqueForms,
    bounces,
    unsubscribes,
    spamComplaints,
    deliveryRate: safeRate(delivered, sent),
    openRate: safeRate(uniqueOpens, deliveredOrSent),
    clickRate: safeRate(uniqueClicks, deliveredOrSent),
    formSubmitRate: safeRate(uniqueForms, deliveredOrSent),
    bounceRate: safeRate(bounces, sent),
    unsubscribeRate: safeRate(unsubscribes, deliveredOrSent)
  };
};

export const listCampaigns = async (req, res) => {
  const query = {};

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.search) {
    query.$or = [
      { campaignName: new RegExp(req.query.search, "i") },
      { subject: new RegExp(req.query.search, "i") },
      { campaignType: new RegExp(req.query.search, "i") }
    ];
  }

  const sort = req.query.status === "scheduled"
    ? { scheduledAt: 1, createdAt: -1 }
    : { createdAt: -1 };

  const campaigns = await BulkEmailCampaign
    .find(query)
    .sort(sort)
    .limit(Math.min(Number(req.query.limit) || 100, 500))
    .lean();

  return res.json({
    success: true,
    campaigns
  });
};

export const getCampaignStats = async (req, res) => {
  const campaign = await BulkEmailCampaign.findById(req.params.id).lean();

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: "Campaign not found"
    });
  }

  const eventRows = await Tracking.aggregate([
    {
      $match: getCampaignTrackingMatch(campaign)
    },
    {
      $group: {
        _id: "$eventType",
        total: {
          $sum: 1
        },
        uniqueRecipients: {
          $addToSet: "$trackingId"
        }
      }
    },
    {
      $project: {
        total: 1,
        unique: {
          $size: "$uniqueRecipients"
        }
      }
    }
  ]);

  const recipientStatus = await BulkEmailRecipient.aggregate([
    {
      $match: {
        campaignId: campaign._id
      }
    },
    {
      $group: {
        _id: "$status",
        total: {
          $sum: 1
        }
      }
    }
  ]);

  return res.json({
    success: true,
    campaign,
    stats: normalizeStats(eventRows, campaign),
    recipientStatus
  });
};

export const listCampaignRecipients = async (req, res) => {
  const query = {
    campaignId: req.params.id
  };

  if (req.query.status) {
    query.status = req.query.status;
  }

  const recipients = await BulkEmailRecipient
    .find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 500, 5000))
    .lean();

  return res.json({
    success: true,
    recipients
  });
};

export const getCampaignActivity = async (req, res) => {
  const campaign = await BulkEmailCampaign.findById(req.params.id).lean();

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: "Campaign not found"
    });
  }

  const activity = await Tracking
    .find(getCampaignTrackingMatch(campaign))
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 500, 5000))
    .lean();

  return res.json({
    success: true,
    activity
  });
};

export const duplicateCampaign = async (req, res) => {
  try {
    const campaign = await duplicateBulkEmailCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    return res.status(201).json({
      success: true,
      message: "Campaign duplicated",
      campaign
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const rescheduleCampaign = async (req, res) => {
  try {
    const campaign = await rescheduleBulkEmailCampaign(
      req.params.id,
      req.body?.scheduledAt
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found or cannot be rescheduled"
      });
    }

    return res.json({
      success: true,
      message: "Campaign schedule updated",
      campaign
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const sendCampaignNow = async (req, res) => {
  try {
    const campaign = await sendBulkEmailCampaignNow(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found or cannot be sent now"
      });
    }

    return res.json({
      success: true,
      message: "Campaign queued to send now",
      campaign
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const cancelCampaign = async (req, res) => {
  try {
    const campaign = await cancelBulkEmailCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found or cannot be cancelled"
      });
    }

    return res.json({
      success: true,
      message: "Campaign cancelled",
      campaign
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const retryFailedCampaignRecipients = async (req, res) => {
  try {
    const result = await retryFailedBulkEmailCampaign(req.params.id);

    if (!result.campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    return res.json({
      success: true,
      message: "Failed recipients queued for retry",
      ...result
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const exportFailedRecipientsCsv = async (req, res) => {
  const recipients = await BulkEmailRecipient
    .find({
      campaignId: req.params.id,
      status: {
        $in: ["failed", "skipped"]
      }
    })
    .sort({ createdAt: -1 })
    .lean();

  const rows = recipients.map((recipient) => ({
    email: recipient.email,
    status: recipient.status,
    attempts: recipient.attempts,
    error: recipient.error || "",
    errorCode: recipient.errorCode || "",
    skipReason: recipient.skipReason || ""
  }));

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="failed-recipients.csv"');

  return res.send(toCsv(rows));
};
