import { ModelAttributes, PersistenceInfo, WithId, WithOptionalId } from "./types";

/**
 * Base class for all models. Set persistence information using the `Persistence` decorator.
 */
export class Model<T extends ModelAttributes> {
  protected static persistence: PersistenceInfo<Model<any>>;
  protected data: T = {} as T;
  protected changedFields: Set<string> = new Set();
  protected _persisted: boolean;
  public id?: any;

  /**
   * Get the persistence information for this model class.
   *
   * @returns The persistence information configured for this model.
   */
  public static getPersistence<T extends ModelAttributes>() {
    return this.persistence as PersistenceInfo<Model<T>>;
  }

  /**
   * Check if the model has been persisted to the database.
   *
   * @returns True if the model has been persisted, false otherwise.
   */
  get persisted() {
    return this._persisted;
  }

  /**
   * Get the fields that have been changed.
   *
   * @returns An array of the keys of the changed fields.
   */
  public getChangedFields(): (keyof T)[] {
    return Array.from(this.changedFields) as (keyof T)[];
  }

  /**
   * Clear the list of changed fields.
   */
  public clearChangedFields() {
    this.changedFields.clear();
  }

  /**
   * Manually mark a field as changed.
   *
   * @param field - The key of the field to mark as changed.
   */
  public markChanged(field: keyof T) {
    this.changedFields.add(String(field));
  }

  /**
   * Manually mark a field as unchanged.
   *
   * @param field - The key of the field to mark as unchanged.
   */
  public markUnchanged(field: keyof T) {
    this.changedFields.delete(String(field));
  }

  /**
   * Constructor for the model.
   *
   * @param data - The data to initialize the model with.
   * @param persisted - Whether the model is already persisted to the database.
   */
  constructor(data: WithOptionalId<T>, persisted: boolean = false) {
    // TODO: generate ID using context
    this.id = data.id;
    const { id, ...rest } = data;
    if (persisted) {
      this.data = rest as T;
      this._persisted = true;
    } else {
      this.set(rest as T);
      this._persisted = false;
    }
  }

  /**
   * Set a field on the model and mark it as changed. Alternatively, you can pass a partial object
   * to set multiple fields at once.
   *
   * @param keyOrChanges - The key of the field to set, or a partial object of fields to set.
   * @param value - The value to set the field to, if setting a single field. Ignored otherwise.
   * @returns The model instance.
   */
  public set<K extends keyof T>(key: K, value: T[K]): Model<T>;
  public set(changes: Partial<T>): Model<T>;
  public set<K extends keyof T>(keyOrChanges: K | Partial<T>, value?: T[K]): Model<T> {
    if (typeof keyOrChanges === "string") {
      this.data[keyOrChanges as K] = value as T[K];
      this.changedFields.add(keyOrChanges);
    } else {
      this.data = { ...this.data, ...keyOrChanges as Partial<T> };
      for (let key in keyOrChanges as Partial<T>) {
        this.changedFields.add(key);
      }
    }

    return this;
  }

  /**
   * Set a field on the model without marking it as changed. Alternatively, you can pass a partial object
   * to set multiple fields at once.
   *
   * @param keyOrChanges - The key of the field to set, or a partial object of fields to set.
   * @param value - The value to set the field to, if setting a single field. Ignored otherwise.
   * @returns The model instance.
   */
  public put<K extends keyof T>(key: K, value: T[K]): Model<T>;
  public put(changes: Partial<T>): Model<T>;
  public put<K extends keyof T>(keyOrChanges: K | Partial<T>, value?: T[K]): Model<T> {
    if (typeof keyOrChanges === "string") {
      this.data[keyOrChanges as K] = value as T[K];
    } else {
      this.data = { ...this.data, ...keyOrChanges as Partial<T> };
    }

    return this;
  }

  /**
   * Get a field from the model.
   *
   * @param key - The key of the field to get.
   * @returns The value of the field.
   */
  public get<K extends keyof T>(key: K): T[K] {
    return this.data[key];
  }

  /**
   * Retrieve all models from the database that match the given criteria.
   *
   * @param matchOrQuery - Optional partial object to match against or SQL query string.
   * @param bindValues - Optional array of values to bind to the query if using a SQL string.
   * @returns A promise that resolves to an array of matching models.
   */
  public static async all<T extends ModelAttributes, M extends Model<T>>(
    this: new (...args: any[]) => M & Model<T>,
    matchOrQuery?: Partial<T> | string,
    bindValues?: any[]
  ): Promise<M[]> {
    const { adapter, globalSpec } = (this as unknown as typeof Model<T>).getPersistence();
    const context = await adapter.getContext();
    const rows = await adapter.all(context, matchOrQuery, bindValues);
    let models = rows.map(row => (this as any).fromRow(row)) as M[];
    if (globalSpec?.postLoad) {
      const promises = models.map<Promise<M>>(model => globalSpec?.postLoad?.(context, model as any) as Promise<M>);
      models = await Promise.all(promises);
    }
    return models as M[];
  }

  /**
   * Load a model from the database.
   *
   * @param id - The ID of the model to load.
   * @returns A promise that resolves to the loaded model, or null if it doesn't exist.
   */
  public static async get<T extends ModelAttributes, M extends Model<T>>(
    this: new (...args: any[]) => M & Model<T>,
    id: any
  ): Promise<M | null> {
    const { adapter, globalSpec } = (this as unknown as typeof Model<T>).getPersistence();
    const context = await adapter.getContext();
    const row = await adapter.get(context, id);
    if (!row) return null;
    let model = (this as any).fromRow(row) as M;
    if (globalSpec?.postLoad) {
      model = await globalSpec.postLoad(context, model as any) as M;
    }
    return model;
  }

  /**
   * Retrieve a single model from the database that matches the given criteria.
   *
   * @param matchOrQuery - Partial object to match against or SQL query string.
   * @param bindValues - Optional array of values to bind to the query if using a SQL string.
   * @returns A promise that resolves to the matching model, or null if none found.
   */
  public static async getBy<T extends ModelAttributes, M extends Model<T>>(
    this: new (...args: any[]) => M & Model<T>,
    matchOrQuery?: Partial<T> | string,
    bindValues?: any[]
  ): Promise<M | null> {
    const { adapter, globalSpec } = (this as unknown as typeof Model<T>).getPersistence();
    const context = await adapter.getContext();
    const row = await adapter.getBy(context, matchOrQuery as any, bindValues);
    if (!row) return null;
    let model = (this as any).fromRow(row) as M;
    if (globalSpec?.postLoad) {
      model = await globalSpec.postLoad(context, model as any) as M;
    }
    return model;
  }

  /**
   * Create a model from a database row.
   *
   * @param row - The row to create the model from.
   * @returns The created model.
   */
  protected static fromRow<T extends ModelAttributes, M extends Model<T>>(
    this: new (...args: any[]) => Model<T>,
    row: WithId<T>
  ): M {
    const { fieldSpecs } = (this as unknown as typeof Model<T>).getPersistence();
    const data = {} as any;
    for (const key in row) {
      const fieldSpec = fieldSpecs?.[key];
      if (fieldSpec?.persist !== false) {
        const value = row[key];
        data[key] = fieldSpec?.encoder ? fieldSpec.encoder.decode(value) : value;
      }
    }

    return new this(data, true) as M;
  }

  /**
   * Save the model to the database.
   *
   * @returns A promise that resolves to the model instance.
   */
  public async save(): Promise<this> {
    const { adapter, fieldSpecs, globalSpec } = (this.constructor as any).getPersistence() as PersistenceInfo<Model<T>>;
    const fields = this.getChangedFields().filter(field => fieldSpecs?.[field]?.persist !== false);

    if (this.persisted && fields.length === 0) return this;

    const context = await adapter.getContext();

    if (globalSpec?.preSave) {
      await globalSpec.preSave(context, this);
    }

    const data: Partial<T> = {};
    for (const field of fields) {
      const value = this.get(field);
      const encoder = fieldSpecs?.[field]?.encoder;
      data[field] = encoder ? encoder.encode(value) : value;
    }

    if (this.persisted) {
      const { success } = await adapter.update(context, this, data);
      if (!success) throw new Error("Failed to save model to database");
    } else {
      const { success, id } = await adapter.insert(context, this, data);
      if (!success) throw new Error("Failed to save model to database");
      this.id = id;
    }

    this._persisted = true;
    this.clearChangedFields();

    if (globalSpec?.postSave) {
      globalSpec.postSave(context, this);
    }
    return this;
  }

  /**
   * Delete the model from the database.
   *
   * @returns A promise that resolves to true if the deletion was successful, false otherwise.
   */
  public async del(): Promise<boolean> {
    const { adapter } = (this.constructor as any).persistence;
    const context = await adapter.getContext();
    return adapter.del(context, this);
  }
}
