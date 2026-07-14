import BulkEmailCampaign from "../models/BulkEmailCampaign.js";
import Tracking from "../models/Tracking.js";

/**
 * Retrieves aggregate statistics for campaigns and email activities.
 */
export const getCampaignSummary = async (req, res) => {
  try {
    const totalCampaigns = await BulkEmailCampaign.countDocuments({});
    
    const totalSent = await Tracking.countDocuments({ eventType: "sent" });
    const totalOpens = await Tracking.countDocuments({ eventType: "open" });
    const totalClicks = await Tracking.countDocuments({ eventType: "click" });
    const totalFormSubmissions = await Tracking.countDocuments({ eventType: "form_submit" });
    
    // Check total failed/bounced events
    const totalFailed = await Tracking.countDocuments({ eventType: "failed" });

    // Fetch the 5 most recent campaigns
    const recentCampaigns = await BulkEmailCampaign.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      summary: {
        totalCampaigns,
        totalSent,
        totalOpens,
        totalClicks,
        totalFormSubmissions,
        totalFailed,
        recentCampaigns
      }
    });
  } catch (error) {
    console.error("Failed to compile admin campaign summary statistics:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
