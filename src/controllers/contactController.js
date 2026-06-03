import Contact from "../models/Contact.js";
import ContactList from "../models/ContactList.js";
import Tracking from "../models/Tracking.js";
import { parseCsv, toCsv } from "../utils/csv.js";
import {
  resolveContactsForSegment,
  upsertContact
} from "../services/contactService.js";

const parseArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const getContactQuery = (query) => {
  const match = {};

  if (query.status) {
    match.status = query.status;
  }

  if (query.tag) {
    match.tags = query.tag;
  }

  if (query.search) {
    match.$or = [
      { email: new RegExp(query.search, "i") },
      { firstName: new RegExp(query.search, "i") },
      { lastName: new RegExp(query.search, "i") },
      { company: new RegExp(query.search, "i") }
    ];
  }

  return match;
};

export const createContact = async (req, res) => {
  try {
    const contact = await upsertContact(req.body);

    return res.status(201).json({
      success: true,
      message: "Contact saved",
      contact
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const listContacts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const query = getContactQuery(req.query);

    const [contacts, total] = await Promise.all([
      Contact
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Contact.countDocuments(query)
    ]);

    return res.json({
      success: true,
      page,
      limit,
      total,
      contacts
    });
  } catch (err) {
    console.error("LIST CONTACTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Contact list failed"
    });
  }
};

export const getContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id).lean();

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found"
      });
    }

    const activity = await Tracking
      .find({ email: contact.email })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      contact,
      activity
    });
  } catch (err) {
    console.error("GET CONTACT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Contact fetch failed"
    });
  }
};

export const updateContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body
      },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found"
      });
    }

    return res.json({
      success: true,
      message: "Contact updated",
      contact
    });
  } catch (err) {
    console.error("UPDATE CONTACT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Contact update failed"
    });
  }
};

export const importContactsCsv = async (req, res) => {
  try {
    const rows = parseCsv(req.body?.csv || req.body || "");
    const listId = req.body?.listId || req.query.listId;
    const imported = [];
    const failed = [];

    for (const row of rows) {
      try {
        const knownKeys = new Set([
          "email",
          "firstName",
          "lastName",
          "phone",
          "company",
          "tags",
          "status"
        ]);
        const customFields = Object.fromEntries(
          Object.entries(row).filter(([key]) => !knownKeys.has(key))
        );
        const contact = await upsertContact({
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          phone: row.phone,
          company: row.company,
          tags: parseArray(row.tags),
          status: row.status,
          customFields,
          source: "csv"
        });

        imported.push(contact);
      } catch (err) {
        failed.push({
          row,
          error: err.message
        });
      }
    }

    if (listId && imported.length) {
      await ContactList.findByIdAndUpdate(listId, {
        $addToSet: {
          contactIds: {
            $each: imported.map((contact) => contact._id)
          }
        }
      });
    }

    return res.status(201).json({
      success: true,
      imported: imported.length,
      failed
    });
  } catch (err) {
    console.error("IMPORT CONTACTS ERROR:", err);

    return res.status(400).json({
      success: false,
      message: "Contact CSV import failed"
    });
  }
};

export const exportContactsCsv = async (req, res) => {
  const contacts = await Contact
    .find(getContactQuery(req.query))
    .sort({ createdAt: -1 })
    .lean();

  const rows = contacts.map((contact) => ({
    email: contact.email,
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    phone: contact.phone || "",
    company: contact.company || "",
    tags: (contact.tags || []).join("|"),
    status: contact.status,
    customFields: JSON.stringify(contact.customFields || {})
  }));

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="contacts.csv"');

  return res.send(toCsv(rows));
};

export const createContactList = async (req, res) => {
  try {
    const list = await ContactList.create({
      name: req.body.name,
      description: req.body.description,
      tags: req.body.tags || [],
      contactIds: req.body.contactIds || []
    });

    return res.status(201).json({
      success: true,
      message: "Contact list created",
      list
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const listContactLists = async (req, res) => {
  const lists = await ContactList
    .find({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    success: true,
    lists: lists.map((list) => ({
      ...list,
      contactCount: list.contactIds?.length || 0
    }))
  });
};

export const addContactsToList = async (req, res) => {
  const contactIds = req.body.contactIds || [];
  const emails = req.body.emails || [];
  const createdContacts = [];

  for (const email of emails) {
    const contact = await upsertContact({ email, source: "list" });
    createdContacts.push(contact._id);
  }

  const list = await ContactList.findByIdAndUpdate(
    req.params.id,
    {
      $addToSet: {
        contactIds: {
          $each: [...contactIds, ...createdContacts]
        }
      }
    },
    {
      returnDocument: "after"
    }
  );

  if (!list) {
    return res.status(404).json({
      success: false,
      message: "Contact list not found"
    });
  }

  return res.json({
    success: true,
    message: "Contacts added to list",
    list
  });
};

export const previewSegment = async (req, res) => {
  try {
    const contacts = await resolveContactsForSegment(req.body || {}, Number(req.query.limit) || 500);

    return res.json({
      success: true,
      total: contacts.length,
      contacts
    });
  } catch (err) {
    console.error("PREVIEW SEGMENT ERROR:", err);

    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const getSuppressionList = async (req, res) => {
  const events = await Tracking
    .find({
      $or: [
        { eventType: "unsubscribe" },
        { eventType: "spam_complaint" },
        {
          eventType: "bounce",
          bounceType: "hard"
        }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 500, 5000))
    .lean();

  return res.json({
    success: true,
    suppressions: events
  });
};

export const getUnsubscribedSuppressionList = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const search = String(req.query.search || "").trim();
    const emailMatch = search ? { email: new RegExp(search, "i") } : {};

    const [unsubscribeEvents, unsubscribedContacts] = await Promise.all([
      Tracking
        .find({
          ...emailMatch,
          eventType: "unsubscribe"
        })
        .sort({ createdAt: -1 })
        .lean(),
      Contact
        .find({
          ...emailMatch,
          status: "unsubscribed"
        })
        .sort({ unsubscribedAt: -1, updatedAt: -1 })
        .lean()
    ]);

    const suppressionsByEmail = new Map();

    for (const event of unsubscribeEvents) {
      const email = String(event.email || "").trim().toLowerCase();

      if (!email || suppressionsByEmail.has(email)) {
        continue;
      }

      suppressionsByEmail.set(email, {
        email,
        reason: "unsubscribe",
        source: "tracking",
        suppressedAt: event.unsubscribedAt || event.createdAt,
        trackingId: event.trackingId,
        subject: event.subject,
        campaignName: event.campaignName,
        campaignType: event.campaignType,
        senderEmail: event.senderEmail
      });
    }

    for (const contact of unsubscribedContacts) {
      const email = String(contact.email || "").trim().toLowerCase();
      const existing = suppressionsByEmail.get(email);

      suppressionsByEmail.set(email, {
        email,
        reason: "unsubscribe",
        source: existing ? "tracking_and_contact" : "contact",
        suppressedAt: existing?.suppressedAt || contact.unsubscribedAt || contact.updatedAt || contact.createdAt,
        trackingId: existing?.trackingId,
        subject: existing?.subject,
        campaignName: existing?.campaignName,
        campaignType: existing?.campaignType,
        senderEmail: existing?.senderEmail,
        contact: {
          id: contact._id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          company: contact.company,
          tags: contact.tags || [],
          unsubscribedAt: contact.unsubscribedAt,
          lastActivityAt: contact.lastActivityAt
        }
      });
    }

    const suppressions = [...suppressionsByEmail.values()]
      .sort((a, b) => new Date(b.suppressedAt || 0) - new Date(a.suppressedAt || 0));
    const total = suppressions.length;
    const start = (page - 1) * limit;

    return res.json({
      success: true,
      page,
      limit,
      total,
      suppressions: suppressions.slice(start, start + limit)
    });
  } catch (err) {
    console.error("UNSUBSCRIBED SUPPRESSIONS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Unsubscribed suppression list failed"
    });
  }
};
