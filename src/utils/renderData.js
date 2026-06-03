import geoip from "geoip-lite";
import { UAParser } from "ua-parser-js";

const getRenderData = (req) => {

   const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      req.ip;

   const geo = geoip.lookup(ip);

   const parser = new UAParser(req.headers["user-agent"]);

   return {

      ip,

      country: geo?.country || "Unknown",

      city: geo?.city || "Unknown",

      browser:
         parser.getBrowser().name || "Unknown",

      os:
         parser.getOS().name || "Unknown",

      device:
         parser.getDevice().type || "desktop",

      userAgent:
         req.headers["user-agent"] || "Unknown"

   };

};

export default getRenderData;