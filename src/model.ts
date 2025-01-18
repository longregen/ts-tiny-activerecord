import { PersistenceInfo } from "./types";

/**
 * Base class for all models. Set persistence information using the `Persistence` decorator.
 */
export class Model<T, C = any> {
  protected static persistence: PersistenceInfo<any, any>;
  protected data: T = {} as T;
  protected changedFields: Set<string> = new Set();
  protected _persisted: boolean;
  public id?: any;

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
  constructor(data: T & { id?: string }, persisted: boolean = false) {
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
  public set<K extends keyof T>(key: K, value: T[K]): Model<T, C>;
  public set(changes: Partial<T>): Model<T, C>;
  public set<K extends keyof T>(keyOrChanges: K | Partial<T>, value?: T[K]): Model<T, C> {
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
  public put<K extends keyof T>(key: K, value: T[K]): Model<T, C>;
  public put(changes: Partial<T>): Model<T, C>;
  public put<K extends keyof T>(keyOrChanges: K | Partial<T>, value?: T[K]): Model<T, C> {
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
   * Load a model from the database.
   * 
   * @param id - The ID of the model to load.
   * @returns A promise that resolves to the loaded model, or null if it doesn't exist.
   */
  public static async load<M extends Model<any, C>, C = any>(
    this: new (...args: any[]) => M,
    id: string
  ): Promise<M | null> {
    const { adapter, globalSpec } = (this as any).persistence;

    const context = await adapter.getContext();
    const row = await adapter.getFromDb(context, id);
    if (!row) return null;
    const model = new this(row, true) as M;
    if (globalSpec?.postLoad) {
      return globalSpec.postLoad(context, model);
    }
    return model;
  }

  /**
   * Create a model from a database row.
   * 
   * @param row - The row to create the model from.
   * @returns The created model.
   */
  protected static fromRow<M extends Model<any, C>, C = any>(
    this: new (...args: any[]) => M,
    row: any & { id: string }
  ): M {
    const { fieldSpecs } = (this.constructor as typeof Model).persistence;
    const data = {} as any;
    for (const key in row) {
      const fieldSpec = fieldSpecs?.[key];
      if (fieldSpec?.persist !== false) {
        const value = row[key];
        data[key] = fieldSpec?.encoder ? fieldSpec.encoder.decode(value) : value;
      }
    }

    return new this(data, true);
  }

  /**
   * Save the model to the database.
   * 
   * @returns A promise that resolves to the model instance.
   */
  public async save(): Promise<Model<T, C>> {
    const { adapter, fieldSpecs, globalSpec } = (this.constructor as any).persistence as PersistenceInfo<T, C>;
    const fields = this.getChangedFields().filter(field => fieldSpecs?.[field]?.persist !== false);

    if (this.persisted && fields.length === 0) return this;

    const context = await adapter.getContext();
    const { success, inserted, id } = await adapter.saveToDb(context, this, fields);
    if (!success) throw new Error("Failed to save model to database");
    if (inserted) {
      this.id = id;
    }

    this._persisted = true;
    this.clearChangedFields();
    if (globalSpec?.postSave) {
      return globalSpec.postSave(context, this);
    }
    return this;
  }
}
