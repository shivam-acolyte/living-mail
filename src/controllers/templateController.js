import AmpTemplate from "../models/AmpTemplate.js";
import SavedBlock from "../models/SavedBlock.js";
import TemplateVersion from "../models/TemplateVersion.js";
import {
  extractTemplateVariables,
  renderTemplateExpressions
} from "../utils/generateAmpTemplate.js";
import {
  builderBlockCatalog,
  builderEditorConfig,
  compileTemplateSource,
  starterTemplateSource
} from "../utils/templateCompiler.js";
import { validateTemplate } from "../utils/templateValidator.js";
import { saveTemplateAsset } from "../utils/templateAssets.js";

const createSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const snapshotTemplate = async (template, summary) => {
  if (!template) {
    return null;
  }

  return TemplateVersion.findOneAndUpdate(
    {
      templateId: template._id,
      version: template.version
    },
    {
      templateId: template._id,
      version: template.version,
      name: template.name,
      subject: template.subject,
      status: template.status,
      sourceJson: template.sourceJson,
      html: template.html,
      amp: template.amp,
      formHtml: template.formHtml,
      text: template.text,
      variables: template.variables,
      summary
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true
    }
  );
};

const getValidationPayload = ({
  subject,
  html,
  amp,
  formHtml,
  variables,
  sourceJson,
  providedVariables
}) => validateTemplate({
  subject: subject || sourceJson?.subject,
  html,
  amp,
  formHtml,
  variables,
  sourceJson,
  providedVariables
});

const isDatabaseConnectionError = (error) => {
  const message = `${error?.message || ""} ${error?.cause?.message || ""}`.toLowerCase();

  return message.includes("connection terminated") ||
    message.includes("connection timeout") ||
    message.includes("connect etimedout") ||
    message.includes("econnrefused") ||
    message.includes("database") && message.includes("not configured");
};

const builderSourceFieldNames = ["theme", "blocks", "formTitle", "text"];
const templateFieldNames = [
  "name",
  "slug",
  "subject",
  "status",
  "sourceJson",
  "html",
  "amp",
  "formHtml",
  "text",
  "variables",
  "isActive",
  "auditHistory"
];
const ignoredRequestFieldNames = [
  "_id",
  "id",
  "version",
  "createdAt",
  "updatedAt"
];
const builderThemeFieldNames = [
  "backgroundColor",
  "backgroundImage",
  "backgroundImageUrl",
  "backgroundUrl",
  "bgImage",
  "bgImageUrl",
  "bgUrl",
  "contentColor",
  "contentBackgroundImage",
  "contentBackgroundImageUrl",
  "contentBackgroundUrl",
  "contentBgImage",
  "contentBgUrl",
  "formBackgroundColor",
  "formBackgroundImage",
  "formBackgroundImageUrl",
  "formBackgroundUrl",
  "formBgImage",
  "formBgImageUrl",
  "formBgUrl",
  "primaryColor",
  "buttonColor",
  "buttonBackgroundColor",
  "buttonTextColor",
  "submitButtonColor",
  "submitBackgroundColor",
  "submitButtonTextColor",
  "submitColor",
  "labelColor",
  "labelColour",
  "fieldLabelColor",
  "inputLabelColor",
  "formLabelColor",
  "inputBackgroundColor",
  "inputBgColor",
  "fieldBackgroundColor",
  "fieldBgColor",
  "inputTextColor",
  "inputTextColour",
  "inputValueColor",
  "inputValueColour",
  "inputColor",
  "fieldTextColor",
  "fieldValueColor",
  "formInputTextColor",
  "formInputValueColor",
  "inputBorderColor",
  "inputBorderColour",
  "fieldBorderColor",
  "formInputBorderColor",
  "successColor",
  "successTitle",
  "successMessage",
  "thankYouTitle",
  "thankYouMessage",
  "thankYouBackgroundColor",
  "thankYouTitleColor",
  "thankYouTextColor",
  "thankYouBorderColor",
  "errorColor",
  "textColor",
  "mutedColor",
  "fontFamily"
];

const hasBuilderSourceFields = (payload = {}) => {
  return builderSourceFieldNames.some((field) => payload[field] !== undefined)
    || builderThemeFieldNames.some((field) => payload[field] !== undefined)
    || Object.keys(payload).some((field) => (
      !templateFieldNames.includes(field) &&
      !ignoredRequestFieldNames.includes(field)
    ));
};

const mergeBuilderSource = (payload = {}, existingSource = {}) => {
  const source = {
    ...(existingSource || {}),
    ...(payload.sourceJson || {})
  };

  for (const field of builderSourceFieldNames) {
    if (payload[field] !== undefined) {
      source[field] = payload[field];
    }
  }

  for (const field of builderThemeFieldNames) {
    if (payload[field] !== undefined) {
      source.theme = {
        ...(source.theme || {}),
        [field]: payload[field]
      };
    }
  }

  for (const [field, value] of Object.entries(payload)) {
    if (
      value !== undefined &&
      !templateFieldNames.includes(field) &&
      !builderThemeFieldNames.includes(field) &&
      !ignoredRequestFieldNames.includes(field)
    ) {
      source[field] = value;
    }
  }

  return source;
};

const removeBuilderSourceFields = (payload = {}) => {
  for (const field of Object.keys(payload)) {
    if (
      !templateFieldNames.includes(field) ||
      builderSourceFieldNames.includes(field) ||
      builderThemeFieldNames.includes(field)
    ) {
      delete payload[field];
    }
  }
};

const keepTemplateFieldsOnly = (payload = {}) => {
  for (const field of Object.keys(payload)) {
    if (!templateFieldNames.includes(field)) {
      delete payload[field];
    }
  }

  for (const field of ignoredRequestFieldNames) {
    delete payload[field];
  }
};

const getPublicAssetUrl = (req, publicPath) => {
  const configuredBaseUrl = process.env.TEMPLATE_ASSET_BASE_URL || process.env.PUBLIC_BASE_URL;
  const baseUrl = configuredBaseUrl || `${req.protocol}://${req.get("host")}`;

  return `${baseUrl.replace(/\/$/, "")}${publicPath}`;
};

export const uploadTemplateAsset = async (req, res) => {
  try {
    const {
      image,
      dataUrl,
      base64,
      fileName,
      name,
      mimeType,
      contentType,
      category = "images"
    } = req.body || {};
    const imagePayload = image || dataUrl || base64;

    if (!imagePayload) {
      return res.status(400).json({
        success: false,
        message: "image, dataUrl or base64 is required"
      });
    }

    const asset = await saveTemplateAsset({
      image: imagePayload,
      fileName: fileName || name,
      mimeType: mimeType || contentType,
      category
    });
    const url = getPublicAssetUrl(req, asset.publicPath);

    return res.status(201).json({
      success: true,
      message: "Template asset saved",
      asset: {
        ...asset,
        url
      },
      usage: {
        imageBlock: {
          type: "image",
          props: {
            src: url
          }
        },
        socialLink: {
          iconUrl: url
        }
      }
    });
  } catch (err) {
    console.error("UPLOAD TEMPLATE ASSET ERROR:", err);

    return res.status(400).json({
      success: false,
      message: err.message || "Template asset upload failed"
    });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const {
      name,
      slug,
      subject,
      sourceJson,
      html,
      amp,
      formHtml,
      text,
      theme,
      blocks,
      formTitle,
      isActive,
      status = "draft"
    } = req.body;
    const builderSourceJson = sourceJson || hasBuilderSourceFields(req.body)
      ? mergeBuilderSource(req.body)
      : null;

    if (!name || (!html && !builderSourceJson)) {
      return res.status(400).json({
        success: false,
        message: "Template name and html or sourceJson are required"
      });
    }

    const compiled = builderSourceJson
      ? compileTemplateSource({
          ...builderSourceJson,
          name,
          subject: subject || builderSourceJson.subject
        })
      : null;
    const validation = getValidationPayload({
      subject: subject || builderSourceJson?.subject,
      html: compiled?.html || html,
      amp: compiled?.amp || amp,
      formHtml: compiled?.formHtml || formHtml,
      variables: compiled?.variables || extractTemplateVariables(html, amp, formHtml, subject),
      sourceJson: builderSourceJson
    });

    const template = await AmpTemplate.create({
      name,
      slug: slug || createSlug(name),
      subject: subject || builderSourceJson?.subject,
      sourceJson: builderSourceJson,
      html: compiled?.html || html,
      amp: compiled?.amp || amp,
      formHtml: compiled?.formHtml || formHtml,
      text: compiled?.text || text,
      status,
      isActive,
      auditHistory: [
        {
          action: "created",
          summary: builderSourceJson ? "Created from builder source" : "Created from raw markup"
        }
      ],
      variables: compiled?.variables || extractTemplateVariables(html, amp, formHtml, subject)
    });

    await snapshotTemplate(template, "Initial template version");

    return res.status(201).json({
      success: true,
      message: "Template saved",
      template,
      validation
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Template slug already exists"
      });
    }

    console.error("CREATE TEMPLATE ERROR:", err);

    if (isDatabaseConnectionError(err)) {
      return res.status(503).json({
        success: false,
        message: "Template database is unavailable. Check POSTGRES_URL or DATABASE_URL and try again."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Template save failed"
    });
  }
};

export const listTemplates = async (req, res) => {
  try {
    const query = {};
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const skip = (page - 1) * limit;

    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, "i") },
        { slug: new RegExp(req.query.search, "i") },
        { subject: new RegExp(req.query.search, "i") }
      ];
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const templates = await AmpTemplate
      .find(query)
      .select("_id name slug subject status version variables isActive createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      templates,
      pagination: {
        page,
        limit,
        count: templates.length,
        hasMore: templates.length === limit
      }
    });
  } catch (err) {
    console.error("LIST TEMPLATE ERROR:", err);

    if (isDatabaseConnectionError(err)) {
      return res.json({
        success: true,
        templates: [],
        warning: "Template database is unavailable. Builder resources can still load, but saved templates cannot be listed."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Template list failed"
    });
  }
};

export const getTemplate = async (req, res) => {
  try {
    const template = await AmpTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    return res.json({
      success: true,
      template
    });
  } catch (err) {
    console.error("GET TEMPLATE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Template fetch failed"
    });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const existingTemplate = await AmpTemplate.findById(req.params.id);

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    const update = { ...req.body };
    const hasBuilderUpdate = update.sourceJson || hasBuilderSourceFields(update);

    if (hasBuilderUpdate) {
      update.sourceJson = mergeBuilderSource(update, existingTemplate.sourceJson || {});
      removeBuilderSourceFields(update);
    }
    keepTemplateFieldsOnly(update);

    if (update.sourceJson) {
      const compiled = compileTemplateSource({
        ...update.sourceJson,
        name: update.name || update.sourceJson.name,
        subject: update.subject || update.sourceJson.subject
      });

      update.html = compiled.html;
      update.amp = compiled.amp;
      update.formHtml = compiled.formHtml;
      update.text = compiled.text;
      update.variables = compiled.variables;
    } else if (update.html || update.amp || update.formHtml || update.subject) {
      update.variables = extractTemplateVariables(
        update.html,
        update.amp,
        update.formHtml,
        update.subject
      );
    }
    const validation = getValidationPayload({
      subject: update.subject || existingTemplate.subject,
      html: update.html || existingTemplate.html,
      amp: update.amp || existingTemplate.amp,
      formHtml: update.formHtml || existingTemplate.formHtml,
      variables: update.variables || existingTemplate.variables,
      sourceJson: update.sourceJson || existingTemplate.sourceJson
    });

    const updateQuery = {
      $set: update,
      $inc: {
        version: 1
      },
      $push: {
        auditHistory: {
          action: "updated",
          summary: update.sourceJson ? "Updated builder source" : "Updated template markup"
        }
      }
    };

    const template = await AmpTemplate.findByIdAndUpdate(
      req.params.id,
      updateQuery,
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    await snapshotTemplate(template, update.sourceJson ? "Updated builder source" : "Updated template markup");

    return res.json({
      success: true,
      message: "Template updated",
      template,
      validation
    });
  } catch (err) {
    console.error("UPDATE TEMPLATE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Template update failed"
    });
  }
};

export const listTemplateVersions = async (req, res) => {
  try {
    const versions = await TemplateVersion
      .find({ templateId: req.params.id })
      .select("-html -amp -formHtml")
      .sort({ version: -1 });

    return res.json({
      success: true,
      versions
    });
  } catch (err) {
    console.error("LIST TEMPLATE VERSIONS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Template version list failed"
    });
  }
};

export const getTemplateVersion = async (req, res) => {
  try {
    const version = await TemplateVersion.findOne({
      templateId: req.params.id,
      version: Number(req.params.version)
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: "Template version not found"
      });
    }

    return res.json({
      success: true,
      version
    });
  } catch (err) {
    console.error("GET TEMPLATE VERSION ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Template version fetch failed"
    });
  }
};

export const restoreTemplateVersion = async (req, res) => {
  try {
    const version = await TemplateVersion.findOne({
      templateId: req.params.id,
      version: Number(req.params.version)
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: "Template version not found"
      });
    }

    const restored = await AmpTemplate.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name: version.name,
          subject: version.subject,
          status: "draft",
          sourceJson: version.sourceJson,
          html: version.html,
          amp: version.amp,
          formHtml: version.formHtml,
          text: version.text,
          variables: version.variables
        },
        $inc: {
          version: 1
        },
        $push: {
          auditHistory: {
            action: "restored",
            summary: `Restored from version ${version.version}`
          }
        }
      },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!restored) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    await snapshotTemplate(restored, `Restored from version ${version.version}`);

    return res.json({
      success: true,
      message: "Template version restored",
      template: restored
    });
  } catch (err) {
    console.error("RESTORE TEMPLATE VERSION ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Template restore failed"
    });
  }
};

export const duplicateTemplate = async (req, res) => {
  try {
    const template = await AmpTemplate.findById(req.params.id).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    const copyName = `${template.name} Copy`;
    const copy = await AmpTemplate.create({
      ...template,
      _id: undefined,
      name: copyName,
      slug: `${createSlug(copyName)}-${Date.now()}`,
      status: "draft",
      version: 1,
      createdAt: undefined,
      updatedAt: undefined,
      auditHistory: [
        ...(template.auditHistory || []),
        {
          action: "duplicated",
          summary: `Duplicated from ${template.name}`
        }
      ]
    });

    await snapshotTemplate(copy, `Duplicated from ${template.name}`);

    return res.status(201).json({
      success: true,
      message: "Template duplicated",
      template: copy
    });
  } catch (err) {
    console.error("DUPLICATE TEMPLATE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Template duplicate failed"
    });
  }
};

export const createSavedBlock = async (req, res) => {
  try {
    const {
      name,
      type,
      category,
      block,
      thumbnailUrl,
      tags
    } = req.body;

    if (!name || !type || !block) {
      return res.status(400).json({
        success: false,
        message: "Saved block name, type and block are required"
      });
    }

    const savedBlock = await SavedBlock.create({
      name,
      type,
      category,
      block,
      thumbnailUrl,
      tags
    });

    return res.status(201).json({
      success: true,
      message: "Saved block created",
      savedBlock
    });
  } catch (err) {
    console.error("CREATE SAVED BLOCK ERROR:", err);

    if (isDatabaseConnectionError(err)) {
      return res.status(503).json({
        success: false,
        message: "Saved block database is unavailable. Check POSTGRES_URL or DATABASE_URL and try again."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Saved block create failed"
    });
  }
};

export const listSavedBlocks = async (req, res) => {
  try {
    const query = {
      isActive: true
    };

    if (req.query.type) {
      query.type = req.query.type;
    }

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, "i") },
        { type: new RegExp(req.query.search, "i") },
        { category: new RegExp(req.query.search, "i") },
        { tags: new RegExp(req.query.search, "i") }
      ];
    }

    const savedBlocks = await SavedBlock
      .find(query)
      .sort({ usageCount: -1, createdAt: -1 });

    return res.json({
      success: true,
      savedBlocks
    });
  } catch (err) {
    console.error("LIST SAVED BLOCKS ERROR:", err);

    if (isDatabaseConnectionError(err)) {
      return res.json({
        success: true,
        savedBlocks: [],
        warning: "Saved block database is unavailable. Builder can continue without saved blocks."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Saved block list failed"
    });
  }
};

export const getSavedBlock = async (req, res) => {
  try {
    const savedBlock = await SavedBlock.findByIdAndUpdate(
      req.params.blockId,
      {
        $inc: {
          usageCount: 1
        }
      },
      {
        returnDocument: "after"
      }
    );

    if (!savedBlock) {
      return res.status(404).json({
        success: false,
        message: "Saved block not found"
      });
    }

    return res.json({
      success: true,
      savedBlock
    });
  } catch (err) {
    console.error("GET SAVED BLOCK ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Saved block fetch failed"
    });
  }
};

export const updateSavedBlock = async (req, res) => {
  try {
    const savedBlock = await SavedBlock.findByIdAndUpdate(
      req.params.blockId,
      {
        $set: req.body
      },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!savedBlock) {
      return res.status(404).json({
        success: false,
        message: "Saved block not found"
      });
    }

    return res.json({
      success: true,
      message: "Saved block updated",
      savedBlock
    });
  } catch (err) {
    console.error("UPDATE SAVED BLOCK ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Saved block update failed"
    });
  }
};

export const archiveSavedBlock = async (req, res) => {
  try {
    const savedBlock = await SavedBlock.findByIdAndUpdate(
      req.params.blockId,
      {
        $set: {
          isActive: false
        }
      },
      {
        returnDocument: "after"
      }
    );

    if (!savedBlock) {
      return res.status(404).json({
        success: false,
        message: "Saved block not found"
      });
    }

    return res.json({
      success: true,
      message: "Saved block archived",
      savedBlock
    });
  } catch (err) {
    console.error("ARCHIVE SAVED BLOCK ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Saved block archive failed"
    });
  }
};

export const previewTemplate = async (req, res) => {
  try {
    const {
      sourceJson,
      subject,
      html,
      amp,
      formHtml,
      text,
      variables = {}
    } = req.body;

    if (!sourceJson && !html) {
      return res.status(400).json({
        success: false,
        message: "sourceJson or html is required"
      });
    }

    const compiled = sourceJson
      ? compileTemplateSource(sourceJson)
      : {
          subject,
          html,
          amp,
          formHtml,
          text,
          variables: extractTemplateVariables(html, amp, formHtml, subject)
        };
    const previewValues = {
      email: "preview@example.com",
      firstName: "Preview",
      formHtmlUrl: "#",
      formAmpUrl: "#",
      formActionUrl: "#",
      directFormHtmlUrl: "#",
      unsubscribeUrl: "#",
      preheader: "",
      ...variables
    };

    const validation = getValidationPayload({
      subject: sourceJson?.subject || subject,
      html: compiled.html,
      amp: compiled.amp,
      formHtml: compiled.formHtml,
      variables: compiled.variables,
      sourceJson,
      providedVariables: variables
    });

    return res.json({
      success: true,
      compiled,
      validation,
      rendered: {
        html: renderTemplateExpressions(compiled.html, previewValues),
        amp: renderTemplateExpressions(compiled.amp, previewValues),
        formHtml: renderTemplateExpressions(compiled.formHtml, previewValues),
        text: renderTemplateExpressions(compiled.text, previewValues)
      }
    });
  } catch (err) {
    console.error("PREVIEW TEMPLATE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Template preview failed"
    });
  }
};

export const validateTemplateController = async (req, res) => {
  try {
    const {
      sourceJson,
      subject,
      html,
      amp,
      formHtml,
      variables,
      providedVariables
    } = req.body;

    const compiled = sourceJson
      ? compileTemplateSource({
          ...sourceJson,
          subject: subject || sourceJson.subject
        })
      : null;
    const validation = getValidationPayload({
      subject: subject || sourceJson?.subject,
      html: compiled?.html || html,
      amp: compiled?.amp || amp,
      formHtml: compiled?.formHtml || formHtml,
      variables: variables || compiled?.variables || extractTemplateVariables(html, amp, formHtml, subject),
      sourceJson,
      providedVariables
    });

    return res.status(200).json({
      success: validation.valid,
      validation,
      compiled
    });
  } catch (err) {
    console.error("VALIDATE TEMPLATE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Template validation failed"
    });
  }
};

export const getBuilderBlockCatalog = (req, res) => {
  return res.json({
    success: true,
    blocks: builderBlockCatalog
  });
};

export const getBuilderEditorConfig = (req, res) => {
  return res.json({
    success: true,
    config: builderEditorConfig
  });
};

export const getStarterTemplateSource = (req, res) => {
  return res.json({
    success: true,
    sourceJson: starterTemplateSource
  });
};
