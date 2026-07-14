import Contact from "../models/Contact.js";
import Tracking from "../models/Tracking.js";
import BlockedEmail from "../models/BlockedEmail.js";

const SUPPRESSED_CONTACT_STATUSES = ["unsubscribed", "bounced", "complained"];

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export class SuppressedEmailError extends Error {
  constructor(email, reason = "suppressed") {
    super(`Email is ${reason}: ${email}`);
    this.name = "SuppressedEmailError";
    this.code = "EMAIL_SUPPRESSED";
    this.email = email;
    this.reason = reason;
  }
}

export const getSuppressedEmailSet = async (emails = []) => {
  const normalizedEmails = [...new Set(emails.map(normalizeEmail).filter(Boolean))];

  if (!normalizedEmails.length) {
    return new Set();
  }

  const [trackingSuppressed, contactSuppressed, adminBlocked] = await Promise.all([
    Tracking.distinct("email", {
      email: {
        $in: normalizedEmails
      },
      $or: [
        { eventType: "unsubscribe" },
        { eventType: "spam_complaint" },
        {
          eventType: "bounce",
          bounceType: "hard"
        }
      ]
    }),
    Contact.distinct("email", {
      email: {
        $in: normalizedEmails
      },
      status: {
        $in: SUPPRESSED_CONTACT_STATUSES
      }
    }),
    BlockedEmail.distinct("email", {
      email: {
        $in: normalizedEmails
      }
    })
  ]);

  return new Set([
    ...trackingSuppressed.map(normalizeEmail),
    ...contactSuppressed.map(normalizeEmail),
    ...adminBlocked.map(normalizeEmail)
  ]);
};

export const isEmailSuppressed = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  const suppressedEmails = await getSuppressedEmailSet([normalizedEmail]);
  return suppressedEmails.has(normalizedEmail);
};

export const assertEmailIsSendable = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  if (await isEmailSuppressed(normalizedEmail)) {
    throw new SuppressedEmailError(normalizedEmail, "suppressed");
  }
};
