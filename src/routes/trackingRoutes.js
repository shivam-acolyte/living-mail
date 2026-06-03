import express from "express";
import { unsubscribeHandler } from "../controllers/unsubscribeController.js";

import {
   trackHandler,
   clickTracking,
   ampFormTracking,
   htmlFormTracking
} from "../controllers/trackingController.js";

import {
   analyticsOverview,
   deepAnalytics,
   exportAnalyticsCsv
} from "../controllers/analyticsController.js";
import { syncDeliveryStatusController } from "../controllers/deliveryStatusController.js";
import formTemplate  from "../templates/formTemplate.js";
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
   ampFormTracking
);

router.post(
   "/form-html/:id",
   htmlFormTracking
);

// analytic routes

router.get("/analytics", analyticsOverview);

router.get("/analytics/deep", deepAnalytics);

router.get("/analytics/export.csv", exportAnalyticsCsv);

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

      if (sentEvent?.renderedFormHtml) {
         return res.send(sentEvent.renderedFormHtml);
      }

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

      if (savedTemplate?.formHtml) {
         return res.send(
            renderTrackedFormTemplate({
               template: savedTemplate,
               trackingId,
               email: sentEvent?.email || "",
               subject: effectiveSubject,
               campaignName: effectiveCampaignName,
               campaignType: effectiveCampaignType
            })
         );
      }

      return res.send(
         formTemplate(
            trackingId,
            fallbackSubject,
            fallbackCampaignName,
            fallbackCampaignType
         )
      );
   } catch (err) {
      console.error("FORM TEMPLATE ERROR:", err);

      return res.send(
         formTemplate(
            trackingId,
            fallbackSubject,
            fallbackCampaignName,
            fallbackCampaignType
         )
      );
   }

});


router.get("/unsubscribe/:id", unsubscribeHandler );



export default router;
