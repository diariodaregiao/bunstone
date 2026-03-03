export abstract class OnModuleInit {
	abstract onModuleInit(): Promise<void> | void;
}
