import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "blocked_emails",
  defaults: {
    reason: "Admin Blocked"
  }
});
