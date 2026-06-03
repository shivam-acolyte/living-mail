import Tracking from "../models/Tracking.js";

const EVENT_TYPES = [
  "sent",
  "delivered",
  "open",
  "click",
  "form_submit",
  "bounce",
  "unsubscribe",
  "spam_complaint"
];

const getDateRange = (query) => {
  const match = {};

  if (query.from || query.to) {
    match.createdAt = {};
  }

  if (query.from) {
    match.createdAt.$gte = new Date(query.from);
  }

  if (query.to) {
    match.createdAt.$lte = new Date(query.to);
  }

  return match;
};

const getAnalyticsMatch = (query) => {
  const match = getDateRange(query);

  const addRegexFilter = (field, value) => {
    if (value) {
      match[field] = { $regex: value, $options: "i" };
    }
  };

  if (query.campaignName) {
    addRegexFilter("campaignName", query.campaignName);
  }

  if (query.campaignType) {
    addRegexFilter("campaignType", query.campaignType);
  }

  if (query.templateId) {
    match.templateId = query.templateId;
  }

  if (query.templateSlug) {
    addRegexFilter("templateSlug", query.templateSlug);
  }

  if (query.senderEmail) {
    addRegexFilter("senderEmail", query.senderEmail);
  }

  addRegexFilter("email", query.email);
  addRegexFilter("subject", query.subject);
  addRegexFilter("messageId", query.messageId);
  addRegexFilter("senderProvider", query.senderProvider);
  addRegexFilter("deliveryProvider", query.deliveryProvider);
  addRegexFilter("clickedUrl", query.clickedUrl);
  addRegexFilter("clickedDomain", query.clickedDomain);
  addRegexFilter("render.country", query.country);
  addRegexFilter("render.city", query.city);
  addRegexFilter("render.device", query.device);
  addRegexFilter("render.browser", query.browser);
  addRegexFilter("render.os", query.os);
  addRegexFilter("bounceType", query.bounceType);

  if (query.eventType) {
    match.eventType = query.eventType;
  }

  if (query.isBot === "true" || query.isBot === "false") {
    match.isBot = query.isBot === "true";
  }

  if (query.formField) {
    const formFieldPath = `formSubmission.${query.formField}`;

    if (query.formValue) {
      match[formFieldPath] = { $regex: query.formValue, $options: "i" };
    } else {
      match[formFieldPath] = { $exists: true };
    }
  }

  return match;
};

const safeRate = (value, total) => {
  if (!total) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
};

const normalizeMetrics = (metrics) => {
  const sent = metrics.sent?.total || 0;
  const delivered = metrics.delivered?.total || 0;
  const totalOpens = metrics.open?.total || 0;
  const uniqueOpens = metrics.open?.unique || 0;
  const totalClicks = metrics.click?.total || 0;
  const uniqueClicks = metrics.click?.unique || 0;
  const totalForms = metrics.form_submit?.total || 0;
  const uniqueForms = metrics.form_submit?.unique || 0;
  const bounces = metrics.bounce?.total || 0;
  const unsubscribes = metrics.unsubscribe?.total || 0;
  const spamComplaints = metrics.spam_complaint?.total || 0;
  const deliveredOrSent = delivered || sent || Math.max(uniqueOpens, uniqueClicks, uniqueForms);

  return {
    sent,
    delivered,
    totalOpens,
    uniqueOpens,
    totalClicks,
    uniqueClicks,
    totalForms,
    uniqueForms,
    bounces,
    unsubscribes,
    spamComplaints,
    deliveryRate: safeRate(delivered, sent),
    openRate: safeRate(uniqueOpens, deliveredOrSent),
    clickThroughRate: safeRate(uniqueClicks, deliveredOrSent),
    clickToOpenRate: safeRate(uniqueClicks, uniqueOpens),
    formSubmitRate: safeRate(uniqueForms, deliveredOrSent),
    bounceRate: safeRate(bounces, sent),
    unsubscribeRate: safeRate(unsubscribes, deliveredOrSent),
    spamComplaintRate: safeRate(spamComplaints, deliveredOrSent)
  };
};

const buildMetricProjection = (labelExpression) => ([
  {
    $group: {
      _id: {
        label: labelExpression,
        eventType: "$eventType"
      },
      total: { $sum: 1 },
      uniqueRecipients: { $addToSet: "$trackingId" }
    }
  },
  {
    $group: {
      _id: "$_id.label",
      metrics: {
        $push: {
          eventType: "$_id.eventType",
          total: "$total",
          unique: { $size: "$uniqueRecipients" }
        }
      }
    }
  },
  { $sort: { _id: 1 } }
]);

const normalizeGroupedRows = (rows, labelKey) => {
  return rows.map((row) => {
    const metrics = Object.fromEntries(
      row.metrics.map((metric) => [metric.eventType, metric])
    );

    return {
      [labelKey]: row._id || "Unknown",
      ...normalizeMetrics(metrics)
    };
  });
};

const getGroupedAnalytics = async (match, labelExpression, labelKey) => {
  const rows = await Tracking.aggregate([
    { $match: match },
    ...buildMetricProjection(labelExpression)
  ]);

  return normalizeGroupedRows(rows, labelKey);
};

const getOverview = async (match) => {
  const rows = await Tracking.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$eventType",
        total: { $sum: 1 },
        uniqueRecipients: { $addToSet: "$trackingId" }
      }
    },
    {
      $project: {
        _id: 1,
        total: 1,
        unique: { $size: "$uniqueRecipients" }
      }
    }
  ]);

  const metrics = Object.fromEntries(rows.map((row) => [row._id, row]));
  const uniqueRecipients = await Tracking.distinct("trackingId", match);

  return {
    totalRecipients: uniqueRecipients.length,
    ...normalizeMetrics(metrics)
  };
};

const getFunnel = (overview) => ({
  sent: overview.sent,
  delivered: overview.delivered,
  opened: overview.uniqueOpens,
  clicked: overview.uniqueClicks,
  submitted: overview.uniqueForms,
  deliveryRate: overview.deliveryRate,
  openRate: overview.openRate,
  clickRate: overview.clickThroughRate,
  submitRate: overview.formSubmitRate,
  clickToOpenRate: overview.clickToOpenRate
});

const getTimeline = async (match, interval) => {
  const labelExpression = interval === "hourly"
    ? { $dateToString: { format: "%Y-%m-%d %H:00", date: "$createdAt" } }
    : interval === "weekly"
      ? {
          $concat: [
            { $toString: { $isoWeekYear: "$createdAt" } },
            "-W",
            { $toString: { $isoWeek: "$createdAt" } }
          ]
        }
      : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };

  return getGroupedAnalytics(match, labelExpression, "period");
};

const getBreakdown = async (match, field) => {
  return Tracking.aggregate([
    {
      $match: {
        ...match,
        eventType: { $in: ["open", "click", "form_submit"] }
      }
    },
    {
      $group: {
        _id: `$render.${field}`,
        total: { $sum: 1 },
        uniqueRecipients: { $addToSet: "$trackingId" }
      }
    },
    {
      $project: {
        _id: 0,
        name: { $ifNull: ["$_id", "Unknown"] },
        total: 1,
        unique: { $size: "$uniqueRecipients" }
      }
    },
    { $sort: { total: -1, name: 1 } }
  ]);
};

const getLinkAnalytics = async (match) => {
  return Tracking.aggregate([
    {
      $match: {
        ...match,
        eventType: "click"
      }
    },
    {
      $group: {
        _id: {
          url: "$clickedUrl",
          domain: "$clickedDomain"
        },
        totalClicks: { $sum: 1 },
        uniqueClicks: { $addToSet: "$trackingId" },
        botClicks: {
          $sum: {
            $cond: ["$isBot", 1, 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        url: { $ifNull: ["$_id.url", "Unknown"] },
        domain: { $ifNull: ["$_id.domain", "Unknown"] },
        totalClicks: 1,
        uniqueClicks: { $size: "$uniqueClicks" },
        botClicks: 1
      }
    },
    { $sort: { totalClicks: -1 } },
    { $limit: 25 }
  ]);
};

const getFormFieldAnalytics = async (match) => {
  return Tracking.aggregate([
    {
      $match: {
        ...match,
        eventType: "form_submit"
      }
    },
    {
      $project: {
        fields: { $objectToArray: "$formSubmission" }
      }
    },
    { $unwind: "$fields" },
    {
      $group: {
        _id: {
          field: "$fields.k",
          value: "$fields.v"
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.field": 1, count: -1 } },
    {
      $group: {
        _id: "$_id.field",
        totalResponses: { $sum: "$count" },
        topValues: {
          $push: {
            value: "$_id.value",
            count: "$count"
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        field: "$_id",
        totalResponses: 1,
        topValues: { $slice: ["$topValues", 8] }
      }
    },
    { $sort: { totalResponses: -1 } }
  ]);
};

const getRecipientJourney = async (match) => {
  const rows = await Tracking.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$trackingId",
        email: { $first: "$email" },
        campaignName: { $first: "$campaignName" },
        campaignType: { $first: "$campaignType" },
        templateSlug: { $first: "$templateSlug" },
        senderEmail: { $first: "$senderEmail" },
        firstSentAt: { $min: "$sentAt" },
        lastActivityAt: { $max: "$createdAt" },
        opens: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "open"] }, 1, 0]
          }
        },
        clicks: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "click"] }, 1, 0]
          }
        },
        forms: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "form_submit"] }, 1, 0]
          }
        },
        bounces: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "bounce"] }, 1, 0]
          }
        },
        unsubscribes: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "unsubscribe"] }, 1, 0]
          }
        },
        botEvents: {
          $sum: {
            $cond: ["$isBot", 1, 0]
          }
        },
        events: {
          $push: {
            eventType: "$eventType",
            createdAt: "$createdAt",
            clickedUrl: "$clickedUrl",
            clickedDomain: "$clickedDomain",
            formSubmission: "$formSubmission",
            providerStatus: "$providerStatus",
            deliveryMeta: "$deliveryMeta",
            deliveryStatusRaw: "$deliveryStatusRaw",
            bounceType: "$bounceType",
            bounceReason: "$bounceReason",
            render: "$render",
            isBot: "$isBot",
            botReason: "$botReason"
          }
        }
      }
    },
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: ["$opens", 1] },
            { $multiply: ["$clicks", 3] },
            { $multiply: ["$forms", 8] },
            { $multiply: ["$unsubscribes", -10] },
            { $multiply: ["$bounces", -10] }
          ]
        }
      }
    },
    { $sort: { score: -1, lastActivityAt: -1 } },
    { $limit: 500 }
  ]);

  return rows.map((row) => {
    const events = row.events
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const openEvents = events.filter((event) => event.eventType === "open");
    const clickEvents = events.filter((event) => event.eventType === "click");
    const formEvents = events.filter((event) => event.eventType === "form_submit");
    const deliveryEvents = events.filter((event) => event.eventType === "delivered");
    const bounceEvents = events.filter((event) => event.eventType === "bounce");
    const latestDeliveryEvent = deliveryEvents[deliveryEvents.length - 1] || null;
    const latestBounceEvent = bounceEvents[bounceEvents.length - 1] || null;
    const latestProviderEvent = latestBounceEvent || latestDeliveryEvent || null;
    const lastEvent = events[events.length - 1];
    const knownRenderEvents = events.filter((event) => event.render);
    const locations = [
      ...new Set(
        knownRenderEvents.map((event) => {
          const city = event.render?.city || "Unknown";
          const country = event.render?.country || "Unknown";
          return `${city}, ${country}`;
        })
      )
    ];
    const devices = [...new Set(knownRenderEvents.map((event) => event.render?.device || "Unknown"))];
    const browsers = [...new Set(knownRenderEvents.map((event) => event.render?.browser || "Unknown"))];
    const operatingSystems = [...new Set(knownRenderEvents.map((event) => event.render?.os || "Unknown"))];

    return {
      trackingId: row._id,
      email: row.email || "Unknown",
      campaignName: row.campaignName || "Unknown",
      campaignType: row.campaignType || "Unknown",
      templateSlug: row.templateSlug || "Unknown",
      senderEmail: row.senderEmail || "Unknown",
      firstSentAt: row.firstSentAt,
      firstOpenedAt: openEvents[0]?.createdAt || null,
      firstClickedAt: clickEvents[0]?.createdAt || null,
      firstFormSubmittedAt: formEvents[0]?.createdAt || null,
      firstDeliveredAt: deliveryEvents[0]?.createdAt || null,
      firstBouncedAt: bounceEvents[0]?.createdAt || null,
      lastActivityAt: row.lastActivityAt,
      lastEventType: lastEvent?.eventType || "sent",
      providerStatus: latestProviderEvent?.providerStatus || "",
      deliveryMeta: latestProviderEvent?.deliveryMeta || {},
      bounceType: latestBounceEvent?.bounceType || "",
      bounceReason: latestBounceEvent?.bounceReason || "",
      opens: row.opens,
      clicks: row.clicks,
      forms: row.forms,
      bounces: row.bounces,
      unsubscribes: row.unsubscribes,
      botEvents: row.botEvents,
      score: row.score,
      locations,
      devices,
      browsers,
      operatingSystems,
      lastLocation: locations[locations.length - 1] || "Unknown",
      lastDevice: devices[devices.length - 1] || "Unknown",
      lastBrowser: browsers[browsers.length - 1] || "Unknown",
      clickedLinks: clickEvents.map((event) => ({
        url: event.clickedUrl || "Unknown",
        domain: event.clickedDomain || "Unknown",
        clickedAt: event.createdAt,
        isBot: Boolean(event.isBot),
        botReason: event.botReason || ""
      })),
      formSubmissions: formEvents.map((event) => ({
        submittedAt: event.createdAt,
        data: event.formSubmission || {}
      })),
      events: events.slice(0, 60)
    };
  });
};

const getEngagementLists = async (match) => {
  const journey = await getRecipientJourney(match);

  return {
    topEngagedRecipients: journey
      .filter((recipient) => recipient.score > 0)
      .slice(0, 20),
    coldRecipients: journey
      .filter((recipient) => recipient.opens === 0 && recipient.clicks === 0 && recipient.forms === 0)
      .slice(0, 20),
    recipientJourney: journey
  };
};

const getPerformanceWindows = async (match) => {
  const events = await Tracking
    .find(match)
    .select("trackingId eventType createdAt sentAt")
    .lean();

  const sentAtByTrackingId = new Map();

  events.forEach((event) => {
    if (event.eventType === "sent") {
      const previous = sentAtByTrackingId.get(event.trackingId);
      const sentAt = event.sentAt || event.createdAt;

      if (!previous || new Date(sentAt) < new Date(previous)) {
        sentAtByTrackingId.set(event.trackingId, sentAt);
      }
    }
  });

  const windows = {
    firstHour: {},
    first24Hours: {}
  };

  const addEvent = (bucket, eventType) => {
    bucket[eventType] = (bucket[eventType] || 0) + 1;
  };

  events.forEach((event) => {
    const sentAt = sentAtByTrackingId.get(event.trackingId);

    if (!sentAt || event.eventType === "sent") {
      return;
    }

    const delta = new Date(event.createdAt) - new Date(sentAt);

    if (delta >= 0 && delta <= 60 * 60 * 1000) {
      addEvent(windows.firstHour, event.eventType);
    }

    if (delta >= 0 && delta <= 24 * 60 * 60 * 1000) {
      addEvent(windows.first24Hours, event.eventType);
    }
  });

  return windows;
};

const getBotFiltering = async (match) => {
  const rows = await Tracking.aggregate([
    {
      $match: {
        ...match,
        eventType: { $in: ["open", "click"] }
      }
    },
    {
      $group: {
        _id: {
          eventType: "$eventType",
          isBot: "$isBot"
        },
        total: { $sum: 1 }
      }
    }
  ]);

  const result = {
    opens: { total: 0, suspectedBots: 0, human: 0 },
    clicks: { total: 0, suspectedBots: 0, human: 0 }
  };

  rows.forEach((row) => {
    const key = row._id.eventType === "open" ? "opens" : "clicks";
    result[key].total += row.total;

    if (row._id.isBot) {
      result[key].suspectedBots += row.total;
    } else {
      result[key].human += row.total;
    }
  });

  return result;
};

const getBounceReasons = async (match) => {
  return Tracking.aggregate([
    {
      $match: {
        ...match,
        eventType: "bounce"
      }
    },
    {
      $group: {
        _id: {
          type: "$bounceType",
          reason: "$bounceReason"
        },
        total: { $sum: 1 },
        uniqueRecipients: { $addToSet: "$trackingId" }
      }
    },
    {
      $project: {
        _id: 0,
        type: { $ifNull: ["$_id.type", "unknown"] },
        reason: { $ifNull: ["$_id.reason", "Unknown"] },
        total: 1,
        unique: { $size: "$uniqueRecipients" }
      }
    },
    { $sort: { total: -1 } }
  ]);
};

const getGmailQuotaUsage = async (match) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const dailyLimit = Number(process.env.GMAIL_DAILY_LIMIT || 2000);

  const rows = await Tracking.aggregate([
    {
      $match: {
        ...match,
        eventType: "sent",
        senderProvider: "gmail",
        createdAt: { $gte: startOfToday }
      }
    },
    {
      $group: {
        _id: "$senderEmail",
        sentToday: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        senderEmail: { $ifNull: ["$_id", "Unknown"] },
        provider: "gmail",
        sentToday: 1,
        dailyLimit: { $literal: dailyLimit },
        remainingToday: { $max: [{ $subtract: [dailyLimit, "$sentToday"] }, 0] },
        usageRate: {
          $round: [
            { $multiply: [{ $divide: ["$sentToday", dailyLimit] }, 100] },
            2
          ]
        }
      }
    },
    { $sort: { sentToday: -1 } }
  ]);

  return rows;
};

const getDeepAnalytics = async (match) => {
  const templateLabel = {
    $ifNull: [
      "$templateSlug",
      { $ifNull: ["$templateId", "$templateName"] }
    ]
  };

  const analyticsTasks = [
    () => getOverview(match),
    () => getGroupedAnalytics(match, "$campaignName", "campaignName"),
    () => getGroupedAnalytics(match, templateLabel, "template"),
    () => getGroupedAnalytics(match, "$campaignType", "campaignType"),
    () => getGroupedAnalytics(match, "$senderEmail", "senderEmail"),
    () => getTimeline(match, "hourly"),
    () => getTimeline(match, "daily"),
    () => getTimeline(match, "weekly"),
    () => getBreakdown(match, "browser"),
    () => getBreakdown(match, "device"),
    () => getBreakdown(match, "os"),
    () => getBreakdown(match, "country"),
    () => getBreakdown(match, "city"),
    () => getLinkAnalytics(match),
    () => getFormFieldAnalytics(match),
    () => getEngagementLists(match),
    () => getPerformanceWindows(match),
    () => getBotFiltering(match),
    () => getBounceReasons(match),
    () => getGmailQuotaUsage(match)
  ];
  const analyticsResults = [];
  const analyticsConcurrency = Number(process.env.ANALYTICS_QUERY_CONCURRENCY || 3);

  for (let index = 0; index < analyticsTasks.length; index += analyticsConcurrency) {
    const batch = analyticsTasks.slice(index, index + analyticsConcurrency);
    analyticsResults.push(...await Promise.all(batch.map((task) => task())));
  }

  const [
    overview,
    campaignComparison,
    templatePerformance,
    campaignTypePerformance,
    senderAccountPerformance,
    hourlyPerformance,
    dailyPerformance,
    weeklyPerformance,
    browsers,
    devices,
    operatingSystems,
    countries,
    cities,
    linkAnalytics,
    formFieldAnalytics,
    engagementLists,
    performanceWindows,
    botFiltering,
    bounceReasons,
    gmailQuotaUsage
  ] = analyticsResults;

  return {
    overview,
    funnel: getFunnel(overview),
    campaignOverview: overview,
    campaignComparison,
    recipientJourney: engagementLists.recipientJourney,
    receiverDetails: engagementLists.recipientJourney,
    linkAnalytics,
    formFieldAnalytics,
    deviceAnalytics: devices,
    browserAnalytics: browsers,
    geoAnalytics: {
      countries,
      cities
    },
    timeline: {
      hourly: hourlyPerformance,
      daily: dailyPerformance,
      weekly: weeklyPerformance,
      firstHour: performanceWindows.firstHour,
      first24Hours: performanceWindows.first24Hours
    },
    templatePerformance,
    senderAccountPerformance,
    gmailQuotaUsage,
    bounceReasons,
    topEngagedRecipients: engagementLists.topEngagedRecipients,
    coldRecipients: engagementLists.coldRecipients,
    conversionRateByCampaignType: campaignTypePerformance,
    botFiltering,
    breakdowns: {
      browsers,
      devices,
      operatingSystems,
      countries,
      cities
    }
  };
};

const escapeCsvValue = (value) => {
  const stringValue = value === undefined || value === null ? "" : String(value);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }

  return stringValue;
};

const toCsv = (rows) => {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(","))
  ];

  return lines.join("\n");
};

const getReceiverCsvRows = async (match) => {
  const receivers = await getRecipientJourney(match);

  return receivers.map((receiver) => ({
    email: receiver.email,
    campaignName: receiver.campaignName,
    campaignType: receiver.campaignType,
    templateSlug: receiver.templateSlug,
    senderEmail: receiver.senderEmail,
    sentAt: receiver.firstSentAt || "",
    deliveredAt: receiver.firstDeliveredAt || "",
    bouncedAt: receiver.firstBouncedAt || "",
    providerStatus: receiver.providerStatus || "",
    statusCode: receiver.deliveryMeta?.statusCode || "",
    responseMessage: receiver.deliveryMeta?.responseMessage || "",
    queue: receiver.deliveryMeta?.queue || "",
    deliveryIp: receiver.deliveryMeta?.ip || "",
    tlsCipher: receiver.deliveryMeta?.tlsCipher || "",
    peerAddress: receiver.deliveryMeta?.peerAddress || "",
    bounceType: receiver.bounceType || "",
    bounceReason: receiver.bounceReason || "",
    firstOpenedAt: receiver.firstOpenedAt || "",
    firstClickedAt: receiver.firstClickedAt || "",
    firstFormSubmittedAt: receiver.firstFormSubmittedAt || "",
    lastActivityAt: receiver.lastActivityAt || "",
    opens: receiver.opens,
    clicks: receiver.clicks,
    forms: receiver.forms,
    bounces: receiver.bounces,
    unsubscribes: receiver.unsubscribes,
    botEvents: receiver.botEvents,
    locations: receiver.locations.join(" | "),
    devices: receiver.devices.join(" | "),
    browsers: receiver.browsers.join(" | "),
    clickedLinks: receiver.clickedLinks.map((link) => link.url).join(" | "),
    formSubmissions: receiver.formSubmissions
      .map((submission) => JSON.stringify(submission.data))
      .join(" | "),
    score: receiver.score
  }));
};

const getFormFillCsvRows = async (match) => {
  const formRows = await Tracking
    .find({
      ...match,
      eventType: "form_submit"
    })
    .sort({ createdAt: -1 })
    .lean();

  const fieldNames = [
    ...new Set(
      formRows.flatMap((row) => Object.keys(row.formSubmission || {}))
    )
  ].sort();

  return formRows.map((row) => {
    const baseRow = {
      email: row.email || "",
      trackingId: row.trackingId || "",
      campaignName: row.campaignName || "",
      campaignType: row.campaignType || "",
      subject: row.subject || "",
      templateId: row.templateId || "",
      templateSlug: row.templateSlug || "",
      templateName: row.templateName || "",
      senderEmail: row.senderEmail || "",
      senderProvider: row.senderProvider || "",
      submittedAt: row.formSubmitAt || row.createdAt || "",
      country: row.render?.country || "",
      city: row.render?.city || "",
      device: row.render?.device || "",
      browser: row.render?.browser || "",
      os: row.render?.os || "",
      ip: row.render?.ip || "",
      isBot: row.isBot || false,
      botReason: row.botReason || ""
    };

    fieldNames.forEach((fieldName) => {
      baseRow[`form_${fieldName}`] = row.formSubmission?.[fieldName] ?? "";
    });

    return baseRow;
  });
};

export const analyticsOverview = async (req, res) => {
  try {
    const match = getAnalyticsMatch(req.query);
    const analytics = await getDeepAnalytics(match);

    return res.json({
      success: true,
      filters: {
        from: req.query.from || null,
        to: req.query.to || null,
        campaignName: req.query.campaignName || null,
        campaignType: req.query.campaignType || null,
        templateId: req.query.templateId || null,
        templateSlug: req.query.templateSlug || null,
        senderEmail: req.query.senderEmail || null
      },
      analytics: {
        totalUsers: analytics.overview.totalRecipients,
        totalSent: analytics.overview.sent,
        totalDelivered: analytics.overview.delivered,
        totalOpens: analytics.overview.totalOpens,
        totalClicks: analytics.overview.totalClicks,
        totalForms: analytics.overview.totalForms,
        totalBounces: analytics.overview.bounces,
        totalUnsubscribes: analytics.overview.unsubscribes,
        totalSpamComplaints: analytics.overview.spamComplaints,
        uniqueOpens: analytics.overview.uniqueOpens,
        uniqueClicks: analytics.overview.uniqueClicks,
        uniqueForms: analytics.overview.uniqueForms,
        funnel: analytics.funnel,
        campaignAnalytics: analytics.campaignComparison,
        templateAnalytics: analytics.templatePerformance,
        graphData: {
          hourly: analytics.timeline.hourly,
          daily: analytics.timeline.daily,
          weekly: analytics.timeline.weekly
        },
        ...analytics
      }
    });
  } catch (err) {
    console.error("ANALYTICS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Analytics error"
    });
  }
};

export const deepAnalytics = analyticsOverview;

export const exportAnalyticsCsv = async (req, res) => {
  try {
    const match = getAnalyticsMatch(req.query);
    const templateLabel = {
      $ifNull: [
        "$templateSlug",
        { $ifNull: ["$templateId", "$templateName"] }
      ]
    };
    const groupBy = req.query.groupBy || "campaign";

    const groupConfig = {
      campaign: {
        labelExpression: "$campaignName",
        labelKey: "campaignName",
        fileName: "campaign-analytics.csv"
      },
      template: {
        labelExpression: templateLabel,
        labelKey: "template",
        fileName: "template-analytics.csv"
      },
      daily: {
        labelExpression: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        labelKey: "period",
        fileName: "daily-analytics.csv"
      },
      sender: {
        labelExpression: "$senderEmail",
        labelKey: "senderEmail",
        fileName: "sender-analytics.csv"
      },
      campaignType: {
        labelExpression: "$campaignType",
        labelKey: "campaignType",
        fileName: "campaign-type-analytics.csv"
      }
    };

    if (groupBy === "receiver" || groupBy === "recipient") {
      const rows = await getReceiverCsvRows(match);
      const csv = toCsv(rows);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="receiver-details.csv"'
      );

      return res.send(csv);
    }

    if (groupBy === "form" || groupBy === "forms" || groupBy === "formFill") {
      const rows = await getFormFillCsvRows(match);
      const csv = toCsv(rows);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="form-fill-data.csv"'
      );

      return res.send(csv);
    }

    const config = groupConfig[groupBy] || groupConfig.campaign;
    const rows = await getGroupedAnalytics(match, config.labelExpression, config.labelKey);
    const csv = toCsv(rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${config.fileName}"`
    );

    return res.send(csv);
  } catch (err) {
    console.error("CSV EXPORT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Analytics CSV export failed"
    });
  }
};
