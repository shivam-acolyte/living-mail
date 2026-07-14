import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "webhook_logs",
  jsonFields: ["request_payload"],
  defaults: {
    responseStatus: null,
    responseBody: "",
    errorMessage: "",
    durationMs: 0
  }
});
