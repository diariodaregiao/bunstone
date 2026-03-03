export interface OnModuleDestroy {
	onModuleDestroy(): Promise<void> | void;
}
