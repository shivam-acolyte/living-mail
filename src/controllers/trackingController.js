import Tracking from "../models/Tracking.js";
import Contact from "../models/Contact.js";
import getRenderData from "../utils/renderData.js";
import { decodeLegacyTrackingId } from "../utils/tracking.js";

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

  return {
    email: decodeLegacyTrackingId(trackingId)
  };
};

const mergeTrackingContext = (baseContext, requestContext) => ({
  ...baseContext,
  ...Object.fromEntries(
    Object.entries(requestContext).filter(([, value]) => value !== undefined && value !== "")
  )
});

const getClickedDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "Unknown";
  }
};

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
};

/* OPEN TRACKING */

export const trackHandler = (emailType) => {

   return async (req, res) => {

      try {

         const identity = await resolveTrackingIdentity(req.params.id);
         const context = mergeTrackingContext(
            identity,
            getTrackingContext(req)
         );
         const botSignal = getBotSignal(req);

         await Tracking.create({

              trackingId: req.params.id,

              email: context.email,

              ...context,

              emailType,

              eventType: "open",

              openedAt: new Date(),

              render: getRenderData(req),

              ...botSignal

            });

         await syncContactActivity(context.email);

         const pixel = Buffer.from(
            "R0lGODlhAQABAAAAACwAAAAAAQABAAA=",
            "base64"
         );

         res.set({

            "Content-Type": "image/gif",

            "Cache-Control":
               "no-store, no-cache, must-revalidate"

         });

         return res.send(pixel);

      } catch (err) {

         console.error(err);

         return res.status(500).send("Tracking Error");

      }

   };

};


// HTML CLICK TRACKING

export const clickTracking = async (req, res) => {

   try {

      const identity = await resolveTrackingIdentity(req.params.id);
      const context = mergeTrackingContext(
         identity,
         getTrackingContext(req)
      );
      const botSignal = getBotSignal(req);

      await Tracking.create({
      
         trackingId: req.params.id,
      
         email: context.email,

         ...context,

         eventType: "click",

         clickedAt: new Date(),

         render: getRenderData(req),

         clickedUrl: req.query.url,

         clickedDomain: getClickedDomain(req.query.url),

         ...botSignal

      });

      await syncContactActivity(context.email);

      return res.redirect(req.query.url);

   } catch (err) {

      console.error(err);

      return res
         .status(500)
         .send("Click Tracking Error");

   }

};

/* AMP FORM */

export const ampFormTracking = async (req, res) => {
  try {
    setAmpResponseHeaders(req, res);

    const trackingId = req.params.id;

    const identity = await resolveTrackingIdentity(trackingId);

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
    const botSignal = getBotSignal(req);

    console.log("AMP FORM BODY:", {
      contentType: req.headers["content-type"],
      body,
      formData
    });


     // CLICK TRACKING
    await Tracking.create({

      trackingId,

      email: context.email,

      ...context,

      emailType: "amp",

      eventType: "click",

      clickedAt: new Date(),

      render: getRenderData(req),

      clickedUrl: "AMP Submit Button",

      clickedDomain: "AMP Submit Button",

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

    formSubmission: formData,

    createdAt: new Date()

  });

    await syncContactActivity(context.email);

    return res.json({
      success: true,
      source: "AMP",
      message: "AMP form submitted successfully"
    });

  } catch (err) {
    console.error("AMP FORM ERROR:", err);
    setAmpResponseHeaders(req, res);

    return res.status(500).json({
      success: false,
      source: "AMP",
      message: "Form submission failed"
    });
  }
};

/* HTML FORM */

export const htmlFormTracking = async (req, res) => {

  try {

    res.setHeader("Access-Control-Allow-Origin", "*");

    res.setHeader(
      "AMP-Access-Control-Allow-Source-Origin",
      process.env.API_URL
    );

    res.setHeader(
      "Access-Control-Expose-Headers",
      "AMP-Access-Control-Allow-Source-Origin"
    );

    const trackingId = req.params.id;

    const identity = await resolveTrackingIdentity(trackingId);

    const body = parseSubmittedBody(req.body);

    const {
      subject,
      emailType,
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
    const botSignal = getBotSignal(req);

    console.log("HTML/AMP WEB FORM BODY:", {
      contentType: req.headers["content-type"],
      body,
      formData
    });

    await Tracking.create({

   trackingId,

   email: context.email,

    ...context,

   emailType: emailType || "html",

   eventType: "form_submit",

    formSubmitAt: new Date(),

   render: getRenderData(req),

   ...botSignal,

   formSubmission: formData,

   createdAt: new Date()

});

    await syncContactActivity(context.email);
    return res.json({

      success: true,

      message: "✅ Form Submitted Successfully"

    });

  } catch (err) {

    console.error("HTML FORM ERROR:", err);

    return res.status(500).json({

      success: false,

      message: "❌ Form Tracking Error"

    });
  }
};
