import express from "express";

import {
  archiveSavedBlock,
  createSavedBlock,
  createTemplate,
  duplicateTemplate,
  getBuilderBlockCatalog,
  getBuilderEditorConfig,
  getSavedBlock,
  getStarterTemplateSource,
  getTemplate,
  getTemplateVersion,
  listSavedBlocks,
  listTemplates,
  listTemplateVersions,
  previewTemplate,
  restoreTemplateVersion,
  updateSavedBlock,
  updateTemplate,
  uploadTemplateAsset,
  validateTemplateController
} from "../controllers/templateController.js";

const router = express.Router();

router.post("/", createTemplate);

router.get("/", listTemplates);

router.get("/builder/starter", getStarterTemplateSource);

router.get("/builder/catalog", getBuilderBlockCatalog);

router.get("/builder/config", getBuilderEditorConfig);

router.post("/builder/preview", previewTemplate);

router.post("/builder/validate", validateTemplateController);

router.post("/assets", uploadTemplateAsset);

router.post("/builder/blocks", createSavedBlock);

router.get("/builder/blocks", listSavedBlocks);

router.get("/builder/blocks/:blockId", getSavedBlock);

router.put("/builder/blocks/:blockId", updateSavedBlock);

router.delete("/builder/blocks/:blockId", archiveSavedBlock);

router.get("/:id", getTemplate);

router.get("/:id/versions", listTemplateVersions);

router.get("/:id/versions/:version", getTemplateVersion);

router.post("/:id/versions/:version/restore", restoreTemplateVersion);

router.post("/:id/duplicate", duplicateTemplate);

router.put("/:id", updateTemplate);

export default router;
