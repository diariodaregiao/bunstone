export type GenerateKind = "controller" | "service" | "module";

export interface GeneratedFile {
	path: string;
	content: string;
}

export function toPascalCase(name: string): string {
	return name
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
}

export function toKebabCase(name: string): string {
	return name
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/[\s_]+/g, "-")
		.toLowerCase();
}

export function generate(kind: GenerateKind, name: string): GeneratedFile {
	const pascal = toPascalCase(name);
	const kebab = toKebabCase(name);

	switch (kind) {
		case "controller":
			return {
				path: `${kebab}.controller.ts`,
				content: controllerTemplate(pascal, kebab),
			};
		case "service":
			return {
				path: `${kebab}.service.ts`,
				content: serviceTemplate(pascal),
			};
		case "module":
			return {
				path: `${kebab}.module.ts`,
				content: moduleTemplate(pascal),
			};
	}
}

function controllerTemplate(pascal: string, kebab: string): string {
	return `import { Controller, Get } from "@grupodiariodaregiao/bunstone";

@Controller("${kebab}")
export class ${pascal}Controller {
	@Get()
	findAll() {
		return [];
	}
}
`;
}

function serviceTemplate(pascal: string): string {
	return `import { Injectable } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class ${pascal}Service {}
`;
}

function moduleTemplate(pascal: string): string {
	return `import { Module } from "@grupodiariodaregiao/bunstone";

@Module({})
export class ${pascal}Module {}
`;
}
