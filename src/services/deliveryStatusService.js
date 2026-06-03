import Tracking from "../models/Tracking.js";

const DEFAULT_STATUS_URL =
  "https://insights.startupflora.co/api/v1/webhooks/maildelivery-status";

const getNestedValue = (source, paths) => {
  for (const path of paths) {
    const value = path
      .split(".")
      .reduce((current, key) => {
        if (Array.isArray(current)) {
          return current[0]?.[key];
        }

        return current?.[key];
      }, source);

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
};

const getFirstRawRequestBody = (record) => {
  if (Array.isArray(record?.raw_request?.body)) {
    return record.raw_request.body[0];
  }

  if (Array.isArray(record?.raw_request)) {
    return record.raw_request[0];
  }

  return record?.raw_request;
};

const expandRecord = (record) => ({
  ...record,
  raw_request_body: getFirstRawRequestBody(record)
});

const toArrayPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return (
    payload?.data ||
    payload?.events ||
    payload?.statuses ||
    payload?.results ||
    payload?.items ||
    payload?.records ||
    []
  );
};

const normalizeStatus = (value) => {
  const status = String(value || "").toLowerCase();

  if (["delivered", "delivery", "success", "sent_delivered", "ok delivered"].includes(status)) {
    return "delivered";
  }

  if (
    status.includes("bounce") ||
    status.includes("failed") ||
    status.includes("dropped") ||
    status.includes("undelivered") ||
    status.includes("reject") ||
    status.includes("rejected")
  ) {
    return "bounce";
  }

  if (status.includes("spam") || status.includes("complaint")) {
    return "spam_complaint";
  }

  return null;
};

const normalizeBounceType = (record) => {
  const value = getNestedValue(record, [
    "bounceType",
    "bounce_type",
    "type",
    "event",
    "event_type",
    "raw_event.event",
    "raw_event.type",
    "raw_request.event",
    "raw_request.type",
    "bounce.category",
    "category"
  ]);
  const text = String(value || "").toLowerCase();

  if (text.includes("hard")) {
    return "hard";
  }

  if (text.includes("soft")) {
    return "soft";
  }

  if (text.includes("reject") || text.includes("failed") || text.includes("dropped")) {
    return "hard";
  }

  return null;
};

const normalizeEvent = (inputRecord) => {
  const record = expandRecord(inputRecord);
  const providerStatus = getNestedValue(record, [
    "event_type",
    "raw_event.type",
    "raw_event.event",
    "raw_request_body.type",
    "raw_request_body.event",
    "raw_request.type",
    "raw_request.event",
    "raw_event.response.content",
    "raw_request_body.response.content",
    "status",
    "event",
    "eventType",
    "event_type",
    "deliveryStatus",
    "delivery_status",
    "mail.status"
  ]);
  const responseMessage = getNestedValue(record, [
    "response_message",
    "raw_event.response.content",
    "raw_request_body.response.content",
    "raw_request.response.content"
  ]);
  const statusCode = getNestedValue(record, [
    "status_code",
    "raw_event.response.code",
    "raw_request_body.response.code",
    "raw_request.response.code"
  ]);
  const eventType =
    normalizeStatus(providerStatus) ||
    normalizeStatus(responseMessage) ||
    (Number(statusCode) >= 200 && Number(statusCode) < 300 ? "delivered" : null);

  if (!eventType) {
    return null;
  }

  return {
    eventType,
    providerStatus: providerStatus || responseMessage,
    senderEmail: getNestedValue(record, [
      "sender",
      "raw_event.sender",
      "raw_request_body.sender",
      "raw_request.sender"
    ]),
    subject: getNestedValue(record, [
      "subject",
      "raw_event.headers.Subject",
      "raw_request_body.headers.Subject",
      "raw_request.headers.Subject"
    ]),
    trackingId: getNestedValue(record, [
    "trackingId",
    "tracking_id",
      "raw_event.trackingId",
      "raw_event.tracking_id",
      "raw_request_body.trackingId",
      "raw_request_body.tracking_id",
      "raw_request.trackingId",
    "raw_request.tracking_id",
    "metadata.trackingId",
      "metadata.tracking_id",
      "custom.trackingId",
      "custom_args.trackingId"
    ]),
    messageId: getNestedValue(record, [
    "messageId",
    "message_id",
      "raw_event.messageId",
      "raw_event.message_id",
      "raw_event.headers.Message-ID",
      "raw_request_body.messageId",
      "raw_request_body.message_id",
      "raw_request_body.headers.Message-ID",
      "raw_request.messageId",
    "raw_request.message_id",
    "raw_request.headers.Message-ID",
    "mail.messageId",
      "mail.message_id",
      "smtp.messageId",
      "smtp-id"
    ]),
    email: getNestedValue(record, [
    "email",
    "recipient",
      "raw_event.email",
      "raw_event.recipient",
      "raw_request_body.email",
      "raw_request_body.recipient",
      "raw_request.email",
    "raw_request.recipient",
    "recipientEmail",
      "recipient_email",
      "to",
      "mail.to",
      "envelope.to"
    ]),
    providerEventId: getNestedValue(record, [
      "raw_event.id",
      "raw_request_body.id",
      "raw_request.id",
      "id",
      "eventId",
      "event_id",
      "providerEventId",
      "provider_event_id"
    ]),
    occurredAt: getNestedValue(record, [
    "timestamp",
    "time",
    "request_timestamp",
    "event_time",
    "created_time",
    "created_at",
    "raw_event.event_time",
    "raw_event.created_time",
    "raw_request_body.event_time",
    "raw_request_body.created_time",
    "raw_request_body.timestamp",
    "raw_request.event_time",
    "raw_request.created_time",
    "createdAt",
      "created_at",
      "eventTime",
      "event_time"
    ]),
    bounceType: normalizeBounceType(record),
    bounceReason: getNestedValue(record, [
    "reason",
    "response_message",
    "raw_event.response.content",
    "raw_request_body.response.content",
    "raw_request.response.content",
    "bounceReason",
      "bounce_reason",
      "error",
      "message",
      "diagnostic",
      "response"
    ]),
    meta: {
      queue: getNestedValue(record, ["queue", "raw_event.queue", "raw_request_body.queue"]),
      statusCode,
      responseMessage,
      ip: getNestedValue(record, ["ip"]),
      size: getNestedValue(record, ["size", "raw_event.size", "raw_request_body.size"]),
      attempts: getNestedValue(record, ["num_attempts", "raw_event.num_attempts", "raw_request_body.num_attempts"]),
      sessionId: getNestedValue(record, ["raw_event.session_id", "raw_request_body.session_id"]),
      tlsCipher: getNestedValue(record, ["raw_event.tls_cipher", "raw_request_body.tls_cipher"]),
      peerAddress: getNestedValue(record, ["raw_event.peer_address.name", "raw_request_body.peer_address.name"]),
      bounceClassification: getNestedValue(record, [
        "raw_event.bounce_classification",
        "raw_request_body.bounce_classification"
      ])
    },
    raw: record
  };
};

const buildSentMatch = (event) => {
  const or = [];

  if (event.trackingId) {
    or.push({ trackingId: event.trackingId });
  }

  if (event.messageId) {
    or.push({ messageId: event.messageId });
  }

  if (event.email) {
    or.push({ email: event.email, eventType: "sent" });
  }

  if (event.email && event.subject) {
    or.push({
      email: event.email,
      subject: event.subject,
      eventType: "sent"
    });
  }

  return or.length ? { $or: or } : null;
};

const getEventDate = (value) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
};

const buildTrackingEvent = (event, sentEvent) => {
  const occurredAt = getEventDate(event.occurredAt);
  const base = {
    trackingId: sentEvent?.trackingId || event.trackingId,
    email: sentEvent?.email || event.email,
    subject: sentEvent?.subject || event.subject,
    campaignName: sentEvent?.campaignName,
    campaignType: sentEvent?.campaignType,
    templateId: sentEvent?.templateId,
    templateSlug: sentEvent?.templateSlug,
    templateName: sentEvent?.templateName,
    messageId: sentEvent?.messageId || event.messageId,
    senderEmail: sentEvent?.senderEmail || event.senderEmail,
    senderProvider: sentEvent?.senderProvider,
    deliveryProvider: sentEvent?.deliveryProvider || "maildelivery-status",
    providerEventId: event.providerEventId,
    providerStatus: event.providerStatus,
    deliveryMeta: event.meta,
    deliveryStatusRaw: event.raw,
    eventType: event.eventType
  };

  if (event.eventType === "delivered") {
    base.deliveredAt = occurredAt;
  }

  if (event.eventType === "bounce") {
    base.bouncedAt = occurredAt;
    base.bounceType = event.bounceType;
    base.bounceReason = event.bounceReason;
  }

  if (event.eventType === "spam_complaint") {
    base.complainedAt = occurredAt;
  }

  return base;
};

const hasExistingEvent = async (event, sentEvent) => {
  const query = {
    eventType: event.eventType,
    $or: []
  };

  if (event.providerEventId) {
    query.$or.push({ providerEventId: event.providerEventId });
  }

  if (sentEvent?.trackingId || event.trackingId) {
    query.$or.push({
      trackingId: sentEvent?.trackingId || event.trackingId,
      eventType: event.eventType
    });
  }

  if (sentEvent?.messageId || event.messageId) {
    query.$or.push({
      messageId: sentEvent?.messageId || event.messageId,
      eventType: event.eventType
    });
  }

  if (event.email && event.providerStatus) {
    query.$or.push({
      email: event.email,
      providerStatus: event.providerStatus,
      eventType: event.eventType
    });
  }

  if (!query.$or.length) {
    return false;
  }

  const existing = await Tracking.findOne(query).lean();
  return Boolean(existing);
};

export const syncDeliveryStatuses = async () => {
  const url = process.env.MAIL_STATUS_WEBHOOK_URL || DEFAULT_STATUS_URL;
  const headers = {};

  if (process.env.MAIL_STATUS_API_KEY) {
    headers.Authorization = `Bearer ${process.env.MAIL_STATUS_API_KEY}`;
    headers["x-api-key"] = process.env.MAIL_STATUS_API_KEY;
  }

  const response = await fetch(url, {
    method: "GET",
    headers
  });

  if (!response.ok) {
    throw new Error(`Delivery status API failed with ${response.status}`);
  }

  const payload = await response.json();
  const records = toArrayPayload(payload);

  if (!Array.isArray(records)) {
    throw new Error("Delivery status API response is not an array");
  }

  const result = {
    fetched: records.length,
    processed: 0,
    inserted: 0,
    skipped: 0,
    unmatched: 0,
    errors: []
  };

  for (const record of records) {
    try {
      const event = normalizeEvent(record);

      if (!event) {
        result.skipped += 1;
        continue;
      }

      result.processed += 1;

      const sentMatch = buildSentMatch(event);
      const sentEvent = sentMatch
        ? await Tracking.findOne({
            ...sentMatch,
            eventType: "sent"
          }).sort({ createdAt: -1 }).lean()
        : null;

      if (!sentEvent && !event.trackingId && !event.messageId && !event.email) {
        result.unmatched += 1;
        continue;
      }

      if (await hasExistingEvent(event, sentEvent)) {
        result.skipped += 1;
        continue;
      }

      await Tracking.create(buildTrackingEvent(event, sentEvent));
      result.inserted += 1;
    } catch (error) {
      result.errors.push(error.message);
    }
  }

  return result;
};
