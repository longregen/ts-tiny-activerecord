import { Model } from "./model";
import { WithId } from "./types";

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
export type AdapterConfig<C, T> = {
  getContext: () => Promise<C>;
  all: (context: C, matchOrQuery?: Partial<T> | string, bindValues?: any[]) => Promise<WithId<T>[]>;
  get: (context: C, id: any) => Promise<WithId<T> | null>;
  getBy: (context: C, matchOrQuery: Partial<T> | string, bindValues?: any[]) => Promise<WithId<T> | null>;
  insert: (context: C, data: Partial<T>) => Promise<SaveResult>;
  update: (context: C, model: Model<T>, data: Partial<T>) => Promise<SaveResult>;
  del: (context: C, model: Model<T>) => Promise<boolean>;
}
