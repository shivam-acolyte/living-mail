import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "webhook_subscriptions",
  jsonFields: ["subscribed_events"],
  defaults: {
    active: true,
    subscribedEvents: []
  }
});
