import BulkEmailCampaign from "../models/BulkEmailCampaign.js";
import BulkEmailRecipient from "../models/BulkEmailRecipient.js";
import Tracking from "../models/Tracking.js";
import sendTrackingEmail from "./emailService.js";
import { getSuppressedEmailSet, SuppressedEmailError } from "./suppressionService.js";

const numberEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const MAX_CAMPAIGN_EMAILS = numberEnv("MAX_CAMPAIGN_EMAILS", 100000);
const DAILY_SENDER_LIMIT = numberEnv("DAILY_SENDER_LIMIT", 25000);
const BULK_EMAIL_BATCH_SIZE = numberEnv("BULK_EMAIL_BATCH_SIZE", 100);
const BULK_EMAIL_BATCH_DELAY_MS = numberEnv("BULK_EMAIL_BATCH_DELAY_MS", 2000);
const BULK_EMAIL_WORKER_INTERVAL_MS = numberEnv("BULK_EMAIL_WORKER_INTERVAL_MS", 10000);
const STALE_LOCK_MS = numberEnv("BULK_EMAIL_STALE_LOCK_MS", 5 * 60 * 1000);
const BULK_EMAIL_SEND_CONCURRENCY = numberEnv("BULK_EMAIL_SEND_CONCURRENCY", 10);
const BULK_EMAIL_MAX_RETRY_ATTEMPTS = numberEnv("BULK_EMAIL_MAX_RETRY_ATTEMPTS", 3);
const BULK_EMAIL_RETRY_BASE_DELAY_MS = numberEnv("BULK_EMAIL_RETRY_BASE_DELAY_MS", 60 * 1000);
const BULK_EMAIL_POLL_LIMIT = numberEnv("BULK_EMAIL_POLL_LIMIT", 2);
const DEFAULT_SCHEDULE_TIMEZONE_OFFSET = process.env.SCHEDULE_TIMEZONE_OFFSET || "+05:30";

let workerStarted = false;
let workerRunning = false;
let workerTimer = null;
let stopRequested = false;

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const assertId = (value, label = "id") => {
  if (!String(value || "").trim()) {
    throw new Error(`Invalid ${label}`);
  }
};

const getErrorCode = (error) => {
  return String(
    error?.responseCode ||
    error?.code ||
    error?.command ||
    ""
  );
};

const isRetryableSendError = (error) => {
  const responseCode = Number(error?.responseCode);

  if (responseCode >= 400 && responseCode < 500) {
    return true;
  }

  if (responseCode >= 500) {
    return false;
  }

  return [
    "ECONNECTION",
    "ETIMEDOUT",
    "ECONNRESET",
    "EPIPE",
    "ENOTFOUND",
    "EAI_AGAIN"
  ].includes(error?.code);
};

const getRetryDelay = (attempts) => {
  return BULK_EMAIL_RETRY_BASE_DELAY_MS * Math.max(attempts, 1);
};

const runWithConcurrency = async (items, limit, handler) => {
  const executing = new Set();

  for (const item of items) {
    const promise = Promise
      .resolve()
      .then(() => handler(item))
      .finally(() => {
        executing.delete(promise);
      });

    executing.add(promise);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
};

const normalizeRecipients = (recipients = []) => {
  return recipients
    .map((recipient) => {
      if (typeof recipient === "string") {
        return {
          email: recipient.trim().toLowerCase(),
          variables: {}
        };
      }

      return {
        email: String(recipient?.email || "").trim().toLowerCase(),
        variables: recipient?.variables || {}
      };
    })
    .filter((recipient) => recipient.email);
};

const parseScheduleDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const scheduleValue = String(value).trim();
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(scheduleValue);
  const hasTime = /t|\s+\d{1,2}:/i.test(scheduleValue);
  const valueWithTime = hasTime ? scheduleValue : `${scheduleValue}T00:00:00`;
  const normalizedValue = hasTimezone
    ? scheduleValue
    : `${valueWithTime}${DEFAULT_SCHEDULE_TIMEZONE_OFFSET}`;
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getDayStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const getRemainingDailyCapacity = async (senderEmail) => {
  const sentToday = await Tracking.countDocuments({
    senderEmail,
    eventType: "sent",
    createdAt: {
      $gte: getDayStart()
    }
  });

  return Math.max(DAILY_SENDER_LIMIT - sentToday, 0);
};

const enqueueCampaign = async () => {};

export const createBulkEmailCampaign = async ({
  recipients,
  subject,
  campaignName,
  campaignType,
  templateId,
  templateSlug,
  variables = {},
  senderEmail,
  replyTo,
  scheduledAt
}) => {
  const normalizedRecipients = normalizeRecipients(recipients);

  if (!campaignName) {
    throw new Error("Campaign name is required");
  }

  if (!normalizedRecipients.length) {
    throw new Error("At least one recipient is required");
  }

  if (normalizedRecipients.length > MAX_CAMPAIGN_EMAILS) {
    throw new Error(`Campaign recipient limit is ${MAX_CAMPAIGN_EMAILS}`);
  }

  const scheduleDate = parseScheduleDate(scheduledAt);

  if (scheduledAt && !scheduleDate) {
    throw new Error("Invalid schedule time");
  }

  const campaign = await BulkEmailCampaign.create({
    subject,
    campaignName,
    campaignType,
    templateId,
    templateSlug,
    variables,
    senderEmail: senderEmail || process.env.SMTP_FROM,
    replyTo: replyTo || senderEmail || process.env.SMTP_FROM,
    status: scheduleDate ? "scheduled" : "pending",
    scheduledAt: scheduleDate,
    totalRecipients: normalizedRecipients.length
  });

  const recipientDocs = normalizedRecipients.map((recipient) => ({
    campaignId: campaign._id,
    email: recipient.email,
    variables: recipient.variables
  }));

  await BulkEmailRecipient.insertMany(recipientDocs, {
    ordered: false
  });

  if (!scheduleDate || scheduleDate <= new Date()) {
    await enqueueCampaign(campaign._id);
  }

  return campaign;
};

export const getBulkEmailCampaign = async (campaignId) => {
  assertId(campaignId, "campaign id");

  const [campaign, recipientStatus] = await Promise.all([
    BulkEmailCampaign.findById(campaignId).lean(),
    BulkEmailRecipient.aggregate([
      {
        $match: {
          campaignId
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
    ])
  ]);

  return {
    campaign,
    recipientStatus
  };
};

export const pauseBulkEmailCampaign = async (campaignId) => {
  return BulkEmailCampaign.findByIdAndUpdate(
    campaignId,
    { status: "paused" },
    { returnDocument: "after" }
  );
};

export const cancelBulkEmailCampaign = async (campaignId) => {
  assertId(campaignId, "campaign id");

  const campaign = await BulkEmailCampaign.findOneAndUpdate(
    {
      _id: campaignId,
      status: {
        $in: ["draft", "scheduled", "pending", "paused"]
      }
    },
    {
      $set: {
        status: "cancelled",
        lastError: "Campaign cancelled before completion",
        completedAt: new Date()
      }
    },
    {
      returnDocument: "after"
    }
  );

  if (campaign) {
    await BulkEmailRecipient.updateMany(
      {
        campaignId: campaign._id,
        status: {
          $in: ["pending", "processing"]
        }
      },
      {
        $set: {
          status: "skipped",
          skipReason: "cancelled"
        },
        $unset: {
          lockedAt: ""
        }
      }
    );
  }

  return campaign;
};

export const resumeBulkEmailCampaign = async (campaignId) => {
  const existingCampaign = await BulkEmailCampaign.findById(campaignId).lean();

  if (!existingCampaign) {
    return null;
  }

  const shouldStayScheduled = existingCampaign.scheduledAt &&
    new Date(existingCampaign.scheduledAt) > new Date();

  const campaign = await BulkEmailCampaign.findByIdAndUpdate(
    campaignId,
    {
      status: shouldStayScheduled ? "scheduled" : "pending",
      lastError: ""
    },
    { returnDocument: "after" }
  );

  if (campaign) {
    await enqueueCampaign(campaign._id);
  }

  return campaign;
};

export const rescheduleBulkEmailCampaign = async (campaignId, scheduledAt) => {
  assertId(campaignId, "campaign id");

  if (!scheduledAt) {
    throw new Error("Schedule time is required");
  }

  const nextDate = parseScheduleDate(scheduledAt);

  if (!nextDate) {
    throw new Error("Invalid schedule time");
  }

  const status = nextDate > new Date() ? "scheduled" : "pending";

  const campaign = await BulkEmailCampaign.findOneAndUpdate(
    {
      _id: campaignId,
      status: {
        $in: ["draft", "scheduled", "pending", "paused"]
      }
    },
    {
      $set: {
        scheduledAt: nextDate,
        status,
        lastError: ""
      }
    },
    {
      returnDocument: "after"
    }
  );

  if (campaign && status === "pending") {
    await enqueueCampaign(campaign._id);
  }

  return campaign;
};

export const sendBulkEmailCampaignNow = async (campaignId) => {
  assertId(campaignId, "campaign id");

  const campaign = await BulkEmailCampaign.findOneAndUpdate(
    {
      _id: campaignId,
      status: {
        $in: ["draft", "scheduled", "paused"]
      }
    },
    {
      $set: {
        status: "pending",
        scheduledAt: new Date(),
        lastError: ""
      }
    },
    {
      returnDocument: "after"
    }
  );

  if (campaign) {
    await enqueueCampaign(campaign._id);
  }

  return campaign;
};

export const retryFailedBulkEmailCampaign = async (campaignId) => {
  assertId(campaignId, "campaign id");

  const result = await BulkEmailRecipient.updateMany(
    {
      campaignId,
      status: "failed"
    },
    {
      $set: {
        status: "pending"
      },
      $unset: {
        error: "",
        errorCode: "",
        nextAttemptAt: "",
        lockedAt: ""
      }
    }
  );

  const campaign = await BulkEmailCampaign.findByIdAndUpdate(
    campaignId,
    {
      $set: {
        status: "pending",
        lastError: ""
      }
    },
    {
      returnDocument: "after"
    }
  );

  if (campaign) {
    await enqueueCampaign(campaign._id);
  }

  return {
    campaign,
    retried: result.modifiedCount || 0
  };
};

export const duplicateBulkEmailCampaign = async (campaignId) => {
  assertId(campaignId, "campaign id");

  const campaign = await BulkEmailCampaign.findById(campaignId).lean();

  if (!campaign) {
    return null;
  }

  const copy = await BulkEmailCampaign.create({
    subject: campaign.subject,
    campaignName: `${campaign.campaignName} Copy`,
    campaignType: campaign.campaignType,
    templateId: campaign.templateId,
    templateSlug: campaign.templateSlug,
    variables: campaign.variables,
    senderEmail: campaign.senderEmail,
    replyTo: campaign.replyTo,
    status: "draft",
    totalRecipients: campaign.totalRecipients
  });

  const recipients = await BulkEmailRecipient
    .find({ campaignId: campaign._id })
    .select("email variables")
    .lean();

  if (recipients.length) {
    await BulkEmailRecipient.insertMany(
      recipients.map((recipient) => ({
        campaignId: copy._id,
        email: recipient.email,
        variables: recipient.variables
      })),
      {
        ordered: false
      }
    );
  }

  return copy;
};

const releaseStaleLocks = async (campaignId) => {
  const staleBefore = new Date(Date.now() - STALE_LOCK_MS);

  await BulkEmailRecipient.updateMany(
    {
      campaignId,
      status: "processing",
      lockedAt: {
        $lt: staleBefore
      }
    },
    {
      $set: {
        status: "pending"
      },
      $unset: {
        lockedAt: ""
      }
    }
  );
};

const claimRecipients = async (campaignId, limit) => {
  const recipients = await BulkEmailRecipient
    .find({
      campaignId,
      status: "pending",
      $or: [
        { nextAttemptAt: { $exists: false } },
        { nextAttemptAt: null },
        { nextAttemptAt: { $lte: new Date() } }
      ]
    })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  if (!recipients.length) {
    return [];
  }

  const ids = recipients.map((recipient) => recipient._id);

  await BulkEmailRecipient.updateMany(
    {
      _id: {
        $in: ids
      },
      status: "pending"
    },
    {
      $set: {
        status: "processing",
        lockedAt: new Date(),
        lastAttemptAt: new Date()
      },
      $inc: {
        attempts: 1
      }
    }
  );

  return BulkEmailRecipient
    .find({
      _id: {
        $in: ids
      },
      status: "processing"
    })
    .lean();
};

const markRecipientSkipped = async (recipientId, reason) => {
  await BulkEmailRecipient.findByIdAndUpdate(recipientId, {
    $set: {
      status: "skipped",
      skipReason: reason
    },
    $unset: {
      lockedAt: ""
    }
  });
};

const markRecipientFailed = async (recipientId, error) => {
  const recipient = await BulkEmailRecipient.findById(recipientId).lean();
  const attempts = recipient?.attempts || 1;
  const retryable = isRetryableSendError(error);
  const shouldRetry = retryable && attempts < BULK_EMAIL_MAX_RETRY_ATTEMPTS;
  const nextAttemptAt = shouldRetry
    ? new Date(Date.now() + getRetryDelay(attempts))
    : null;

  await BulkEmailRecipient.findByIdAndUpdate(recipientId, {
    $set: {
      status: shouldRetry ? "pending" : "failed",
      error: error.message,
      errorCode: getErrorCode(error),
      ...(nextAttemptAt ? { nextAttemptAt } : {})
    },
    $unset: {
      lockedAt: "",
      ...(nextAttemptAt ? {} : { nextAttemptAt: "" })
    }
  });
};

const markRecipientSent = async (recipientId, info) => {
  await BulkEmailRecipient.findByIdAndUpdate(recipientId, {
    $set: {
      status: "sent",
      messageId: info?.messageId,
      sentAt: new Date()
    },
    $unset: {
      lockedAt: "",
      nextAttemptAt: ""
    }
  });
};

const refreshCampaignCounts = async (campaignId) => {
  const [campaign, counts] = await Promise.all([
    BulkEmailCampaign.findById(campaignId).lean(),
    BulkEmailRecipient.aggregate([
      {
        $match: {
          campaignId
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
    ])
  ]);

  const countMap = Object.fromEntries(
    counts.map((row) => [row._id, row.total])
  );
  const pending = countMap.pending || 0;
  const processing = countMap.processing || 0;
  const sent = countMap.sent || 0;
  const failed = countMap.failed || 0;
  const skipped = countMap.skipped || 0;
  const complete = pending === 0 && processing === 0;
  const nextStatus = complete
    ? "completed"
    : campaign?.status === "paused"
      ? "paused"
      : "running";

  await BulkEmailCampaign.findByIdAndUpdate(campaignId, {
    $set: {
      sent,
      failed,
      skipped,
      status: nextStatus,
      completedAt: complete ? new Date() : null
    }
  });

  return {
    pending,
    processing,
    sent,
    failed,
    skipped,
    complete
  };
};

const processRecipient = async (recipient, campaign) => {
  try {
    const info = await sendTrackingEmail(
      recipient.email,
      campaign.subject,
      campaign.campaignName,
      campaign.campaignType,
      {
        templateId: campaign.templateId,
        templateSlug: campaign.templateSlug,
        skipVerify: true,
        variables: {
          ...(campaign.variables || {}),
          ...(recipient.variables || {})
        },
        senderEmail: campaign.senderEmail,
        replyTo: campaign.replyTo
      }
    );

    await markRecipientSent(recipient._id, info);
  } catch (error) {
    if (error instanceof SuppressedEmailError || error?.code === "EMAIL_SUPPRESSED") {
      await markRecipientSkipped(recipient._id, "suppressed");
      return;
    }

    await markRecipientFailed(recipient._id, error);
  }
};

const processCampaign = async (campaign) => {
  if (!campaign || campaign.status === "paused" || campaign.status === "completed") {
    return;
  }

  await releaseStaleLocks(campaign._id);

  await BulkEmailCampaign.findByIdAndUpdate(campaign._id, {
    $set: {
      status: "running",
      startedAt: campaign.startedAt || new Date()
    }
  });

  const capacity = await getRemainingDailyCapacity(campaign.senderEmail || process.env.SMTP_FROM);

  if (!capacity) {
    await BulkEmailCampaign.findByIdAndUpdate(campaign._id, {
      $set: {
        status: "paused",
        lastError: "Daily sender limit reached"
      }
    });
    return;
  }

  const batchSize = Math.min(BULK_EMAIL_BATCH_SIZE, capacity);
  const recipients = await claimRecipients(campaign._id, batchSize);

  if (!recipients.length) {
    await refreshCampaignCounts(campaign._id);
    return;
  }

  const suppressedEmails = await getSuppressedEmailSet(
    recipients.map((recipient) => recipient.email)
  );

  const sendableRecipients = [];

  for (const recipient of recipients) {
    if (suppressedEmails.has(recipient.email)) {
      await markRecipientSkipped(recipient._id, "suppressed");
    } else {
      sendableRecipients.push(recipient);
    }
  }

  await runWithConcurrency(
    sendableRecipients,
    BULK_EMAIL_SEND_CONCURRENCY,
    (recipient) => processRecipient(recipient, campaign)
  );

  await refreshCampaignCounts(campaign._id);
  await sleep(BULK_EMAIL_BATCH_DELAY_MS);

  const latestCampaign = await BulkEmailCampaign.findById(campaign._id).lean();
  const pendingCount = await BulkEmailRecipient.countDocuments({
    campaignId: campaign._id,
    status: "pending"
  });

  if (latestCampaign?.status === "running" && pendingCount > 0) {
    await BulkEmailCampaign.findByIdAndUpdate(campaign._id, {
      $set: {
        status: "pending"
      }
    });
  }
};

const processNextCampaigns = async () => {
  if (workerRunning) {
    return;
  }

  workerRunning = true;

  try {
    const campaigns = await BulkEmailCampaign
      .find({
        $or: [
          {
            status: {
              $in: ["pending", "running"]
            }
          },
          {
            status: "scheduled",
            scheduledAt: {
              $lte: new Date()
            }
          }
        ]
      })
      .sort({
        createdAt: 1
      })
      .limit(BULK_EMAIL_POLL_LIMIT)
      .lean();

    for (const campaign of campaigns) {
      if (stopRequested) {
        break;
      }

      await processCampaign(campaign);
    }
  } catch (error) {
    console.error("BULK EMAIL WORKER ERROR:", error);
  } finally {
    workerRunning = false;
  }
};

const mongoWorkerLoop = async () => {
  if (!workerStarted || stopRequested) {
    return;
  }

  await processNextCampaigns();

  if (workerStarted && !stopRequested) {
    workerTimer = setTimeout(mongoWorkerLoop, BULK_EMAIL_WORKER_INTERVAL_MS);
  }
};

export const startBulkEmailWorker = () => {
  if (workerStarted) {
    return;
  }

  workerStarted = true;
  stopRequested = false;

  console.log("Bulk email PostgreSQL worker running");
  mongoWorkerLoop();
};

export const stopBulkEmailWorker = async () => {
  stopRequested = true;
  workerStarted = false;

  if (workerTimer) {
    clearTimeout(workerTimer);
    workerTimer = null;
  }

  while (workerRunning) {
    await sleep(250);
  }
};
