/**
 * Configuration for a module.
 */
export type ModuleConfig = {
  providers?: (new (...args: any[]) => any)[];
  imports?: (new (...args: any[]) => any)[];
  controllers?: (new (...args: any[]) => any)[];
  exports?: (new (...args: any[]) => any)[];
};
