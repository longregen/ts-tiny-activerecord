import { AdapterConfig } from "./adapter";
import { Model } from "./model";

export type WithId<T> = T & { id: any };

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

export interface GlobalSpec<T, C, M = Model<T, C>> {
  preSave?: (context: C, model: M) => Promise<M>;
  postSave?: (context: C, model: M) => Promise<M>;
  postLoad?: (context: C, model: M) => Promise<M>;
}

export interface PersistenceInfo<T, C, M extends Model<T, C> = Model<T, C>> {
  adapter: AdapterConfig<C, T>;
  fieldSpecs?: FieldSpecs<T>;
  globalSpec?: GlobalSpec<T, C, M>;
}

