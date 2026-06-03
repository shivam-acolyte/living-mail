import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "template_versions",
  jsonFields: ["source_json"],
  arrayFields: ["variables"],
  defaults: {
    sourceJson: null,
    amp: "",
    formHtml: "",
    text: "",
    variables: []
  }
});
