import { syncDeliveryStatuses } from "../services/deliveryStatusService.js";

export const syncDeliveryStatusController = async (req, res) => {
  try {
    const result = await syncDeliveryStatuses();

    return res.json({
      success: true,
      message: "Delivery status sync completed",
      result
    });
  } catch (error) {
    console.error("DELIVERY STATUS SYNC ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Delivery status sync failed",
      error: error.message
    });
  }
};
