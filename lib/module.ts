import "reflect-metadata";
import { ModuleInitializationError } from "./errors";
import type { GuardContract } from "./interfaces/guard-contract";
import { MapProvidersWithCron } from "./schedule/cron/mappers/map-providers-with-cron";
import { MapProvidersWithTimeout } from "./schedule/timeout/mappers/map-providers-with-timeouts";
import type { ModuleConfig } from "./types/module-config";
import { resolveType } from "./utils/dependency-injection";
import { ErrorFormatter } from "./utils/error-formatter";

/**
 * Decorator that marks a class as a module.
 * Modules are used to organize the application structure and manage dependency injection scopes.
 *
 * @param moduleConfig Configuration object defining controllers, providers, imports, and exports.
 *
 * @example
 * ```typescript
 * @Module({
 *   controllers: [AppController],
 *   providers: [AppService],
 * })
 * export class AppModule {}
 * ```
 */
export function Module(moduleConfig: ModuleConfig = {}): any {
	try {
		moduleConfig.controllers = moduleConfig.controllers || [];
		moduleConfig.providers = moduleConfig.providers || [];
		moduleConfig.imports = moduleConfig.imports || [];
		moduleConfig.exports = moduleConfig.exports || [];

		const modules = moduleConfig.imports;
		const controllers = mapControllers(moduleConfig.controllers);
		const providersTimeouts = MapProvidersWithTimeout.execute(
			moduleConfig.providers,
		);
		const providersCrons = MapProvidersWithCron.execute(moduleConfig.providers);
		const injectableProviders = mapInjectableProviders(moduleConfig);

		return (target: any, _context?: any) => {
			Reflect.defineMetadata("dip:module", "is_module", target);
			Reflect.defineMetadata(
				"dip:module:global",
				!!moduleConfig.global,
				target,
			);
			Reflect.defineMetadata("dip:module:routes", controllers, target);
			Reflect.defineMetadata("dip:timeouts", providersTimeouts, target);
			Reflect.defineMetadata("dip:modules", modules, target);
			Reflect.defineMetadata("dip:crons", providersCrons, target);
			Reflect.defineMetadata("dip:injectables", injectableProviders, target);
		};
	} catch (error: any) {
		ErrorFormatter.format(error);
		process.exit(1);
	}
}

/**
 * Maps controllers to their routes and guards.
 * @param controllers Array of controller classes.
 * @returns A map of controllers to their methods.
 */
function mapControllers(controllers: ModuleConfig["controllers"] = []) {
	const controllersMap = new Map<
		any,
		{
			httpMethod: string;
			pathname: string;
			methodName: string;
			guard?: GuardContract;
		}[]
	>();

	for (const controller of controllers) {
		controllersMap.set(controller, []);

		for (const controllerSymbol of Object.getOwnPropertySymbols(controller)) {
			const controllerPathname = Reflect.getOwnMetadata(
				"dip:controller:pathname",
				controller,
			);

			const controllerGuard = Reflect.getMetadata("dip:guard", controller);

			const controllerMethods: {
				httpMethod: string;
				pathname: string;
				methodName: string;
			}[] = (controller as any)[controllerSymbol];

			controllerMethods.forEach((cm) => {
				const pathname = `${
					controllerPathname === "/" ? "" : controllerPathname
				}${cm.pathname}`;

				const methodGuard = Reflect.getMetadata(
					"dip:guard",
					controller.prototype,
					cm.methodName,
				);

				controllersMap.get(controller)?.push({
					httpMethod: cm.httpMethod,
					pathname,
					methodName: cm.methodName,
					guard: methodGuard || controllerGuard,
				});
			});
		}
	}

	return controllersMap;
}

/**
 * Maps injectable providers and their dependencies, including those from imported modules.
 * @param moduleConfig The module configuration.
 * @returns A map of provider classes to instances.
 */
function mapInjectableProviders(moduleConfig: ModuleConfig) {
	const deps: Map<any, any> = new Map();

	try {
		// Merge injectables from imported modules
		(moduleConfig.imports || []).forEach((mod) => {
			const importedInjectables = Reflect.getMetadata("dip:injectables", mod);
			if (importedInjectables instanceof Map) {
				for (const [key, value] of importedInjectables.entries()) {
					deps.set(key, value);
				}
			}
		});

		// Resolve current module's providers
		(moduleConfig.providers || []).forEach((provider) => {
			resolveType(provider, deps);
		});
	} catch (error: any) {
		if (error instanceof ModuleInitializationError) {
			throw error;
		}
		throw new ModuleInitializationError(
			`Failed to initialize providers for module configuration.`,
			"Ensure all providers are correctly decorated with @Injectable() and there are no circular dependencies.",
			{ originalError: error.message },
		);
	}

	return deps;
}
