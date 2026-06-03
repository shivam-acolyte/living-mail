import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "amp_templates",
  jsonFields: ["source_json", "audit_history"],
  arrayFields: ["variables"],
  defaults: {
    status: "draft",
    version: 1,
    sourceJson: null,
    amp: "",
    formHtml: "",
    text: "Your email client does not support HTML or AMP emails.",
    variables: [],
    isActive: true,
    auditHistory: []
  }
});
