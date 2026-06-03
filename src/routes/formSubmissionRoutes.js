import express from "express";
import {
  exportFormSubmissionsCsv,
  listFormSubmissions
} from "../controllers/formSubmissionController.js";

const router = express.Router();

router.get("/form-submissions", listFormSubmissions);
router.get("/form-submissions/export.csv", exportFormSubmissionsCsv);

export default router;
