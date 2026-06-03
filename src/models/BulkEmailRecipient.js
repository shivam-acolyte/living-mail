import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "bulk_email_recipients",
  jsonFields: ["variables"],
  defaults: {
    variables: {},
    status: "pending",
    attempts: 0
  }
});
