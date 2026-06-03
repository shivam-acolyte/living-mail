import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export const templateAssetRoot = path.resolve(process.cwd(), "public", "template-assets");

const categoryFolders = {
  image: "images",
  images: "images",
  logo: "social-logos",
  logos: "social-logos",
  social: "social-logos",
  socialLogo: "social-logos",
  socialLogos: "social-logos"
};

const mimeExtensions = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp"
};

const maxAssetBytes = Number(process.env.TEMPLATE_ASSET_MAX_BYTES) || 4 * 1024 * 1024;

const sanitizeName = (value = "asset") => {
  const name = String(value)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return name || "asset";
};

const normalizeCategory = (value) => categoryFolders[value] || "images";

const parseImagePayload = (image) => {
  const value = String(image || "").trim();
  const dataUrlMatch = value.match(/^data:([^;,]+)(;base64)?,(.*)$/s);

  if (dataUrlMatch) {
    const [, mimeType, isBase64, data] = dataUrlMatch;
    const buffer = isBase64
      ? Buffer.from(data, "base64")
      : Buffer.from(decodeURIComponent(data), "utf8");

    return {
      buffer,
      mimeType
    };
  }

  return {
    buffer: Buffer.from(value, "base64"),
    mimeType: null
  };
};

const compactSvg = (buffer) => Buffer.from(
  buffer
    .toString("utf8")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .trim(),
  "utf8"
);

export const saveTemplateAsset = async ({
  image,
  fileName,
  mimeType,
  category
}) => {
  const parsed = parseImagePayload(image);
  const resolvedMimeType = mimeType || parsed.mimeType;
  const extension = mimeExtensions[resolvedMimeType];

  if (!extension) {
    throw new Error("Only png, jpg, webp, gif and svg images are supported");
  }

  const buffer = extension === "svg" ? compactSvg(parsed.buffer) : parsed.buffer;

  if (!buffer.length || buffer.length > maxAssetBytes) {
    throw new Error(`Image must be between 1 byte and ${maxAssetBytes} bytes`);
  }

  const folder = normalizeCategory(category);
  const directory = path.join(templateAssetRoot, folder);
  const id = crypto.randomBytes(6).toString("hex");
  const safeName = sanitizeName(fileName);
  const storedFileName = `${safeName}-${id}.${extension}`;
  const absolutePath = path.join(directory, storedFileName);
  const publicPath = `/template-assets/${folder}/${storedFileName}`;

  await fs.mkdir(directory, {
    recursive: true
  });
  await fs.writeFile(absolutePath, buffer);

  return {
    fileName: storedFileName,
    category: folder,
    mimeType: resolvedMimeType,
    size: buffer.length,
    publicPath
  };
};
