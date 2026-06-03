import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  pool: true,
  maxConnections: Number(process.env.SMTP_POOL_MAX_CONNECTIONS || 50),
  maxMessages: Number(process.env.SMTP_POOL_MAX_MESSAGES || 1000),
  rateDelta: Number(process.env.SMTP_RATE_DELTA_MS || 1000),
  rateLimit: Number(process.env.SMTP_RATE_LIMIT_PER_SECOND || 400),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  logger: process.env.SMTP_LOGGER === "true",
  debug: process.env.SMTP_DEBUG === "true"
});

export default transporter;
