/** Interface representing a class constructor.
 * @property new (...args: any[]): any - A constructor that can take any number of arguments and returns any type.
 */
export interface ClassConstructor {
	new (...args: any[]): any;
}
