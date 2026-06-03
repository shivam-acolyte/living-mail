const SYSTEM_VARIABLES = new Set([
  "baseUrl",
  "campaignName",
  "campaignType",
  "directFormHtmlUrl",
  "email",
  "formActionUrl",
  "formAmpUrl",
  "formHtmlSubmitUrl",
  "formHtmlUrl",
  "openPixelAmp",
  "openPixelHtml",
  "preheader",
  "subject",
  "templateId",
  "templateSlug",
  "trackingId",
  "unsubscribeUrl"
]);

const SUPPORTED_AMP_COMPONENTS = new Set([
  "amp-img",
  "amp-form",
  "amp-carousel"
]);

const addIssue = (issues, severity, code, message, meta = {}) => {
  issues.push({
    severity,
    code,
    message,
    ...meta
  });
};

const hasMustache = (value = "") => /\{\{[^}]+\}\}/.test(String(value));

const isAbsoluteUrl = (value = "") => {
  if (hasMustache(value)) {
    return true;
  }

  if (/^(mailto:|tel:|#)/i.test(value)) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const extractAttributes = (markup = "", attribute) => {
  const pattern = new RegExp(`${attribute}\\s*=\\s*(["'])(.*?)\\1`, "gi");
  return [...String(markup).matchAll(pattern)].map((match) => match[2]);
};

const validateUrls = (issues, markup, { label, imageRequired = false } = {}) => {
  const hrefs = extractAttributes(markup, "href");
  const srcs = extractAttributes(markup, "src");

  hrefs.forEach((href) => {
    if (!href || !isAbsoluteUrl(href)) {
      addIssue(
        issues,
        "error",
        "INVALID_LINK_URL",
        `${label} has an invalid link URL`,
        { value: href }
      );
    }
  });

  srcs.forEach((src) => {
    if (!src || !isAbsoluteUrl(src)) {
      addIssue(
        issues,
        "warning",
        "INVALID_IMAGE_URL",
        `${label} has an invalid image URL`,
        { value: src }
      );
    }
  });
};

const validateAmp = (issues, amp = "") => {
  if (!amp) {
    addIssue(issues, "warning", "MISSING_AMP", "AMP output is missing");
    return;
  }

  if (!/<html[^>]*(?:\bamp4email\b|⚡4email)/i.test(amp)) {
    addIssue(issues, "error", "INVALID_AMP_ROOT", "AMP email must use an amp4email html root");
  }

  if (!/https:\/\/cdn\.ampproject\.org\/v0\.js/i.test(amp)) {
    addIssue(issues, "error", "MISSING_AMP_RUNTIME", "AMP email is missing the AMP runtime script");
  }

  if (!/<style\s+amp4email-boilerplate>/i.test(amp)) {
    addIssue(issues, "error", "MISSING_AMP_BOILERPLATE", "AMP email is missing amp4email boilerplate");
  }

  const ampTags = [...amp.matchAll(/<\s*(amp-[a-z0-9-]+)/gi)]
    .map((match) => match[1].toLowerCase());
  const unsupportedTags = [...new Set(
    ampTags.filter((tag) => !SUPPORTED_AMP_COMPONENTS.has(tag))
  )];

  unsupportedTags.forEach((tag) => {
    addIssue(
      issues,
      "error",
      "UNSUPPORTED_AMP_COMPONENT",
      `Unsupported AMP component: ${tag}`,
      { component: tag }
    );
  });

  if (/<amp-carousel\b/i.test(amp) && !/custom-element=["']amp-carousel["']/i.test(amp)) {
    addIssue(issues, "error", "MISSING_AMP_CAROUSEL_SCRIPT", "AMP carousel script is missing");
  }

  if (/<form\b/i.test(amp) && !/<form\b[^>]*\baction-xhr=["'](?:\{\{formAmpUrl\}\}|https?:\/\/)/i.test(amp)) {
    addIssue(issues, "error", "MISSING_AMP_FORM_ACTION", "AMP form must submit to formAmpUrl or an HTTPS action-xhr");
  }

  if (/<form\b[^>]*\btarget=/i.test(amp)) {
    addIssue(issues, "error", "INVALID_AMP_FORM_TARGET", "AMP email forms must not include a target attribute");
  }
};

const validateFormPage = (issues, formHtml = "") => {
  if (!/<form\b/i.test(formHtml || "")) {
    return;
  }

  const hasAction = /<form\b[^>]*\b(action|action-xhr)=["'](?:\{\{formActionUrl\}\}|https?:\/\/)/i
    .test(formHtml);

  if (!hasAction) {
    addIssue(
      issues,
      "error",
      "MISSING_FORM_ACTION",
      "Hosted form must submit to formActionUrl or an HTTPS action"
    );
  }
};

const validateMissingVariables = (issues, variables = [], providedVariables = {}) => {
  const provided = new Set(Object.keys(providedVariables || {}));
  const missing = variables.filter((variable) => (
    !SYSTEM_VARIABLES.has(variable) &&
    !provided.has(variable)
  ));

  if (missing.length) {
    addIssue(
      issues,
      "warning",
      "MISSING_VARIABLE_VALUES",
      "Template has variables without preview/send values",
      { variables: missing }
    );
  }
};

const validateSourceBlocks = (issues, sourceJson = {}) => {
  if (!sourceJson || typeof sourceJson !== "object") {
    return;
  }

  const blocks = Array.isArray(sourceJson.blocks) ? sourceJson.blocks : [];

  blocks.forEach((block) => {
    const props = block.props || {};

    if (block.type === "image" && !props.src) {
      addIssue(issues, "error", "IMAGE_BLOCK_MISSING_SRC", "Image block is missing src", {
        blockId: block.id,
        blockType: block.type
      });
    }

    if (["form", "poll", "survey", "rating", "nps", "appointment", "booking", "quiz", "productFeedback", "rsvp"].includes(block.type)) {
      const fields = props.fields || props.questions || [];

      if (block.type === "form" && !fields.length) {
        addIssue(issues, "warning", "FORM_HAS_NO_FIELDS", "Form block has no fields", {
          blockId: block.id,
          blockType: block.type
        });
      }

      fields.forEach((field) => {
        if (!field.name) {
          addIssue(issues, "error", "FORM_FIELD_MISSING_NAME", "Form field is missing name", {
            blockId: block.id,
            blockType: block.type,
            fieldLabel: field.label
          });
        }
      });
    }
  });
};

export const validateTemplate = ({
  subject,
  html,
  amp,
  formHtml,
  variables = [],
  sourceJson,
  providedVariables = {}
} = {}) => {
  const issues = [];

  if (!String(subject || "").trim()) {
    addIssue(issues, "error", "MISSING_SUBJECT", "Subject is required before sending");
  }

  if (!String(html || "").trim()) {
    addIssue(issues, "error", "MISSING_HTML_FALLBACK", "HTML fallback is required before sending");
  }

  if (html && !/<body[\s>]/i.test(html)) {
    addIssue(issues, "warning", "HTML_MISSING_BODY", "HTML fallback does not include a body tag");
  }

  const hasUnsubscribe = /unsubscribeUrl|\/track\/unsubscribe|unsubscribe/i.test(`${html || ""}\n${amp || ""}`);

  if (!hasUnsubscribe) {
    addIssue(
      issues,
      "warning",
      "MISSING_UNSUBSCRIBE",
      "Template does not include an unsubscribe token; send-time tracking will auto-inject one"
    );
  }

  validateUrls(issues, html, { label: "HTML fallback", imageRequired: true });
  validateUrls(issues, amp, { label: "AMP email", imageRequired: true });
  validateAmp(issues, amp);
  validateFormPage(issues, formHtml);
  validateMissingVariables(issues, variables, providedVariables);
  validateSourceBlocks(issues, sourceJson);

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    issues
  };
};
