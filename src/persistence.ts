import { AdapterConfig } from "./adapter";
import { Model } from "./model";
import { FieldSpecs, GlobalSpec, PersistenceInfo } from "./types";

/**
 * Decorator to add persistence information to a model.
 * 
 * @param dbName - The name of the database to use.
 * @param tableName - The name of the table to use.
 * @param fieldSpecs - The `FieldSpecs` to use.
 * @param globalSpec - The `GlobalSpec` to use.
 * @returns A decorator function.
 */
export function Persistence<T = any, C = any, M extends Model<T, C> = Model<T, C>>(
  adapter: AdapterConfig<C, T>,
  fieldSpecs?: FieldSpecs<T>,
  globalSpec?: GlobalSpec<T, C, M>
) {
  return function (target: any) {
    target.persistence = { adapter, fieldSpecs, globalSpec } as PersistenceInfo<T, C, M>;
  }
}
