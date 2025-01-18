import { Model } from "./model";

export interface SaveResult {
  success: boolean;
  inserted: boolean;
  id?: string;
}

export type AdapterConfig<C, T> = {
  getContext: () => Promise<C>;
  getFromDb: (context: C, id: any) => Promise<(T & { id: string }) | null>;
  saveToDb: (context: C, model: Model<T, C>, fields: (keyof T)[]) => Promise<SaveResult>;
}
