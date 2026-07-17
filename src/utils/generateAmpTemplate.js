import { defaultTemplateStyles } from "./styles.js";
import { compileTemplateSource } from "./templateCompiler.js";

const placeholderPattern = /\{\{\s*([a-zA-Z0-9_.-]+)(?:\s*\|\s*default\s*:\s*(?:"([^"]*)"|'([^']*)'|([^}]+)))?\s*\}\}/g;

const getBaseUrl = () => (process.env.API_URL || "").replace(/\/$/, "");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeHtmlAttribute = (value) => {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

const buildTrackingUrls = ({
  trackingId,
  subject,
  campaignName,
  campaignType,
  templateId,
  templateSlug
}) => {
  const baseUrl = getBaseUrl();
  const query = new URLSearchParams({
    subject: subject || "",
    campaignName: campaignName || "",
    campaignType: campaignType || ""
  });

  if (templateId) {
    query.set("templateId", templateId);
  }

  if (templateSlug) {
    query.set("templateSlug", templateSlug);
  }

  const formHtmlUrl = `${baseUrl}/track/form/${trackingId}?${query.toString()}`;
  const formClickQuery = new URLSearchParams({
    url: formHtmlUrl,
    subject: subject || "",
    campaignName: campaignName || "",
    campaignType: campaignType || ""
  });

  if (templateId) {
    formClickQuery.set("templateId", templateId);
  }

  if (templateSlug) {
    formClickQuery.set("templateSlug", templateSlug);
  }

  return {
    baseUrl,
    openHtmlUrl: `${baseUrl}/track/open-html/${trackingId}?${query.toString()}`,
    openAmpUrl: `${baseUrl}/track/open-amp/${trackingId}?${query.toString()}`,
    unsubscribeUrl: `${baseUrl}/track/unsubscribe/${trackingId}`,
    formHtmlUrl: `${baseUrl}/track/click/${trackingId}?${formClickQuery.toString()}`,
    directFormHtmlUrl: formHtmlUrl,
    formHtmlSubmitUrl: `${baseUrl}/track/form-html/${trackingId}?${query.toString()}`,
    formAmpUrl: `${baseUrl}/track/form-amp/${trackingId}?${query.toString()}`
  };
};

const getValue = (values, path) => {
  return String(path || "")
    .split(".")
    .filter(Boolean)
    .reduce((current, key) => current?.[key], values);
};

const stripQuotes = (value) => {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
};

const isTruthyValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return Boolean(value);
};

const evaluateCondition = (expression, values) => {
  const condition = String(expression || "").trim();
  const comparison = condition.match(/^([a-zA-Z0-9_.-]+)\s*(==|!=)\s*(.+)$/);

  if (comparison) {
    const [, key, operator, expectedRaw] = comparison;
    const actual = getValue(values, key);
    const expected = stripQuotes(expectedRaw);
    const matches = String(actual ?? "") === expected;

    return operator === "==" ? matches : !matches;
  }

  return isTruthyValue(getValue(values, condition));
};

const renderEachSections = (template, values) => {
  return template.replace(
    /\{\{\s*#each\s+([a-zA-Z0-9_.-]+)\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g,
    (_, key, content) => {
      const items = getValue(values, key);

      if (!Array.isArray(items) || !items.length) {
        return "";
      }

      return items
        .map((item) => renderTemplateExpressions(content, {
          ...values,
          ...(typeof item === "object" && item !== null ? item : { value: item }),
          this: item
        }))
        .join("");
    }
  );
};

const renderConditionalSections = (template, values) => {
  return template
    .replace(
      /\{\{\s*#if\s+([^}]+?)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g,
      (_, expression, content) => evaluateCondition(expression, values)
        ? renderTemplateExpressions(content, values)
        : ""
    )
    .replace(
      /\{\{\s*#unless\s+([^}]+?)\s*\}\}([\s\S]*?)\{\{\s*\/unless\s*\}\}/g,
      (_, expression, content) => !evaluateCondition(expression, values)
        ? renderTemplateExpressions(content, values)
        : ""
    );
};

const replacePlaceholders = (template, values) => {
  return template.replace(placeholderPattern, (_, key, doubleDefault, singleDefault, rawDefault) => {
    const value = getValue(values, key);
    const fallback = doubleDefault ?? singleDefault ?? rawDefault;

    if (value === undefined || value === null || value === "") {
      return fallback === undefined ? "" : stripQuotes(fallback);
    }

    return String(value);
  });
};

export const renderTemplateExpressions = (template, values) => {
  let nextTemplate = String(template || "");

  for (let index = 0; index < 4; index += 1) {
    const previous = nextTemplate;
    nextTemplate = renderEachSections(nextTemplate, values);
    nextTemplate = renderConditionalSections(nextTemplate, values);

    if (previous === nextTemplate) {
      break;
    }
  }

  return replacePlaceholders(nextTemplate, values);
};

const shouldTrackHref = (href, baseUrl) => {
  if (!href || href.startsWith("#")) {
    return false;
  }

  const lowerHref = href.toLowerCase();

  if (
    lowerHref.startsWith("mailto:") ||
    lowerHref.startsWith("tel:") ||
    lowerHref.startsWith("javascript:")
  ) {
    return false;
  }

  if (baseUrl && lowerHref.startsWith(baseUrl.toLowerCase())) {
    return false;
  }

  return /^https?:\/\//i.test(href);
};

const trackLinks = (html, trackingId, context) => {
  const { baseUrl } = context.urls;

  return html.replace(
    /href=(["'])(.*?)\1/gi,
    (match, quote, href) => {
      if (!shouldTrackHref(href, baseUrl)) {
        return match;
      }

      const decodedHref = href
        .replace(/&amp;/gi, "&")
        .replace(/&#x26;/gi, "&")
        .replace(/&#38;/gi, "&");

      const query = new URLSearchParams({
        url: decodedHref,
        subject: context.subject || "",
        campaignName: context.campaignName || "",
        campaignType: context.campaignType || ""
      });

      if (context.templateId) {
        query.set("templateId", context.templateId);
      }

      if (context.templateSlug) {
        query.set("templateSlug", context.templateSlug);
      }

      return `href=${quote}${baseUrl}/track/click/${trackingId}?${query.toString()}${quote}`;
    }
  );
};

const injectBeforeBodyEnd = (html, markup) => {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${markup}</body>`);
  }

  return `${html}${markup}`;
};

const injectStyle = (html) => {
  if (html.includes("tracking-footer")) {
    return html;
  }

  const style = `<style>${defaultTemplateStyles}</style>`;

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${style}</head>`);
  }

  return `${style}${html}`;
};

const DESKTOP_EMAIL_WIDTH = 500;
const DESKTOP_IMAGE_WIDTH = 500;

const getTemplateWidth = (template = {}) => {
  const width = Number(template.sourceJson?.theme?.width);

  return Number.isFinite(width) && width > 0
    ? Math.min(width, DESKTOP_EMAIL_WIDTH)
    : DESKTOP_EMAIL_WIDTH;
};

const getTemplateImageWidth = (template = {}) => {
  const shellWidth = getTemplateWidth(template);

  return Math.min(shellWidth, DESKTOP_IMAGE_WIDTH);
};

const setStyleValue = (styleValue = "", property, value) => {
  const pattern = new RegExp(`${escapeRegex(property)}\\s*:\\s*[^;"]*`, "i");

  if (pattern.test(styleValue)) {
    return styleValue.replace(pattern, `${property}:${value}`);
  }

  return `${styleValue.replace(/;?\s*$/, "")};${property}:${value}`;
};

const setAttributeValue = (attrs = "", attribute, value) => {
  const pattern = new RegExp(`\\s${escapeRegex(attribute)}=(["']).*?\\1`, "i");

  if (pattern.test(attrs)) {
    return attrs.replace(pattern, ` ${attribute}="${value}"`);
  }

  return `${attrs} ${attribute}="${value}"`;
};

const constrainEmailShell = (html, template = {}) => {
  const width = getTemplateWidth(template);

  return String(html || "").replace(/<([a-z][a-z0-9-]*)([^>]*class=(["'])[^"']*\bemail-shell\b[^"']*\3[^>]*)>/gi, (match, tagName, attrs) => {
    let nextAttrs = attrs;

    if (tagName.toLowerCase() === "table") {
      nextAttrs = setAttributeValue(nextAttrs, "width", width);
    }

    if (/\sstyle=(["'])(.*?)\1/i.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(/\sstyle=(["'])(.*?)\1/i, (_, quote, styleValue) => {
        let nextStyle = setStyleValue(styleValue, "width", `${width}px`);
        nextStyle = setStyleValue(nextStyle, "max-width", "100%");
        nextStyle = setStyleValue(nextStyle, "margin", "0 auto");

        return ` style=${quote}${nextStyle}${quote}`;
      });
    } else {
      nextAttrs += ` style="width:${width}px;max-width:100%;margin:0 auto"`;
    }

    return `<${tagName}${nextAttrs}>`;
  });
};

const constrainHtmlImages = (html, template = {}) => {
  const width = getTemplateImageWidth(template);

  const htmlWithFrames = String(html || "").replace(/<table\b([^>]*class=(["'])[^"']*\bemail-image-frame\b[^"']*\2[^>]*)>/gi, (match, attrs) => {
    let nextAttrs = setAttributeValue(attrs, "width", width);

    if (/\sstyle=(["'])(.*?)\1/i.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(/\sstyle=(["'])(.*?)\1/i, (_, quote, styleValue) => {
        let nextStyle = setStyleValue(styleValue, "width", "100%");
        nextStyle = setStyleValue(nextStyle, "max-width", `${width}px`);
        nextStyle = setStyleValue(nextStyle, "margin", "0 auto");

        return ` style=${quote}${nextStyle}${quote}`;
      });
    } else {
      nextAttrs += ` style="width:100%;max-width:${width}px;margin:0 auto"`;
    }

    return `<table${nextAttrs}>`;
  });

  return htmlWithFrames.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
    if (/width=(["'])1\1/i.test(attrs) || /display\s*:\s*none/i.test(attrs)) {
      return match;
    }

    const hasFluidWidth = /width=(["'])100%\1/i.test(attrs) || /width\s*:\s*100%/i.test(attrs);

    if (!hasFluidWidth) {
      return match;
    }

    let nextAttrs = setAttributeValue(attrs, "width", width);

    if (/\sclass=(["'])(.*?)\1/i.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(/\sclass=(["'])(.*?)\1/i, (_, quote, classValue) => {
        return classValue.includes("email-image")
          ? ` class=${quote}${classValue}${quote}`
          : ` class=${quote}${classValue} email-image${quote}`;
      });
    } else {
      nextAttrs += ` class="email-image"`;
    }

    if (/\sstyle=(["'])(.*?)\1/i.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(/\sstyle=(["'])(.*?)\1/i, (_, quote, styleValue) => {
        let nextStyle = setStyleValue(styleValue, "width", "100%");
        nextStyle = setStyleValue(nextStyle, "max-width", `${width}px`);
        nextStyle = setStyleValue(nextStyle, "height", "auto");

        return ` style=${quote}${nextStyle}${quote}`;
      });
    } else {
      nextAttrs += ` style="width:100%;max-width:${width}px;height:auto"`;
    }

    return `<img${nextAttrs}>`;
  });
};

export const normalizeStoredTemplateMarkup = ({
  html,
  amp,
  template = {}
} = {}) => ({
  html: constrainHtmlImages(
    constrainEmailShell(html, template),
    template
  ),
  amp: constrainEmailShell(amp, template)
});

const hasTrackingToken = (template, tokenName, url) => {
  return (
    new RegExp(`\\{\\{\\s*${escapeRegex(tokenName)}\\s*\\}\\}`, "i").test(template) ||
    template.includes(url)
  );
};

const addHtmlTracking = (html, originalTemplate, urls) => {
  let nextHtml = injectStyle(html);

  if (!hasTrackingToken(originalTemplate, "openPixelHtml", urls.openHtmlUrl)) {
    nextHtml = injectBeforeBodyEnd(
      nextHtml,
      `<img src="${urls.openHtmlUrl}" width="1" height="1" alt="" style="display:none;" />`
    );
  }

  if (!hasTrackingToken(originalTemplate, "unsubscribeUrl", urls.unsubscribeUrl)) {
    nextHtml = injectBeforeBodyEnd(
      nextHtml,
      `<div class="tracking-footer"><a href="${urls.unsubscribeUrl}">Unsubscribe</a></div>`
    );
  }

  return nextHtml;
};

const addAmpTracking = (amp, originalTemplate, urls) => {
  let nextAmp = amp;

  if (!hasTrackingToken(originalTemplate, "openPixelAmp", urls.openAmpUrl)) {
    nextAmp = injectBeforeBodyEnd(
      nextAmp,
      `<amp-img src="${urls.openAmpUrl}" width="1" height="1" layout="fixed"></amp-img>`
    );
  }

  if (!hasTrackingToken(originalTemplate, "unsubscribeUrl", urls.unsubscribeUrl)) {
    nextAmp = injectBeforeBodyEnd(
      nextAmp,
      `<div style="text-align:center;font-size:12px;margin-top:16px;"><a href="${urls.unsubscribeUrl}">Unsubscribe</a></div>`
    );
  }

  return nextAmp;
};

const ensureFormAttribute = (html, attribute, value) => {
  if (!/<form\b/i.test(html)) {
    return html;
  }

  const attributePattern = new RegExp(`\\s${escapeRegex(attribute)}=(["'])(.*?)\\1`, "i");

  if (attributePattern.test(html)) {
    return html.replace(
      new RegExp(`(<form\\b[^>]*)\\s${escapeRegex(attribute)}=(["'])(.*?)\\2`, "i"),
      `$1 ${attribute}="${value}"`
    );
  }

  return html.replace(/<form\b([^>]*)>/i, `<form$1 ${attribute}="${value}">`);
};

const removeFormAttribute = (html, attribute) => {
  if (!/<form\b/i.test(html)) {
    return html;
  }

  return html.replace(
    new RegExp(`(<form\\b[^>]*)\\s${escapeRegex(attribute)}=(["'])(.*?)\\2`, "i"),
    "$1"
  );
};

const ensureEmailFormTrackingFields = (html, fields) => {
  if (!/<form\b/i.test(html)) {
    return html;
  }

  let nextHtml = html;

  for (const [name, value] of Object.entries(fields)) {
    if (new RegExp(`name=(["'])${escapeRegex(name)}\\1`, "i").test(nextHtml)) {
      continue;
    }

    nextHtml = nextHtml.replace(
      /<\/form>/i,
      `<input type="hidden" name="${name}" value="${escapeHtmlAttribute(value)}"></form>`
    );
  }

  return nextHtml;
};

const addHtmlFormTracking = (html, values, urls) => {
  if (!/<form\b/i.test(html)) {
    return html;
  }

  let nextHtml = removeFormAttribute(html, "action-xhr");
  nextHtml = ensureFormAttribute(nextHtml, "method", "post");
  nextHtml = ensureFormAttribute(nextHtml, "action", urls.formHtmlSubmitUrl);

  return ensureEmailFormTrackingFields(nextHtml, {
    trackingid: values.trackingId,
    subject: values.subject,
    campaignName: values.campaignName,
    campaignType: values.campaignType,
    templateId: values.templateId,
    templateSlug: values.templateSlug
  });
};

const addAmpFormTracking = (amp, values, urls) => {
  if (!/<form\b/i.test(amp)) {
    return amp;
  }

  let nextAmp = removeFormAttribute(amp, "action");
  nextAmp = ensureFormAttribute(nextAmp, "method", "post");
  nextAmp = ensureFormAttribute(nextAmp, "action-xhr", urls.formAmpUrl);
  nextAmp = removeFormAttribute(nextAmp, "target");

  return ensureEmailFormTrackingFields(nextAmp, {
    trackingid: values.trackingId,
    subject: values.subject,
    campaignName: values.campaignName,
    campaignType: values.campaignType,
    templateId: values.templateId,
    templateSlug: values.templateSlug
  });
};

export const renderTrackedTemplate = ({
  template,
  trackingId,
  email,
  subject,
  campaignName,
  campaignType,
  variables = {}
}) => {
  const urls = buildTrackingUrls({
    trackingId,
    subject,
    campaignName,
    campaignType,
    templateId: template._id?.toString(),
    templateSlug: template.slug
  });

  const values = {
    ...variables,
    trackingId,
    email,
    subject,
    campaignName,
    campaignType,
    baseUrl: urls.baseUrl,
    openPixelHtml: `<img src="${urls.openHtmlUrl}" width="1" height="1" alt="" style="display:none;" />`,
    openPixelAmp: `<amp-img src="${urls.openAmpUrl}" width="1" height="1" layout="fixed"></amp-img>`,
    unsubscribeUrl: urls.unsubscribeUrl,
    formHtmlUrl: urls.formHtmlUrl,
    directFormHtmlUrl: urls.directFormHtmlUrl,
    formHtmlSubmitUrl: urls.formHtmlSubmitUrl,
    formAmpUrl: urls.formAmpUrl,
    templateId: template._id?.toString(),
    templateSlug: template.slug
  };

  const htmlWithValues = constrainHtmlImages(
    constrainEmailShell(
      renderTemplateExpressions(template.html, values),
      template
    ),
    template
  );
  const ampWithValues = template.amp
    ? constrainEmailShell(renderTemplateExpressions(template.amp, values), template)
    : "";

  const context = {
    subject,
    campaignName,
    campaignType,
    templateId: template._id?.toString(),
    templateSlug: template.slug,
    urls
  };

  return {
    subject: subject || template.subject,
    html: addHtmlTracking(
      trackLinks(addHtmlFormTracking(htmlWithValues, values, urls), trackingId, context),
      template.html,
      urls
    ),
    amp: ampWithValues
      ? addAmpTracking(
        trackLinks(addAmpFormTracking(ampWithValues, values, urls), trackingId, context),
        template.amp,
        urls
      )
      : "",
    text: template.text
  };
};

const defaultFormHtml = ({
  trackingId,
  subject,
  campaignName,
  campaignType,
  formActionUrl,
  values
}) => {
  return `<!doctype html>
<html amp>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
  <title>${values.formTitle || "Campaign Form"}</title>
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>
  <script async custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"></script>
  <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
  <noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
  <style amp-custom>
    body{margin:0;background:#f8fafc;font-family:Arial,sans-serif;padding:24px}
    .container{max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:24px}
    h1{margin:0 0 16px;color:#111827;font-size:24px}
    label{display:block;margin:14px 0 6px;color:#374151;font-weight:700;font-size:14px}
    input,textarea,select{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px;padding:12px;font-size:15px}
    button{width:100%;margin-top:20px;border:0;border-radius:6px;background:#178218;color:#fff;padding:13px;font-size:16px;font-weight:700}
    @media (max-width: 600px) {
      body { padding: 12px; }
      .container { padding: 16px; border-radius: 6px; }
      h1 { font-size: 20px; margin-bottom: 12px; }
      label { margin: 10px 0 4px; font-size: 13px; }
      input,textarea,select { padding: 10px; font-size: 14px; }
      button { padding: 11px; font-size: 15px; margin-top: 16px; }
    }
  </style>
</head>
<body>
  <form class="container" method="post" action-xhr="${formActionUrl}">
    <h1>${values.formTitle || "Check Your Eligibility"}</h1>
    <label>Company Name *</label>
    <input type="text" name="company" required>
    <label>Mobile No *</label>
    <input type="tel" name="mobile" required>
    <input type="hidden" name="trackingid" value="${trackingId}">
    <input type="hidden" name="subject" value="${subject || ""}">
    <input type="hidden" name="campaignName" value="${campaignName || ""}">
    <input type="hidden" name="campaignType" value="${campaignType || ""}">
    <button type="submit">${values.buttonText || "Apply Now"}</button>
    <div submit-success>
      <template type="amp-mustache">
        <p style="color:#178218;text-align:center;font-weight:700;">Submitted successfully.</p>
      </template>
    </div>
    <div submit-error>
      <template type="amp-mustache">
        <p style="color:#dc2626;text-align:center;font-weight:700;">Submission failed.</p>
      </template>
    </div>
  </form>
</body>
</html>`;
};

const isAmpFormPage = (html) => {
  return /<html[^>]*(\samp|⚡|amp4email)/i.test(html) || /<style\b[^>]*amp-custom/i.test(html) || /action-xhr=/i.test(html);
};

const ensureFormAction = (html, formActionUrl, useAmpAction = false) => {
  if (!/<form\b/i.test(html)) {
    return html;
  }

  if (useAmpAction) {
    let nextHtml = html
      .replace(/\saction-xhr=(["'])(.*?)\1/gi, "")
      .replace(/\saction=(["'])(.*?)\1/gi, "");

    nextHtml = nextHtml.replace(
      /<form\b([^>]*)>/i,
      `<form$1 action-xhr="${formActionUrl}">`
    );

    return nextHtml;
  }

  if (/<form\b[^>]*\saction=/i.test(html)) {
    return html.replace(
      /<form\b([^>]*)\saction=(["'])(.*?)\2([^>]*)>/i,
      `<form$1 action="${formActionUrl}"$4>`
    );
  }

  return html.replace(/<form\b([^>]*)>/i, `<form$1 action="${formActionUrl}">`);
};

const ensurePostMethod = (html) => {
  if (!/<form\b/i.test(html)) {
    return html;
  }

  if (/<form\b[^>]*\smethod=/i.test(html)) {
    return html.replace(
      /<form\b([^>]*)\smethod=(["'])(.*?)\2([^>]*)>/i,
      `<form$1 method="post"$4>`
    );
  }

  return html.replace(/<form\b([^>]*)>/i, `<form$1 method="post">`);
};

const ensureFormEnctype = (html) => {
  if (!/<form\b/i.test(html)) {
    return html;
  }

  if (/<form\b[^>]*\senctype=/i.test(html)) {
    return html.replace(
      /<form\b([^>]*)\senctype=(["'])(.*?)\2([^>]*)>/i,
      `<form$1 enctype="application/x-www-form-urlencoded"$4>`
    );
  }

  return html.replace(
    /<form\b([^>]*)>/i,
    `<form$1 enctype="application/x-www-form-urlencoded">`
  );
};

const ensureHiddenField = (html, name, value) => {
  if (new RegExp(`name=(["'])${escapeRegex(name)}\\1`, "i").test(html)) {
    return html;
  }

  const input = `<input type="hidden" name="${name}" value="${value || ""}">`;

  if (/<\/form>/i.test(html)) {
    return html.replace(/<\/form>/i, `${input}</form>`);
  }

  return `${html}${input}`;
};

export const renderTrackedFormTemplate = ({
  template,
  trackingId,
  email,
  subject,
  campaignName,
  campaignType,
  variables = {}
}) => {
  const baseUrl = getBaseUrl();
  const formActionUrl = `${baseUrl}/track/form-html/${trackingId}`;
  const directFormHtmlUrl = `${baseUrl}/track/form/${trackingId}`;
  const values = {
    ...variables,
    trackingId,
    email,
    subject,
    campaignName,
    campaignType,
    baseUrl,
    formActionUrl,
    directFormHtmlUrl,
    templateId: template?._id?.toString(),
    templateSlug: template?.slug
  };

  const compiledFormHtml = template?.sourceJson
    ? compileTemplateSource(template.sourceJson).formHtml
    : "";
  const templateFormHtml = compiledFormHtml || template?.formHtml;
  const rawFormHtml = templateFormHtml
    ? renderTemplateExpressions(templateFormHtml, values)
    : defaultFormHtml({
      trackingId,
      subject,
      campaignName,
      campaignType,
      formActionUrl,
      values
    });

  const ampFormPage = isAmpFormPage(rawFormHtml);

  let html = ensureFormEnctype(
    ensurePostMethod(
      ensureFormAction(rawFormHtml, formActionUrl, ampFormPage)
    )
  );

  html = ensureHiddenField(html, "trackingid", trackingId);
  html = ensureHiddenField(html, "subject", subject);
  html = ensureHiddenField(html, "campaignName", campaignName);
  html = ensureHiddenField(html, "campaignType", campaignType);
  html = ensureHiddenField(html, "templateId", template?._id?.toString());
  html = ensureHiddenField(html, "templateSlug", template?.slug);

  return html;
};

export const extractTemplateVariables = (...templates) => {
  const variables = new Set();

  for (const template of templates) {
    if (!template) {
      continue;
    }

    for (const match of String(template).matchAll(placeholderPattern)) {
      variables.add(match[1]);
    }

    for (const match of String(template).matchAll(/\{\{\s*#(?:if|unless|each)\s+([a-zA-Z0-9_.-]+)/g)) {
      variables.add(match[1]);
    }
  }

  return [...variables].sort();
};
