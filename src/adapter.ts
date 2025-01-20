import { Model } from "./model";
import { ModelAttributes, WithId } from "./types";

export interface SaveResult {
  success: boolean;
  inserted: boolean;
  id?: any;
  rows: number;
}

/**
 * The adapter configuration interface.
 * 
 * @param C - The context type.
 * @param T - The model attributes type.
 */
export type AdapterConfig<T extends ModelAttributes> = {
  getContext: () => Promise<any>;
  all: (context: any, matchOrQuery?: Partial<T> | string, bindValues?: any[]) => Promise<WithId<T>[]>;
  get: (context: any, id: any) => Promise<WithId<T> | null>;
  getBy: (context: any, matchOrQuery: Partial<T> | string, bindValues?: any[]) => Promise<WithId<T> | null>;
  insert: (context: any, data: Partial<T>) => Promise<SaveResult>;
  update: (context: any, model: Model<T>, data: Partial<T>) => Promise<SaveResult>;
  del: (context: any, model: Model<T>) => Promise<boolean>;
}
