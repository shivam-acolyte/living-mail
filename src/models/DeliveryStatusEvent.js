import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "delivery_status_events",
  jsonFields: ["delivery_meta", "delivery_status_raw"],
  defaults: {
    deliveryMeta: {},
    deliveryStatusRaw: {}
  }
});
