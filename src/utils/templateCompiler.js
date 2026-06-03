const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const escapeAttr = escapeHtml;

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
const SMARTPHONE_BREAKPOINT = 480;

const getImageSize = (props = {}, theme = {}) => {
  const shellWidth = Math.min(Number(theme.width) || DESKTOP_EMAIL_WIDTH, DESKTOP_EMAIL_WIDTH);
  const defaultDesktopImageWidth = Math.min(shellWidth, DESKTOP_IMAGE_WIDTH);
  const width = Math.min(numberFrom(props.width, props.imageWidth, props.bannerWidth, defaultDesktopImageWidth) || defaultDesktopImageWidth, shellWidth);
  const requestedHeight = numberFrom(props.height, props.imageHeight, props.bannerHeight);
  const maxHeight = Math.round(width * 0.75);
  const height = requestedHeight
    ? Math.min(requestedHeight, maxHeight)
    : Math.round(width * 0.5);

  return {
    width,
    height
  };
};

const firstValue = (...values) => {
  return values.find((value) => value !== undefined && value !== null && value !== "");
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
  thankYouMessage: sourceJson.theme?.thankYouMessage || sourceJson.theme?.successMessage || "Your details have been submitted successfully.",
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
    .map(([key, value]) => `${key}:${value}`)
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
    margin: props.margin || "0 0 14px",
    color: props.color || theme.textColor,
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
    ? `<table class="email-image-frame" role="presentation" width="${width}" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:${width}px;margin:0 auto;padding:0;border-collapse:collapse"><tr><td style="padding:${padding};margin:0"><a href="${escapeAttr(props.href)}" target="_blank" style="display:block;margin:0;padding:0">${image}</a></td></tr></table>`
    : `<table class="email-image-frame" role="presentation" width="${width}" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:${width}px;margin:0 auto;padding:0;border-collapse:collapse"><tr><td style="padding:${padding};margin:0">${image}</td></tr></table>`;
};

const renderImageAmp = (block, theme) => {
  const props = block.props || {};
  const padding = "0";
  const { width, height } = getImageSize(props, theme);
  const textAlign = "left";
  const image = `<div class="email-amp-image" style="padding:${padding};text-align:${textAlign};max-width:${width}px;margin:0 auto"><amp-img src="${escapeAttr(props.src)}" alt="${escapeAttr(props.alt || "")}" width="${width}" height="${height}" layout="responsive"></amp-img></div>`;

  return props.href
    ? `<a href="${escapeAttr(props.href)}" target="_blank">${image}</a>`
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

const renderRawHtml = (block) => {
  return block.props?.html || "";
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
    margin: props.margin || "18px 0",
    padding: props.padding
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
  const formBlock = toFormBlock(
    block,
    [
      {
        name: props.name || "pollAnswer",
        label: props.question || "What do you think?",
        type: "radio",
        required: true,
        options
      }
    ],
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
  const questions = Array.isArray(props.questions) && props.questions.length
    ? props.questions
    : [
        {
          name: "surveyAnswer",
          label: props.question || "How was your experience?",
          type: "select",
          required: true,
          options: ["Excellent", "Good", "Average", "Poor"]
        }
      ];
  const fields = questions.map((question, index) => ({
    name: question.name || `question${index + 1}`,
    label: question.label || question.question || `Question ${index + 1}`,
    type: question.type || "select",
    required: question.required !== false,
    options: normalizeOptions(question.options, ["Yes", "No"])
  }));
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
  const formBlock = toFormBlock(
    block,
    [
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
    ],
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
  const formBlock = toFormBlock(
    block,
    [
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
    ],
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
  const formBlock = toFormBlock(
    block,
    [
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
    ],
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
  const formBlock = toFormBlock(
    block,
    [
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
    ],
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

  if (props.amp === true) {
    return `<amp-carousel width="${Number(props.width) || 600}" height="${Number(props.height) || 260}" layout="responsive" type="slides">
      ${slides.map((slide) => `<div>
        <amp-img src="${escapeAttr(slide.imageUrl)}" alt="${escapeAttr(slide.title)}" width="${Number(props.width) || 600}" height="${Number(props.height) || 260}" layout="responsive"></amp-img>
      </div>`).join("")}
    </amp-carousel>`;
  }

  return `<div style="font-family:${theme.fontFamily};text-align:center">
    ${slides.slice(0, 3).map((slide) => `<div style="margin:10px 0">
      <img src="${escapeAttr(slide.imageUrl)}" alt="${escapeAttr(slide.title)}" style="display:block;width:100%;height:auto;border-radius:8px">
      <p style="margin:8px 0 0;font-weight:700;color:${theme.textColor}">${escapeHtml(slide.title)}</p>
    </div>`).join("")}
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
  const message = props.thankYouMessage || props.successMessage || theme.thankYouMessage || "Your details have been submitted successfully.";
  const backgroundColor = props.thankYouBackgroundColor || props.successBackgroundColor || props.formBackgroundColor || props.contentColor || theme.formBackgroundColor || "#ffffff";
  const borderColor = props.thankYouBorderColor || props.successBorderColor || props.successColor || theme.successColor || theme.primaryColor;
  const titleColor = props.thankYouTitleColor || props.successTitleColor || "#ffffff";
  const textColor = props.thankYouTextColor || props.successTextColor || "#ffffff";

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
      "font-weight": "700"
    })}">${escapeHtml(title)}</p>
    <p style="${style({
      margin: "0",
      color: textColor,
      "font-size": px(props.thankYouTextSize, "14px"),
      "line-height": "1.45"
    })}">${escapeHtml(message)}</p>
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
  <div submit-success><template type="amp-mustache">${renderThankYouMessage(props, theme)}</template></div>
  <div submit-error><template type="amp-mustache"><p style="color:${props.errorColor || theme.errorColor};text-align:center;font-weight:700">Submission failed.</p></template></div>
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

  return `<form method="post" action-xhr="{{formActionUrl}}" target="_top" style="${style({
    margin: "0 auto",
    "max-width": "560px",
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
  <div submit-success>
    <template type="amp-mustache">
      ${renderThankYouMessage(props, theme)}
    </template>
  </div>
  <div submit-error>
    <template type="amp-mustache">
      <p style="color:${props.errorColor || theme.errorColor};text-align:center;font-weight:700">Submission failed. Please try again.</p>
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
    case "rawHtml":
      return renderRawHtml(block);
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
          amp: target === "amp"
        }
      }, theme);
    case "footer":
      return renderFooter(block, theme, target);
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
      .email-shell{width:100% !important;max-width:100% !important}
      .email-content{width:100% !important}
      .email-amp-image{max-width:100% !important}
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
  "rsvp"
]);

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

const ampDocument = (sourceJson) => {
  const theme = getTheme(sourceJson);
  const body = renderBody(sourceJson, "amp");
  const carouselScript = hasBlockType(sourceJson, "carousel")
    ? '<script async custom-element="amp-carousel" src="https://cdn.ampproject.org/v0/amp-carousel-0.2.js"></script>'
    : "";

  return `<!doctype html>
<html ⚡4email data-css-strict>
<head>
  <meta charset="utf-8">
  ${colorSchemeMeta(theme)}
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>
  ${carouselScript}
  <script async custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"></script>
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
    ${ampDeviceColorStyles(theme)}
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
  const formBlock = getBlocks(sourceJson).find((block) => interactiveBlockTypes.has(block.type));
  const body = formBlock
    ? renderBlock(formBlock, "formPage", theme)
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
  <script async custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"></script>
  <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
  <noscript><style amp-boilerplate>body{-webkit-animation:none;animation:none}</style></noscript>
  <style amp-custom>
    body{${style({
      margin: "0",
      "background-color": theme.backgroundColor,
      ...backgroundImageStyles(theme.backgroundImage),
      padding: "24px",
      "font-family": theme.fontFamily,
      color: theme.textColor
    })}}
    input,textarea,select{font-family:${theme.fontFamily}}
    ${ampDeviceColorStyles(theme)}
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
        questions: [
          {
            name: "experience",
            label: "How was your experience?",
            type: "select",
            options: ["Excellent", "Good", "Average", "Poor"]
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
        question: "Will you attend?"
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
