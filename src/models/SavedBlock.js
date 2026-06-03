import { PgModel } from "./pgModel.js";

export default new PgModel({
  table: "saved_blocks",
  jsonFields: ["block"],
  arrayFields: ["tags"],
  defaults: {
    category: "custom",
    isActive: true,
    usageCount: 0,
    tags: []
  }
});
