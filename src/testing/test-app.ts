import type Elysia from "elysia";

/**
 * A wrapper around the Elysia instance for E2E testing.
 * Allows making requests directly to the app without network overhead.
 */
export class TestApp {
	constructor(private readonly app: Elysia) {}

	/**
	 * Gets the underlying Elysia instance.
	 */
	getElysia() {
		return this.app;
	}

	/**
	 * Makes a GET request to the application.
	 */
	async get(path: string, options: Partial<RequestInit> = {}) {
		const request = new Request(`http://localhost${path}`, {
			method: "GET",
			...options,
		});
		return await this.app.handle(request);
	}

	/**
	 * Makes a POST request to the application.
	 */
	async post(path: string, body?: any, options: Partial<RequestInit> = {}) {
		const request = new Request(`http://localhost${path}`, {
			method: "POST",
			body: body ? JSON.stringify(body) : undefined,
			headers: {
				"Content-Type": "application/json",
				...(options.headers || {}),
			},
			...options,
		});
		return await this.app.handle(request);
	}

	/**
	 * Makes a PUT request to the application.
	 */
	async put(path: string, body?: any, options: Partial<RequestInit> = {}) {
		const request = new Request(`http://localhost${path}`, {
			method: "PUT",
			body: body ? JSON.stringify(body) : undefined,
			headers: {
				"Content-Type": "application/json",
				...(options.headers || {}),
			},
			...options,
		});
		return await this.app.handle(request);
	}

	/**
	 * Makes a PATCH request to the application.
	 */
	async patch(path: string, body?: any, options: Partial<RequestInit> = {}) {
		const request = new Request(`http://localhost${path}`, {
			method: "PATCH",
			body: body ? JSON.stringify(body) : undefined,
			headers: {
				"Content-Type": "application/json",
				...(options.headers || {}),
			},
			...options,
		});
		return await this.app.handle(request);
	}

	/**
	 * Makes a DELETE request to the application.
	 */
	async delete(path: string, options: Partial<RequestInit> = {}) {
		const request = new Request(`http://localhost${path}`, {
			method: "DELETE",
			...options,
		});
		return await this.app.handle(request);
	}
}
