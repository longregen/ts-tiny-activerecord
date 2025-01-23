import { AdapterConfig } from "./adapter";
import { Model } from "./model";

export type ModelAttributes = Record<string, unknown>;

/**
 * A `ValueEncoder` is a set of functions that encode and decode values from the database to the model.
 * `encode` is used to convert a value from the model to the database, and `decode` is used to convert a
 * value from the database to the model.
 * 
 * @param T - The type of the value in memory in the model.
 * @param R - The type of the value at rest in the database.
 */
export interface ValueEncoder<T = any, R = any> {
  encode(value: T): R;
  decode(value: R): T;
}

export interface FieldSpec {
  persist?: boolean;
  encoder?: ValueEncoder;
}

export type FieldSpecs<T> = {
  [K in keyof T]?: FieldSpec;
}

export interface GlobalSpec<T extends ModelAttributes> {
  preSave?: (context: any, model: Model<T>) => Promise<void>;
  postSave?: (context: any, model: Model<T>) => Promise<void>;
  postLoad?: (context: any, model: Model<T>) => Promise<void>;
}

export type ModelType<M> = M extends Model<infer T> ? T : never;

export interface PersistenceInfo<M extends Model<any>> {
  adapter: AdapterConfig<ModelType<M>>;
  fieldSpecs?: FieldSpecs<ModelType<M>>;
  globalSpec?: GlobalSpec<ModelType<M>>;
}


