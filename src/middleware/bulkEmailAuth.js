const bulkEmailAuth = (req, res, next) => {
  const configuredKey = process.env.BULK_EMAIL_API_KEY;

  if (!configuredKey) {
    return res.status(503).json({
      success: false,
      message: "Bulk email API key is not configured"
    });
  }

  const providedKey =
    req.headers["x-api-key"] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (providedKey !== configuredKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized bulk email request"
    });
  }

  return next();
};

export default bulkEmailAuth;
