export function isClass(fn: any) {
	return (
		typeof fn === "function" &&
		Object.getOwnPropertyDescriptor(fn, "prototype")?.writable === false
	);
}
