import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "contact_lists",
  arrayFields: ["tags", "contact_ids"],
  defaults: {
    tags: [],
    contactIds: [],
    isActive: true
  }
});
