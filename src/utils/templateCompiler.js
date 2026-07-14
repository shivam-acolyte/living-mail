const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const escapeAttr = escapeHtml;

const appendUtmToUrl = (url, campaignNameVar = "{{campaignName}}", utmContent = "email_visit_button", templateSlugVar = "{{templateSlug}}") => {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("{{") || url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("#")) {
    return url;
  }
  try {
    if (url.includes("utm_campaign")) {
      return url;
    }
    const utmParams = `utm_source=email&utm_medium=email&utm_campaign=${campaignNameVar}&utm_id=${templateSlugVar}&utm_content=${utmContent}`;
    return url.includes("?") ? `${url}&${utmParams}` : `${url}?${utmParams}`;
  } catch (e) {
    return url;
  }
};

const px = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? `${number}px` : fallback;
};

const numberFrom = (...values) => {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }

  return null;
};

const DESKTOP_EMAIL_WIDTH = 500;
const DESKTOP_IMAGE_WIDTH = 500;
const HOSTED_FORM_BANNER_WIDTH = 720;
const HOSTED_FORM_WIDTH = 840;
const SMARTPHONE_BREAKPOINT = 480;

const getImageSize = (props = {}, theme = {}) => {
  const shellWidth = Math.min(Number(theme.width) || DESKTOP_EMAIL_WIDTH, DESKTOP_EMAIL_WIDTH);
  const defaultDesktopImageWidth = Math.min(shellWidth, DESKTOP_IMAGE_WIDTH);
  const fitToBody = props.fullWidth !== false && props.fitToBody !== false;
  const requestedWidth = numberFrom(props.width, props.imageWidth, props.bannerWidth);
  const width = fitToBody
    ? defaultDesktopImageWidth
    : Math.min(requestedWidth || defaultDesktopImageWidth, shellWidth);
  const requestedHeight = numberFrom(props.height, props.imageHeight, props.bannerHeight);
  const requestedRatioWidth = requestedWidth || width;
  const scaledHeight = requestedHeight
    ? Math.round(requestedHeight * (width / requestedRatioWidth))
    : null;
  const height = requestedHeight
    ? scaledHeight
    : Math.round(width * 0.5);

  return {
    width,
    height
  };
};

const firstValue = (...values) => {
  return values.find((value) => value !== undefined && value !== null && value !== "");
};

const getBoxPadding = (props = {}, fallback = "0") => {
  const top = props.paddingTop;
  const right = props.paddingRight;
  const bottom = props.paddingBottom;
  const left = props.paddingLeft;
  const hasSidePadding = [top, right, bottom, left].some((value) => value !== undefined && value !== "");

  if (hasSidePadding) {
    const t = top !== undefined && top !== "" ? (Number.isFinite(Number(top)) ? `${top}px` : top) : "0px";
    const r = right !== undefined && right !== "" ? (Number.isFinite(Number(right)) ? `${right}px` : right) : "0px";
    const b = bottom !== undefined && bottom !== "" ? (Number.isFinite(Number(bottom)) ? `${bottom}px` : bottom) : "0px";
    const l = left !== undefined && left !== "" ? (Number.isFinite(Number(left)) ? `${left}px` : left) : "0px";
    return `${t} ${r} ${b} ${l}`;
  }

  const padding = props.padding;
  if (padding !== undefined && padding !== "") {
    return Number.isFinite(Number(padding)) ? `${padding}px` : padding;
  }

  return fallback;
};

const getBoxMargin = (props = {}, fallback = "0") => {
  const top = props.marginTop;
  const right = props.marginRight;
  const bottom = props.marginBottom;
  const left = props.marginLeft;
  const hasSideMargin = [top, right, bottom, left].some((value) => value !== undefined && value !== "");

  if (hasSideMargin) {
    const t = top !== undefined && top !== "" ? (Number.isFinite(Number(top)) ? `${top}px` : top) : "0px";
    const r = right !== undefined && right !== "" ? (Number.isFinite(Number(right)) ? `${right}px` : right) : "0px";
    const b = bottom !== undefined && bottom !== "" ? (Number.isFinite(Number(bottom)) ? `${bottom}px` : bottom) : "0px";
    const l = left !== undefined && left !== "" ? (Number.isFinite(Number(left)) ? `${left}px` : left) : "0px";
    return `${t} ${r} ${b} ${l}`;
  }

  const margin = props.margin;
  if (margin !== undefined && margin !== "") {
    return Number.isFinite(Number(margin)) ? `${margin}px` : margin;
  }

  return fallback;
};

const getBackgroundImage = (source = {}) => firstValue(
  source.backgroundImage,
  source.backgroundImageUrl,
  source.backgroundUrl,
  source.bgImage,
  source.bgImageUrl,
  source.bgUrl,
  source.image
);

const getButtonBackgroundColor = (source = {}) => firstValue(
  source.buttonBackgroundColor,
  source.buttonColor,
  source.submitButtonColor,
  source.submitBackgroundColor,
  source.ctaBackgroundColor,
  source.backgroundColor
);

const getButtonTextColor = (source = {}) => firstValue(
  source.buttonTextColor,
  source.submitButtonTextColor,
  source.submitColor,
  source.textButtonColor,
  source.ctaTextColor,
  source.color
);

const getTheme = (sourceJson = {}) => ({
  width: Math.min(Number(sourceJson.theme?.width) || DESKTOP_EMAIL_WIDTH, DESKTOP_EMAIL_WIDTH),
  backgroundColor: sourceJson.theme?.backgroundColor || "#f8fafc",
  backgroundImage: getBackgroundImage(sourceJson.theme) || "",
  contentColor: sourceJson.theme?.contentColor || "#ffffff",
  contentBackgroundImage: firstValue(
    sourceJson.theme?.contentBackgroundImage,
    sourceJson.theme?.contentBackgroundImageUrl,
    sourceJson.theme?.contentBackgroundUrl,
    sourceJson.theme?.contentBgImage,
    sourceJson.theme?.contentBgUrl
  ) || "",
  formBackgroundColor: sourceJson.theme?.formBackgroundColor || sourceJson.theme?.form?.backgroundColor || sourceJson.theme?.contentColor || "#ffffff",
  formBackgroundImage: firstValue(
    sourceJson.theme?.formBackgroundImage,
    sourceJson.theme?.formBackgroundImageUrl,
    sourceJson.theme?.formBackgroundUrl,
    sourceJson.theme?.formBgImage,
    sourceJson.theme?.formBgImageUrl,
    sourceJson.theme?.formBgUrl,
    getBackgroundImage(sourceJson.theme?.form)
  ) || "",
  darkBackgroundColor: sourceJson.theme?.darkBackgroundColor || sourceJson.theme?.darkMode?.backgroundColor || "#111827",
  darkContentColor: sourceJson.theme?.darkContentColor || sourceJson.theme?.darkMode?.contentColor || "#1f2937",
  darkTextColor: sourceJson.theme?.darkTextColor || sourceJson.theme?.darkMode?.textColor || "#f9fafb",
  darkMutedColor: sourceJson.theme?.darkMutedColor || sourceJson.theme?.darkMode?.mutedColor || "#cbd5e1",
  textColor: sourceJson.theme?.textColor || "#111827",
  mutedColor: sourceJson.theme?.mutedColor || "#64748b",
  primaryColor: firstValue(
    sourceJson.theme?.primaryColor,
    sourceJson.theme?.buttonColor,
    sourceJson.theme?.buttonBackgroundColor,
    sourceJson.theme?.submitButtonColor
  ) || "#178218",
  buttonColor: firstValue(
    sourceJson.theme?.buttonColor,
    sourceJson.theme?.buttonBackgroundColor,
    sourceJson.theme?.submitButtonColor,
    sourceJson.theme?.primaryColor
  ) || "#178218",
  buttonTextColor: firstValue(
    sourceJson.theme?.buttonTextColor,
    sourceJson.theme?.submitButtonTextColor
  ) || "#ffffff",
  labelColor: firstValue(sourceJson.theme?.labelColor, sourceJson.theme?.labelColour, sourceJson.theme?.fieldLabelColor, sourceJson.theme?.textColor) || "#111827",
  inputBackgroundColor: firstValue(sourceJson.theme?.inputBackgroundColor, sourceJson.theme?.inputBgColor, sourceJson.theme?.fieldBackgroundColor) || "#ffffff",
  inputTextColor: firstValue(
    sourceJson.theme?.inputTextColor,
    sourceJson.theme?.inputTextColour,
    sourceJson.theme?.inputValueColor,
    sourceJson.theme?.inputValueColour,
    sourceJson.theme?.inputColor,
    sourceJson.theme?.fieldTextColor,
    sourceJson.theme?.fieldValueColor,
    sourceJson.theme?.formInputValueColor,
    sourceJson.theme?.textColor
  ) || "#111827",
  inputBorderColor: firstValue(sourceJson.theme?.inputBorderColor, sourceJson.theme?.inputBorderColour, sourceJson.theme?.fieldBorderColor) || "#d1d5db",
  successColor: sourceJson.theme?.successColor || sourceJson.theme?.primaryColor || "#178218",
  thankYouTitle: sourceJson.theme?.thankYouTitle || sourceJson.theme?.successTitle || "Thank you!",
  thankYouMessage: sourceJson.theme?.thankYouText || sourceJson.theme?.thankYouMessage || sourceJson.theme?.successMessage || "Your details have been submitted successfully.",
  thankYouShowButton: sourceJson.theme?.thankYouShowButton ?? false,
  thankYouButtonText: sourceJson.theme?.thankYouButtonText || "Visit",
  thankYouButtonUrl: sourceJson.theme?.thankYouButtonUrl || "https://example.com",
  thankYouButtonColor: sourceJson.theme?.thankYouButtonColor || sourceJson.theme?.primaryColor || "#0f766e",
  thankYouButtonTextColor: sourceJson.theme?.thankYouButtonTextColor || "#ffffff",
  thankYouButtonRadius: sourceJson.theme?.thankYouButtonRadius,
  thankYouButtonPadding: sourceJson.theme?.thankYouButtonPadding || "10px 18px",
  thankYouButtonSize: sourceJson.theme?.thankYouButtonSize,
  thankYouButtonWeight: sourceJson.theme?.thankYouButtonWeight,
  thankYouButtonMargin: sourceJson.theme?.thankYouButtonMargin,
  thankYouButtonAlign: sourceJson.theme?.thankYouButtonAlign,
  errorColor: sourceJson.theme?.errorColor || "#dc2626",
  followDeviceColorScheme: sourceJson.theme?.followDeviceColorScheme !== false,
  fontFamily: sourceJson.theme?.fontFamily || "Arial, sans-serif"
});

const getBlocks = (sourceJson = {}) => {
  const blocks = Array.isArray(sourceJson.blocks) ? [...sourceJson.blocks] : [];
  const hasSocialBlock = blocks.some((block) => ["social", "socialLinks", "socialIcons"].includes(block.type));
  const hasFooterBlock = blocks.some((block) => block.type === "footer");

  if (!hasSocialBlock && Array.isArray(sourceJson.socialLinks) && sourceJson.socialLinks.length) {
    blocks.push({
      type: "socialLinks",
      props: {
        links: sourceJson.socialLinks,
        ...(sourceJson.social || {})
      }
    });
  }

  if (!hasFooterBlock && sourceJson.autoUnsubscribeFooter !== false) {
    blocks.push({
      type: "footer",
      props: {
        ...(sourceJson.footer || {}),
        unsubscribeButton: sourceJson.unsubscribeButton,
        unsubscribe: sourceJson.unsubscribe !== false
      }
    });
  }

  return blocks;
};

const style = (values) => {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => {
      let finalKey = key;
      if (key === "background-color" && /gradient/i.test(String(value))) {
        finalKey = "background";
      }
      return `${finalKey}:${value}`;
    })
    .join(";");
};

const cssUrl = (value) => {
  const url = String(value || "").trim();

  return url ? `url('${url.replace(/'/g, "%27")}')` : "";
};

const backgroundImageStyles = (image, {
  size = "cover",
  position = "center",
  repeat = "no-repeat"
} = {}) => {
  if (!image) {
    return {};
  }

  return {
    "background-image": cssUrl(image),
    "background-size": size,
    "background-position": position,
    "background-repeat": repeat
  };
};

const getVisibilityToken = (visibility) => {
  if (!visibility?.field) {
    return null;
  }

  const operator = visibility.operator || "truthy";
  const expected = visibility.value;

  if (operator === "equals" && expected !== undefined && expected !== "") {
    return `${visibility.field} == "${String(expected).replace(/"/g, "\\\"")}"`;
  }

  if (operator === "notEquals" && expected !== undefined && expected !== "") {
    return `${visibility.field} != "${String(expected).replace(/"/g, "\\\"")}"`;
  }

  return visibility.field;
};

const wrapWithVisibility = (html, block) => {
  const token = getVisibilityToken(block.props?.visibility || block.visibility);

  return token ? `{{#if ${token}}}${html}{{/if}}` : html;
};

const renderText = (block, theme, tag = "p") => {
  const props = block.props || {};
  const htmlTag = tag === "h1" || tag === "h2" || tag === "h3" ? tag : "p";
  const text = props.text || "";

  return `<${htmlTag} style="${style({
    margin: getBoxMargin(props, "0 0 14px"),
    padding: getBoxPadding(props, "0"),
    color: props.color || theme.textColor,
    "background-color": props.backgroundColor || "transparent",
    "font-family": theme.fontFamily,
    "font-size": px(props.fontSize, htmlTag === "p" ? "16px" : "24px"),
    "font-weight": props.fontWeight || (htmlTag === "p" ? "400" : "700"),
    "line-height": props.lineHeight || "1.45",
    "text-align": props.align || "left"
  })}">${text}</${htmlTag}>`;
};

const renderImageHtml = (block, theme) => {
  const props = block.props || {};
  const padding = "0";
  const margin = "0";
  const { width } = getImageSize(props, theme);
  const image = `<img class="email-image" src="${escapeAttr(props.src)}" alt="${escapeAttr(props.alt || "")}" width="${width}" style="${style({
    display: "block",
    border: "0",
    width: "100%",
    "max-width": `${width}px`,
    height: "auto",
    margin,
    "border-radius": px(props.radius, "0")
  })}" />`;

  return props.href
    ? `<table class="email-image-frame" role="presentation" width="${width}" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:${width}px;margin:0 auto;padding:0;border-collapse:collapse"><tr><td style="padding:${padding};margin:0"><a href="${escapeAttr(appendUtmToUrl(props.href, "{{campaignName}}", "banner_click", "{{templateSlug}}"))}" target="_blank" style="display:block;margin:0;padding:0">${image}</a></td></tr></table>`
    : `<table class="email-image-frame" role="presentation" width="${width}" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:${width}px;margin:0 auto;padding:0;border-collapse:collapse"><tr><td style="padding:${padding};margin:0">${image}</td></tr></table>`;
};

const renderImageAmp = (block, theme) => {
  const props = block.props || {};
  const padding = "0";
  const { width, height } = getImageSize(props, theme);
  const textAlign = "left";
  const image = `<div class="email-amp-image" style="padding:${padding};text-align:${textAlign};max-width:${width}px;margin:0 auto"><amp-img src="${escapeAttr(props.src)}" alt="${escapeAttr(props.alt || "")}" width="${width}" height="${height}" layout="responsive"></amp-img></div>`;

  return props.href
    ? `<a href="${escapeAttr(appendUtmToUrl(props.href, "{{campaignName}}", "banner_click", "{{templateSlug}}"))}" target="_blank">${image}</a>`
    : image;
};

const renderHostedFormBanner = (block, theme) => {
  const props = block.props || {};
  const { width, height } = getImageSize(props, theme);
  const requestedWidth = numberFrom(
    props.hostedFormWidth,
    props.formPageWidth,
    props.bannerWidth
  );
  const bannerWidth = theme.bannerWidth || Math.min(
    requestedWidth || HOSTED_FORM_BANNER_WIDTH,
    HOSTED_FORM_WIDTH
  );
  const bannerHeight = Math.round(height * (bannerWidth / width));
  const image = `<div class="hosted-form-banner" style="${style({
    width: "100%",
    "max-width": `${bannerWidth}px`,
    margin: "0 auto 0",
    "text-align": "center"
  })}"><amp-img src="${escapeAttr(props.src)}" alt="${escapeAttr(props.alt || "")}" width="${bannerWidth}" height="${bannerHeight}" layout="responsive"></amp-img></div>`;

  return props.href
    ? `<a href="${escapeAttr(appendUtmToUrl(props.href, "{{campaignName}}", "banner_click", "{{templateSlug}}"))}" target="_blank">${image}</a>`
    : image;
};

const renderButton = (block, theme) => {
  const props = block.props || {};
  const text = escapeHtml(props.text || "Click");
  const href = escapeAttr(props.href || "{{formHtmlUrl}}");
  const backgroundColor = getButtonBackgroundColor(props) || theme.buttonColor || theme.primaryColor;
  const color = getButtonTextColor(props) || theme.buttonTextColor || "#ffffff";

  return `<table role="presentation" align="${props.align || "center"}" border="0" cellpadding="0" cellspacing="0" style="margin:${props.margin || "18px auto"}">
  <tr>
    <td align="center" bgcolor="${escapeAttr(backgroundColor)}" style="border-radius:${px(firstValue(props.buttonRadius, props.radius), "6px")}">
      <a href="${href}" target="_blank" style="${style({
    display: "inline-block",
    background: backgroundColor,
    color,
    "font-family": theme.fontFamily,
    "font-size": px(props.fontSize, "16px"),
    "font-weight": props.fontWeight || "700",
    "line-height": "1",
    "text-decoration": "none",
    padding: props.buttonPadding || props.padding || "13px 20px",
    "border-radius": px(firstValue(props.buttonRadius, props.radius), "6px")
  })}">${text}</a>
    </td>
  </tr>
</table>`;
};

const renderDivider = (block) => {
  const props = block.props || {};
  return `<div style="${style({
    height: "1px",
    "line-height": "1px",
    background: props.color || "#e5e7eb",
    margin: props.margin || "20px 0"
  })}">&nbsp;</div>`;
};

const renderSpacer = (block) => {
  const props = block.props || {};
  return `<div style="height:${px(props.height, "20px")};line-height:${px(props.height, "20px")}">&nbsp;</div>`;
};

const renderShape = (block, theme) => {
  const props = block.props || {};
  const width = px(props.width, "100%");
  const height = px(props.height, "80px");
  const radius = props.shape === "circle" || props.shape === "pill"
    ? "999px"
    : px(props.radius, "8px");

  return `<div style="${style({
    width,
    height,
    margin: props.margin || "12px auto",
    background: props.shape === "line" ? "transparent" : (props.backgroundColor || theme.primaryColor),
    border: props.shape === "line"
      ? `${props.lineWidth || 2}px ${props.lineStyle || "solid"} ${props.backgroundColor || theme.primaryColor}`
      : (props.border || "0"),
    "border-radius": radius,
    "line-height": height
  })}">&nbsp;</div>`;
};

const renderCard = (block, theme) => {
  const props = block.props || {};

  return `<div style="${style({
    background: props.backgroundColor || "#f8fafc",
    border: props.border || "1px solid #e5e7eb",
    "border-radius": px(props.radius, "8px"),
    padding: props.padding || "18px",
    margin: props.margin || "14px 0",
    "text-align": props.align || "left",
    "font-family": theme.fontFamily
  })}">
  ${props.title ? `<h3 style="${style({
    margin: "0 0 8px",
    color: props.titleColor || theme.textColor,
    "font-size": px(props.titleSize, "20px"),
    "line-height": "1.3"
  })}">${props.title}</h3>` : ""}
  ${props.text ? `<p style="${style({
    margin: "0",
    color: props.textColor || theme.mutedColor,
    "font-size": px(props.textSize, "15px"),
    "line-height": "1.5"
  })}">${props.text}</p>` : ""}
</div>`;
};

const renderRawHtml = (block, target) => {
  let html = block.props?.html || "";
  if (target === "formPage") {
    html = html.replace('"showOfferForm": false', '"showOfferForm": true');
    html = html.replace('id="offer-form-block" hidden', 'id="offer-form-block"');
  }
  return html;
};

const renderNavbar = (block, theme) => {
  const props = block.props || {};
  const links = props.links || [
    { label: "Home", href: "#" },
    { label: "About", href: "#" },
    { label: "Contact", href: "#" }
  ];

  return `<div style="${style({
    "font-family": theme.fontFamily,
    "text-align": props.align || "center",
    padding: props.padding || "12px 0"
  })}">
    ${links.map((link) => `<a href="${escapeAttr(link.href)}" style="${style({
    color: props.color || theme.primaryColor,
    "font-size": px(props.fontSize, "14px"),
    "font-weight": "700",
    "text-decoration": "none",
    margin: "0 10px"
  })}">${escapeHtml(link.label)}</a>`).join("")}
  </div>`;
};

const getSocialIconUrl = (item = {}) => firstValue(
  item.iconUrl,
  item.logoUrl,
  item.imageUrl,
  item.src,
  item.icon,
  item.logo
);

const renderSocialLinks = (block, theme, target = "html") => {
  const props = block.props || {};
  const links = props.links || props.items || props.socialLinks || [];

  if (!Array.isArray(links) || !links.length) {
    return "";
  }

  return `<div style="${style({
    "font-family": theme.fontFamily,
    "text-align": props.align || "center",
    margin: getBoxMargin(props, "18px 0"),
    padding: getBoxPadding(props, "0")
  })}">
    ${links.map((item) => {
    const href = escapeAttr(item.href || item.url || "#");
    const label = escapeHtml(item.label || item.name || item.platform || "Social");
    const iconUrl = getSocialIconUrl(item);
    const size = Number(item.size || props.iconSize || props.size) || 32;

    const imageMarkup = target === "amp"
      ? `<amp-img src="${escapeAttr(iconUrl)}" alt="${label}" width="${size}" height="${size}" layout="fixed"></amp-img>`
      : `<img src="${escapeAttr(iconUrl)}" alt="${label}" width="${size}" height="${size}" style="${style({
        display: "block",
        border: "0",
        width: `${size}px`,
        height: `${size}px`,
        "border-radius": px(item.radius || props.iconRadius, "0")
      })}">`;

    return `<a href="${href}" target="_blank" style="${style({
      display: "inline-block",
      margin: item.margin || props.itemMargin || "0 6px",
      color: item.color || props.color || theme.primaryColor,
      "font-size": px(props.fontSize, "13px"),
      "text-decoration": "none",
      "vertical-align": "middle"
    })}">${iconUrl ? imageMarkup : label}</a>`;
  }).join("")}
  </div>`;
};

const renderLogoHeader = (block, theme) => {
  const props = block.props || {};
  const logo = props.logoUrl
    ? `<img src="${escapeAttr(props.logoUrl)}" alt="${escapeAttr(props.logoAlt || "Logo")}" width="${Number(props.logoWidth) || 120}" style="display:block;margin:0 auto 10px;height:auto;max-width:100%">`
    : "";

  return `<div style="${style({
    "text-align": props.align || "center",
    padding: props.padding || "18px 0",
    "font-family": theme.fontFamily
  })}">
    ${logo}
    ${props.title ? `<h1 style="${style({
    margin: "0",
    color: props.color || theme.textColor,
    "font-size": px(props.fontSize, "26px")
  })}">${escapeHtml(props.title)}</h1>` : ""}
  </div>`;
};

const renderProductCard = (block, theme) => {
  const props = block.props || {};

  return `<div style="${style({
    border: props.border || "1px solid #e5e7eb",
    "border-radius": px(props.radius, "8px"),
    padding: props.padding || "18px",
    "font-family": theme.fontFamily,
    "text-align": props.align || "left"
  })}">
    ${props.imageUrl ? `<img src="${escapeAttr(props.imageUrl)}" alt="${escapeAttr(props.title || "Product")}" style="display:block;width:100%;height:auto;border-radius:${px(props.radius, "8px")}">` : ""}
    <h3 style="margin:14px 0 6px;color:${props.titleColor || theme.textColor};font-size:${px(props.titleSize, "20px")}">${escapeHtml(props.title || "Product Name")}</h3>
    <p style="margin:0 0 12px;color:${props.textColor || theme.mutedColor};font-size:${px(props.textSize, "14px")}">${escapeHtml(props.text || "Product description")}</p>
    ${props.price ? `<p style="margin:0 0 12px;font-weight:700;color:${theme.textColor};font-size:18px">${escapeHtml(props.price)}</p>` : ""}
    ${renderButton({ props: { text: props.buttonText || "View Product", href: props.href || "#", backgroundColor: props.buttonColor || theme.primaryColor } }, theme)}
  </div>`;
};

const renderProductList = (block, theme) => {
  const props = block.props || {};
  const collection = props.collection || "products";
  const fallbackItems = props.items || [
    {
      title: "Product name",
      text: "Short product description.",
      price: "$29",
      href: "https://example.com/product"
    }
  ];
  const fallbackHtml = fallbackItems
    .map((item) => renderProductCard({
      props: {
        ...props,
        ...item
      }
    }, theme))
    .join("\n");

  const repeatedCard = renderProductCard({
    props: {
      ...props,
      imageUrl: "{{imageUrl}}",
      title: "{{title | default:'Product name'}}",
      text: "{{text | default:'Short product description.'}}",
      price: "{{price}}",
      href: "{{href | default:'#'}}",
      buttonText: "{{buttonText | default:'View Product'}}"
    }
  }, theme);

  return `{{#each ${collection}}}${repeatedCard}{{/each}}{{#unless ${collection}}}${fallbackHtml}{{/unless}}`;
};

const normalizeOptions = (options, fallback) => {
  const values = Array.isArray(options) && options.length ? options : fallback;

  return values.map((option) => {
    if (typeof option === "object") {
      return {
        label: option.label || option.value,
        value: option.value || option.label
      };
    }

    return {
      label: option,
      value: option
    };
  });
};

const fieldTypesWithOptions = new Set(["select", "radio", "checkbox"]);

const normalizeField = (field = {}, index = 0, fallback = {}) => {
  const type = field.type || fallback.type || "text";
  const normalized = {
    ...fallback,
    ...field,
    name: field.name || fallback.name || `field${index + 1}`,
    label: field.label || field.question || fallback.label || `Field ${index + 1}`,
    type,
    required: field.required ?? fallback.required ?? false
  };

  if (fieldTypesWithOptions.has(type)) {
    normalized.options = normalizeOptions(
      field.options,
      fallback.options || ["Yes", "No"]
    );
  }

  return normalized;
};

const normalizeFields = (fields, fallbackFields = []) => {
  const values = Array.isArray(fields) && fields.length ? fields : fallbackFields;
  return values.map((field, index) => normalizeField(field, index, fallbackFields[index]));
};

const getManagedFields = (props, fallbackFields = []) => {
  return normalizeFields(props.fields || props.questions, fallbackFields);
};

const toFormBlock = (block, fields, defaults = {}) => {
  return {
    ...block,
    type: "form",
    props: {
      ...defaults,
      ...(block.props || {}),
      fields
    }
  };
};

const renderPoll = (block, theme, target) => {
  const props = block.props || {};
  const options = normalizeOptions(
    props.options,
    ["Yes", "No", "Maybe"]
  );
  const fields = getManagedFields(props, [
    {
      name: props.name || "pollAnswer",
      label: props.question || "What do you think?",
      type: "radio",
      required: true,
      options
    }
  ]);
  const formBlock = toFormBlock(
    block,
    fields,
    {
      title: props.title || "Quick poll",
      description: props.description || props.question,
      submitText: props.submitText || "Vote"
    }
  );

  if (target === "html") {
    return renderHtmlFormButton(formBlock, theme);
  }

  return target === "formPage"
    ? renderFormPageForm(formBlock, theme)
    : renderAmpForm(formBlock, theme);
};

const renderSurvey = (block, theme, target) => {
  const props = block.props || {};
  const fields = getManagedFields(props, [
    {
      name: "experience",
      label: props.question || "How was your experience?",
      type: "select",
      required: true,
      options: ["Excellent", "Good", "Average", "Poor"]
    },
    {
      name: "comments",
      label: "Anything else you want to share?",
      type: "textarea",
      required: false
    }
  ]);
  const formBlock = toFormBlock(block, fields, {
    title: props.title || "Survey",
    description: props.description,
    submitText: props.submitText || "Submit survey"
  });

  if (target === "html") {
    return renderHtmlFormButton(formBlock, theme);
  }

  return target === "formPage"
    ? renderFormPageForm(formBlock, theme)
    : renderAmpForm(formBlock, theme);
};

const renderRating = (block, theme, target) => {
  const props = block.props || {};
  const max = Math.min(Math.max(Number(props.max) || 5, 2), 10);
  const options = Array.from({ length: max }, (_, index) => {
    const value = index + 1;
    return {
      label: props.labelPrefix ? `${props.labelPrefix} ${value}` : String(value),
      value
    };
  });
  const fields = getManagedFields(props, [
    {
      name: props.name || "rating",
      label: props.question || "How would you rate us?",
      type: "radio",
      required: true,
      options
    },
    ...(props.allowComment === false
      ? []
      : [
        {
          name: props.commentName || "comment",
          label: props.commentLabel || "Anything else to share?",
          type: "textarea"
        }
      ])
  ]);
  const formBlock = toFormBlock(
    block,
    fields,
    {
      title: props.title || "Rate your experience",
      description: props.description,
      submitText: props.submitText || "Submit rating"
    }
  );

  if (target === "html") {
    return renderHtmlFormButton(formBlock, theme);
  }

  return target === "formPage"
    ? renderFormPageForm(formBlock, theme)
    : renderAmpForm(formBlock, theme);
};

const renderNps = (block, theme, target) => {
  const props = block.props || {};
  const options = Array.from({ length: 11 }, (_, value) => ({
    label: String(value),
    value
  }));
  const fields = getManagedFields(props, [
    {
      name: props.name || "npsScore",
      label: props.question || "How likely are you to recommend us?",
      type: "radio",
      required: true,
      options
    },
    {
      name: props.reasonName || "npsReason",
      label: props.reasonLabel || "What is the main reason for your score?",
      type: "textarea"
    }
  ]);
  const formBlock = toFormBlock(
    block,
    fields,
    {
      title: props.title || "Quick NPS",
      description: props.description || "0 means not likely, 10 means very likely.",
      submitText: props.submitText || "Send feedback"
    }
  );

  if (target === "html") {
    return renderHtmlFormButton(formBlock, theme);
  }

  return target === "formPage"
    ? renderFormPageForm(formBlock, theme)
    : renderAmpForm(formBlock, theme);
};

const renderAppointment = (block, theme, target) => {
  const props = block.props || {};
  const fields = getManagedFields(props, [
    {
      name: props.dateName || "appointmentDate",
      label: props.dateLabel || "Preferred date",
      type: "date",
      required: true
    },
    {
      name: props.timeName || "appointmentTime",
      label: props.timeLabel || "Preferred time",
      type: "select",
      required: true,
      options: normalizeOptions(
        props.slots,
        ["10:00 AM", "12:00 PM", "03:00 PM", "05:00 PM"]
      )
    },
    {
      name: props.phoneName || "phone",
      label: props.phoneLabel || "Phone number",
      type: "tel"
    }
  ]);
  const formBlock = toFormBlock(
    block,
    fields,
    {
      title: props.title || "Book an appointment",
      description: props.description,
      submitText: props.submitText || "Book slot"
    }
  );

  if (target === "html") {
    return renderHtmlFormButton(formBlock, theme);
  }

  return target === "formPage"
    ? renderFormPageForm(formBlock, theme)
    : renderAmpForm(formBlock, theme);
};

const renderRsvp = (block, theme, target) => {
  const props = block.props || {};
  const fields = getManagedFields(props, [
    {
      name: props.name || "rsvp",
      label: props.question || "Will you attend?",
      type: "radio",
      required: true,
      options: normalizeOptions(props.options, ["Yes", "Maybe", "No"])
    },
    {
      name: props.guestName || "guestCount",
      label: props.guestLabel || "Number of guests",
      type: "number"
    }
  ]);
  const formBlock = toFormBlock(
    block,
    fields,
    {
      title: props.title || "Event RSVP",
      description: props.description,
      submitText: props.submitText || "Send RSVP"
    }
  );

  if (target === "html") {
    return renderHtmlFormButton(formBlock, theme);
  }

  return target === "formPage"
    ? renderFormPageForm(formBlock, theme)
    : renderAmpForm(formBlock, theme);
};

const renderConditionalGroup = (block, target, theme) => {
  const props = block.props || {};
  const token = getVisibilityToken(props.visibility || block.visibility);
  const children = Array.isArray(props.blocks) ? props.blocks : [];
  const content = children
    .map((childBlock) => renderBlock(childBlock, target, theme))
    .join("\n");

  return token ? `{{#if ${token}}}${content}{{/if}}` : content;
};

const renderPricingCard = (block, theme) => {
  const props = block.props || {};
  const features = props.features || ["Feature one", "Feature two", "Feature three"];

  return `<div style="${style({
    border: props.border || `2px solid ${theme.primaryColor}`,
    "border-radius": px(props.radius, "8px"),
    padding: props.padding || "22px",
    "text-align": "center",
    "font-family": theme.fontFamily
  })}">
    <h3 style="margin:0;color:${theme.textColor};font-size:22px">${escapeHtml(props.title || "Pro Plan")}</h3>
    <p style="margin:12px 0;font-size:32px;font-weight:700;color:${theme.primaryColor}">${escapeHtml(props.price || "$29")}</p>
    <div style="text-align:left;margin:16px 0">${features.map((feature) => `<p style="margin:8px 0;color:${theme.mutedColor}">✓ ${escapeHtml(feature)}</p>`).join("")}</div>
    ${renderButton({ props: { text: props.buttonText || "Choose Plan", href: props.href || "#", backgroundColor: props.buttonColor || theme.primaryColor } }, theme)}
  </div>`;
};

const renderTestimonial = (block, theme) => {
  const props = block.props || {};

  return `<div style="${style({
    background: props.backgroundColor || "#f8fafc",
    border: props.border || "1px solid #e5e7eb",
    "border-radius": px(props.radius, "8px"),
    padding: props.padding || "20px",
    "font-family": theme.fontFamily
  })}">
    <p style="margin:0 0 12px;color:${props.textColor || theme.textColor};font-size:16px;line-height:1.5">“${escapeHtml(props.quote || "This was a great experience.")}”</p>
    <p style="margin:0;font-weight:700;color:${theme.textColor}">${escapeHtml(props.name || "Customer Name")}</p>
    <p style="margin:2px 0 0;color:${theme.mutedColor};font-size:13px">${escapeHtml(props.role || "Customer")}</p>
  </div>`;
};

const renderCountdown = (block, theme) => {
  const props = block.props || {};
  const label = props.label || "Offer ends soon";
  const date = props.date || "2026-12-31";

  return `<div style="${style({
    "text-align": "center",
    padding: props.padding || "18px",
    background: props.backgroundColor || "#fef2f2",
    "border-radius": px(props.radius, "8px"),
    "font-family": theme.fontFamily
  })}">
    <p style="margin:0 0 8px;font-weight:700;color:${theme.textColor}">${escapeHtml(label)}</p>
    <p style="margin:0;font-size:24px;font-weight:700;color:${props.color || "#dc2626"}">${escapeHtml(date)}</p>
  </div>`;
};

const renderAccordion = (block, theme) => {
  const props = block.props || {};
  const items = props.items || [
    { title: "Question one", text: "Answer text goes here." },
    { title: "Question two", text: "Answer text goes here." }
  ];

  return `<div style="font-family:${theme.fontFamily}">
    ${items.map((item) => `<div style="${style({
    border: "1px solid #e5e7eb",
    "border-radius": "6px",
    padding: "12px",
    margin: "8px 0"
  })}">
      <p style="margin:0 0 6px;font-weight:700;color:${theme.textColor}">${escapeHtml(item.title)}</p>
      <p style="margin:0;color:${theme.mutedColor};font-size:14px">${escapeHtml(item.text)}</p>
    </div>`).join("")}
  </div>`;
};

const renderCarousel = (block, theme) => {
  const props = block.props || {};
  const slides = props.slides || [
    { imageUrl: "https://via.placeholder.com/600x260.png?text=Slide+1", title: "Slide 1" },
    { imageUrl: "https://via.placeholder.com/600x260.png?text=Slide+2", title: "Slide 2" }
  ];
  const width = Number(props.width) || 600;
  const height = Number(props.height) || 260;
  const radius = px(props.radius, "8px");
  const getSlideSrc = (slide = {}) => slide.imageUrl || slide.src || "";
  const getSlideAlt = (slide = {}) => slide.alt || slide.title || "Carousel slide";
  const visibleSlides = props.fallback === "first" ? slides.slice(0, 1) : slides.slice(0, Number(props.maxFallbackSlides) || 3);

  const font = theme.fontFamily || "Arial, sans-serif";

  if (props.amp === true) {
    const autoplayAttr = props.autoplay !== false ? " autoplay" : "";
    const loopAttr = props.loop !== false ? " loop" : "";
    const delayAttr = (props.autoplay !== false && props.delay) ? ` delay="${Number(props.delay)}"` : "";

    if (props.layout === "card") {
      const titleColor = props.carouselTitleColor || "#333333";
      const descColor = props.carouselDescriptionColor || "#888888";
      const priceColor = props.carouselPriceColor || "#e74c3c";
      const btnBg = props.carouselButtonBg || "#e74c3c";
      const btnTextColor = props.carouselButtonTextColor || "#ffffff";
      const btnPadding = props.carouselButtonPadding || "14px";
      const btnRadius = px(props.carouselButtonRadius, "4px");
      const btnFontSize = px(props.carouselButtonFontSize, "14px");

      return `<amp-carousel class="property-carousel" height="${height}" layout="fixed-height" type="slides"${autoplayAttr}${loopAttr}${delayAttr}>
        ${slides.map((slide) => `<div>
          <div style="background-color:#ffffff;border:1px solid #e0e0e0;border-radius:${radius};overflow:hidden;margin:0 10px;text-align:left;box-sizing:border-box;font-family:${font}">
            <amp-img src="${escapeAttr(getSlideSrc(slide))}" alt="${escapeAttr(getSlideAlt(slide))}" width="${width}" height="220" layout="responsive"></amp-img>
            <div style="padding:20px;box-sizing:border-box">
              <h3 style="font-size:${px(props.carouselTitleSize, "18px")};font-weight:bold;margin:0 0 5px 0;color:${escapeAttr(titleColor)};font-family:${font}">${escapeHtml(slide.title || "")}</h3>
              <p style="font-size:${px(props.carouselDescriptionSize, "14px")};color:${escapeAttr(descColor)};margin:0 0 10px 0;font-family:${font}">📍 ${escapeHtml(slide.description || "")}</p>
              <p style="font-size:${px(props.carouselPriceSize, "18px")};color:${escapeAttr(priceColor)};font-weight:bold;margin:0 0 20px 0;font-family:${font}">${escapeHtml(slide.price || "")}</p>
              <a href="${escapeAttr(slide.href || "#")}" target="_blank" style="display:block;box-sizing:border-box;background:${escapeAttr(btnBg)};color:${escapeAttr(btnTextColor)};text-decoration:none;padding:${escapeAttr(btnPadding)};border-radius:${btnRadius};font-size:${btnFontSize};font-weight:bold;text-align:center;width:100%;font-family:${font}">${escapeHtml(slide.buttonText || "View Details")}</a>
            </div>
          </div>
        </div>`).join("")}
      </amp-carousel>`;
    }

    return `<amp-carousel width="${width}" height="${height}" layout="responsive" type="slides"${autoplayAttr}${loopAttr}${delayAttr}>
      ${slides.map((slide) => `<div>
        ${slide.href ? `<a href="${escapeAttr(slide.href)}" target="_blank">` : ""}
        <amp-img src="${escapeAttr(getSlideSrc(slide))}" alt="${escapeAttr(getSlideAlt(slide))}" width="${width}" height="${height}" layout="responsive"></amp-img>
        ${slide.href ? "</a>" : ""}
      </div>`).join("")}
    </amp-carousel>`;
  }

  if (props.layout === "card") {
    const titleColor = props.carouselTitleColor || "#333333";
    const descColor = props.carouselDescriptionColor || "#888888";
    const priceColor = props.carouselPriceColor || "#e74c3c";
    const btnBg = props.carouselButtonBg || "#e74c3c";
    const btnTextColor = props.carouselButtonTextColor || "#ffffff";
    const btnPadding = props.carouselButtonPadding || "14px";
    const btnRadius = px(props.carouselButtonRadius, "4px");
    const btnFontSize = px(props.carouselButtonFontSize, "14px");

    return `<div style="font-family:${font};text-align:center">
      ${visibleSlides.map((slide) => `
      <div style="margin:20px auto;max-width:${width}px;background-color:#ffffff;border:1px solid #e0e0e0;border-radius:${radius};overflow:hidden;text-align:left;box-sizing:border-box;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
        ${slide.href ? `<a href="${escapeAttr(slide.href)}" target="_blank" style="text-decoration:none">` : ""}
        <img src="${escapeAttr(getSlideSrc(slide))}" alt="${escapeAttr(getSlideAlt(slide))}" width="${width}" style="${style({
      display: "block",
      width: "100%",
      "max-width": `${width}px`,
      height: "auto",
      margin: "0 auto",
      border: "0"
    })}">
        ${slide.href ? "</a>" : ""}
        <div style="padding:20px;box-sizing:border-box">
          <h3 style="font-size:${px(props.carouselTitleSize, "18px")};font-weight:bold;margin:0 0 5px 0;color:${escapeAttr(titleColor)};font-family:${font}">${escapeHtml(slide.title || "")}</h3>
          <p style="font-size:${px(props.carouselDescriptionSize, "14px")};color:${escapeAttr(descColor)};margin:0 0 10px 0;font-family:${font}">📍 ${escapeHtml(slide.description || "")}</p>
          <p style="font-size:${px(props.carouselPriceSize, "18px")};color:${escapeAttr(priceColor)};font-weight:bold;margin:0 0 20px 0;font-family:${font}">${escapeHtml(slide.price || "")}</p>
          <a href="${escapeAttr(slide.href || "#")}" target="_blank" style="display:block;box-sizing:border-box;background:${escapeAttr(btnBg)};color:${escapeAttr(btnTextColor)};text-decoration:none;padding:${escapeAttr(btnPadding)};border-radius:${btnRadius};font-size:${btnFontSize};font-weight:bold;text-align:center;width:100%;font-family:${font}">${escapeHtml(slide.buttonText || "View Details")}</a>
        </div>
      </div>`).join("")}
    </div>`;
  }

  return `<div style="font-family:${font};text-align:center">
    ${visibleSlides.map((slide) => `<div style="margin:10px 0">
      ${slide.href ? `<a href="${escapeAttr(slide.href)}" target="_blank" style="text-decoration:none">` : ""}
      <img src="${escapeAttr(getSlideSrc(slide))}" alt="${escapeAttr(getSlideAlt(slide))}" width="${width}" style="${style({
    display: "block",
    width: "100%",
    "max-width": `${width}px`,
    height: "auto",
    margin: "0 auto",
    border: "0",
    "border-radius": radius
  })}">
      ${slide.href ? "</a>" : ""}
      ${props.showTitles !== false && slide.title ? `<p style="margin:8px 0 0;font-weight:700;color:${theme.textColor}">${escapeHtml(slide.title)}</p>` : ""}
      ${props.showDescriptions !== false && slide.description ? `<p style="margin:4px 0 0;color:${theme.mutedColor};font-size:14px;line-height:1.45">${escapeHtml(slide.description)}</p>` : ""}
    </div>`).join("")}
  </div>`;
};

const renderContainer = (block, target, theme) => {
  const props = block.props || {};
  const width = Number(props.width) || 600;
  const radius = px(props.radius, "8px");
  const font = theme.fontFamily || "Arial, sans-serif";

  const bgImage = props.backgroundImage ? `background-image:url('${escapeAttr(props.backgroundImage)}');background-size:cover;background-position:center;` : "";
  const bgStyle = /gradient/i.test(props.backgroundColor || "")
    ? `background:${props.backgroundColor};`
    : `background-color:${props.backgroundColor || "#ffffff"};`;

  const inlineImage = props.showImage && props.imageSrc ? (
    target === "amp"
      ? `<div style="text-align:center;margin-bottom:15px;"><amp-img src="${escapeAttr(props.imageSrc)}" width="${Number(props.imageWidth) || width}" height="${Number(props.imageHeight) || 200}" layout="responsive" style="border-radius:${px(props.imageRadius, "0")};"></amp-img></div>`
      : `<div style="text-align:center;margin-bottom:15px;"><img src="${escapeAttr(props.imageSrc)}" width="${Number(props.imageWidth) || width}" style="width:100%;max-width:${Number(props.imageWidth) || width}px;height:auto;border-radius:${px(props.imageRadius, "0")};border:0;display:block;margin:0 auto;" /></div>`
  ) : "";

  return `<div style="max-width:${width}px;margin:${getBoxMargin(props, "10px auto")};border-radius:${radius};overflow:hidden;${bgStyle}${bgImage}box-sizing:border-box;border:${props.border || "none"};padding:${getBoxPadding(props, "20px")};text-align:${props.align || "left"};font-family:${font};">
    ${inlineImage}
    ${props.title ? `<h3 style="font-size:20px;font-weight:bold;margin:0 0 10px 0;color:${props.titleColor || "#333333"};font-family:${font}">${escapeHtml(props.title)}</h3>` : ""}
    ${props.text ? `<p style="font-size:14px;line-height:1.5;margin:0;color:${props.textColor || "#666666"};font-family:${font}">${escapeHtml(props.text)}</p>` : ""}
  </div>`;
};

const renderHtmlFormButton = (block, theme) => {
  return renderButton({
    props: {
      ...(block.props || {}),
      text: block.props?.submitText || block.props?.buttonText || "Open Form",
      href: "{{formHtmlUrl}}"
    }
  }, theme);
};

const getFormFieldTheme = (props = {}, theme = {}) => ({
  ...theme,
  labelColor: firstValue(
    props.labelColor,
    props.labelColour,
    props.fieldLabelColor,
    props.inputLabelColor,
    props.formLabelColor,
    theme.labelColor
  ),
  inputBackgroundColor: firstValue(
    props.inputBackgroundColor,
    props.inputBgColor,
    props.fieldBackgroundColor,
    props.fieldBgColor,
    theme.inputBackgroundColor
  ),
  inputTextColor: firstValue(
    props.inputTextColor,
    props.inputTextColour,
    props.inputValueColor,
    props.inputValueColour,
    props.inputColor,
    props.fieldTextColor,
    props.fieldValueColor,
    props.formInputTextColor,
    props.formInputValueColor,
    theme.inputTextColor
  ),
  inputBorderColor: firstValue(
    props.inputBorderColor,
    props.inputBorderColour,
    props.fieldBorderColor,
    props.formInputBorderColor,
    theme.inputBorderColor
  )
});

const renderFields = (fields = [], amp = false, theme = {}) => {
  return fields.map((field) => {
    const name = escapeAttr(field.name);
    const label = escapeHtml(field.label || field.name);
    const required = field.required ? " required" : "";
    const labelStyle = style({
      display: "block",
      margin: field.labelMargin || "14px 0 6px",
      "font-weight": field.labelFontWeight || "700",
      color: firstValue(field.labelColor, field.labelColour, field.fieldLabelColor, theme.labelColor, theme.textColor)
    });
    const commonStyle = style({
      width: "100%",
      "box-sizing": "border-box",
      border: `1px solid ${firstValue(field.borderColor, field.borderColour, field.inputBorderColor, field.inputBorderColour, field.fieldBorderColor, theme.inputBorderColor, "#d1d5db")}`,
      "border-radius": px(field.radius || field.inputRadius, "6px"),
      padding: field.padding || field.inputPadding || "12px",
      "font-size": px(field.fontSize || field.inputFontSize, "15px"),
      background: firstValue(field.backgroundColor, field.inputBackgroundColor, field.inputBgColor, field.fieldBackgroundColor, theme.inputBackgroundColor, "#ffffff"),
      color: firstValue(
        field.color,
        field.textColor,
        field.inputTextColor,
        field.inputTextColour,
        field.inputValueColor,
        field.inputValueColour,
        field.inputColor,
        field.fieldTextColor,
        field.fieldValueColor,
        theme.inputTextColor,
        theme.textColor
      )
    });

    if (field.type === "textarea") {
      return `<label style="${labelStyle}">${label}${field.required ? " *" : ""}</label><textarea name="${name}"${required} style="${commonStyle};min-height:${px(field.height, "90px")}"></textarea>`;
    }

    if (field.type === "select" && Array.isArray(field.options)) {
      const options = field.options
        .map((option) => `<option value="${escapeAttr(option.value || option)}">${escapeHtml(option.label || option)}</option>`)
        .join("");
      return `<label style="${labelStyle}">${label}${field.required ? " *" : ""}</label><select name="${name}"${required} style="${commonStyle}">${options}</select>`;
    }

    if ((field.type === "radio" || field.type === "checkbox") && Array.isArray(field.options)) {
      const type = field.type;
      const options = field.options
        .map((option) => {
          const optionValue = escapeAttr(option.value || option);
          const optionLabel = escapeHtml(option.label || option);
          return `<label style="${style({
            display: "block",
            margin: "8px 0",
            "font-weight": "400",
            color: firstValue(field.optionColor, field.optionTextColor, theme.inputTextColor, theme.textColor)
          })}"><input type="${type}" name="${name}" value="${optionValue}"${required}> ${optionLabel}</label>`;
        })
        .join("");

      return `<div style="${labelStyle}">${label}${field.required ? " *" : ""}</div>${options}`;
    }

    const type = ["email", "tel", "number", "date"].includes(field.type) ? field.type : "text";
    return `<label style="${labelStyle}">${label}${field.required ? " *" : ""}</label><input type="${type}" name="${name}" placeholder="${escapeAttr(field.placeholder || "")}"${required} style="${commonStyle}">`;
  }).join("");
};

const renderThankYouMessage = (props = {}, theme = {}) => {
  const title = props.thankYouTitle || props.successTitle || theme.thankYouTitle || "Thank you!";
  const message = props.thankYouText || props.thankYouMessage || props.successMessage || theme.thankYouMessage || "Your details have been submitted successfully.";
  const backgroundColor = props.thankYouBackgroundColor || props.successBackgroundColor || props.formBackgroundColor || props.contentColor || theme.formBackgroundColor || "#ffffff";
  const borderColor = props.thankYouBorderColor || props.successBorderColor || theme.thankYouBorderColor || props.successColor || theme.successColor || theme.primaryColor || "#34d399";
  const titleColor = props.thankYouTitleColor || props.successTitleColor || theme.thankYouTitleColor || "#047857";
  const textColor = props.thankYouTextColor || props.successTextColor || theme.thankYouTextColor || "#064e3b";
  const showButton = props.thankYouShowButton ?? theme.thankYouShowButton;
  const buttonText = props.thankYouButtonText || theme.thankYouButtonText || "Visit";
  const buttonUrl = props.thankYouButtonUrl || theme.thankYouButtonUrl || "https://example.com";
  const buttonAlign = props.thankYouButtonAlign || theme.thankYouButtonAlign || props.thankYouAlign || "center";

  return `<div style="${style({
    margin: props.thankYouMargin || "18px 0 0",
    padding: props.thankYouPadding || "16px",
    "border-radius": px(props.thankYouRadius || props.radius, "8px"),
    border: `1px solid ${borderColor}`,
    background: backgroundColor,
    "text-align": props.thankYouAlign || "center"
  })}">
    <p style="${style({
    margin: "0 0 6px",
    color: titleColor,
    "font-size": px(props.thankYouTitleSize, "18px"),
    "font-weight": props.thankYouTitleWeight || theme.thankYouTitleWeight || "800"
  })}">${escapeHtml(title)}</p>
    <p style="${style({
    margin: "0",
    color: textColor,
    "font-size": px(props.thankYouTextSize, "14px"),
    "font-weight": props.thankYouTextWeight || theme.thankYouTextWeight || "600",
    "line-height": "1.45"
  })}">${escapeHtml(message)}</p>
    ${showButton ? `<div style="${style({
    "text-align": buttonAlign,
    margin: props.thankYouButtonMargin || theme.thankYouButtonMargin || "14px 0 0"
  })}"><a href="${escapeAttr(appendUtmToUrl(buttonUrl, "{{campaignName}}", "email_visit_button", "{{templateSlug}}"))}" target="_blank" rel="noopener" style="${style({
    display: "inline-block",
    background: props.thankYouButtonColor || theme.thankYouButtonColor || "#0f766e",
    color: props.thankYouButtonTextColor || theme.thankYouButtonTextColor || "#ffffff",
    "border-radius": px(props.thankYouButtonRadius || theme.thankYouButtonRadius, "8px"),
    padding: props.thankYouButtonPadding || theme.thankYouButtonPadding || "10px 18px",
    "font-size": px(props.thankYouButtonSize || theme.thankYouButtonSize, "14px"),
    "font-weight": props.thankYouButtonWeight || theme.thankYouButtonWeight || "800",
    "line-height": "1.2",
    "text-decoration": "none"
  })}">${escapeHtml(buttonText)}</a></div>` : ""}
  </div>`;
};

const renderAmpForm = (block, theme) => {
  const props = block.props || {};
  const fieldTheme = getFormFieldTheme(props, theme);
  const fields = renderFields(props.fields || [], true, fieldTheme);
  const actionUrl = props.actionXhr || props.formAmpUrl || "https://example.com/amp-form-submit";
  const formBackgroundImage = firstValue(
    props.formBackgroundImage,
    props.formBackgroundImageUrl,
    props.formBackgroundUrl,
    props.formBgImage,
    props.formBgImageUrl,
    props.formBgUrl,
    getBackgroundImage(props),
    theme.formBackgroundImage
  );

  return `<form method="post" action-xhr="${escapeAttr(actionUrl)}" style="${style({
    "background-color": props.formBackgroundColor || props.contentColor || props.backgroundColor || theme.formBackgroundColor,
    ...backgroundImageStyles(formBackgroundImage, {
      size: props.backgroundSize,
      position: props.backgroundPosition,
      repeat: props.backgroundRepeat
    }),
    border: props.border || `1px solid ${props.borderColor || "#e5e7eb"}`,
    "border-radius": px(props.radius, "8px"),
    padding: props.padding || "20px",
    "font-family": theme.fontFamily,
    color: props.textColor || theme.textColor
  })}">
  <div class="form-content-wrapper">
    ${props.title ? `<h2 style="${style({
    margin: props.titleMargin || "0 0 8px",
    color: props.titleColor || props.headingColor || theme.textColor,
    "font-size": px(props.titleSize || props.titleFontSize, "24px")
  })}">${escapeHtml(props.title)}</h2>` : ""}
    ${props.description ? `<p style="${style({
    margin: props.descriptionMargin || "0 0 14px",
    color: props.descriptionColor || props.mutedColor || theme.mutedColor
  })}">${escapeHtml(props.description)}</p>` : ""}
    ${fields}
    <button type="submit" style="${style({
    width: "100%",
    margin: "18px 0 0",
    border: "0",
    "border-radius": px(props.buttonRadius || props.submitButtonRadius, "6px"),
    background: getButtonBackgroundColor(props) || theme.buttonColor || theme.primaryColor,
    color: getButtonTextColor(props) || theme.buttonTextColor || "#ffffff",
    padding: props.buttonPadding || props.submitButtonPadding || "13px",
    "font-size": px(props.buttonFontSize || props.submitButtonFontSize, "16px"),
    "font-weight": props.buttonFontWeight || props.submitButtonFontWeight || "700"
  })}">${escapeHtml(props.submitText || "Submit")}</button>
  </div>

  <div submit-success><template type="amp-mustache">${renderThankYouMessage(props, theme)}</template></div>
  <div submit-error><template type="amp-mustache"><div style="padding:12px;text-align:center"><p style="margin:0;color:${props.errorColor || theme.errorColor || "#dc2626"};font-weight:700">❌ Submission failed. Please try again.</p></div></template></div>
</form>`;
};

const renderFormPageForm = (block, theme) => {
  const props = block.props || {};
  const formBackgroundImage = firstValue(
    props.formBackgroundImage,
    props.formBackgroundImageUrl,
    props.formBackgroundUrl,
    props.formBgImage,
    props.formBgImageUrl,
    props.formBgUrl,
    getBackgroundImage(props),
    theme.formBackgroundImage
  );

  const formMaxWidth = firstValue(
    props.formMaxWidth,
    props.formWidth,
    theme.bannerWidth,
    theme.width,
    560
  );

  return `<form class="hosted-form" method="post" action-xhr="{{formActionUrl}}" target="_top" style="${style({
    margin: "0 auto",
    width: "100%",
    "max-width": `${formMaxWidth}px`,
    "box-sizing": "border-box",
    "background-color": props.formBackgroundColor || props.contentColor || props.backgroundColor || theme.formBackgroundColor,
    ...backgroundImageStyles(formBackgroundImage, {
      size: props.backgroundSize,
      position: props.backgroundPosition,
      repeat: props.backgroundRepeat
    }),
    border: props.border || `1px solid ${props.borderColor || "#e5e7eb"}`,
    "border-radius": px(props.radius, "8px"),
    padding: props.padding || "24px",
    "font-family": theme.fontFamily,
    color: props.textColor || theme.textColor
  })}">
  <div class="form-content-wrapper">
    ${props.title ? `<h1 style="${style({
    margin: props.titleMargin || "0 0 8px",
    color: props.titleColor || props.headingColor || theme.textColor,
    "font-size": px(props.titleSize || props.titleFontSize, "24px")
  })}">${escapeHtml(props.title)}</h1>` : ""}
    ${props.description ? `<p style="${style({
    margin: props.descriptionMargin || "0 0 16px",
    color: props.descriptionColor || props.mutedColor || theme.mutedColor
  })}">${escapeHtml(props.description)}</p>` : ""}
    ${renderFields(props.fields || [], false, getFormFieldTheme(props, theme))}
    <button type="submit" style="${style({
    width: "100%",
    margin: "20px 0 0",
    border: "0",
    "border-radius": px(props.buttonRadius || props.submitButtonRadius, "6px"),
    background: getButtonBackgroundColor(props) || theme.buttonColor || theme.primaryColor,
    color: getButtonTextColor(props) || theme.buttonTextColor || "#ffffff",
    padding: props.buttonPadding || props.submitButtonPadding || "13px",
    "font-size": px(props.buttonFontSize || props.submitButtonFontSize, "16px"),
    "font-weight": props.buttonFontWeight || props.submitButtonFontWeight || "700"
  })}">${escapeHtml(props.submitText || "Submit")}</button>
  </div>
  
  <div submit-success>
    <template type="amp-mustache">
      ${renderThankYouMessage(props, theme)}
    </template>
  </div>
  <div submit-error>
    <template type="amp-mustache">
      <div style="padding:12px;text-align:center">
        <p style="margin:0;color:${props.errorColor || theme.errorColor || "#dc2626"};font-weight:700">❌ Submission failed. Please try again.</p>
      </div>
    </template>
  </div>
</form>`;
};

const renderFooter = (block = {}, theme, target = "html") => {
  const props = block.props || {};
  const unsubscribe = props.unsubscribe !== false;
  const unsubscribeButton = props.unsubscribeButton || props.button || {};
  const text = unsubscribeButton.text || props.unsubscribeText || "Unsubscribe";
  const href = unsubscribeButton.href || props.unsubscribeUrl || "{{unsubscribeUrl}}";
  const asButton = unsubscribeButton.variant === "button" || props.unsubscribeVariant === "button" || unsubscribeButton.backgroundColor;
  const socialHtml = Array.isArray(props.socialLinks) && props.socialLinks.length
    ? renderSocialLinks({ props: { links: props.socialLinks, ...(props.social || {}) } }, theme, target)
    : "";

  return `<div style="${style({
    "font-family": theme.fontFamily,
    "font-size": px(props.fontSize, "12px"),
    color: props.color || "#6b7280",
    "text-align": props.align || "center",
    margin: props.margin || "20px 0 0",
    padding: props.padding
  })}">
    ${socialHtml}
    ${props.text ? `<p style="margin:0 0 10px;color:${props.color || "#6b7280"}">${escapeHtml(props.text)}</p>` : ""}
    ${unsubscribe ? `<a href="${escapeAttr(href)}" target="_blank" style="${style({
    display: asButton ? "inline-block" : undefined,
    background: asButton ? (unsubscribeButton.backgroundColor || props.buttonColor || theme.buttonColor || theme.primaryColor) : undefined,
    color: asButton ? (unsubscribeButton.color || props.buttonTextColor || theme.buttonTextColor || "#ffffff") : (unsubscribeButton.color || props.linkColor || "#6b7280"),
    "text-decoration": asButton ? "none" : "underline",
    padding: asButton ? (unsubscribeButton.padding || "10px 16px") : undefined,
    "border-radius": asButton ? px(unsubscribeButton.radius || props.buttonRadius, "6px") : undefined,
    "font-weight": asButton ? (unsubscribeButton.fontWeight || "700") : undefined
  })}">${escapeHtml(text)}</a>` : ""}
  </div>`;
};

const fontSize = (value, fallback, min = 12) => {
  const size = Number(value || fallback);
  const vw = Math.min(Math.max(size / 6, 3.2), 10);
  return `clamp(${min}px, ${vw}vw, ${size}px)`;
};

export const buildSvgWheel = (props, options) => {
  const segmentColors = props.segmentColors
    ? props.segmentColors.split(",").map(c => c.trim())
    : ["#f87171", "#fb923c", "#fbbf24", "#34d399", "#60a5fa", "#818cf8", "#a78bfa", "#f472b6"];

  const cx = 100;
  const cy = 100;
  const radius = 90;

  const svgSegments = options.map((option, index) => {
    const angle = 360 / options.length;
    const startAngle = index * angle;
    const endAngle = (index + 1) * angle;

    const toRadians = (deg) => (deg * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(toRadians(startAngle - 90));
    const y1 = cy + radius * Math.sin(toRadians(startAngle - 90));
    const x2 = cx + radius * Math.cos(toRadians(endAngle - 90));
    const y2 = cy + radius * Math.sin(toRadians(endAngle - 90));

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      "Z"
    ].join(" ");

    const textAngle = startAngle + angle / 2 - 90;
    const textX = cx + (radius * 0.65) * Math.cos(toRadians(textAngle));
    const textY = cy + (radius * 0.65) * Math.sin(toRadians(textAngle));

    const fill = option.color || segmentColors[index % segmentColors.length];
    const textColor = option.textColor || props.segmentTextColor || "#ffffff";
    const fontSizeVal = props.segmentFontSize || 8;
    const fontWeight = props.segmentFontWeight || "bold";

    return `<g>
      <path d="${pathData}" fill="${fill}" stroke="#ffffff" stroke-width="1" />
      <text
        x="${textX}"
        y="${textY}"
        fill="${textColor}"
        font-size="${fontSizeVal}"
        font-weight="${fontWeight}"
        text-anchor="middle"
        transform="rotate(${textAngle + 90}, ${textX}, ${textY})"
      >
        ${escapeHtml(option.label || option.value)}
      </text>
    </g>`;
  }).join("\n");

  const wheelBg = props.wheelBgColor ? `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${props.wheelBgColor}"/>` : "";
  const borderStroke = props.wheelOuterBorderColor || "#ffffff";
  const borderWidth = props.wheelOuterBorderWidth ?? 3;
  const outerBorder = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${borderStroke}" stroke-width="${borderWidth}"/>`;

  let borderDots = "";
  if (props.wheelBorderDots) {
    const dotsCount = props.wheelBorderDotsCount || 24;
    const dotsColor = props.wheelBorderDotsColor || "#ffffff";
    const dotsHtml = [];
    for (let i = 0; i < dotsCount; i++) {
      const dotAngle = (360 / dotsCount) * i;
      const dotRad = (dotAngle * Math.PI) / 180;
      const dotX = cx + (radius + 4) * Math.cos(dotRad);
      const dotY = cy + (radius + 4) * Math.sin(dotRad);
      dotsHtml.push(`<circle cx="${dotX}" cy="${dotY}" r="2.5" fill="${dotsColor}" />`);
    }
    borderDots = dotsHtml.join("\n");
  }

  const centerPinRad = props.centerPinSize ?? 15;
  const centerPinFill = props.centerPinColor || "#ffffff";
  const centerPinStroke = props.centerPinBorderColor || "#cbd5e1";
  const centerPinStrokeWidth = props.centerPinBorderWidth ?? 3;

  let centerImage = "";
  if (props.centerPinImage) {
    centerImage = `
      <clipPath id="center-clip-${props.id || 'pin'}">
        <circle cx="${cx}" cy="${cy}" r="${centerPinRad}" />
      </clipPath>
      <image href="${escapeHtml(props.centerPinImage)}" x="${cx - centerPinRad}" y="${cy - centerPinRad}" width="${2 * centerPinRad}" height="${2 * centerPinRad}" clip-path="url(#center-clip-${props.id || 'pin'})" preserveAspectRatio="xMidYMid slice" />
    `;
  }

  const centerCircle = `<circle cx="${cx}" cy="${cy}" r="${centerPinRad}" fill="${centerPinFill}" stroke="${centerPinStroke}" stroke-width="${centerPinStrokeWidth}"/>`;

  return `
    <svg viewBox="0 0 200 200" style="width:100%;height:100%">
      ${wheelBg}
      ${svgSegments}
      ${outerBorder}
      ${borderDots}
      ${centerCircle}
      ${centerImage}
    </svg>
  `;
};

const buildPointerStyle = (props) => {
  const pos = props.pointerPosition || "top";
  const color = props.pointerColor || "#ef4444";
  const size = props.pointerSize ?? 24;

  let baseStyle = `position:absolute;z-index:10;filter:drop-shadow(0px 2px 2px rgba(0,0,0,0.2));`;
  let arrowStyle = "";

  if (props.pointerImage) {
    let posStyle = "";
    if (pos === "top") {
      posStyle = `top:-${size / 2}px;left:50%;transform:translateX(-50%) rotate(180deg);`;
    } else if (pos === "right") {
      posStyle = `right:-${size / 2}px;top:50%;transform:translateY(-50%) rotate(270deg);`;
    } else if (pos === "bottom") {
      posStyle = `bottom:-${size / 2}px;left:50%;transform:translateX(-50%) rotate(0deg);`;
    } else {
      posStyle = `left:-${size / 2}px;top:50%;transform:translateY(-50%) rotate(90deg);`;
    }
    return `<div style="${baseStyle}${posStyle}width:${size}px;height:${size}px">
      <img src="${escapeHtml(props.pointerImage)}" style="width:100%;height:100%;object-fit:contain" />
    </div>`;
  }

  const arrowSize = Math.round(size / 2);
  if (pos === "top") {
    arrowStyle = `top:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:${arrowSize}px solid transparent;border-right:${arrowSize}px solid transparent;border-top:${size}px solid ${color};`;
  } else if (pos === "right") {
    arrowStyle = `right:-10px;top:50%;transform:translateY(-50%);width:0;height:0;border-top:${arrowSize}px solid transparent;border-bottom:${arrowSize}px solid transparent;border-left:${size}px solid ${color};`;
  } else if (pos === "bottom") {
    arrowStyle = `bottom:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:${arrowSize}px solid transparent;border-right:${arrowSize}px solid transparent;border-bottom:${size}px solid ${color};`;
  } else {
    arrowStyle = `left:-10px;top:50%;transform:translateY(-50%);width:0;height:0;border-top:${arrowSize}px solid transparent;border-bottom:${arrowSize}px solid transparent;border-right:${size}px solid ${color};`;
  }

  return `<div style="${baseStyle}${arrowStyle}"></div>`;
};

const renderSpinWheel = (block, theme, target) => {
  const props = block.props || {};
  const options = props.options || [
    { label: "10% Off", value: "10_off", probability: 10 },
    { label: "Free Shipping", value: "free_shipping", probability: 10 },
    { label: "Try Again", value: "try_again", probability: 10 },
    { label: "20% Off", value: "20_off", probability: 10 },
    { label: "Gift Card", value: "gift_card", probability: 10 },
    { label: "No Luck", value: "no_luck", probability: 10 }
  ];

  if (target === "amp") {
    const actionUrl = props.actionXhr || props.formAmpUrl || "{{formAmpUrl}}";
    const safeId = block.id.replace(/-/g, "_");
    return `<amp-state id="wheelState_${safeId}">
      <script type="application/json">
        { "step": "idle", "prizeCode": "", "prizeDesc": "" }
      </script>
    </amp-state>

    <div class="card" style="text-align:center">
      <!-- STEP 1: Idle wheel, tap to spin -->
      <div class="step visible" [class]="(wheelState_${safeId}.step || 'idle') == 'idle' ? 'step visible' : 'step'">
        <div class="title">${escapeHtml(props.title || "Spin the Wheel to Win!")}</div>
        <div class="subtitle">${escapeHtml(props.description || "Try your luck and win exciting prizes.")}</div>

        <form method="post"
              id="wheelForm_${safeId}"
              action-xhr="${escapeAttr(actionUrl)}"
              on="submit:AMP.setState({wheelState_${safeId}:{step:'spinning'}}); submit-success:AMP.setState({wheelState_${safeId}:{step:'result', prizeCode: event.response.prizeCode || event.response.prizeLabel || 'SURPRISE', prizeDesc: event.response.prizeDesc || 'Congratulations!'}}); submit-error:AMP.setState({wheelState_${safeId}:{step:'error'}})">

          <input type="hidden" name="is_spin_wheel" value="true">
          <input type="hidden" name="spin_wheel_block_id" value="${escapeAttr(block.id || "")}">
          <input type="hidden" name="trackingid" value="{{trackingId}}">
          <input type="hidden" name="templateId" value="{{templateId}}">
          <input type="hidden" name="templateSlug" value="{{templateSlug}}">
          <input type="hidden" name="campaignName" value="{{campaignName}}">

          <div class="wheel-wrap"
               role="button"
               tabindex="0"
               on="tap:wheelForm_${safeId}.submit">
            <amp-img src="${escapeAttr(props.customIdleImage || "{{baseUrl}}/template-assets/wheel/{{templateId}}.svg")}"
                      width="240" height="240" layout="responsive"
                      alt="Prize wheel"></amp-img>
          </div>

          <div [hidden]="(wheelState_${safeId}.step || 'idle') != 'idle'">
            <button type="submit" class="btn">${escapeHtml(props.submitText || "🎰 Spin Now!")}</button>
          </div>
        </form>
      </div>

      <!-- STEP 2: Spinning animation -->
      <div class="step" [class]="wheelState_${safeId}.step == 'spinning' ? 'step visible' : 'step'">
        <div class="title">${escapeHtml(props.spinningTitle || "Spinning…")}</div>
        <div class="subtitle">${escapeHtml(props.spinningSubtitle || "Please wait while the wheel spins...")}</div>
        <div class="wheel-wrap">
          <amp-anim src="${escapeAttr(props.customSpinningImage || "https://res.cloudinary.com/dpgykcvsj/image/upload/v1783146943/wheel_GIF_by_Scorpion_Dagger_qijlpv.gif")}"
                    width="240" height="240" layout="responsive"
                    alt="Wheel spinning"></amp-anim>
        </div>
      </div>

      <!-- STEP 3: Result screen -->
      <div class="step" [class]="wheelState_${safeId}.step == 'result' ? 'step visible' : 'step'">
        <div class="title">${escapeHtml(props.successTitle || "You won!")}</div>

        <!-- Static "landed" wheel with the prize label overlaid on top -->
        <div class="result-wheel-wrap">
          <amp-img src="${escapeAttr(props.customLandedImage || "https://res.cloudinary.com/dpgykcvsj/image/upload/v1783149492/pngwing.com_1_eve3fn.png")}"
                    width="200" height="200" layout="responsive"
                    alt="Wheel landed on your prize"></amp-img>
          <div class="result-wheel-label" [text]="wheelState_${safeId}.prizeCode">WELCOME10</div>
        </div>

        <div class="result-box" style="margin-top:20px">
          <div class="result-icon">🎉</div>
          <div class="result-title" [text]="wheelState_${safeId}.prizeCode">WELCOME10</div>
          <div class="result-prize" [text]="wheelState_${safeId}.prizeDesc">10% off your next order</div>
        </div>
        <br>
        <button type="button" class="btn" style="cursor:pointer;outline:none" on="tap:AMP.setState({wheelState_${safeId}:{step:'idle'}})">${escapeHtml(props.successButtonText || "Spin Again")}</button>
      </div>

      <!-- STEP 4: Error — shown if the backend request fails -->
      <div class="step" [class]="wheelState_${safeId}.step == 'error' ? 'step visible' : 'step'">
        <div class="title">${escapeHtml(props.errorTitle || "Oops!")}</div>
        <div class="subtitle">${escapeHtml(props.errorSubtitle || "Something went wrong. Please try again.")}</div>
        <button type="button" class="btn" style="cursor:pointer;outline:none" on="tap:AMP.setState({wheelState_${safeId}:{step:'idle'}})">${escapeHtml(props.errorButtonText || "Try Again")}</button>
      </div>
    </div>`;
  }

  if (target === "formPage") {
    return renderSpinWheel(block, theme, "amp");
  }

  // HTML email version (static redirect CTA)
  const wheelImageHtml = props.customIdleImage
    ? `<img src="${escapeAttr(props.customIdleImage)}" style="width:100%;height:100%;object-fit:contain" alt="Spin Wheel" />`
    : buildSvgWheel(props, options);

  return `<div style="text-align:center;padding:24px;border:1px solid ${props.borderColor || "#e2e8f0"};border-radius:${px(props.radius || 12, "12px")};background-color:${props.formBackgroundColor || "#ffffff"};max-width:500px;margin:0 auto;font-family:${theme.fontFamily}">
    <h2 style="margin:0 0 8px;color:${props.titleColor || "#111827"};font-size:${fontSize(props.titleSize || 24, 24, 16)};font-weight:${props.titleWeight || 800}">${escapeHtml(props.title || "Spin the Wheel to Win!")}</h2>
    <p style="margin:0 0 16px;color:${props.descriptionColor || "#64748b"};font-size:${fontSize(props.descriptionSize || 14, 14, 12)}">${escapeHtml(props.description || "Try your luck and win exciting prizes.")}</p>
    
    <div style="position:relative;margin:24px auto;width:240px;height:240px">
      ${buildPointerStyle(props)}
      <div style="width:100%;height:100%">
        ${wheelImageHtml}
      </div>
    </div>
    
    <div style="margin-top:16px">
      <a href="{{formHtmlUrl}}" target="_blank" style="display:inline-block;background-color:${props.buttonColor || theme.primaryColor || "#0f766e"};color:${props.buttonTextColor || "#ffffff"};border-radius:${px(props.buttonRadius || 999, "999px")};padding:12px 30px;font-size:16px;font-weight:800;text-decoration:none">
        ${escapeHtml(props.submitText || "🎰 Spin Now!")}
      </a>
    </div>
  </div>`;
};

const renderSpinWheelHostedBlock = (block, theme) => {
  const props = block.props || {};
  const options = props.options || [
    { label: "10% Off", value: "10_off", probability: 10 },
    { label: "Free Shipping", value: "free_shipping", probability: 10 },
    { label: "Try Again", value: "try_again", probability: 10 },
    { label: "20% Off", value: "20_off", probability: 10 },
    { label: "Gift Card", value: "gift_card", probability: 10 },
    { label: "No Luck", value: "no_luck", probability: 10 }
  ];

  const pinText = props.centerPinText || "Spin";
  const pinSize = props.centerPinButtonSize ?? 60;
  const pinBg = props.centerPinColor || "#ffffff";
  const pinTextColor = props.centerPinTextColor || "#111827";
  const pinBorderColor = props.centerPinBorderColor || props.buttonColor || theme.primaryColor || "#0f766e";
  const pinBorderWidth = props.centerPinBorderWidth ?? 4;

  let spinButtonContent = pinText;
  if (props.centerPinImage) {
    spinButtonContent = `<img src="${escapeHtml(props.centerPinImage)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
  }

  let successText = props.thankYouText || "You won: Prize";
  if (!successText.includes("won-prize-label")) {
    if (successText.includes("{prize}")) {
      successText = successText.replace("{prize}", `<span id="won-prize-label">Prize</span>`);
    } else if (successText.includes("Prize")) {
      successText = successText.replace("Prize", `<span id="won-prize-label">Prize</span>`);
    } else {
      successText = successText + ` <span id="won-prize-label">Prize</span>`;
    }
  }

  const formActionUrl = props.formActionUrl || "{{formActionUrl}}";

  return `<div style="text-align:center;padding:24px;border:1px solid ${props.borderColor || "#e2e8f0"};border-radius:${px(props.radius || 12, "12px")};background-color:${props.formBackgroundColor || "#ffffff"};max-width:500px;margin:0 auto;font-family:${theme.fontFamily}">
    <h2 style="margin:0 0 8px;color:${props.titleColor || "#111827"};font-size:${fontSize(props.titleSize || 24, 24, 16)};font-weight:${props.titleWeight || 800}">${escapeHtml(props.title || "Spin the Wheel to Win!")}</h2>
    <p style="margin:0 0 16px;color:${props.descriptionColor || "#64748b"};font-size:${fontSize(props.descriptionSize || 14, 14, 12)}">${escapeHtml(props.description || "Try your luck and win exciting prizes.")}</p>
    
    <div style="position:relative;margin:24px auto;width:240px;height:240px">
      <!-- Top pointer -->
      ${buildPointerStyle(props)}
      
      <!-- Spinning Wheel -->
      <div id="wheel-canvas-container" style="width:100%;height:100%;transition:transform ${Number(props.spinDuration ?? 4)}s cubic-bezier(0.1, 0.8, 0.1, 1);transform:rotate(0deg)">
        ${buildSvgWheel(props, options)}
      </div>
      
      <!-- Spin Button -->
      <button id="spin-button" type="button" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:10;width:${pinSize}px;height:${pinSize}px;border-radius:50%;background-color:${pinBg};color:${pinTextColor};border:${pinBorderWidth}px solid ${pinBorderColor};font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,0.15);outline:none;display:flex;align-items:center;justify-content:center;text-transform:uppercase;padding:0;overflow:hidden">${spinButtonContent}</button>
    </div>

    <!-- Hidden Form -->
    <form id="spin-wheel-form" method="post" action="${escapeAttr(formActionUrl)}" style="margin:0">
      <input type="hidden" name="is_spin_wheel" value="true">
      <input type="hidden" id="spin-result-input" name="spin_result" value="" required>
      <input type="hidden" name="email" value="{{email}}">
      <input type="hidden" name="campaignName" value="{{campaignName}}">
      <input type="hidden" name="campaignType" value="{{campaignType}}">
      <input type="hidden" name="templateId" value="{{templateId}}">
      <input type="hidden" name="templateSlug" value="{{templateSlug}}">
    </form>

    <!-- Local Success Announcement -->
    <div id="local-success-container" class="hidden">
      <div style="margin-top:16px;padding:${props.thankYouPadding || '12px'};border:1px solid ${props.thankYouBorderColor || '#34d399'};border-radius:${px(props.thankYouRadius || 8, '8px')};background-color:${props.thankYouBackgroundColor || '#ecfdf5'};text-align:${props.thankYouAlign || 'center'}">
        <p style="margin:0 0 4px;color:${props.thankYouTitleColor || '#047857'};font-weight:${props.thankYouTitleWeight || 800};font-size:${props.thankYouTitleSize || 16}px">
          ${escapeHtml(props.thankYouTitle || "🎉 Congratulations!")}
        </p>
        <p style="margin:0;color:${props.thankYouTextColor || '#064e3b'};font-weight:${props.thankYouTextWeight || 600};font-size:${props.thankYouTextSize || 14}px">
          ${successText}
        </p>
      </div>
    </div>

    <script>
      (function() {
        const options = ${JSON.stringify(options)};
        const wheel = document.getElementById('wheel-canvas-container');
        const btn = document.getElementById('spin-button');
        const input = document.getElementById('spin-result-input');
        const form = document.getElementById('spin-wheel-form');
        const successContainer = document.getElementById('local-success-container');
        const prizeLabelSpan = document.getElementById('won-prize-label');
        let isSpinning = false;

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          if (isSpinning) return;
          isSpinning = true;
          btn.disabled = true;
          btn.style.cursor = 'default';
          btn.style.opacity = '0.7';

          // Weighted random selection algorithm
          const totalWeight = options.reduce((sum, opt) => sum + Number(opt.probability || 1), 0);
          let r = Math.random() * totalWeight;
          let segmentIndex = 0;
          for (let i = 0; i < options.length; i++) {
            r -= Number(options[i].probability || 1);
            if (r <= 0) {
              segmentIndex = i;
              break;
            }
          }

          const degreesPerSegment = 360 / options.length;
          const extraTurns = ${Number(props.spinTurns ?? 6)};
          const targetDegrees = extraTurns * 360 + (options.length - segmentIndex) * degreesPerSegment - (degreesPerSegment / 2);

          wheel.style.transform = 'rotate(' + targetDegrees + 'deg)';

          setTimeout(function() {
            const wonPrize = options[segmentIndex];
            const prizeText = wonPrize.label || wonPrize.value;
            input.value = prizeText;
            if (prizeLabelSpan) {
              prizeLabelSpan.textContent = prizeText;
            }
            successContainer.classList.remove('hidden');

            // Post result back to server
            const formData = new FormData(form);
            const actionUrl = form.getAttribute('action-xhr') || form.action || form.getAttribute('action');
            fetch(actionUrl, {
              method: 'POST',
              body: new URLSearchParams(formData),
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }).catch(err => console.error("Error submitting spin result:", err));
          }, ${Number(props.spinDuration ?? 4) * 1000 + 100});
        });
      })();
    </script>
  </div>`;
};

const renderBlockInner = (block, target, theme) => {
  switch (block.type) {
    case "heading":
      return renderText(block, theme, block.props?.level || "h2");
    case "text":
      return renderText(block, theme, "p");
    case "image":
      return target === "amp" ? renderImageAmp(block, theme) : renderImageHtml(block, theme);
    case "button":
      return renderButton(block, theme);
    case "form":
      if (target === "html") {
        return renderHtmlFormButton(block, theme);
      }
      if (target === "amp") {
        return renderAmpForm(block, theme);
      }
      return renderFormPageForm(block, theme);
    case "divider":
      return renderDivider(block);
    case "spacer":
      return renderSpacer(block);
    case "shape":
      return renderShape(block, theme);
    case "card":
      return renderCard(block, theme);
    case "container":
      return renderContainer(block, target, theme);
    case "rawHtml":
      return renderRawHtml(block, target);
    case "navbar":
      return renderNavbar(block, theme);
    case "social":
    case "socialLinks":
    case "socialIcons":
      return renderSocialLinks(block, theme, target);
    case "logoHeader":
      return renderLogoHeader(block, theme);
    case "productCard":
      return renderProductCard(block, theme);
    case "productList":
      return renderProductList(block, theme);
    case "pricingCard":
      return renderPricingCard(block, theme);
    case "testimonial":
      return renderTestimonial(block, theme);
    case "countdown":
      return renderCountdown(block, theme);
    case "rating":
      return renderRating(block, theme, target);
    case "nps":
      return renderNps(block, theme, target);
    case "poll":
      return renderPoll(block, theme, target);
    case "survey":
      return renderSurvey(block, theme, target);
    case "appointment":
    case "booking":
      return renderAppointment(block, theme, target);
    case "quiz":
      return renderSurvey({
        ...block,
        props: {
          title: "Quiz",
          submitText: "Submit answers",
          ...(block.props || {})
        }
      }, theme, target);
    case "productFeedback":
      return renderRating({
        ...block,
        props: {
          title: "Product feedback",
          question: "How satisfied are you with this product?",
          ...(block.props || {})
        }
      }, theme, target);
    case "rsvp":
      return renderRsvp(block, theme, target);
    case "conditionalGroup":
      return renderConditionalGroup(block, target, theme);
    case "accordion":
      return renderAccordion(block, theme);
    case "carousel":
      return renderCarousel({
        ...block,
        props: {
          ...(block.props || {}),
          amp: target === "amp" || target === "formPage"
        }
      }, theme);
    case "footer":
      return renderFooter(block, theme, target);
    case "spinWheel":
      return renderSpinWheel(block, theme, target);
    default:
      return "";
  }
};

const renderBlock = (block, target, theme) => {
  return wrapWithVisibility(renderBlockInner(block, target, theme), block);
};

const renderBody = (sourceJson, target) => {
  const theme = getTheme(sourceJson);
  return getBlocks(sourceJson)
    .map((block) => renderBlock(block, target, theme))
    .join("\n");
};

const hasBlockType = (sourceJson, types) => {
  const typeSet = new Set(Array.isArray(types) ? types : [types]);
  return getBlocks(sourceJson).some((block) => typeSet.has(block.type));
};

const colorSchemeMeta = (theme) => {
  return theme.followDeviceColorScheme
    ? `<meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">`
    : `<meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">`;
};

const htmlDeviceColorStyles = (theme) => {
  return `<style>
    @media only screen and (max-width:${SMARTPHONE_BREAKPOINT}px) {
      .email-shell{width:100% !important;max-width:100% !important}
      .email-content{width:100% !important}
      .email-image-frame{width:100% !important;max-width:100% !important}
      .email-image{max-width:100% !important;height:auto !important}
      img{height:auto !important}
    }
    ${theme.followDeviceColorScheme ? `
    :root{color-scheme:light dark;supported-color-schemes:light dark}
    @media (prefers-color-scheme: dark) {
      body,.email-bg{background:${theme.darkBackgroundColor} !important}
      .email-shell,.email-content{background:${theme.darkContentColor} !important}
      .email-content{color:${theme.darkTextColor} !important}
      .email-muted{color:${theme.darkMutedColor} !important}
    }` : ""}
  </style>`;
};

const ampDeviceColorStyles = (theme) => {
  return `
    @media only screen and (max-width:${SMARTPHONE_BREAKPOINT}px) {
      .email-shell{width:100%;max-width:100%}
      .email-content{width:100%}
      .email-amp-image{max-width:100%}
      .hosted-form-banner{max-width:100%}
    }`;
};

const interactiveBlockTypes = new Set([
  "form",
  "poll",
  "survey",
  "rating",
  "nps",
  "appointment",
  "booking",
  "quiz",
  "productFeedback",
  "rsvp",
  "spinWheel"
]);

const getHostedFormBannerBlock = (blocks, formBlock) => {
  const isImageBlock = (block) => block?.type === "image" && block.props?.src;
  const formIndex = blocks.indexOf(formBlock);
  const blocksBeforeForm = formIndex > -1 ? blocks.slice(0, formIndex) : blocks;

  return blocksBeforeForm.find(isImageBlock) || blocks.find(isImageBlock);
};

const htmlDocument = (sourceJson) => {
  const theme = getTheme(sourceJson);
  const body = renderBody(sourceJson, "html");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${colorSchemeMeta(theme)}
  <title>${escapeHtml(sourceJson.subject || sourceJson.name || "Email")}</title>
  ${htmlDeviceColorStyles(theme)}
</head>
<body class="email-bg" style="${style({
    margin: "0",
    padding: "0",
    "background-color": theme.backgroundColor,
    ...backgroundImageStyles(theme.backgroundImage)
  })}">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent">{{preheader}}</div>
  <table class="email-bg" role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="${style({
    "background-color": theme.backgroundColor,
    ...backgroundImageStyles(theme.backgroundImage)
  })}">
    <tr>
      <td align="center" style="padding:0">
        <table class="email-shell" role="presentation" width="${theme.width}" border="0" cellpadding="0" cellspacing="0" style="${style({
    width: `${theme.width}px`,
    "max-width": "100%",
    margin: "0 auto",
    "background-color": theme.contentColor,
    ...backgroundImageStyles(theme.contentBackgroundImage)
  })}">
          <tr>
            <td class="email-content" style="padding:0;color:${theme.textColor}">
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const getSpinWheelStyles = (sourceJson) => {
  const blocks = typeof sourceJson.blocks !== 'undefined' ? sourceJson.blocks : (typeof getBlocks === 'function' ? getBlocks(sourceJson) : []);
  const spinWheelBlock = (Array.isArray(blocks) ? blocks : []).find(b => b.type === "spinWheel");
  if (!spinWheelBlock) {
    return "";
  }

  const props = spinWheelBlock.props || {};
  const options = props.options || [
    { label: "10% Off", value: "10_off", probability: 10 },
    { label: "Free Shipping", value: "free_shipping", probability: 10 },
    { label: "Try Again", value: "try_again", probability: 10 },
    { label: "20% Off", value: "20_off", probability: 10 },
    { label: "Gift Card", value: "gift_card", probability: 10 },
    { label: "No Luck", value: "no_luck", probability: 10 }
  ];
  return `
    .card {
      background: ${props.formBackgroundColor || "#ffffff"};
      border-radius: ${px(props.radius || 16, "16px")};
      padding: 24px;
      text-align: center;
      border: 1px solid ${props.borderColor || "#e5e7eb"};
      max-width: 500px;
      margin: 0 auto;
    }
    .title {
      font-size: ${fontSize(props.titleSize || 28, 28, 18)};
      font-weight: ${props.titleWeight || 700};
      color: ${props.titleColor || "#111827"};
      margin-bottom: 10px;
    }
    .subtitle {
      color: ${props.descriptionColor || "#6b7280"};
      margin-bottom: 20px;
      font-size: ${fontSize(props.descriptionSize || 14, 14, 12)};
    }
    .btn {
      background: ${props.buttonColor || "#7c3aed"};
      color: ${props.buttonTextColor || "#ffffff"};
      border: none;
      border-radius: ${px(props.buttonRadius || 12, "12px")};
      padding: 14px 36px;
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 16px;
    }
    .result-box {
      background: ${props.thankYouBackgroundColor || "#ecfdf5"};
      border: 1px solid ${props.thankYouBorderColor || "#34d399"};
      border-radius: ${px(props.thankYouRadius || 16, "16px")};
      padding: ${props.thankYouPadding || "24px"};
      text-align: ${props.thankYouAlign || "center"};
      margin-top: 16px;
    }
    .result-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .result-title {
      font-weight: ${props.thankYouTitleWeight || 700};
      color: ${props.thankYouTitleColor || "#047857"};
      margin-bottom: 6px;
      font-size: ${props.thankYouTitleSize ? props.thankYouTitleSize + "px" : "22px"};
    }
    .result-prize {
      font-weight: ${props.thankYouTextWeight || 600};
      color: ${props.thankYouTextColor || "#064e3b"};
      font-size: ${props.thankYouTextSize ? props.thankYouTextSize + "px" : "16px"};
    }
    .step {
      display: none;
    }
    .step.visible {
      display: block;
    }
    .wheel-wrap {
      position: relative;
      width: 240px;
      height: 240px;
      margin: 0 auto 20px;
      cursor: pointer;
    }
    .wheel-wrap img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .result-wheel-wrap {
      position: relative;
      width: 200px;
      height: 200px;
      margin: 0 auto 16px;
    }
    .result-wheel-wrap img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .result-wheel-label {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      max-width: 90px;
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      text-align: center;
      word-break: break-word;
    }
  `;
};

const getCarouselArrowStyles = (sourceJson) => {
  let css = "";
  const blocks = sourceJson.blocks || [];
  blocks.forEach((block) => {
    if (block.type === "carousel" && block.props?.layout === "card") {
      const position = block.props.carouselArrowsPosition || "image";

      if (position === "carousel") {
        css += `
    .property-carousel .amp-carousel-button {
      top: 50%;
      transform: translateY(-50%);
    }
        `;
      } else if (position === "custom") {
        const topVal = block.props.carouselArrowsTop ? `${block.props.carouselArrowsTop}px` : "110px";
        css += `
    .property-carousel .amp-carousel-button {
      top: ${topVal};
      transform: translateY(-50%);
    }
        `;
      } else {
        // "image" positioning: Center of the image area (Desktop = 110px, Mobile = 1px)
        css += `
    .property-carousel .amp-carousel-button {
      top: 110px;
      transform: translateY(-50%);
    }
    @media (max-width: 600px) {
      .property-carousel .amp-carousel-button {
        top: 1px;
      }
    }
        `;
      }
    }
  });

  if (!css) {
    css = `
    .property-carousel .amp-carousel-button {
      top: 110px;
      transform: translateY(-50%);
    }
    @media (max-width: 600px) {
      .property-carousel .amp-carousel-button {
        top: 1px;
      }
    }
    `;
  }
  return css;
};

const ampDocument = (sourceJson) => {
  const theme = getTheme(sourceJson);
  const body = renderBody(sourceJson, "amp");

  const jsonStr = JSON.stringify(sourceJson);
  const hasCarousel = hasBlockType(sourceJson, "carousel") || jsonStr.includes("amp-carousel");
  const hasForm = hasBlockType(sourceJson, Array.from(interactiveBlockTypes)) || jsonStr.includes("<form");
  const hasMustache = hasBlockType(sourceJson, Array.from(interactiveBlockTypes).filter(t => t !== "spinWheel")) || jsonStr.includes("amp-mustache");
  const hasBind = hasBlockType(sourceJson, "spinWheel") || jsonStr.includes("amp-state") || jsonStr.includes("AMP.setState");
  const hasAnim = hasBlockType(sourceJson, "spinWheel") || jsonStr.includes("amp-anim");

  const carouselScript = hasCarousel
    ? '<script async custom-element="amp-carousel" src="https://cdn.ampproject.org/v0/amp-carousel-0.2.js"></script>'
    : "";
  const formScript = hasForm
    ? '<script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>'
    : "";
  const mustacheScript = hasMustache
    ? '<script async custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"></script>'
    : "";
  const bindScript = hasBind
    ? '<script async custom-element="amp-bind" src="https://cdn.ampproject.org/v0/amp-bind-0.1.js"></script>'
    : "";
  const animScript = hasAnim
    ? '<script async custom-element="amp-anim" src="https://cdn.ampproject.org/v0/amp-anim-0.1.js"></script>'
    : "";

  return `<!doctype html>
<html ⚡4email data-css-strict>
<head>
  <meta charset="utf-8">
  ${colorSchemeMeta(theme)}
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  ${formScript}
  ${carouselScript}
  ${mustacheScript}
  ${bindScript}
  ${animScript}
  <style amp4email-boilerplate>body{visibility:hidden}</style>
  <style amp-custom>
    body{${style({
    margin: "0",
    "background-color": theme.backgroundColor,
    ...backgroundImageStyles(theme.backgroundImage),
    "font-family": theme.fontFamily,
    color: theme.textColor
  })}}
    .email-shell{${style({
    width: `${theme.width}px`,
    "max-width": "100%",
    margin: "0 auto",
    "background-color": theme.contentColor,
    ...backgroundImageStyles(theme.contentBackgroundImage),
    padding: "0"
  })}}
    .email-content{color:${theme.textColor}}
    a{color:${theme.primaryColor}}
    form.amp-form-submitting .form-content-wrapper,
    form.amp-form-submit-success .form-content-wrapper {
      display: none;
    }
    [submitting], [submit-success], [submit-error] {
      display: none;
    }
    ${ampDeviceColorStyles(theme)}
    ${getSpinWheelStyles(sourceJson)}
    ${getCarouselArrowStyles(sourceJson)}
  </style>
</head>
<body class="email-bg">
  <div class="email-shell email-content">
    ${body}
  </div>
</body>
</html>`;
};

const formDocument = (sourceJson) => {
  const theme = getTheme(sourceJson);
  const blocks = getBlocks(sourceJson);
  const jsonStr = JSON.stringify(sourceJson);
  const carouselScript = (hasBlockType(sourceJson, "carousel") || jsonStr.includes("amp-carousel"))
    ? '<script async custom-element="amp-carousel" src="https://cdn.ampproject.org/v0/amp-carousel-0.2.js"></script>'
    : "";
  const formBlock = blocks.find((block) => interactiveBlockTypes.has(block.type));
  const bannerBlock = getHostedFormBannerBlock(blocks, formBlock);

  if (bannerBlock) {
    const props = bannerBlock.props || {};
    const requestedWidth = numberFrom(
      props.hostedFormWidth,
      props.formPageWidth,
      props.bannerWidth,
      props.width,
      props.imageWidth
    );
    theme.bannerWidth = Math.min(
      requestedWidth || HOSTED_FORM_BANNER_WIDTH,
      HOSTED_FORM_WIDTH
    );
  }

  const formMaxWidth = firstValue(
    formBlock?.props?.formMaxWidth,
    formBlock?.props?.formWidth,
    theme.bannerWidth,
    theme.width,
    560
  );

  const allowedFormPageBlocks = new Set([
    "divider",
    "spacer",
    "heading",
    "text",
    "footer",
    "social",
    "socialLinks",
    "socialIcons",
    "carousel",
    "rawHtml"
  ]);

  const body = formBlock
    ? blocks
      .map((block) => {
        if (block === formBlock) {
          return renderBlock(block, "formPage", theme);
        }
        if (block === bannerBlock) {
          return renderHostedFormBanner(block, theme);
        }
        if (allowedFormPageBlocks.has(block.type)) {
          const html = renderBlock(block, "formPage", theme);
          if (!html) return null;
          return `<div style="${style({
            margin: "0 auto",
            width: "100%",
            "max-width": `${formMaxWidth}px`,
            "box-sizing": "border-box"
          })}">${html}</div>`;
        }
        return null;
      })
      .filter(Boolean)
      .join("\n")
    : `<p style="font-family:${theme.fontFamily};text-align:center">No form block is available.</p>`;

  return `<!doctype html>
<html ⚡>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
  ${colorSchemeMeta(theme)}
  <link rel="canonical" href="{{directFormHtmlUrl}}">
  <title>${escapeHtml(sourceJson.formTitle || sourceJson.name || "Form")}</title>
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>
  <script async custom-element="amp-bind" src="https://cdn.ampproject.org/v0/amp-bind-0.1.js"></script>
  <script async custom-element="amp-anim" src="https://cdn.ampproject.org/v0/amp-anim-0.1.js"></script>
  ${carouselScript}
  <script async custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"></script>
  <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
  <noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
  <style amp-custom>
    html, body {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
      box-sizing: border-box;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body{${style({
    margin: "0",
    "background-color": theme.backgroundColor,
    ...backgroundImageStyles(theme.backgroundImage),
    padding: "24px",
    "font-family": theme.fontFamily,
    color: theme.textColor
  })}}
    input,textarea,select{font-family:${theme.fontFamily}}
    form.amp-form-submitting .form-content-wrapper,
    form.amp-form-submit-success .form-content-wrapper {
      display: none;
    }
    [submitting], [submit-success], [submit-error] {
      display: none;
    }
    .prize-announcement {
      animation: fadeIn 0.5s ease-out forwards;
      animation-delay: 4s;
      opacity: 0;
    }
    @keyframes fadeIn {
      to { opacity: 1; }
    }
    .hidden {
      display: none;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 12px;
      }
      form.hosted-form {
        padding: 16px;
        border-radius: 6px;
      }
      form.hosted-form input,
      form.hosted-form textarea,
      form.hosted-form select {
        padding: 10px;
        font-size: 14px;
      }
      form.hosted-form button[type="submit"] {
        padding: 11px;
        font-size: 15px;
        margin-top: 16px;
      }
    }
    ${ampDeviceColorStyles(theme)}
    ${getSpinWheelStyles(sourceJson)}
    ${getCarouselArrowStyles(sourceJson)}
  </style>
</head>
<body class="email-bg email-content">
  ${body}
</body>
</html>`;
};

const placeholderPattern = /\{\{\s*(?![#/])([a-zA-Z0-9_.-]+)(?:\s*\|\s*default\s*:\s*(?:"[^"]*"|'[^']*'|[^}]+))?\s*\}\}/g;
const sectionPattern = /\{\{\s*#(?:if|unless|each)\s+([a-zA-Z0-9_.-]+)/g;

const extractVariables = (...templates) => {
  const variables = new Set();

  for (const template of templates) {
    if (!template) {
      continue;
    }

    for (const match of String(template).matchAll(placeholderPattern)) {
      variables.add(match[1]);
    }

    for (const match of String(template).matchAll(sectionPattern)) {
      variables.add(match[1]);
    }
  }

  return [...variables].sort();
};

const getTextFallback = (sourceJson) => {
  return getBlocks(sourceJson)
    .filter((block) => block.type === "heading" || block.type === "text")
    .map((block) => block.props?.text || "")
    .join("\n\n") || "Please view this email in HTML.";
};

export const compileTemplateSource = (sourceJson = {}) => {
  const html = htmlDocument(sourceJson);
  const amp = ampDocument(sourceJson);
  const formHtml = formDocument(sourceJson);
  const text = sourceJson.text || getTextFallback(sourceJson);

  return {
    html,
    amp,
    formHtml,
    text,
    variables: extractVariables(html, amp, formHtml, text, sourceJson.subject)
  };
};

export const builderBlockCatalog = [
  {
    type: "heading",
    label: "Heading",
    category: "content",
    block: {
      type: "heading",
      props: {
        text: "Section heading",
        level: "h2",
        fontSize: 24
      }
    }
  },
  {
    type: "text",
    label: "Text",
    category: "content",
    block: {
      type: "text",
      props: {
        text: "Write your email copy here."
      }
    }
  },
  {
    type: "image",
    label: "Image",
    category: "content",
    block: {
      type: "image",
      props: {
        src: "https://via.placeholder.com/600x320.png?text=Image",
        alt: "Image",
        width: 600,
        height: 320
      }
    }
  },
  {
    type: "button",
    label: "Button",
    category: "content",
    block: {
      type: "button",
      props: {
        text: "Call to action",
        href: "https://example.com"
      }
    }
  },
  {
    type: "form",
    label: "Form",
    category: "interactive",
    block: {
      type: "form",
      props: {
        title: "Tell us about yourself",
        submitText: "Submit",
        fields: [
          {
            name: "name",
            label: "Name",
            type: "text",
            required: true
          },
          {
            name: "email",
            label: "Email",
            type: "email",
            required: true
          }
        ]
      }
    }
  },
  {
    type: "poll",
    label: "Poll",
    category: "interactive",
    block: {
      type: "poll",
      props: {
        question: "Are you interested?",
        options: ["Yes", "No", "Maybe"]
      }
    }
  },
  {
    type: "survey",
    label: "Survey",
    category: "interactive",
    block: {
      type: "survey",
      props: {
        title: "Quick survey",
        description: "Collect customer details directly from this campaign.",
        submitText: "Submit",
        fields: [
          {
            name: "experience",
            label: "How was your experience?",
            type: "select",
            required: true,
            options: ["Excellent", "Good", "Average", "Poor"]
          },
          {
            name: "feedback",
            label: "What can we improve?",
            type: "textarea"
          }
        ]
      }
    }
  },
  {
    type: "rating",
    label: "Rating",
    category: "interactive",
    block: {
      type: "rating",
      props: {
        question: "How would you rate us?",
        max: 5
      }
    }
  },
  {
    type: "nps",
    label: "NPS",
    category: "interactive",
    block: {
      type: "nps",
      props: {
        question: "How likely are you to recommend us?"
      }
    }
  },
  {
    type: "appointment",
    label: "Appointment",
    category: "interactive",
    block: {
      type: "appointment",
      props: {
        title: "Book an appointment",
        slots: ["10:00 AM", "12:00 PM", "03:00 PM"]
      }
    }
  },
  {
    type: "rsvp",
    label: "Event RSVP",
    category: "interactive",
    block: {
      type: "rsvp",
      props: {
        title: "Event RSVP",
        question: "Will you attend?",
        options: ["Yes", "Maybe", "No"]
      }
    }
  },
  {
    type: "carousel",
    label: "Carousel",
    category: "commerce",
    block: {
      type: "carousel",
      props: {
        slides: [
          {
            imageUrl: "https://via.placeholder.com/600x260.png?text=Slide+1",
            title: "Slide 1"
          },
          {
            imageUrl: "https://via.placeholder.com/600x260.png?text=Slide+2",
            title: "Slide 2"
          }
        ]
      }
    }
  },
  {
    type: "productCard",
    label: "Product Card",
    category: "commerce",
    block: {
      type: "productCard",
      props: {
        title: "Product name",
        text: "Short product description.",
        price: "$29",
        href: "https://example.com/product"
      }
    }
  },
  {
    type: "productList",
    label: "Dynamic Product List",
    category: "commerce",
    block: {
      type: "productList",
      props: {
        collection: "products",
        items: [
          {
            title: "Product name",
            text: "Short product description.",
            price: "$29",
            href: "https://example.com/product"
          }
        ]
      }
    }
  },
  {
    type: "conditionalGroup",
    label: "Conditional Section",
    category: "personalization",
    block: {
      type: "conditionalGroup",
      props: {
        visibility: {
          field: "plan",
          operator: "equals",
          value: "pro"
        },
        blocks: [
          {
            type: "text",
            props: {
              text: "This message is shown only to matching contacts."
            }
          }
        ]
      }
    }
  },
  {
    type: "container",
    label: "Container",
    category: "layout",
    block: {
      type: "container",
      props: {
        width: 600,
        height: "auto",
        backgroundColor: "#ffffff",
        radius: 8,
        padding: "20px",
        imageSrc: "https://via.placeholder.com/600x200.png?text=Container+Image",
        imageWidth: 600,
        showImage: true,
        title: "Container Title",
        text: "Enter your custom container text here."
      }
    }
  }
];

export const builderEditorConfig = {
  assetLibrary: {
    uploadUrl: "/api/templates/assets",
    publicBasePath: "/template-assets",
    categories: ["images", "social-logos"],
    acceptedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"],
    bodyFields: {
      image: "data URL or base64 image data",
      fileName: "optional display filename",
      category: "images or social"
    }
  },
  previewModes: [
    {
      id: "desktop",
      label: "Desktop",
      width: 600
    },
    {
      id: "mobile",
      label: "Mobile",
      width: 390
    }
  ],
  previewTargets: ["html", "amp", "formHtml", "text"],
  variableGroups: [
    {
      label: "Contact",
      variables: ["email", "firstName", "lastName", "phone", "company", "plan"]
    },
    {
      label: "Campaign",
      variables: ["subject", "campaignName", "campaignType"]
    },
    {
      label: "System",
      variables: ["unsubscribeUrl", "formHtmlUrl", "directFormHtmlUrl"]
    }
  ],
  visibilityOperators: [
    {
      value: "truthy",
      label: "exists"
    },
    {
      value: "equals",
      label: "equals"
    },
    {
      value: "notEquals",
      label: "does not equal"
    }
  ],
  fieldTypes: [
    {
      value: "text",
      label: "Text"
    },
    {
      value: "email",
      label: "Email"
    },
    {
      value: "tel",
      label: "Phone"
    },
    {
      value: "number",
      label: "Number"
    },
    {
      value: "textarea",
      label: "Long text"
    },
    {
      value: "select",
      label: "Dropdown",
      supportsOptions: true
    },
    {
      value: "radio",
      label: "Single choice",
      supportsOptions: true
    },
    {
      value: "checkbox",
      label: "Multiple choice",
      supportsOptions: true
    },
    {
      value: "date",
      label: "Date"
    }
  ],
  blockSchemas: {
    form: {
      label: "Form",
      fieldPath: "props.fields",
      fieldLabel: "Form fields",
      allowAddFields: true,
      allowRemoveFields: true,
      allowReorderFields: true,
      emptyState: "Add form fields from the inspector",
      controls: ["title", "description", "submitText", "fields", "successMessage"]
    },
    survey: {
      label: "Survey",
      fieldPath: "props.fields",
      legacyFieldPath: "props.questions",
      fieldLabel: "Survey questions",
      allowAddFields: true,
      allowRemoveFields: true,
      allowReorderFields: true,
      emptyState: "Add survey questions from the inspector",
      controls: ["title", "description", "submitText", "fields", "successMessage"]
    },
    poll: {
      label: "Poll",
      fieldPath: "props.fields",
      optionPath: "props.options",
      fieldLabel: "Poll question",
      allowAddFields: false,
      allowEditOptions: true,
      controls: ["title", "question", "options", "submitText"]
    },
    rating: {
      label: "Rating",
      fieldPath: "props.fields",
      fieldLabel: "Rating fields",
      allowAddFields: true,
      allowRemoveFields: true,
      allowReorderFields: true,
      controls: ["title", "question", "max", "fields", "submitText"]
    },
    nps: {
      label: "NPS",
      fieldPath: "props.fields",
      fieldLabel: "NPS fields",
      allowAddFields: true,
      allowRemoveFields: true,
      allowReorderFields: true,
      controls: ["title", "question", "fields", "submitText"]
    },
    appointment: {
      label: "Appointment",
      fieldPath: "props.fields",
      optionPath: "props.slots",
      fieldLabel: "Appointment fields",
      allowAddFields: true,
      allowRemoveFields: true,
      allowReorderFields: true,
      allowEditOptions: true,
      controls: ["title", "description", "slots", "fields", "submitText"]
    },
    rsvp: {
      label: "Event RSVP",
      fieldPath: "props.fields",
      optionPath: "props.options",
      fieldLabel: "RSVP fields",
      allowAddFields: true,
      allowRemoveFields: true,
      allowReorderFields: true,
      allowEditOptions: true,
      controls: ["title", "question", "options", "fields", "submitText"]
    }
  },
  personalizationExamples: [
    "{{firstName | default:'there'}}",
    "{{#if plan == \"pro\"}}Pro-only content{{/if}}",
    "{{#each products}}{{title}} - {{price}}{{/each}}"
  ]
};

export const starterTemplateSource = {
  version: 1,
  name: "Lead Form Template",
  subject: "Hi {{email}}, check your eligibility",
  theme: {
    width: 600,
    backgroundColor: "#f8fafc",
    contentColor: "#ffffff",
    darkBackgroundColor: "#111827",
    darkContentColor: "#1f2937",
    darkTextColor: "#f9fafb",
    darkMutedColor: "#cbd5e1",
    followDeviceColorScheme: true,
    primaryColor: "#178218",
    textColor: "#111827",
    mutedColor: "#64748b",
    fontFamily: "Arial, sans-serif"
  },
  blocks: [
    {
      id: "heading-1",
      type: "heading",
      props: {
        text: "Check Your Eligibility",
        level: "h1",
        align: "center",
        fontSize: 28
      }
    },
    {
      id: "text-1",
      type: "text",
      props: {
        text: "Hi {{email}}, submit your details and our team will contact you.",
        align: "center",
        color: "#475569"
      }
    },
    {
      id: "form-1",
      type: "form",
      props: {
        title: "Business Details",
        description: "Please submit your company and contact details.",
        submitText: "Apply Now",
        fields: [
          {
            name: "company",
            label: "Company Name",
            type: "text",
            required: true
          },
          {
            name: "mobile",
            label: "Mobile No",
            type: "tel",
            required: true
          },
          {
            name: "city",
            label: "City",
            type: "text"
          }
        ]
      }
    },
    {
      id: "footer-1",
      type: "footer",
      props: {
        unsubscribe: true
      }
    }
  ]
};
