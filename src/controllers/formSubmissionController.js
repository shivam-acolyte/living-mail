import Tracking from "../models/Tracking.js";
import { toCsv } from "../utils/csv.js";

const getSubmissionQuery = (query) => {
  const match = {
    eventType: "form_submit"
  };

  if (query.campaignName) {
    match.campaignName = new RegExp(query.campaignName, "i");
  }

  if (query.templateId) {
    match.templateId = query.templateId;
  }

  if (query.templateSlug) {
    match.templateSlug = new RegExp(query.templateSlug, "i");
  }

  if (query.email) {
    match.email = new RegExp(query.email, "i");
  }

  if (query.from || query.to) {
    match.createdAt = {};
  }

  if (query.from) {
    match.createdAt.$gte = new Date(query.from);
  }

  if (query.to) {
    match.createdAt.$lte = new Date(query.to);
  }

  if (query.field) {
    const path = `formSubmission.${query.field}`;
    match[path] = query.value
      ? { $regex: query.value, $options: "i" }
      : { $exists: true };
  }

  return match;
};

export const listFormSubmissions = async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
  const match = getSubmissionQuery(req.query);

  const [submissions, total] = await Promise.all([
    Tracking
      .find(match)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Tracking.countDocuments(match)
  ]);

  return res.json({
    success: true,
    page,
    limit,
    total,
    submissions
  });
};

export const exportFormSubmissionsCsv = async (req, res) => {
  const submissions = await Tracking
    .find(getSubmissionQuery(req.query))
    .sort({ createdAt: -1 })
    .limit(10000)
    .lean();

  const fieldNames = [
    ...new Set(
      submissions.flatMap((submission) => Object.keys(submission.formSubmission || {}))
    )
  ].sort();

  const rows = submissions.map((submission) => {
    const row = {
      email: submission.email || "",
      trackingId: submission.trackingId || "",
      campaignName: submission.campaignName || "",
      campaignType: submission.campaignType || "",
      subject: submission.subject || "",
      templateId: submission.templateId || "",
      templateSlug: submission.templateSlug || "",
      submittedAt: submission.formSubmitAt || submission.createdAt || "",
      country: submission.render?.country || "",
      city: submission.render?.city || "",
      device: submission.render?.device || "",
      browser: submission.render?.browser || "",
      isBot: submission.isBot || false
    };

    for (const fieldName of fieldNames) {
      row[`form_${fieldName}`] = submission.formSubmission?.[fieldName] ?? "";
    }

    return row;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="form-submissions.csv"');

  return res.send(toCsv(rows));
};
