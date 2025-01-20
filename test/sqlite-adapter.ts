import { AdapterConfig, Model, ModelAttributes, WithId } from "../src";
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

export function createSqliteAdapter<T extends ModelAttributes>(dbName: string, tableName: string): AdapterConfig<T> {
  let ctx: Context | null = null;

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
    let res = await context.db.all<WithId<T>[]>(`SELECT * FROM ${tableName} ${whereClause}`, bindValues);
    return res.map(row => convertRowToCamelCase<WithId<T>>(row));
  }

  async function get(context: Context, id: any) {
    const res = await context.db.get<WithId<T>>(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
    return res ? convertRowToCamelCase<WithId<T>>(res) : null;
  }

  async function getBy(context: Context, matchOrQuery: Partial<T> | string, bindValues?: any[]) {
    const res = await all(context, matchOrQuery, bindValues);
    if (res.length > 1) throw new Error("getBy returned multiple results");
    return res[0] || null;
  }

  async function insert(context: Context, data: Partial<T>) {
    const id = generateId();
    const fields = Object.keys(data);
    const snakeCaseFields = fields.map(camelCaseToSnakeCase);
    const query = `INSERT INTO ${tableName} (id, ${snakeCaseFields.join(", ")}) VALUES (?, ${fields.map(() => "?").join(", ")})`;
    const bindValues = [id, ...fields.map(field => data[field as keyof T])];
    const res = await context.db.run(query, bindValues);
    return { success: !!(res.lastID !== undefined), inserted: true, rows: res.changes || 0, id };
  }

  async function update(context: Context, model: Model<T>, data: Partial<T>) {
    const id = model.id;
    const fields = Object.keys(data);
    const query = `UPDATE ${tableName} SET ${fields.map((field) => `${camelCaseToSnakeCase(String(field))} = ?`).join(", ")} WHERE id = ?`;
    const bindValues = [...fields.map(field => data[field as keyof T]), id];
    const res = await context.db.run(query, bindValues);
    return { success: !!(res.changes && res.changes > 0), inserted: false, rows: res.changes || 0, id };
  }

  async function del(context: Context, model: Model<T>) {
    const id = model.id;
    const res = await context.db.run(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
    return !!(res.changes && res.changes > 0);
  }

  return { getContext, all, get, getBy, insert, update, del }
}
