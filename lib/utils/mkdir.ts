import { $ } from "bun";

export function mkdir(path: string) {
	try {
		$`mkdir ${path}`;
	} catch (error) {
		if ((error as any).code !== "EEXIST") {
			throw error;
		}
	}
}
