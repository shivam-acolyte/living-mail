import Contact from "../models/Contact.js";
import ContactList from "../models/ContactList.js";
import Tracking from "../models/Tracking.js";
import { getSuppressedEmailSet } from "./suppressionService.js";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const upsertContact = async ({
  email,
  firstName,
  lastName,
  phone,
  company,
  tags = [],
  customFields = {},
  status,
  source = "manual"
}) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  return Contact.findOneAndUpdate(
    {
      email: normalizedEmail
    },
    {
      $set: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(company !== undefined ? { company } : {}),
        ...(status ? { status } : {}),
        source,
        customFields
      },
      $addToSet: {
        tags: {
          $each: tags
        }
      }
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true
    }
  );
};

export const buildContactMatchFromSegment = (segment = {}) => {
  const match = {};

  if (segment.status) {
    match.status = segment.status;
  } else {
    match.status = "subscribed";
  }

  if (Array.isArray(segment.tags) && segment.tags.length) {
    match.tags = {
      $all: segment.tags
    };
  }

  if (segment.search) {
    match.$or = [
      { email: new RegExp(segment.search, "i") },
      { firstName: new RegExp(segment.search, "i") },
      { lastName: new RegExp(segment.search, "i") },
      { company: new RegExp(segment.search, "i") }
    ];
  }

  if (segment.fields && typeof segment.fields === "object") {
    for (const [key, value] of Object.entries(segment.fields)) {
      match[`customFields.${key}`] = value;
    }
  }

  if (segment.notActiveDays) {
    const inactiveBefore = new Date(Date.now() - Number(segment.notActiveDays) * 24 * 60 * 60 * 1000);
    match.$or = [
      ...(match.$or || []),
      { lastActivityAt: { $lte: inactiveBefore } },
      { lastActivityAt: { $exists: false } },
      { lastActivityAt: null }
    ];
  }

  return match;
};

const filterByTrackingRule = async (contacts, segment = {}) => {
  const needsTrackingFilter = segment.openedCampaign ||
    segment.clickedUrl ||
    segment.clickedDomain ||
    segment.submittedFormCampaign;

  if (!needsTrackingFilter) {
    return contacts;
  }

  const emails = contacts.map((contact) => contact.email);
  const trackingMatch = {
    email: {
      $in: emails
    }
  };

  if (segment.openedCampaign) {
    trackingMatch.eventType = "open";
    trackingMatch.campaignName = segment.openedCampaign;
  }

  if (segment.clickedUrl) {
    trackingMatch.eventType = "click";
    trackingMatch.clickedUrl = {
      $regex: segment.clickedUrl,
      $options: "i"
    };
  }

  if (segment.clickedDomain) {
    trackingMatch.eventType = "click";
    trackingMatch.clickedDomain = {
      $regex: segment.clickedDomain,
      $options: "i"
    };
  }

  if (segment.submittedFormCampaign) {
    trackingMatch.eventType = "form_submit";
    trackingMatch.campaignName = segment.submittedFormCampaign;
  }

  const matchingEmails = await Tracking.distinct("email", trackingMatch);
  const matchingSet = new Set(matchingEmails.map(normalizeEmail));

  return contacts.filter((contact) => matchingSet.has(contact.email));
};

export const resolveContactsForSegment = async (segment = {}, limit = 5000) => {
  const contacts = await Contact
    .find(buildContactMatchFromSegment(segment))
    .limit(limit)
    .lean();

  return filterByTrackingRule(contacts, segment);
};

export const resolveRecipients = async ({
  recipients,
  emails,
  listId,
  segment,
  includeSuppressed = false
}) => {
  if (Array.isArray(recipients) || Array.isArray(emails)) {
    return recipients || emails;
  }

  let contacts = [];

  if (listId) {
    if (!String(listId || "").trim()) {
      throw new Error("Invalid contact list id");
    }

    const list = await ContactList.findById(listId).lean();

    if (!list) {
      throw new Error("Contact list not found");
    }

    contacts = await Contact
      .find({
        _id: {
          $in: list.contactIds || []
        },
        status: "subscribed"
      })
      .lean();
  } else if (segment) {
    contacts = await resolveContactsForSegment(segment);
  }

  const mapped = contacts.map((contact) => ({
    email: contact.email,
    variables: {
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      company: contact.company,
      ...(contact.customFields || {})
    }
  }));

  if (includeSuppressed || !mapped.length) {
    return mapped;
  }

  const suppressed = await getSuppressedEmailSet(mapped.map((recipient) => recipient.email));

  return mapped.filter((recipient) => !suppressed.has(recipient.email));
};
