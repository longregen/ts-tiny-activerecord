import { Model } from "./model";

export interface SaveResult {
  success: boolean;
  inserted: boolean;
  id?: string;
}

/**
 * The adapter configuration interface.
 * 
 * @param C - The context type.
 * @param T - The model attributes type.
 */
export type AdapterConfig<C, T> = {
  getContext: () => Promise<C>;
  getFromDb: (context: C, id: any) => Promise<(T & { id: string }) | null>;
  saveToDb: (context: C, model: Model<T, C>, data: Partial<T>) => Promise<SaveResult>;
}
