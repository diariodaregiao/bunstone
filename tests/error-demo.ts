import { AppStartup, Injectable, Module } from "../index";

@Injectable()
class BrokenService {
	// Deliberately using a property that will result in 'undefined' or 'Object' metadata
	constructor(private unknownDep: any) {}
}

// To trigger 'undefined' metadata naturally in a single file is hard without circular deps,
// so we will manually trigger the error by calling resolveType with undefined in a provider factory or similar,
// but let's try a circular dependency simulation.

@Module({
	providers: [BrokenService],
})
class BrokenModule {}

async function run() {
	console.log("Starting Bunstone App with a deliberate DI error...");

	// We can also just throw the error to see the formatter in action
	// but let's try to make it happen via the actual DI logic.

	// Direct trigger for demonstration:
	try {
		const { resolveType } = await import("../lib/utils/dependency-injection");
		resolveType(undefined, new Map());
	} catch (e) {
		const { ErrorFormatter } = await import("../lib/utils/error-formatter");
		ErrorFormatter.format(e);
		process.exit(1);
	}
}

run();
