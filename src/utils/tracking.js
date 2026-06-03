import crypto from "crypto";

export const generateTrackingId = (email, campaignName = "") => {
   const emailToken = Buffer
      .from(email)
      .toString("base64url");

   const campaignToken = campaignName
      ? Buffer.from(campaignName).toString("base64url").slice(0, 16)
      : "campaign";

   const randomToken = crypto.randomBytes(10).toString("hex");

   return `${emailToken}.${campaignToken}.${randomToken}`;
};

export const decodeLegacyTrackingId = (trackingId) => {
   try {
      return Buffer
         .from(trackingId, "base64")
         .toString();
   } catch {
      return "";
   }

};
