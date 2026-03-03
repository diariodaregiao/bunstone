export abstract class OnModuleDestroy {
	abstract onModuleDestroy(): Promise<void> | void;
}
