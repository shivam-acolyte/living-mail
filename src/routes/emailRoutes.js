import express from "express";

import { sendEmailController }
from "../controllers/emailController.js";
import {
   createBulkEmailController,
   createBulkEmailImportController,
   getBulkEmailController,
   pauseBulkEmailController,
   previewBulkEmailImportController,
   resumeBulkEmailController,
   thankYou
} from "../controllers/emailController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
   "/send-email",
   requireAuth,
   sendEmailController
);

router.post(
   "/bulk-email",
   requireAuth,
   createBulkEmailController
);

router.post(
   "/bulk-email/import/preview",
   requireAuth,
   previewBulkEmailImportController
);

router.post(
   "/bulk-email/import",
   requireAuth,
   createBulkEmailImportController
);

router.get(
   "/bulk-email/:id",
   requireAuth,
   getBulkEmailController
);

router.post(
   "/bulk-email/:id/pause",
   requireAuth,
   pauseBulkEmailController
);

router.post(
   "/bulk-email/:id/resume",
   requireAuth,
   resumeBulkEmailController
);

router.get("/submit/thank-you", thankYou );

export default router;
