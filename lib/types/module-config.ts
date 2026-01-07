/**
 * Configuration options for a module.
 * @property providers - An array of provider classes.
 * @property imports - An array of imported module classes.
 * @property controllers - An array of controller classes.
 * @property exports - An array of exported provider classes.
 */
export type ModuleConfig = {
  providers?: (new (...args: any[]) => any)[];
  imports?: (new (...args: any[]) => any)[];
  controllers?: (new (...args: any[]) => any)[];
  exports?: (new (...args: any[]) => any)[];
  global?: boolean;
};
