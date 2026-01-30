import "reflect-metadata";

import type { ModuleConfig } from "../../../types/module-config";
import { mapProvidersWithType } from "../../../utils/map-providers";

export const MapProvidersWithTimeout = {
	execute(providers: ModuleConfig["providers"] = []) {
		return mapProvidersWithType(providers, "timeout");
	},
};
