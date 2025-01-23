import { Model, Persistence, ValueEncoder } from "../src";
import { createSqliteAdapter } from "./sqlite-adapter";
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

type ComplexAttrs = {
  id?: string;
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
  createSqliteAdapter({
    dbName: "test_db2",
    tableName: "complex_models",
    primaryKeyField: "id"
  }),
  {
    secretKey: { persist: false },
    metadata: { encoder: jsonEncoder },
    lastUpdated: { encoder: dateEncoder }
  },
  {
    preSave: async (_context, _model) => {
      preSaveCalled = true;
    },
    postSave: async (_context, _model) => {
      postSaveCalled = true;
    },
    postLoad: async (_context, _model) => {
      postLoadCalled = true;
    }
  }
)
class ComplexModel extends Model<ComplexAttrs> { }

describe('Advanced Model Features', () => {
  const dbPath = '/tmp/test_db2.db';

  beforeAll(async () => {
    const adapter = createSqliteAdapter({
      dbName: "test_db2",
      tableName: "complex_models",
      primaryKeyField: "id"
    });
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
    const loaded = await ComplexModel.get(model.get("id"));

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
    const loaded = await ComplexModel.get(model.get("id"));

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
    const loaded = await ComplexModel.get(model.get("id"));

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

    await ComplexModel.get(model.get("id"));
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

    const loaded = await ComplexModel.get(model.get("id"));
    expect(loaded?.get("name")).toBe("Updated Name");
    expect(loaded?.get("metadata")).toEqual({ initial: true });
    expect(preSaveCalled).toBe(true);
    expect(postSaveCalled).toBe(true);
  });

  it('should retrieve all models and handle encoders', async () => {
    const date1 = new Date();
    const date2 = new Date();

    await new ComplexModel({
      name: "Model 1",
      metadata: { type: "test1" },
      secretKey: "secret1",
      lastUpdated: date1
    }).save();

    await new ComplexModel({
      name: "Model 2",
      metadata: { type: "test2" },
      secretKey: "secret2",
      lastUpdated: date2
    }).save();

    const allModels = await ComplexModel.all();
    expect(allModels.length).toBeGreaterThanOrEqual(2);
    expect(allModels[0]?.get("metadata")).toBeInstanceOf(Object);
    expect(allModels[0]?.get("lastUpdated")).toBeInstanceOf(Date);
    expect(postLoadCalled).toBe(true);
  });

  it('should retrieve models by criteria with encoded fields', async () => {
    const date = new Date();
    await new ComplexModel({
      name: "Search Test",
      metadata: { searchKey: "findMe" },
      secretKey: "secret",
      lastUpdated: date
    }).save();

    const foundModel = await ComplexModel.getBy({ name: "Search Test" });
    expect(foundModel).not.toBeNull();
    expect(foundModel?.get("metadata")?.searchKey).toBe("findMe");
    expect(foundModel?.get("lastUpdated").getTime()).toBe(date.getTime());
    expect(postLoadCalled).toBe(true);
  });

  it('should delete a model and handle lifecycle hooks', async () => {
    const model = new ComplexModel({
      name: "Delete Test",
      metadata: { toDelete: true },
      secretKey: "secret123",
      lastUpdated: new Date()
    });
    await model.save();
    const id = model.get("id");

    // Verify model exists
    let loadedModel = await ComplexModel.get(id);
    expect(loadedModel).not.toBeNull();

    // Delete the model
    const success = await model.del();
    expect(success).toBe(true);

    // Verify model no longer exists
    loadedModel = await ComplexModel.get(id);
    expect(loadedModel).toBeNull();
  });
});
