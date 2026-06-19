import Tracking from "../models/Tracking.js";
import DeliveryStatusEvent from "../models/DeliveryStatusEvent.js";
import { postgres } from "../config/postgres.js";

// simple in-memory cache for deep analytics to speed up repeated requests
const deepCache = new Map();
const deepOngoing = new Map();
const DEEP_CACHE_TTL = Number(process.env.DEEP_ANALYTICS_TTL_MS || 60 * 1000); // default 60s

const makeQueryKey = (query) => {
  // stable stringify for query object
  const entries = Object.entries(query || {}).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(Object.fromEntries(entries));
};

const getCachedDeepAnalytics = async (match, queryKey, force = false) => {
  const now = Date.now();
  const cached = deepCache.get(queryKey);

  if (!force && cached && (now - cached.ts) < DEEP_CACHE_TTL) {
    return cached.data;
  }

  if (deepOngoing.has(queryKey)) {
    return deepOngoing.get(queryKey);
  }

  const promise = (async () => {
    try {
      const data = await getDeepAnalytics(match);
      deepCache.set(queryKey, { ts: Date.now(), data });
      return data;
    } finally {
      deepOngoing.delete(queryKey);
    }
  })();

  deepOngoing.set(queryKey, promise);
  return promise;
};

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
    const toDate = new Date(query.to);
    if (typeof query.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
      toDate.setUTCHours(23, 59, 59, 999);
    }
    match.createdAt.$lte = toDate;
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

const DELIVERY_STATUS_FILTER_FIELDS = new Set([
  "createdAt",
  "trackingId",
  "email",
  "subject",
  "campaignName",
  "campaignType",
  "templateId",
  "templateSlug",
  "templateName",
  "messageId",
  "senderEmail",
  "senderProvider",
  "deliveryProvider",
  "providerStatus",
  "bounceType"
]);

const getDeliveryStatusMatch = (match = {}) => {
  if (match.eventType && match.eventType !== "delivered") {
    return null;
  }

  const deliveryMatch = {
    eventType: "delivered"
  };

  for (const [field, condition] of Object.entries(match)) {
    if (field === "eventType") {
      continue;
    }

    if (!DELIVERY_STATUS_FILTER_FIELDS.has(field)) {
      return null;
    }

    deliveryMatch[field] = condition;
  }

  return deliveryMatch;
};

const getDeliveredMetric = async (match) => {
  const deliveryMatch = getDeliveryStatusMatch(match);

  if (!deliveryMatch) {
    return null;
  }

  const trackingIds = await DeliveryStatusEvent.distinct("trackingId", deliveryMatch);
  const emails = trackingIds.length
    ? []
    : await DeliveryStatusEvent.distinct("email", deliveryMatch);
  const unique = trackingIds.length || emails.length;

  return {
    total: unique,
    unique
  };
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
  const rows = await Tracking.aggregateMetricsBy(match, labelExpression) || await Tracking.aggregate([
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
  const deliveredMetric = await getDeliveredMetric(match);

  if (deliveredMetric?.total) {
    metrics.delivered = deliveredMetric;
  }

  const { sql: trackingWhere, values: trackingParams } = Tracking.buildWhere(match);
  const trackingSql = `SELECT DISTINCT tracking_id FROM tracking_events ${trackingWhere ? `WHERE ${trackingWhere}` : ""}`;

  let unionSql = trackingSql;
  let unionParams = [...trackingParams];

  const deliveryMatch = getDeliveryStatusMatch(match);
  if (deliveryMatch) {
    const { sql: deliveryWhere, values: deliveryParams } = DeliveryStatusEvent.buildWhere(deliveryMatch);
    let deliveryWhereShifted = deliveryWhere;
    const offset = trackingParams.length;
    if (offset > 0 && deliveryWhere) {
      deliveryWhereShifted = deliveryWhere.replace(/\$(\d+)/g, (_, num) => `$${Number(num) + offset}`);
    }

    unionSql = `
      SELECT tracking_id FROM (${trackingSql}) AS t
      UNION
      SELECT tracking_id FROM delivery_status_events ${deliveryWhereShifted ? `WHERE ${deliveryWhereShifted}` : ""}
    `;
    unionParams = [...trackingParams, ...deliveryParams];
  }

  const countQuery = `SELECT COUNT(*)::int AS count FROM (${unionSql}) AS u WHERE tracking_id IS NOT NULL`;
  const countResult = await postgres.query(countQuery, unionParams);
  const totalRecipients = countResult.rows[0]?.count || 0;

  return {
    totalRecipients,
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
  const queryMatch = {
    ...match,
    eventType: { $in: ["open", "click", "form_submit"] }
  };
  const { sql: whereSql, values } = Tracking.buildWhere(queryMatch);
  const sqlWhere = whereSql ? `WHERE ${whereSql}` : "";

  const query = `
    SELECT 
      COALESCE(render->>'${field}', 'Unknown') AS name,
      COUNT(*)::int AS total,
      COUNT(DISTINCT tracking_id)::int AS unique
    FROM tracking_events
    ${sqlWhere}
    GROUP BY name
    ORDER BY total DESC, name ASC
  `;

  const result = await postgres.query(query, values);
  return result.rows;
};

const getLinkAnalytics = async (match) => {
  const queryMatch = {
    ...match,
    eventType: "click"
  };
  const { sql: whereSql, values } = Tracking.buildWhere(queryMatch);
  const sqlWhere = whereSql ? `WHERE ${whereSql}` : "";

  const query = `
    SELECT 
      COALESCE(clicked_url, 'Unknown') AS url,
      COALESCE(clicked_domain, 'Unknown') AS domain,
      COUNT(*)::int AS "totalClicks",
      COUNT(DISTINCT tracking_id)::int AS "uniqueClicks",
      SUM(CASE WHEN is_bot = true THEN 1 ELSE 0 END)::int AS "botClicks"
    FROM tracking_events
    ${sqlWhere}
    GROUP BY clicked_url, clicked_domain
    ORDER BY "totalClicks" DESC
    LIMIT 25
  `;

  const result = await postgres.query(query, values);
  return result.rows;
};

const getDeliveryEventsByTrackingId = async (match, trackingIds = []) => {
  const deliveryMatch = getDeliveryStatusMatch(match);
  const knownTrackingIds = trackingIds.filter(Boolean);

  if (!deliveryMatch || !knownTrackingIds.length) {
    return new Map();
  }

  const queryMatch = {
    ...deliveryMatch,
    trackingId: { $in: knownTrackingIds }
  };
  const { sql: whereSql, values } = DeliveryStatusEvent.buildWhere(queryMatch);
  const sqlWhere = whereSql ? `WHERE ${whereSql}` : "";

  const query = `
    SELECT 
      tracking_id AS "trackingId",
      event_type AS "eventType",
      occurred_at AS "occurredAt",
      created_at AS "createdAt",
      provider_status AS "providerStatus",
      delivery_meta AS "deliveryMeta",
      bounce_type AS "bounceType",
      bounce_reason AS "bounceReason"
    FROM delivery_status_events
    ${sqlWhere}
    ORDER BY created_at ASC
  `;

  const result = await postgres.query(query, values);
  const eventsByTrackingId = new Map();

  for (const event of result.rows) {
    const events = eventsByTrackingId.get(event.trackingId) || [];
    events.push({
      eventType: event.eventType,
      createdAt: event.occurredAt || event.createdAt,
      providerStatus: event.providerStatus,
      deliveryMeta: event.deliveryMeta,
      bounceType: event.bounceType,
      bounceReason: event.bounceReason
    });
    eventsByTrackingId.set(event.trackingId, events);
  }

  return eventsByTrackingId;
};

const getFormFieldAnalytics = async (match) => {
  const queryMatch = {
    ...match,
    eventType: "form_submit"
  };
  const { sql: whereSql, values } = Tracking.buildWhere(queryMatch);
  const sqlWhere = whereSql ? `WHERE ${whereSql}` : "";

  const query = `
    WITH fields AS (
      SELECT f.key AS field, f.value AS value
      FROM tracking_events, LATERAL jsonb_each_text(form_submission) f
      ${sqlWhere}
    ),
    grouped AS (
      SELECT field, value, COUNT(*)::int AS count
      FROM fields
      GROUP BY field, value
    ),
    ranked AS (
      SELECT field, value, count,
             ROW_NUMBER() OVER (PARTITION BY field ORDER BY count DESC) as rn
      FROM grouped
    )
    SELECT 
      field, 
      SUM(count)::int AS "totalResponses",
      COALESCE(
        json_agg(json_build_object('value', value, 'count', count) ORDER BY count DESC) FILTER (WHERE rn <= 8),
        '[]'::json
      ) AS "topValues"
    FROM ranked
    GROUP BY field
    ORDER BY "totalResponses" DESC
  `;

  const result = await postgres.query(query, values);
  return result.rows;
};

const getRecipientJourney = async (match) => {
  const { sql: whereSql, values } = Tracking.buildWhere(match);
  const sqlWhere = whereSql ? `WHERE ${whereSql}` : "";

  const query = `
    SELECT 
      tracking_id AS "trackingId",
      MIN(email) AS email,
      MIN(campaign_name) AS "campaignName",
      MIN(campaign_type) AS "campaignType",
      MIN(template_slug) AS "templateSlug",
      MIN(sender_email) AS "senderEmail",
      MIN(sent_at) AS "firstSentAt",
      MAX(created_at) AS "lastActivityAt",
      SUM(CASE WHEN event_type = 'open' THEN 1 ELSE 0 END)::int AS opens,
      SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END)::int AS clicks,
      SUM(CASE WHEN event_type = 'form_submit' THEN 1 ELSE 0 END)::int AS forms,
      SUM(CASE WHEN event_type = 'bounce' THEN 1 ELSE 0 END)::int AS bounces,
      SUM(CASE WHEN event_type = 'unsubscribe' THEN 1 ELSE 0 END)::int AS unsubscribes,
      SUM(CASE WHEN is_bot = true THEN 1 ELSE 0 END)::int AS "botEvents",
      (
        SUM(CASE WHEN event_type = 'open' THEN 1 ELSE 0 END) * 1 +
        SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) * 3 +
        SUM(CASE WHEN event_type = 'form_submit' THEN 1 ELSE 0 END) * 8 +
        SUM(CASE WHEN event_type = 'unsubscribe' THEN 1 ELSE 0 END) * -10 +
        SUM(CASE WHEN event_type = 'bounce' THEN 1 ELSE 0 END) * -10
      )::int AS score
    FROM tracking_events
    ${sqlWhere}
    GROUP BY tracking_id
    ORDER BY score DESC, "lastActivityAt" DESC
    LIMIT 500
  `;

  const result = await postgres.query(query, values);
  const trackingIds = result.rows.map((row) => row.trackingId).filter(Boolean);

  const eventsByTrackingId = new Map();
  if (trackingIds.length > 0) {
    const journeyEventsMatch = {
      ...match,
      trackingId: { $in: trackingIds }
    };
    const { sql: eventsWhereSql, values: eventsValues } = Tracking.buildWhere(journeyEventsMatch);
    const eventsQuery = `
      SELECT 
        tracking_id AS "trackingId",
        event_type AS "eventType",
        created_at AS "createdAt",
        clicked_url AS "clickedUrl",
        clicked_domain AS "clickedDomain",
        form_submission AS "formSubmission",
        provider_status AS "providerStatus",
        delivery_meta AS "deliveryMeta",
        bounce_type AS "bounceType",
        bounce_reason AS "bounceReason",
        render,
        is_bot AS "isBot",
        bot_reason AS "botReason"
      FROM tracking_events
      WHERE ${eventsWhereSql}
    `;
    const eventsResult = await postgres.query(eventsQuery, eventsValues);
    for (const event of eventsResult.rows) {
      const tId = event.trackingId;
      if (!eventsByTrackingId.has(tId)) {
        eventsByTrackingId.set(tId, []);
      }
      eventsByTrackingId.get(tId).push(event);
    }
  }

  const rows = result.rows.map((row) => {
    const events = eventsByTrackingId.get(row.trackingId) || [];
    return {
      ...row,
      _id: row.trackingId,
      events
    };
  });

  const deliveryEventsByTrackingId = await getDeliveryEventsByTrackingId(
    match,
    rows.map((row) => row._id)
  );

  return rows.map((row) => {
    const events = [
      ...(row.events || []),
      ...(deliveryEventsByTrackingId.get(row._id) || [])
    ]
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
      events: events.slice(0, 60).map((event) => ({
        eventType: event.eventType,
        createdAt: event.createdAt,
        clickedUrl: event.clickedUrl || "",
        clickedDomain: event.clickedDomain || "",
        formSubmission: event.formSubmission || {},
        providerStatus: event.providerStatus || "",
        deliveryMeta: event.deliveryMeta || {},
        bounceType: event.bounceType || "",
        bounceReason: event.bounceReason || "",
        render: event.render || {},
        isBot: Boolean(event.isBot),
        botReason: event.botReason || ""
      }))
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
  const { sql: whereSql, values } = Tracking.buildWhere(match);
  const sqlWhere = whereSql ? `WHERE ${whereSql}` : "";

  const query = `
    WITH filtered_events AS (
      SELECT tracking_id, event_type, created_at, sent_at
      FROM tracking_events
      ${sqlWhere}
    ),
    sent_times AS (
      SELECT 
        tracking_id, 
        MIN(COALESCE(sent_at, created_at)) AS sent_time
      FROM filtered_events
      WHERE event_type = 'sent'
      GROUP BY tracking_id
    ),
    events_with_delta AS (
      SELECT 
        f.event_type,
        EXTRACT(EPOCH FROM (f.created_at - s.sent_time)) AS delta_seconds
      FROM filtered_events f
      JOIN sent_times s ON f.tracking_id = s.tracking_id
      WHERE f.event_type != 'sent'
    )
    SELECT 
      event_type AS "eventType",
      SUM(CASE WHEN delta_seconds >= 0 AND delta_seconds <= 3600 THEN 1 ELSE 0 END)::int AS count_1h,
      SUM(CASE WHEN delta_seconds >= 0 AND delta_seconds <= 86400 THEN 1 ELSE 0 END)::int AS count_24h
    FROM events_with_delta
    GROUP BY event_type
  `;

  const dbResult = await postgres.query(query, values);

  const windows = {
    firstHour: {},
    first24Hours: {}
  };

  dbResult.rows.forEach((row) => {
    if (row.count_1h > 0) {
      windows.firstHour[row.eventType] = row.count_1h;
    }
    if (row.count_24h > 0) {
      windows.first24Hours[row.eventType] = row.count_24h;
    }
  });

  return windows;
};

const getBotFiltering = async (match) => {
  const queryMatch = {
    ...match,
    eventType: { $in: ["open", "click"] }
  };
  const { sql: whereSql, values } = Tracking.buildWhere(queryMatch);
  const sqlWhere = whereSql ? `WHERE ${whereSql}` : "";

  const query = `
    SELECT 
      event_type AS "eventType",
      is_bot AS "isBot",
      COUNT(*)::int AS total
    FROM tracking_events
    ${sqlWhere}
    GROUP BY event_type, is_bot
  `;

  const dbResult = await postgres.query(query, values);
  const result = {
    opens: { total: 0, suspectedBots: 0, human: 0 },
    clicks: { total: 0, suspectedBots: 0, human: 0 }
  };

  dbResult.rows.forEach((row) => {
    const key = row.eventType === "open" ? "opens" : "clicks";
    result[key].total += row.total;

    if (row.isBot) {
      result[key].suspectedBots += row.total;
    } else {
      result[key].human += row.total;
    }
  });

  return result;
};

const getBounceReasons = async (match) => {
  const queryMatch = {
    ...match,
    eventType: "bounce"
  };
  const { sql: whereSql, values } = Tracking.buildWhere(queryMatch);
  const sqlWhere = whereSql ? `WHERE ${whereSql}` : "";

  const query = `
    SELECT 
      COALESCE(bounce_type, 'unknown') AS type,
      COALESCE(bounce_reason, 'Unknown') AS reason,
      COUNT(*)::int AS total,
      COUNT(DISTINCT tracking_id)::int AS unique
    FROM tracking_events
    ${sqlWhere}
    GROUP BY bounce_type, bounce_reason
    ORDER BY total DESC
  `;

  const result = await postgres.query(query, values);
  return result.rows;
};

const getGmailQuotaUsage = async (match) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const dailyLimit = Number(process.env.GMAIL_DAILY_LIMIT || 2000);

  const queryMatch = {
    ...match,
    eventType: "sent",
    senderProvider: "gmail",
    createdAt: { $gte: startOfToday }
  };
  const { sql: whereSql, values } = Tracking.buildWhere(queryMatch);
  const sqlWhere = whereSql ? `WHERE ${whereSql}` : "";

  const query = `
    SELECT 
      COALESCE(sender_email, 'Unknown') AS "senderEmail",
      'gmail' AS provider,
      COUNT(*)::int AS "sentToday",
      ${dailyLimit}::int AS "dailyLimit",
      GREATEST(${dailyLimit} - COUNT(*), 0)::int AS "remainingToday",
      ROUND((COUNT(*)::numeric / ${dailyLimit}) * 100, 2)::float AS "usageRate"
    FROM tracking_events
    ${sqlWhere}
    GROUP BY sender_email
    ORDER BY "sentToday" DESC
  `;

  const result = await postgres.query(query, values);
  return result.rows;
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
  const analyticsConcurrency = Number(process.env.ANALYTICS_QUERY_CONCURRENCY || 5);

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

export const deepAnalytics = async (req, res) => {
  try {
    const match = getAnalyticsMatch(req.query);
    const queryKey = makeQueryKey(req.query);
    const force = req.query.force === "true";

    const analytics = await getCachedDeepAnalytics(match, queryKey, force);

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
    console.error("DEEP ANALYTICS ERROR:", err);
    return res.status(500).json({ success: false, message: "Deep analytics error" });
  }
};

export const analyticsSummary = async (req, res) => {
  try {
    const match = getAnalyticsMatch(req.query);

    // lightweight summary: overview + hourly timeline
    const overview = await getOverview(match);
    const hourly = await getTimeline(match, "hourly");

    // warm full analytics in background to make deep results faster for next request
    warmDeepCache(req.query);

    return res.json({
      success: true,
      analytics: {
        totalUsers: overview.totalRecipients,
        totalSent: overview.sent,
        totalDelivered: overview.delivered,
        totalOpens: overview.totalOpens,
        totalClicks: overview.totalClicks,
        totalForms: overview.totalForms,
        totalBounces: overview.bounces,
        totalUnsubscribes: overview.unsubscribes,
        totalSpamComplaints: overview.spamComplaints,
        uniqueOpens: overview.uniqueOpens,
        uniqueClicks: overview.uniqueClicks,
        uniqueForms: overview.uniqueForms,
        funnel: getFunnel(overview),
        graphData: {
          hourly
        }
      }
    });
  } catch (err) {
    console.error("ANALYTICS SUMMARY ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Analytics summary error"
    });
  }
};

// warm the deep analytics cache in background when summary is requested
const warmDeepCache = (reqQuery) => {
  try {
    const match = getAnalyticsMatch(reqQuery || {});
    const key = makeQueryKey(reqQuery || {});
    // kick off compute but don't await
    getCachedDeepAnalytics(match, key, false).catch((err) => {
      console.warn("Warm deep analytics failed:", err?.message || err);
    });
  } catch (err) {
    console.warn("Warm deep cache error:", err?.message || err);
  }
};

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
