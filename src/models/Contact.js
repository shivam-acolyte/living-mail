import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "contacts",
  jsonFields: ["custom_fields"],
  arrayFields: ["tags"],
  defaults: {
    tags: [],
    customFields: {},
    status: "subscribed",
    source: "manual"
  }
});
