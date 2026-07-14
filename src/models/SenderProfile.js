import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "sender_profiles",
  jsonFields: [],
  defaults: {
    isActive: false
  }
});
