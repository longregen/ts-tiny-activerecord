import { AdapterConfig } from "./adapter";
import { Model } from "./model";
import { FieldSpecs, GlobalSpec, ModelAttributes, PersistenceInfo } from "./types";

/**
 * Decorator to add persistence information to a model.
 * 
 * @param adapter - The adapter to use.
 * @param fieldSpecs - The `FieldSpecs` to use.
 * @param globalSpec - The `GlobalSpec` to use.
 * @returns A decorator function.
 */
export function Persistence<T extends ModelAttributes>(
  adapter: AdapterConfig<T>,
  fieldSpecs?: FieldSpecs<T>,
  globalSpec?: GlobalSpec<T>
) {
  return function (target: any) {
    target.persistence = { adapter, fieldSpecs, globalSpec } as PersistenceInfo<Model<T>>;
  }
}
