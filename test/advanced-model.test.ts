import { Model, Persistence, ValueEncoder } from "../src";
import { createSqliteAdapter } from "./sqlite-adapter";
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

interface ComplexAttrs {
  name: string;
  metadata: Record<string, any>;
  secretKey: string;
  lastUpdated: Date;
}

// JSON encoder for metadata field
const jsonEncoder: ValueEncoder<Record<string, any>, string> = {
  encode: (value) => JSON.stringify(value),
  decode: (value) => JSON.parse(value)
};

// Date encoder for lastUpdated field
const dateEncoder: ValueEncoder<Date, string> = {
  encode: (value) => value.toISOString(),
  decode: (value) => new Date(value)
};

let preSaveCalled = false;
let postSaveCalled = false;
let postLoadCalled = false;

@Persistence(
  createSqliteAdapter("test_db", "complex_models"),
  {
    secretKey: { persist: false },
    metadata: { encoder: jsonEncoder },
    lastUpdated: { encoder: dateEncoder }
  },
  {
    preSave: async (context, model) => {
      preSaveCalled = true;
      return model;
    },
    postSave: async (context, model) => {
      postSaveCalled = true;
      return model;
    },
    postLoad: async (context, model) => {
      postLoadCalled = true;
      return model;
    }
  }
)
class ComplexModel extends Model<ComplexAttrs> { }

describe('Advanced Model Features', () => {
  const dbPath = '/tmp/test_db.db';

  beforeAll(async () => {
    const adapter = createSqliteAdapter("test_db", "complex_models");
    const ctx = await adapter.getContext();
    await ctx.db.run(
      "CREATE TABLE IF NOT EXISTS complex_models (id TEXT PRIMARY KEY, name TEXT, metadata TEXT, last_updated TEXT)"
    );
  });

  afterAll(async () => {
    if (existsSync(dbPath)) {
      await unlink(dbPath);
    }
  });

  beforeEach(() => {
    preSaveCalled = false;
    postSaveCalled = false;
    postLoadCalled = false;
  });

  it('should handle non-persisted fields', async () => {
    const model = new ComplexModel({
      name: "Test Model",
      metadata: { foo: "bar" },
      secretKey: "secret123",
      lastUpdated: new Date()
    });

    await model.save();
    const loaded = await ComplexModel.get(model.id);

    expect(loaded?.get("secretKey")).toBeUndefined();
    expect(loaded?.get("name")).toBe("Test Model");
  });

  it('should encode and decode JSON fields', async () => {
    const metadata = { foo: "bar", num: 123, nested: { test: true } };
    const model = new ComplexModel({
      name: "JSON Test",
      metadata,
      secretKey: "secret123",
      lastUpdated: new Date()
    });

    await model.save();
    const loaded = await ComplexModel.get(model.id);

    expect(loaded?.get("metadata")).toEqual(metadata);
  });

  it('should encode and decode Date fields', async () => {
    const date = new Date();
    const model = new ComplexModel({
      name: "Date Test",
      metadata: {},
      secretKey: "secret123",
      lastUpdated: date
    });

    await model.save();
    const loaded = await ComplexModel.get(model.id);

    expect(loaded?.get("lastUpdated")).toBeInstanceOf(Date);
    expect(loaded?.get("lastUpdated").getTime()).toBe(date.getTime());
  });

  it('should call lifecycle hooks', async () => {
    const model = new ComplexModel({
      name: "Hooks Test",
      metadata: {},
      secretKey: "secret123",
      lastUpdated: new Date()
    });

    await model.save();
    expect(preSaveCalled).toBe(true);
    expect(postSaveCalled).toBe(true);

    await ComplexModel.get(model.id);
    expect(postLoadCalled).toBe(true);
  });

  it('should only encode changed fields on update', async () => {
    const model = new ComplexModel({
      name: "Update Test",
      metadata: { initial: true },
      secretKey: "secret123",
      lastUpdated: new Date()
    });

    await model.save();

    // Reset the hook flags
    preSaveCalled = false;
    postSaveCalled = false;

    // Update only the name
    model.set("name", "Updated Name");
    await model.save();

    const loaded = await ComplexModel.get(model.id);
    expect(loaded?.get("name")).toBe("Updated Name");
    expect(loaded?.get("metadata")).toEqual({ initial: true });
    expect(preSaveCalled).toBe(true);
    expect(postSaveCalled).toBe(true);
  });
});