import "reflect-metadata";

export const RENDER_METADATA = "dip:render:component";

/**
 * Decorator to specify a React component to render the controller's response.
 * @param component The React component to use as a View.
 */
export function Render(component: any): any {
	return (
		target: any,
		propertyKey: string | symbol,
		descriptor: PropertyDescriptor,
	) => {
		Reflect.defineMetadata(RENDER_METADATA, component, target, propertyKey);
		return descriptor;
	};
}
