import Tracking from "../models/Tracking.js";
import Contact from "../models/Contact.js";
import AmpTemplate from "../models/AmpTemplate.js";
import getRenderData from "../utils/renderData.js";
import { decodeLegacyTrackingId } from "../utils/tracking.js";
import {
  isPostgresBackedOff,
  notePostgresConnectionFailure
} from "../config/postgres.js";

// Helper functions (identical copy from trackingController.js to leave it clean and untouched)
const parseSubmittedBody = (body) => {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    const trimmed = body.trim();

    if (!trimmed) {
      return {};
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return Object.fromEntries(new URLSearchParams(trimmed));
    }
  }

  if (typeof body === "object") {
    return body;
  }

  return {};
};

const splitTrackingFields = (body) => {
  const {
    trackingid,
    trackingId,
    subject,
    emailType,
    campaignName,
    campaignType,
    templateId,
    templateSlug,
    ...formData
  } = body;

  return {
    subject,
    emailType,
    campaignName,
    campaignType,
    templateId,
    templateSlug,
    formData,
    trackingid,
    trackingId
  };
};

const getTrackingContext = (req, bodyContext = {}) => ({
  subject: bodyContext.subject || req.query.subject,
  campaignName: bodyContext.campaignName || req.query.campaignName,
  campaignType: bodyContext.campaignType || req.query.campaignType,
  templateId: bodyContext.templateId || req.query.templateId,
  templateSlug: bodyContext.templateSlug || req.query.templateSlug
});

const setAmpResponseHeaders = (req, res) => {
  const requestOrigin = req.get("origin");
  const sourceOrigin = req.query.__amp_source_origin || process.env.API_URL;

  if (requestOrigin) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  }

  res.setHeader("AMP-Access-Control-Allow-Source-Origin", sourceOrigin);
  res.setHeader(
    "Access-Control-Expose-Headers",
    "AMP-Access-Control-Allow-Source-Origin"
  );
};

const resolveTrackingIdentity = async (trackingId) => {
  const fallbackIdentity = {
    email: decodeLegacyTrackingId(trackingId)
  };

  if (isPostgresBackedOff()) {
    return fallbackIdentity;
  }

  const sentEvent = await Tracking
    .findOne({ trackingId, eventType: "sent" })
    .sort({ createdAt: 1 })
    .lean();

  if (sentEvent) {
    return {
      email: sentEvent.email,
      subject: sentEvent.subject,
      campaignName: sentEvent.campaignName,
      campaignType: sentEvent.campaignType,
      templateId: sentEvent.templateId,
      templateSlug: sentEvent.templateSlug,
      templateName: sentEvent.templateName,
      senderEmail: sentEvent.senderEmail,
      senderProvider: sentEvent.senderProvider,
      deliveryProvider: sentEvent.deliveryProvider
    };
  }

  return fallbackIdentity;
};

const getTrackingIdentity = async (trackingId) => {
  try {
    return await resolveTrackingIdentity(trackingId);
  } catch (error) {
    if (notePostgresConnectionFailure(error)) {
      console.warn("Tracking identity lookup skipped after PostgreSQL timeout:", error.message);
      return {
        email: decodeLegacyTrackingId(trackingId)
      };
    }

    throw error;
  }
};

const mergeTrackingContext = (baseContext, requestContext) => ({
  ...baseContext,
  ...Object.fromEntries(
    Object.entries(requestContext).filter(([, value]) => value !== undefined && value !== "")
  )
});

const getBotSignal = (req) => {
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();
  const botPatterns = [
    "bot",
    "crawler",
    "spider",
    "preview",
    "scanner",
    "safe links",
    "safelinks",
    "proofpoint",
    "mimecast",
    "barracuda",
    "security"
  ];

  const matchedPattern = botPatterns.find((pattern) => userAgent.includes(pattern));

  if (!matchedPattern) {
    return {
      isBot: false,
      botReason: ""
    };
  }

  return {
    isBot: true,
    botReason: `User agent matched ${matchedPattern}`
  };
};

const syncContactActivity = async (email, update = {}) => {
  if (!email) {
    return;
  }

  if (isPostgresBackedOff()) {
    return;
  }

  try {
    await Contact.findOneAndUpdate(
      {
        email: String(email).trim().toLowerCase()
      },
      {
        $set: {
          lastActivityAt: new Date(),
          ...update
        }
      },
      {
        upsert: false
      }
    );
  } catch (error) {
    if (notePostgresConnectionFailure(error)) {
      console.warn("Contact activity sync skipped after PostgreSQL timeout:", error.message);
      return;
    }

    throw error;
  }
};

export const handleSpinWheelAmpSubmit = async (req, res) => {
  try {
    setAmpResponseHeaders(req, res);

    const trackingId = req.params.id;

    const identity = await getTrackingIdentity(trackingId);

    const body = parseSubmittedBody(req.body);

    const {
      subject,
      campaignName,
      campaignType,
      templateId,
      templateSlug,
      formData
    } = splitTrackingFields(body);

    const context = mergeTrackingContext(
      identity,
      getTrackingContext(req, {
        subject,
        campaignName,
        campaignType,
        templateId,
        templateSlug
      })
    );

    if (context.email) {
      const existing = await Tracking.findOne({
        email: context.email,
        eventType: "form_submit",
        "formSubmission.is_spin_wheel": "true"
      });

      if (existing) {
        const prizeText = existing.formSubmission?.spin_result || "Prize";
        return res.json({
          success: true,
          prizeLabel: prizeText,
          prizeCode: prizeText,
          prizeDesc: "You already spun the wheel!",
          alreadySpun: true
        });
      }
    }
    const botSignal = getBotSignal(req);

    console.log("AMP SPIN WHEEL SUBMIT BODY:", {
      contentType: req.headers["content-type"],
      body,
      formData
    });

    let spinWheelBlock = null;
    let options = [
      { label: "10% Off", value: "10_off", probability: 10 },
      { label: "Free Shipping", value: "free_shipping", probability: 10 },
      { label: "Try Again", value: "try_again", probability: 10 },
      { label: "20% Off", value: "20_off", probability: 10 },
      { label: "Gift Card", value: "gift_card", probability: 10 },
      { label: "No Luck", value: "no_luck", probability: 10 }
    ];

    if (templateId || templateSlug) {
      const savedTemplate = templateId
        ? await AmpTemplate.findOne({ _id: templateId, isActive: true })
        : templateSlug
        ? await AmpTemplate.findOne({ slug: templateSlug, isActive: true })
        : null;

      if (savedTemplate?.sourceJson?.blocks) {
        if (body.spin_wheel_block_id) {
          spinWheelBlock = savedTemplate.sourceJson.blocks.find(
            (b) => b.type === "spinWheel" && b.id === body.spin_wheel_block_id
          );
        }
        if (!spinWheelBlock) {
          spinWheelBlock = savedTemplate.sourceJson.blocks.find(
            (b) => b.type === "spinWheel"
          );
        }
      }
    }

    if (spinWheelBlock?.props?.options) {
      options = spinWheelBlock.props.options;
    }

    // Weighted random selection algorithm
    const totalWeight = options.reduce((sum, opt) => sum + Number(opt.probability || 1), 0);
    let r = Math.random() * totalWeight;
    let selectedIndex = 0;
    for (let i = 0; i < options.length; i++) {
      r -= Number(options[i].probability || 1);
      if (r <= 0) {
        selectedIndex = i;
        break;
      }
    }
    const wonPrize = options[selectedIndex];
    const prizeText = wonPrize.label || wonPrize.value;

    const degreesPerSegment = 360 / options.length;
    const extraTurns = 6;
    const targetDegrees = extraTurns * 360 + (options.length - selectedIndex) * degreesPerSegment - (degreesPerSegment / 2);

    const updatedFormData = {
      ...formData,
      spin_result: prizeText
    };

    // CLICK TRACKING
    await Tracking.create({
      trackingId,
      email: context.email,
      ...context,
      emailType: "amp",
      eventType: "click",
      clickedAt: new Date(),
      render: getRenderData(req),
      clickedUrl: "AMP Spin the Wheel",
      clickedDomain: "AMP Spin the Wheel",
      ...botSignal,
      createdAt: new Date()
    });

    await Tracking.create({
      trackingId,
      email: context.email,
      ...context,
      emailType: "amp",
      eventType: "form_submit",
      formSubmitAt: new Date(),
      render: getRenderData(req),
      ...botSignal,
      formSubmission: updatedFormData,
      createdAt: new Date()
    });

    await syncContactActivity(context.email);

    return res.json({
      success: true,
      prizeLabel: prizeText,
      prizeCode: prizeText,
      prizeDesc: "Congratulations, you won!",
      prizeIndex: selectedIndex,
      rotation: targetDegrees
    });

  } catch (err) {
    console.error("AMP SPIN WHEEL ERROR:", err);
    setAmpResponseHeaders(req, res);

    return res.status(500).json({
      success: false,
      source: "AMP",
      message: "Spin wheel submission failed"
    });
  }
};
