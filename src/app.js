import express from "express";

import trackingRoutes from "./routes/trackingRoutes.js";
import corsMiddleware from "./middleware/corsMiddleware.js";
import emailRoutes from "./routes/emailRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import formSubmissionRoutes from "./routes/formSubmissionRoutes.js";
import { healthCheck } from "./controllers/healthController.js";
import { templateAssetRoot } from "./utils/templateAssets.js";
import AmpTemplate from "./models/AmpTemplate.js";
import { validate as uuidValidate } from "uuid";

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

    if (templateId) {
      const cleanId = templateId.replace(".svg", "");
      // Validate UUID – if invalid, treat as slug but ensure it's non‑empty
      if (!uuidValidate(cleanId)) {
        // Not a valid UUID; continue – the query will match by slug only
        // Optionally, you could return 400 here, but allowing slug keeps existing behavior
      }
      const savedTemplate = await AmpTemplate.findOne({
        $or: [{ _id: cleanId }, { slug: cleanId }],
        isActive: true
      });

      if (savedTemplate?.sourceJson?.blocks) {
        const spinWheelBlock = savedTemplate.sourceJson.blocks.find(
          (b) => b.type === "spinWheel"
        );
        if (spinWheelBlock?.props?.options) {
          options = spinWheelBlock.props.options;
        }
      }
    }

    const escapeHtml = (value) => {
      return String(value ?? "")
        .replace(/\u0026/g, "\u0026amp;")
        .replace(/\u003c/g, "\u0026lt;")
        .replace(/\u003e/g, "\u0026gt;")
        .replace(/"/g, "\u0026quot;");
    };

    const colors = ["#f87171", "#fb923c", "#fbbf24", "#34d399", "#60a5fa", "#818cf8", "#a78bfa", "#f472b6"];
    const cx = 100;
    const cy = 100;
    const radius = 90;

    const svgSegments = options.map((option, index) => {
      const angle = 360 / options.length;
      const startAngle = index * angle;
      const endAngle = (index + 1) * angle;

      const toRadians = (deg) => (deg * Math.PI) / 180;
      const x1 = cx + radius * Math.cos(toRadians(startAngle - 90));
      const y1 = cy + radius * Math.sin(toRadians(startAngle - 90));
      const x2 = cx + radius * Math.cos(toRadians(endAngle - 90));
      const y2 = cy + radius * Math.sin(toRadians(endAngle - 90));

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${cx} ${cy}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        "Z"
      ].join(" ");

      const textAngle = startAngle + angle / 2 - 90;
      const textX = cx + (radius * 0.65) * Math.cos(toRadians(textAngle));
      const textY = cy + (radius * 0.65) * Math.sin(toRadians(textAngle));

      return `<g>
        <path d="${pathData}" fill="${colors[index % colors.length]}" stroke="#ffffff" stroke-width="1" />
        <text
          x="${textX}"
          y="${textY}"
          fill="#ffffff"
          font-size="8"
          font-weight="bold"
          text-anchor="middle"
          transform="rotate(${textAngle + 90}, ${textX}, ${textY})"
        >
          ${escapeHtml(option.label || option.value)}
        </text>
      </g>`;
    }).join("\n");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      ${svgSegments}
      <circle cx="100" cy="100" r="90" fill="none" stroke="#ffffff" stroke-width="3"/>
    </svg>`;

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
