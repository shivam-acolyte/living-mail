import express from "express";
import { unsubscribeHandler } from "../controllers/unsubscribeController.js";

import {
   trackHandler,
   clickTracking,
   ampFormTracking,
   htmlFormTracking
} from "../controllers/trackingController.js";
import { handleSpinWheelAmpSubmit } from "../controllers/spinWheelController.js";

import {
   analyticsOverview,
   analyticsSummary,
   deepAnalytics,
   exportAnalyticsCsv,
   getUserHistory,
   searchEmails,
   listRecipientJourneys,
   abTestAnalytics
} from "../controllers/analyticsController.js";
import { syncDeliveryStatusController } from "../controllers/deliveryStatusController.js";
import formTemplate from "../templates/formTemplate.js";
import AmpTemplate from "../models/AmpTemplate.js";
import Tracking from "../models/Tracking.js";
import { renderTrackedFormTemplate } from "../utils/generateAmpTemplate.js";

const router = express.Router();

/* OPEN */

router.get(
   "/open-html/:id",
   trackHandler("html")
);

router.get(
   "/open-amp/:id",
   trackHandler("amp")
);

// HTML click tracking

router.get(
   "/click/:id",
   clickTracking
);

/* FORMS */

router.post(
   "/form-amp/:id",
   (req, res, next) => {
      let parsedBody = req.body || {};
      if (typeof parsedBody === "string") {
         const trimmed = parsedBody.trim();
         if (trimmed) {
            try {
               parsedBody = JSON.parse(trimmed);
            } catch {
               parsedBody = Object.fromEntries(new URLSearchParams(trimmed));
            }
         }
      }
      const isSpinWheel = parsedBody.is_spin_wheel === "true" || !!parsedBody.spin_wheel_block_id;
      if (isSpinWheel) {
         return handleSpinWheelAmpSubmit(req, res);
      }
      return ampFormTracking(req, res);
   }
);

router.post(
   "/form-html/:id",
   (req, res, next) => {
      let parsedBody = req.body || {};
      if (typeof parsedBody === "string") {
         const trimmed = parsedBody.trim();
         if (trimmed) {
            try {
               parsedBody = JSON.parse(trimmed);
            } catch {
               parsedBody = Object.fromEntries(new URLSearchParams(trimmed));
            }
         }
      }
      const isSpinWheel = parsedBody.is_spin_wheel === "true" || !!parsedBody.spin_wheel_block_id;
      if (isSpinWheel) {
         return handleSpinWheelAmpSubmit(req, res);
      }
      return htmlFormTracking(req, res);
   }
);

// analytic routes

router.get("/analytics", analyticsOverview);

router.get("/analytics/summary", analyticsSummary);

router.get("/analytics/deep", deepAnalytics);

router.get("/analytics/ab-test", abTestAnalytics);

router.get("/analytics/user-history", getUserHistory);

router.get("/analytics/search-emails", searchEmails);

router.get("/analytics/export.csv", exportAnalyticsCsv);
router.get("/analytics/journeys", listRecipientJourneys);

router.get("/delivery-status/sync", syncDeliveryStatusController);

// form route

router.get("/form/:id", async (req, res) => {

   console.log(req.query);

   const trackingId = req.params.id;

   const {
      subject,
      campaignName,
      campaignType,
      templateId,
      templateSlug
   } = req.query;
   let fallbackSubject = subject;
   let fallbackCampaignName = campaignName;
   let fallbackCampaignType = campaignType;

   try {
      const sentEvent = await Tracking
         .findOne({ trackingId, eventType: "sent" })
         .sort({ createdAt: 1 })
         .lean();

      const effectiveSubject = subject || sentEvent?.subject;
      const effectiveCampaignName = campaignName || sentEvent?.campaignName;
      const effectiveCampaignType = campaignType || sentEvent?.campaignType;
      const effectiveTemplateId = templateId || sentEvent?.templateId;
      const effectiveTemplateSlug = templateSlug || sentEvent?.templateSlug;
      fallbackSubject = effectiveSubject;
      fallbackCampaignName = effectiveCampaignName;
      fallbackCampaignType = effectiveCampaignType;

      let responseHtml = "";

      // Always prefer live re-compilation from the saved template
      // so the hosted form matches the latest compiler output (e.g. AMP spin wheel).
      const savedTemplate = effectiveTemplateId
         ? await AmpTemplate.findOne({
            _id: effectiveTemplateId,
            isActive: true
         })
         : effectiveTemplateSlug
            ? await AmpTemplate.findOne({
               slug: effectiveTemplateSlug,
               isActive: true
            })
            : null;

      if (savedTemplate?.sourceJson || savedTemplate?.formHtml) {
         responseHtml = renderTrackedFormTemplate({
            template: savedTemplate,
            trackingId,
            email: sentEvent?.email || "",
            subject: effectiveSubject,
            campaignName: effectiveCampaignName,
            campaignType: effectiveCampaignType
         });
      } else if (sentEvent?.renderedFormHtml) {
         // Fallback to pre-rendered HTML only when the template is deleted/missing
         responseHtml = sentEvent.renderedFormHtml;
      } else {
         responseHtml = formTemplate(
            trackingId,
            fallbackSubject,
            fallbackCampaignName,
            fallbackCampaignType
         );
      }

      const effectiveEmail = sentEvent?.email;
      if (effectiveEmail) {
         const alreadySpun = await Tracking.findOne({
            email: effectiveEmail,
            eventType: "form_submit",
            "formSubmission.is_spin_wheel": "true"
         });

         if (alreadySpun && responseHtml) {
            const prize = alreadySpun.formSubmission?.spin_result || "Prize";
            responseHtml = responseHtml.replace(
               /<amp-state\s+id="wheelState_([^"]+)">\s*<script\s+type="application\/json">[\s\S]*?<\/script>\s*<\/amp-state>/gi,
               (match, safeId) => `<amp-state id="wheelState_${safeId}"><script type="application/json">{ "step": "result", "prizeCode": "${prize}", "prizeDesc": "You already spun the wheel!" }</script></amp-state>`
            );
         }
      }

      // Inject global box-sizing and viewport overflow constraints if not already present
      if (responseHtml && responseHtml.includes("<style amp-custom>") && !responseHtml.includes("box-sizing: border-box;")) {
         responseHtml = responseHtml.replace(
            "<style amp-custom>",
            "<style amp-custom>\n    html, body {\n      width: 100%;\n      max-width: 100%;\n      overflow-x: hidden;\n      box-sizing: border-box;\n    }\n    *, *:before, *:after {\n      box-sizing: inherit;\n    }"
         );
      }
      return res.send(responseHtml);
   } catch (err) {
      console.error("FORM TEMPLATE ERROR:", err);

      let fallbackHtml = formTemplate(
         trackingId,
         fallbackSubject,
         fallbackCampaignName,
         fallbackCampaignType
      );
      if (fallbackHtml && fallbackHtml.includes("<style amp-custom>") && !fallbackHtml.includes("box-sizing: border-box;")) {
         fallbackHtml = fallbackHtml.replace(
            "<style amp-custom>",
            "<style amp-custom>\n    html, body {\n      width: 100%;\n      max-width: 100%;\n      overflow-x: hidden;\n      box-sizing: border-box;\n    }\n    *, *:before, *:after {\n      box-sizing: inherit;\n    }"
         );
      }
      return res.send(fallbackHtml);
   }

});


router.get("/unsubscribe/:id", unsubscribeHandler);



export default router;
