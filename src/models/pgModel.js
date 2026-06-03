import { postgres } from "../config/postgres.js";

const isPlainObject = (value) => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof RegExp);
};

const toSnake = (value) => {
  return String(value).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

const toCamel = (value) => {
  return String(value).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

const clone = (value) => {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
};

const normalizeValue = (value) => {
  if (value instanceof Date) {
    return value;
  }

  if (value instanceof RegExp) {
    return value;
  }

  return value;
};

const getPath = (row, path) => {
  const normalizedPath = String(path || "").replace(/^\$/, "");
  return normalizedPath.split(".").reduce((value, key) => value?.[key], row);
};

const setPath = (row, path, value) => {
  row[path] = value;
};

const formatDate = (dateValue, format) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (value) => String(value).padStart(2, "0");
  return format
    .replace("%Y", String(date.getUTCFullYear()))
    .replace("%m", pad(date.getUTCMonth() + 1))
    .replace("%d", pad(date.getUTCDate()))
    .replace("%H", pad(date.getUTCHours()));
};

const getIsoWeek = (dateValue) => {
  const date = new Date(dateValue);
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
};

const getIsoWeekYear = (dateValue) => {
  const date = new Date(dateValue);
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  return utcDate.getUTCFullYear();
};

const evaluateExpression = (expression, row) => {
  if (typeof expression === "string") {
    return expression.startsWith("$") ? getPath(row, expression) : expression;
  }

  if (!isPlainObject(expression)) {
    return expression;
  }

  if (expression.$size !== undefined) {
    return (evaluateExpression(expression.$size, row) || []).length;
  }

  if (expression.$ifNull) {
    const [valueExpression, fallback] = expression.$ifNull;
    const value = evaluateExpression(valueExpression, row);
    return value === null || value === undefined || value === "" ? fallback : value;
  }

  if (expression.$objectToArray) {
    const value = evaluateExpression(expression.$objectToArray, row) || {};
    return Object.entries(value).map(([key, itemValue]) => ({
      k: key,
      v: itemValue
    }));
  }

  if (expression.$slice) {
    const [arrayExpression, count] = expression.$slice;
    return (evaluateExpression(arrayExpression, row) || []).slice(0, count);
  }

  if (expression.$literal !== undefined) {
    return expression.$literal;
  }

  if (expression.$max) {
    return Math.max(...expression.$max.map((item) => Number(evaluateExpression(item, row)) || 0));
  }

  if (expression.$subtract) {
    const [left, right] = expression.$subtract;
    return (Number(evaluateExpression(left, row)) || 0) - (Number(evaluateExpression(right, row)) || 0);
  }

  if (expression.$round) {
    const [valueExpression, places = 0] = expression.$round;
    const factor = 10 ** places;
    return Math.round((Number(evaluateExpression(valueExpression, row)) || 0) * factor) / factor;
  }

  if (expression.$multiply) {
    return expression.$multiply.reduce((total, item) => total * (Number(evaluateExpression(item, row)) || 0), 1);
  }

  if (expression.$divide) {
    const [left, right] = expression.$divide;
    const divisor = Number(evaluateExpression(right, row)) || 0;
    return divisor ? (Number(evaluateExpression(left, row)) || 0) / divisor : 0;
  }

  if (expression.$add) {
    return expression.$add.reduce((total, item) => total + (Number(evaluateExpression(item, row)) || 0), 0);
  }

  if (expression.$cond) {
    const [condition, pass, fail] = expression.$cond;
    return evaluateExpression(condition, row) ? evaluateExpression(pass, row) : evaluateExpression(fail, row);
  }

  if (expression.$eq) {
    const [left, right] = expression.$eq;
    return evaluateExpression(left, row) === evaluateExpression(right, row);
  }

  if (expression.$toString) {
    return String(evaluateExpression(expression.$toString, row));
  }

  if (expression.$isoWeek) {
    return getIsoWeek(evaluateExpression(expression.$isoWeek, row));
  }

  if (expression.$isoWeekYear) {
    return getIsoWeekYear(evaluateExpression(expression.$isoWeekYear, row));
  }

  if (expression.$dateToString) {
    return formatDate(evaluateExpression(expression.$dateToString.date, row), expression.$dateToString.format);
  }

  if (expression.$concat) {
    return expression.$concat.map((item) => evaluateExpression(item, row)).join("");
  }

  return Object.fromEntries(
    Object.entries(expression).map(([key, value]) => [key, evaluateExpression(value, row)])
  );
};

const groupKey = (value) => JSON.stringify(value);

const sortRows = (rows, sortSpec) => {
  const entries = Object.entries(sortSpec || {});

  return [...rows].sort((left, right) => {
    for (const [field, direction] of entries) {
      const leftValue = getPath(left, field);
      const rightValue = getPath(right, field);

      if (leftValue < rightValue) {
        return Number(direction) < 0 ? 1 : -1;
      }

      if (leftValue > rightValue) {
        return Number(direction) < 0 ? -1 : 1;
      }
    }

    return 0;
  });
};

const matchesCondition = (value, condition) => {
  if (condition instanceof RegExp) {
    return condition.test(String(value || ""));
  }

  if (isPlainObject(condition)) {
    return Object.entries(condition).every(([operator, expected]) => {
      if (operator === "$in") {
        return expected.includes(value);
      }

      if (operator === "$gte") {
        return new Date(value) >= new Date(expected);
      }

      if (operator === "$lte") {
        return new Date(value) <= new Date(expected);
      }

      if (operator === "$gt") {
        return value > expected;
      }

      if (operator === "$lt") {
        return value < expected;
      }

      if (operator === "$regex") {
        return new RegExp(expected, condition.$options || "").test(String(value || ""));
      }

      if (operator === "$exists") {
        return expected ? value !== undefined && value !== null : value === undefined || value === null;
      }

      return true;
    });
  }

  return value === condition;
};

const rowMatches = (row, query = {}) => {
  return Object.entries(query || {}).every(([field, condition]) => {
    if (field === "$or") {
      return condition.some((item) => rowMatches(row, item));
    }

    return matchesCondition(getPath(row, field), condition);
  });
};

const createDuplicateKeyError = (error) => {
  if (error?.code !== "23505") {
    return error;
  }

  error.code = 11000;
  return error;
};

const makeDocument = (model, row) => {
  if (!row) {
    return null;
  }

  const doc = {};

  for (const [key, value] of Object.entries(row)) {
    const camelKey = toCamel(key);
    doc[camelKey] = value;
  }

  doc._id = doc.id;

  Object.defineProperty(doc, "lean", {
    enumerable: false,
    value: () => doc
  });

  Object.defineProperty(doc, "save", {
    enumerable: false,
    value: async () => model.findByIdAndUpdate(doc._id, doc, { returnDocument: "after" })
  });

  return doc;
};

class PgQuery {
  constructor(executor) {
    this.executor = executor;
    this.sortValue = null;
    this.limitValue = null;
    this.skipValue = null;
    this.selectValue = null;
  }

  sort(value) {
    this.sortValue = value;
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  skip(value) {
    this.skipValue = value;
    return this;
  }

  select(value) {
    this.selectValue = value;
    return this;
  }

  lean() {
    return this;
  }

  then(resolve, reject) {
    return this.executor(this).then(resolve, reject);
  }

  catch(reject) {
    return this.executor(this).catch(reject);
  }

  finally(handler) {
    return this.executor(this).finally(handler);
  }
}

export class PgModel {
  constructor({ table, fields = {}, jsonFields = [], arrayFields = [], defaults = {} }) {
    this.table = table;
    this.fields = fields;
    this.jsonFields = new Set(jsonFields);
    this.arrayFields = new Set(arrayFields);
    this.defaults = defaults;
  }

  column(field) {
    if (field === "_id") {
      return "id";
    }

    return this.fields[field] || toSnake(field);
  }

  mapRow(row) {
    return makeDocument(this, row);
  }

  mapRows(rows) {
    return rows.map((row) => this.mapRow(row));
  }

  assertConfigured() {
    if (!postgres) {
      throw new Error("PostgreSQL is not configured. Set POSTGRES_URL or DATABASE_URL.");
    }
  }

  valueForColumn(column, value) {
    if (this.jsonFields.has(column)) {
      return JSON.stringify(value ?? {});
    }

    return normalizeValue(value);
  }

  buildJsonPath(field) {
    const [root, ...path] = field.split(".");

    if (!path.length) {
      return null;
    }

    const column = this.column(root);

    if (!this.jsonFields.has(column)) {
      return null;
    }

    return {
      column,
      path
    };
  }

  addCondition(parts, values, field, condition) {
    if (field === "$or") {
      const orParts = condition.map((item) => {
        const nested = this.buildWhere(item, values);
        return nested.sql ? `(${nested.sql})` : "";
      }).filter(Boolean);

      if (orParts.length) {
        parts.push(`(${orParts.join(" OR ")})`);
      }

      return;
    }

    const jsonPath = this.buildJsonPath(field);
    const column = jsonPath ? null : this.column(field);
    const isArrayField = column && this.arrayFields.has(column);
    const sqlField = jsonPath
      ? `${jsonPath.column}#>>'{${jsonPath.path.join(",")}}'`
      : isArrayField
        ? `array_to_string(${column}, ',')`
        : column;

    if (condition instanceof RegExp) {
      values.push(condition.source);
      parts.push(`${sqlField} ~* $${values.length}`);
      return;
    }

    if (isPlainObject(condition)) {
      for (const [operator, rawValue] of Object.entries(condition)) {
        if (operator === "$in") {
          values.push(rawValue);
          if (isArrayField) {
            parts.push(`${column} && $${values.length}::text[]`);
          } else {
            parts.push(`${sqlField}::text = ANY($${values.length})`);
          }
        } else if (operator === "$all") {
          values.push(rawValue);
          parts.push(`${column} @> $${values.length}::text[]`);
        } else if (operator === "$gte") {
          values.push(rawValue);
          parts.push(`${sqlField} >= $${values.length}`);
        } else if (operator === "$lte") {
          values.push(rawValue);
          parts.push(`${sqlField} <= $${values.length}`);
        } else if (operator === "$lt") {
          values.push(rawValue);
          parts.push(`${sqlField} < $${values.length}`);
        } else if (operator === "$gt") {
          values.push(rawValue);
          parts.push(`${sqlField} > $${values.length}`);
        } else if (operator === "$regex") {
          values.push(rawValue);
          parts.push(`${sqlField} ~* $${values.length}`);
        } else if (operator === "$exists") {
          parts.push(rawValue ? `${sqlField} IS NOT NULL` : `${sqlField} IS NULL`);
        }
      }
      return;
    }

    if (condition === null) {
      parts.push(`${sqlField} IS NULL`);
      return;
    }

    if (isArrayField) {
      values.push(condition);
      parts.push(`$${values.length} = ANY(${column})`);
      return;
    }

    values.push(this.valueForColumn(column, condition));
    parts.push(`${sqlField} = $${values.length}`);
  }

  buildWhere(query = {}, values = []) {
    const parts = [];

    for (const [field, condition] of Object.entries(query || {})) {
      this.addCondition(parts, values, field, condition);
    }

    return {
      sql: parts.join(" AND "),
      values
    };
  }

  buildOrder(sortValue) {
    if (!sortValue) {
      return "";
    }

    const entries = Object.entries(sortValue);

    if (!entries.length) {
      return "";
    }

    return ` ORDER BY ${entries.map(([field, direction]) => {
      return `${this.column(field)} ${Number(direction) < 0 ? "DESC" : "ASC"}`;
    }).join(", ")}`;
  }

  buildSelect(selectValue) {
    if (!selectValue) {
      return "*";
    }

    if (typeof selectValue === "string" && selectValue.trim().startsWith("-")) {
      return "*";
    }

    const fields = String(selectValue)
      .split(/\s+/)
      .map((field) => field.trim())
      .filter(Boolean)
      .filter((field) => !field.startsWith("-"))
      .map((field) => this.column(field));

    return fields.length ? fields.join(", ") : "*";
  }

  find(query = {}) {
    return new PgQuery(async (options) => {
      this.assertConfigured();
      const values = [];
      const where = this.buildWhere(query, values);
      const sql = [
        `SELECT ${this.buildSelect(options.selectValue)} FROM ${this.table}`,
        where.sql ? `WHERE ${where.sql}` : "",
        this.buildOrder(options.sortValue),
        options.limitValue ? ` LIMIT ${Number(options.limitValue)}` : "",
        options.skipValue ? ` OFFSET ${Number(options.skipValue)}` : ""
      ].join(" ");
      const result = await postgres.query(sql, values);
      return this.mapRows(result.rows);
    });
  }

  findOne(query = {}) {
    return new PgQuery(async (options) => {
      const rows = await this.find(query)
        .sort(options.sortValue)
        .limit(1);
      return rows[0] || null;
    });
  }

  findById(id) {
    return this.findOne({ _id: id });
  }

  async create(data) {
    this.assertConfigured();
    const payload = {
      ...clone(this.defaults),
      ...clone(data),
      createdAt: data?.createdAt || new Date(),
      updatedAt: data?.updatedAt || new Date()
    };
    const entries = Object.entries(payload)
      .filter(([key, value]) => value !== undefined && key !== "_id" && key !== "id");
    const columns = entries.map(([key]) => this.column(key));
    const values = entries.map(([key, value]) => this.valueForColumn(this.column(key), value));
    const placeholders = values.map((_, index) => `$${index + 1}`);

    try {
      const result = await postgres.query(
        `INSERT INTO ${this.table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
        values
      );
      return this.mapRow(result.rows[0]);
    } catch (error) {
      throw createDuplicateKeyError(error);
    }
  }

  async insertMany(items = []) {
    const inserted = [];

    for (const item of items) {
      inserted.push(await this.create(item));
    }

    return inserted;
  }

  normalizeUpdate(update = {}) {
    const hasOperators = Object.keys(update).some((key) => key.startsWith("$"));

    if (hasOperators) {
      return update;
    }

    return {
      $set: update
    };
  }

  async updateMany(query = {}, update = {}) {
    this.assertConfigured();
    const normalized = this.normalizeUpdate(update);
    const values = [];
    const setParts = [];

    for (const [field, value] of Object.entries(normalized.$set || {})) {
      const column = this.column(field);
      values.push(this.valueForColumn(column, value));
      setParts.push(`${column} = $${values.length}`);
    }

    for (const [field, value] of Object.entries(normalized.$inc || {})) {
      const column = this.column(field);
      values.push(Number(value) || 0);
      setParts.push(`${column} = COALESCE(${column}, 0) + $${values.length}`);
    }

    for (const field of Object.keys(normalized.$unset || {})) {
      setParts.push(`${this.column(field)} = NULL`);
    }

    for (const [field, value] of Object.entries(normalized.$addToSet || {})) {
      const column = this.column(field);
      const valuesToAdd = value?.$each || [value];
      values.push(valuesToAdd);
      setParts.push(`${column} = ARRAY(SELECT DISTINCT unnest(COALESCE(${column}, '{}') || $${values.length}::text[]))`);
    }

    for (const [field, value] of Object.entries(normalized.$push || {})) {
      const column = this.column(field);
      values.push(JSON.stringify(value));
      setParts.push(`${column} = COALESCE(${column}, '[]'::jsonb) || $${values.length}::jsonb`);
    }

    setParts.push(`updated_at = now()`);
    const where = this.buildWhere(query, values);
    const result = await postgres.query(
      `UPDATE ${this.table} SET ${setParts.join(", ")} ${where.sql ? `WHERE ${where.sql}` : ""}`,
      values
    );

    return {
      matchedCount: result.rowCount,
      modifiedCount: result.rowCount
    };
  }

  async findOneAndUpdate(query = {}, update = {}, options = {}) {
    this.assertConfigured();
    const existing = await this.findOne(query);

    if (!existing && options.upsert) {
      const normalized = this.normalizeUpdate(update);
      const addToSetData = Object.fromEntries(
        Object.entries(normalized.$addToSet || {}).map(([field, value]) => [
          field,
          value?.$each || [value]
        ])
      );
      const incData = Object.fromEntries(
        Object.entries(normalized.$inc || {}).map(([field, value]) => [field, value])
      );

      return this.create({
        ...query,
        ...(normalized.$set || {}),
        ...addToSetData,
        ...incData
      });
    }

    if (!existing) {
      return null;
    }

    await this.updateMany({ _id: existing._id }, update);
    return this.findOne({ _id: existing._id });
  }

  async findByIdAndUpdate(id, update = {}, options = {}) {
    return this.findOneAndUpdate({ _id: id }, update, options);
  }

  async countDocuments(query = {}) {
    this.assertConfigured();
    const values = [];
    const where = this.buildWhere(query, values);
    const result = await postgres.query(
      `SELECT COUNT(*)::int AS total FROM ${this.table} ${where.sql ? `WHERE ${where.sql}` : ""}`,
      values
    );

    return result.rows[0]?.total || 0;
  }

  async distinct(field, query = {}) {
    this.assertConfigured();
    const values = [];
    const where = this.buildWhere(query, values);
    const column = this.column(field);
    const result = await postgres.query(
      `SELECT DISTINCT ${column} AS value FROM ${this.table} ${where.sql ? `WHERE ${where.sql}` : ""}`,
      values
    );

    return result.rows.map((row) => row.value).filter((value) => value !== null && value !== undefined);
  }

  async aggregate(pipeline = []) {
    this.assertConfigured();
    const matchStage = pipeline.find((stage) => stage.$match)?.$match || {};
    const groupStage = pipeline.find((stage) => stage.$group)?.$group;

    if (groupStage?._id === "$status" || groupStage?._id === "$eventType") {
      const groupColumn = this.column(groupStage._id.slice(1));
      const values = [];
      const where = this.buildWhere(matchStage, values);
      const uniqueExpression = this.table === "tracking_events"
        ? "COUNT(DISTINCT tracking_id)::int AS unique"
        : "COUNT(*)::int AS unique";
      const result = await postgres.query(
        `SELECT ${groupColumn} AS _id, COUNT(*)::int AS total, ${uniqueExpression}
         FROM ${this.table}
         ${where.sql ? `WHERE ${where.sql}` : ""}
         GROUP BY ${groupColumn}`,
        values
      );

      return result.rows.map((row) => ({
        _id: row._id,
        total: row.total,
        unique: row.unique
      }));
    }

    let rows = await this.find(matchStage);
    const remainingStages = pipeline.slice(pipeline.findIndex((stage) => stage.$match) + 1);

    for (const stage of remainingStages) {
      if (stage.$match) {
        rows = rows.filter((row) => rowMatches(row, stage.$match));
      } else if (stage.$project) {
        rows = rows.map((row) => {
          const projected = {};

          for (const [field, expression] of Object.entries(stage.$project)) {
            if (expression === 0) {
              continue;
            }

            if (expression === 1) {
              projected[field] = row[field];
            } else {
              projected[field] = evaluateExpression(expression, row);
            }
          }

          return projected;
        });
      } else if (stage.$unwind) {
        const field = String(stage.$unwind).replace(/^\$/, "");
        rows = rows.flatMap((row) => {
          const items = getPath(row, field) || [];
          return items.map((item) => ({
            ...row,
            [field]: item
          }));
        });
      } else if (stage.$group) {
        const groups = new Map();

        for (const row of rows) {
          const id = evaluateExpression(stage.$group._id, row);
          const key = groupKey(id);

          if (!groups.has(key)) {
            groups.set(key, {
              _id: id
            });
          }

          const target = groups.get(key);

          for (const [field, accumulator] of Object.entries(stage.$group)) {
            if (field === "_id") {
              continue;
            }

            if (accumulator.$sum !== undefined) {
              target[field] = (target[field] || 0) + (Number(evaluateExpression(accumulator.$sum, row)) || 0);
            } else if (accumulator.$addToSet !== undefined) {
              const nextValue = evaluateExpression(accumulator.$addToSet, row);
              const existing = target[field] || [];

              if (!existing.some((value) => groupKey(value) === groupKey(nextValue))) {
                existing.push(nextValue);
              }

              target[field] = existing;
            } else if (accumulator.$push !== undefined) {
              target[field] = [
                ...(target[field] || []),
                evaluateExpression(accumulator.$push, row)
              ];
            } else if (accumulator.$first !== undefined) {
              if (target[field] === undefined) {
                target[field] = evaluateExpression(accumulator.$first, row);
              }
            } else if (accumulator.$min !== undefined) {
              const value = evaluateExpression(accumulator.$min, row);
              target[field] = target[field] === undefined || new Date(value) < new Date(target[field]) ? value : target[field];
            } else if (accumulator.$max !== undefined) {
              const value = evaluateExpression(accumulator.$max, row);
              target[field] = target[field] === undefined || new Date(value) > new Date(target[field]) ? value : target[field];
            }
          }
        }

        rows = [...groups.values()];
      } else if (stage.$addFields) {
        rows = rows.map((row) => ({
          ...row,
          ...Object.fromEntries(
            Object.entries(stage.$addFields).map(([field, expression]) => [field, evaluateExpression(expression, row)])
          )
        }));
      } else if (stage.$sort) {
        rows = sortRows(rows, stage.$sort);
      } else if (stage.$limit) {
        rows = rows.slice(0, stage.$limit);
      }
    }

    return rows;
  }
}
