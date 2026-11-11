/** Limits checked on the server before anything is written. */
export interface UploadLimits {
	/** Largest accepted file, in bytes. */
	maxSize?: number;
	/**
	 * Accepted media types: exact (`"image/png"`) or a wildcard (`"image/*"`).
	 * Checked against the type the client declared for the part.
	 */
	accept?: string | readonly string[];
}

export interface FieldError {
	field: string;
	message: string;
}

/**
 * A blank `<input type="file">` is sent as an empty part with no filename;
 * it is a file the user did not choose, not an empty upload.
 */
export function isChosenFile(file: Blob): boolean {
	const name = (file as Partial<File>).name;
	return Boolean(name) || file.size > 0;
}

export function mediaType(file: Blob): string {
	const type = (file.type || "application/octet-stream").split(";")[0] ?? "";
	return type.trim().toLowerCase() || "application/octet-stream";
}

export function accepts(type: string, accept: string | readonly string[]) {
	const patterns = (typeof accept === "string" ? [accept] : accept).map((p) =>
		p.trim().toLowerCase(),
	);
	return patterns.some((pattern) => {
		if (pattern === "*/*" || pattern === "*") return true;
		if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
		return type === pattern;
	});
}

export function checkLimits(
	file: Blob,
	field: string,
	limits: UploadLimits,
): FieldError[] {
	const errors: FieldError[] = [];
	if (limits.maxSize !== undefined && file.size > limits.maxSize) {
		errors.push({
			field,
			message: `File is too large: ${file.size} bytes, the limit is ${limits.maxSize}.`,
		});
	}
	if (limits.accept !== undefined) {
		const type = mediaType(file);
		if (!accepts(type, limits.accept)) {
			const list =
				typeof limits.accept === "string" ? [limits.accept] : limits.accept;
			errors.push({
				field,
				message: `File type "${type}" is not accepted; expected ${list.join(", ")}.`,
			});
		}
	}
	return errors;
}

/**
 * The extension of the client's filename, kept only when it is short and
 * alphanumeric: it is useful in a key, but the name itself is never trusted.
 */
export function safeExtension(name: string | undefined): string {
	if (!name) return "";
	const dot = name.lastIndexOf(".");
	if (dot <= 0 || dot === name.length - 1) return "";
	const ext = name.slice(dot + 1);
	return /^[a-z0-9]{1,16}$/i.test(ext) ? `.${ext.toLowerCase()}` : "";
}

/** `prefix` + a time-ordered UUID + the file's extension, e.g. `avatars/0192….png`. */
export function generateKey(prefix: string, name: string | undefined): string {
	return `${prefix}${Bun.randomUUIDv7()}${safeExtension(name)}`;
}

/**
 * A `Content-Disposition` that keeps the original filename (RFC 6266/5987):
 * an ASCII fallback plus the exact UTF-8 name.
 */
export function contentDisposition(
	name: string | undefined,
	type: "inline" | "attachment" = "inline",
): string {
	if (!name) return type;
	const clean = name.replace(/[\r\n\\/]/g, "_");
	const ascii = clean.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
	const encoded = encodeURIComponent(clean).replace(
		/['()*]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
	);
	return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
