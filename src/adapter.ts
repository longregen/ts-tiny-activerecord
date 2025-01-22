import { Model } from "./model";
import { ModelAttributes } from "./types";

export interface SaveResult {
  success: boolean;
  inserted: boolean;
  primaryKey?: any;
  rows: number;
}

/**
 * The adapter configuration interface.
 * 
 * @param C - The context type.
 * @param T - The model attributes type.
 */
export type AdapterConfig<T extends ModelAttributes> = {
  getPrimaryKeyField: () => string;
  getContext: () => Promise<any>;
  all: (context: any, matchOrQuery?: Partial<T> | string, bindValues?: any[]) => Promise<T[]>;
  get: (context: any, primaryKey: any) => Promise<T | null>;
  getBy: (context: any, matchOrQuery: Partial<T> | string, bindValues?: any[]) => Promise<T | null>;
  insert: (context: any, model: Model<T>, data: Partial<T>) => Promise<SaveResult>;
  update: (context: any, model: Model<T>, data: Partial<T>) => Promise<SaveResult>;
  del: (context: any, model: Model<T>) => Promise<boolean>;
}
