import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "bulk_email_campaigns",
  jsonFields: ["variables"],
  defaults: {
    variables: {},
    status: "pending",
    totalRecipients: 0,
    sent: 0,
    failed: 0,
    skipped: 0
  }
});
