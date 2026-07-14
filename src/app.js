import express from "express";

import trackingRoutes from "./routes/trackingRoutes.js";
import corsMiddleware from "./middleware/corsMiddleware.js";
import emailRoutes from "./routes/emailRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import formSubmissionRoutes from "./routes/formSubmissionRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import senderProfileRoutes from "./routes/senderProfileRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import blockedEmailRoutes from "./routes/blockedEmailRoutes.js";
import { healthCheck } from "./controllers/healthController.js";
import { templateAssetRoot } from "./utils/templateAssets.js";
import AmpTemplate from "./models/AmpTemplate.js";
import { validate as uuidValidate } from "uuid";
import { buildSvgWheel } from "./utils/templateCompiler.js";

const app = express();
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || "25mb";

/* MIDDLEWARE */

app.set("trust proxy", true);

/* CUSTOM CORS */

app.use(corsMiddleware);

app.use(express.json({
  limit: requestBodyLimit
}));

app.use(express.urlencoded({
  extended: true,
  limit: requestBodyLimit
}));

app.use(express.text({
  limit: requestBodyLimit
}));

app.get("/template-assets/wheel/:templateId.svg", async (req, res) => {
  try {
    const templateId = req.params.templateId;
    let options = [
      { label: "10% Off", value: "10_off", probability: 10 },
      { label: "Free Shipping", value: "free_shipping", probability: 10 },
      { label: "Try Again", value: "try_again", probability: 10 },
      { label: "20% Off", value: "20_off", probability: 10 },
      { label: "Gift Card", value: "gift_card", probability: 10 },
      { label: "No Luck", value: "no_luck", probability: 10 }
    ];
    let props = {};

    if (templateId) {
      const cleanId = templateId.replace(".svg", "");
      const queryOr = [];
      if (uuidValidate(cleanId)) {
        queryOr.push({ _id: cleanId });
      }
      queryOr.push({ slug: cleanId });

      const savedTemplate = await AmpTemplate.findOne({
        $or: queryOr,
        isActive: true
      });

      if (savedTemplate?.sourceJson?.blocks) {
        const spinWheelBlock = savedTemplate.sourceJson.blocks.find(
          (b) => b.type === "spinWheel"
        );
        if (spinWheelBlock) {
          props = spinWheelBlock.props || {};
          if (props.options) {
            options = props.options;
          }
        }
      }
    }

    const svg = buildSvgWheel(props, options);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(svg);
  } catch (err) {
    console.error("Dynamic wheel SVG error:", err);
    res.status(500).send("Error generating wheel SVG");
  }
});

app.use("/template-assets", express.static(templateAssetRoot, {
  fallthrough: false,
  immutable: true,
  maxAge: "30d"
}));

// email routes
app.use("/api", emailRoutes);

// contacts and campaign dashboard routes
app.use("/api", contactRoutes);

app.use("/api", formSubmissionRoutes);

app.use("/api/campaigns", campaignRoutes);

// template routes
app.use("/api/templates", templateRoutes);

// webhook routes
app.use("/api/webhooks", webhookRoutes);

// authentication routes
app.use("/api/auth", authRoutes);

// sender profiles routes
app.use("/api/sender-profiles", senderProfileRoutes);

// admin routes
app.use("/api/admin", adminRoutes);

// blocked email routes
app.use("/api/blocked-emails", blockedEmailRoutes);

app.use("/track", trackingRoutes);

/* HEALTH */

app.get("/", (req, res) => {
  res.send("Tracking Server Running");
});

app.get("/health", healthCheck);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      error: "Request body is too large",
      limit: requestBodyLimit
    });
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: "Invalid request body"
    });
  }

  console.error(err);

  res.status(500).json({
    error: "Internal server error"
  });
});

export default app;
