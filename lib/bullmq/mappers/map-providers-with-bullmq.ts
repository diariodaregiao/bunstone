import type { ModuleConfig } from "../../types/module-config";
import { mapProvidersWithType } from "../../utils/map-providers";

export const MapProvidersWithBullMq = {
	execute(providers: ModuleConfig["providers"] = []) {
		return mapProvidersWithType(providers, "bullmq");
	},
};
