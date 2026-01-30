import type { ModuleConfig } from "../../../types/module-config";
import { mapProvidersWithType } from "../../../utils/map-providers";

export const MapProvidersWithCron = {
	execute(providers: ModuleConfig["providers"] = []) {
		return mapProvidersWithType(providers, "cron");
	},
};
