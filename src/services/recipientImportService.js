import ContactList from "../models/ContactList.js";
import { parseCsv } from "../utils/csv.js";
import { resolveRecipients, upsertContact } from "./contactService.js";

const EMAIL_FIELDS = [
  "email",
  "Email",
  "EMAIL",
  "mail",
  "Mail",
  "recipient",
  "Recipient"
];

const PROFILE_FIELDS = new Set([
  "email",
  "Email",
  "EMAIL",
  "mail",
  "Mail",
  "recipient",
  "Recipient",
  "firstName",
  "First Name",
  "firstname",
  "lastName",
  "Last Name",
  "lastname",
  "phone",
  "Phone",
  "company",
  "Company",
  "tags",
  "Tags",
  "status",
  "Status"
]);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const getFirstValue = (row, keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && String(row[key]).trim()) {
      return row[key];
    }
  }

  return "";
};

const splitDelimitedLine = (line, delimiter) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseTsv = (text = "") => {
  const lines = String(text)
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (!lines.length) {
    return [];
  }

  const headers = splitDelimitedLine(lines[0], "\t").map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, "\t");
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] || ""])
    );
  });
};

const parseSpreadsheetText = (text = "") => {
  const firstLine = String(text).split(/\r?\n/)[0] || "";

  if (firstLine.includes("\t") && !firstLine.includes(",")) {
    return parseTsv(text);
  }

  return parseCsv(text);
};

const parseTags = (value) => {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[|,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const mapRowToRecipient = (row, index) => {
  if (typeof row === "string") {
    const email = normalizeEmail(row);

    return {
      rowNumber: index + 1,
      email,
      variables: {}
    };
  }

  const email = normalizeEmail(getFirstValue(row, EMAIL_FIELDS));
  const firstName = getFirstValue(row, ["firstName", "First Name", "firstname"]);
  const lastName = getFirstValue(row, ["lastName", "Last Name", "lastname"]);
  const phone = getFirstValue(row, ["phone", "Phone"]);
  const company = getFirstValue(row, ["company", "Company"]);
  const customFields = Object.fromEntries(
    Object
      .entries(row || {})
      .filter(([key, value]) => !PROFILE_FIELDS.has(key) && value !== undefined && value !== "")
  );

  return {
    rowNumber: index + 1,
    email,
    firstName,
    lastName,
    phone,
    company,
    tags: parseTags(getFirstValue(row, ["tags", "Tags"])),
    status: getFirstValue(row, ["status", "Status"]),
    variables: {
      firstName,
      lastName,
      phone,
      company,
      ...customFields
    }
  };
};

const normalizeRows = (rows = []) => {
  const seen = new Set();
  const recipients = [];
  const failed = [];
  let duplicates = 0;

  rows.forEach((row, index) => {
    const recipient = mapRowToRecipient(row, index);

    if (!recipient.email || !emailRegex.test(recipient.email)) {
      failed.push({
        rowNumber: recipient.rowNumber,
        row,
        error: "Valid email is required"
      });
      return;
    }

    if (seen.has(recipient.email)) {
      duplicates += 1;
      return;
    }

    seen.add(recipient.email);
    recipients.push(recipient);
  });

  return {
    recipients,
    failed,
    duplicates
  };
};

export const importRecipientsFromSource = async ({
  csv,
  rows,
  recipients,
  emails,
  listId,
  segment
} = {}) => {
  if (listId || segment) {
    const resolvedRecipients = await resolveRecipients({
      listId,
      segment
    });

    return {
      source: listId ? "contact_list" : "segment",
      ...normalizeRows(resolvedRecipients)
    };
  }

  if (Array.isArray(recipients) && recipients.length) {
    return {
      source: "recipients",
      ...normalizeRows(recipients)
    };
  }

  if (Array.isArray(rows) && rows.length) {
    return {
      source: "rows",
      ...normalizeRows(rows)
    };
  }

  if (Array.isArray(emails) && emails.length) {
    return {
      source: "emails",
      ...normalizeRows(emails)
    };
  }

  if (csv) {
    return {
      source: "csv",
      ...normalizeRows(parseSpreadsheetText(csv))
    };
  }

  return {
    source: "empty",
    recipients: [],
    failed: [],
    duplicates: 0
  };
};

export const previewRecipientImport = async (payload = {}, limit = 25) => {
  const result = await importRecipientsFromSource(payload);
  const columns = Array.from(
    new Set(
      result.recipients.flatMap((recipient) => Object.keys(recipient.variables || {}))
    )
  );

  return {
    ...result,
    columns,
    total: result.recipients.length,
    sample: result.recipients.slice(0, limit)
  };
};

export const saveImportedRecipientsToContacts = async ({
  recipients = [],
  listId,
  listName,
  tags = [],
  source = "bulk_import"
} = {}) => {
  if (!recipients.length) {
    return null;
  }

  const importedContacts = [];

  for (const recipient of recipients) {
    const contact = await upsertContact({
      email: recipient.email,
      firstName: recipient.firstName || recipient.variables?.firstName,
      lastName: recipient.lastName || recipient.variables?.lastName,
      phone: recipient.phone || recipient.variables?.phone,
      company: recipient.company || recipient.variables?.company,
      tags: [
        ...tags,
        ...(recipient.tags || [])
      ],
      status: recipient.status,
      customFields: recipient.variables || {},
      source
    });

    importedContacts.push(contact);
  }

  if (!listId && !listName) {
    return {
      listId: null,
      imported: importedContacts.length
    };
  }

  const list = listId
    ? await ContactList.findById(listId)
    : await ContactList.create({
      name: listName,
      description: "Created from bulk email import"
    });

  if (!list) {
    throw new Error("Contact list not found");
  }

  await ContactList.findByIdAndUpdate(list._id, {
    $addToSet: {
      contactIds: {
        $each: importedContacts.map((contact) => contact._id)
      }
    }
  });

  return {
    listId: list._id,
    imported: importedContacts.length
  };
};
