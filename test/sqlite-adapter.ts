import { AdapterConfig, Model } from "../src";
import * as sqlite3 from "sqlite3";
import { Database, open } from "sqlite";

type Context = {
  dbName: string;
  tableName: string;
  db: Database<sqlite3.Database, sqlite3.Statement>;
}

function generateId() {
  return crypto.randomUUID();
}

export function createSqliteAdapter<T>(dbName: string, tableName: string): AdapterConfig<Context, T> {
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

  async function getFromDb(context: Context, id: any) {
    const res = await context.db.get<T & { id: string }>(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
    return res || null;
  }

  async function saveToDb(context: Context, model: Model<T, Context>, data: Partial<T>) {
    let id: string;
    let query: string;
    let bindValues: any[];
    const fields = Object.keys(data);

    if (model.persisted) {
      id = model.id;
      query = `UPDATE ${tableName} SET ${fields.map((field) => `${String(field)} = ?`).join(", ")} WHERE id = ?`;
      bindValues = [...fields.map(field => data[field as keyof T]), id]
    } else {
      id = model.id || generateId();
      query = `INSERT INTO ${tableName} (id, ${fields.join(", ")}) VALUES (?, ${fields.map(() => "?").join(", ")})`;
      bindValues = [id, ...fields.map(field => data[field as keyof T])]
    }

    const res = await context.db.run(query, bindValues);
    return { success: true, inserted: !model.persisted, id: id };
  }

  return { getContext, getFromDb, saveToDb }
}
