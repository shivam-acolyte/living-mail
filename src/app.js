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
