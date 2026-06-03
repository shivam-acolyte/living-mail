import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "tracking_events",
  jsonFields: ["delivery_status_raw", "delivery_meta", "render", "form_submission"],
  defaults: {
    isSubscribed: true,
    senderProvider: "smtp",
    deliveryStatusRaw: {},
    deliveryMeta: {},
    render: {},
    formSubmission: {}
  }
});
