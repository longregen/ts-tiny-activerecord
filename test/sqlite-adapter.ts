import { AdapterConfig, Model, ModelAttributes } from "../src/index";
import * as sqlite3 from "sqlite3";
import { Database, open } from "sqlite";

function camelCaseToSnakeCase(str: string) {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

function snakeCaseToCamelCase(str: string) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertRowToCamelCase<T>(row: any): T {
  if (!row) return row;
  const converted: any = {};
  for (const [key, value] of Object.entries(row)) {
    converted[snakeCaseToCamelCase(key)] = value;
  }
  return converted;
}

type Context = {
  dbName: string;
  tableName: string;
  db: Database<sqlite3.Database, sqlite3.Statement>;
}

function generateId() {
  return crypto.randomUUID();
}

type SqliteAdapterConfig = {
  dbName: string;
  tableName: string;
  primaryKeyField: string;
}

export function createSqliteAdapter<T extends ModelAttributes>(config: SqliteAdapterConfig): AdapterConfig<T> {
  const { dbName, tableName, primaryKeyField } = config;
  let ctx: Context | null = null;

  function getPrimaryKeyField() {
    return primaryKeyField;
  }

  async function getContext() {
    if (ctx) return ctx;
    const db = await open({
      filename: `/tmp/${dbName}.db`,
      driver: sqlite3.cached.Database,
    });
    ctx = { dbName, tableName, db };
    return ctx;
  }

  async function all(context: Context, matchOrQuery?: Partial<T> | string, bindValues?: any[]) {
    let whereClause: string;
    if (matchOrQuery === undefined) {
      whereClause = "";
    } else if (typeof matchOrQuery === "string") {
      whereClause = matchOrQuery;
    } else {
      whereClause = "WHERE " + Object.keys(matchOrQuery)
        .map((key) => `${camelCaseToSnakeCase(key)} = ?`)
        .join(" AND ");
      bindValues = Object.values(matchOrQuery);
    }
    let res = await context.db.all<T[]>(`SELECT * FROM ${tableName} ${whereClause}`, bindValues);
    return res.map((row: T) => convertRowToCamelCase<T>(row));
  }

  async function get(context: Context, primaryKey: any) {
    const res = await context.db.get<T>(`SELECT * FROM ${tableName} WHERE ${primaryKeyField} = $1`, [primaryKey]);
    return res ? convertRowToCamelCase<T>(res) : null;
  }

  async function getBy(context: Context, matchOrQuery: Partial<T> | string, bindValues?: any[]) {
    const res = await all(context, matchOrQuery, bindValues);
    if (res.length > 1) throw new Error("getBy returned multiple results");
    return res[0] || null;
  }

  async function insert(context: Context, model: Model<T>, data: Partial<T>) {
    const primaryKey = generateId();
    const fields = Object.keys(data);
    const snakeCaseFields = fields.map(camelCaseToSnakeCase);
    const query = `INSERT INTO ${tableName} (${primaryKeyField}, ${snakeCaseFields.join(", ")}) VALUES (?, ${fields.map(() => "?").join(", ")})`;
    const rest = Object.keys(data).filter(field => field !== primaryKeyField);
    const bindValues = [primaryKey, ...rest.map(field => data[field as keyof T])];
    const res = await context.db.run(query, bindValues);
    const result = { success: !!(res.lastID !== undefined), inserted: true, rows: res.changes || 0, primaryKey };
    if (result.success) {
      model.put(primaryKeyField, primaryKey as any);
    }
    return result;
  }

  async function update(context: Context, model: Model<T>, data: Partial<T>) {
    const primaryKey = model.get(primaryKeyField);
    const fields = Object.keys(data).filter(field => field !== primaryKeyField);
    const snakeCaseFields = fields.map(camelCaseToSnakeCase);
    const query = `UPDATE ${tableName} SET ${snakeCaseFields.map((field) => `${field} = ?`).join(", ")} WHERE ${primaryKeyField} = ?`;
    const bindValues = [...fields.map(field => data[field as keyof T]), primaryKey];
    const res = await context.db.run(query, bindValues);
    return { success: !!(res.changes && res.changes > 0), inserted: false, rows: res.changes || 0, primaryKey };
  }

  async function del(context: Context, model: Model<T>) {
    const primaryKey = model.get(primaryKeyField);
    const res = await context.db.run(`DELETE FROM ${tableName} WHERE ${primaryKeyField} = ?`, [primaryKey]);
    return !!(res.changes && res.changes > 0);
  }

  return { getPrimaryKeyField, getContext, all, get, getBy, insert, update, del }
}
