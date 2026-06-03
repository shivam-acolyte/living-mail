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

const router = express.Router();

router.post(
   "/send-email",
   sendEmailController
);

router.post(
   "/bulk-email",
   createBulkEmailController
);

router.post(
   "/bulk-email/import/preview",
   previewBulkEmailImportController
);

router.post(
   "/bulk-email/import",
   createBulkEmailImportController
);

router.get(
   "/bulk-email/:id",
   getBulkEmailController
);

router.post(
   "/bulk-email/:id/pause",
   pauseBulkEmailController
);

router.post(
   "/bulk-email/:id/resume",
   resumeBulkEmailController
);

router.get("/submit/thank-you", thankYou );

export default router;
