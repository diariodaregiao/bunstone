import "reflect-metadata";

import type { ModuleConfig } from "../../../types/module-config";
import { mapProvidersWithType } from "../../../utils/map-providers";

export class MapProvidersWithTimeout {
  static execute(providers: ModuleConfig["providers"] = []) {
    return mapProvidersWithType(providers, "timeout");
  }
}
