import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { formatEvent, type SseMessage, sseResponse } from "@/http/sse";

describe("formatEvent", () => {
	it("collapses newlines in event and id so frames cannot be forged", () => {
		const frame = formatEvent({
			event: "ping\ndata: injected",
			id: "1\nevent: nope",
			data: "real",
		});

		expect(frame).toBe(
			"event: ping data: injected\nid: 1 event: nope\ndata: real\n\n",
		);
	});

	it("survives a message whose data is undefined", () => {
		expect(() => formatEvent({ data: undefined })).not.toThrow();
		expect(formatEvent({ data: undefined })).toBe("data: \n\n");
	});
});

describe("sseResponse", () => {
	it("does not run ahead of a consumer that stops reading", async () => {
		let produced = 0;

		async function* source(): AsyncGenerator<SseMessage> {
			while (produced < 10_000) {
				produced++;
				yield { data: produced };
			}
		}

		const response = sseResponse(source());
		const reader = response.body?.getReader();
		await reader?.read();
		await Bun.sleep(50);
		const producedWhileIdle = produced;
		await reader?.cancel();

		// pull-driven: an idle consumer must not let the generator drain itself
		expect(producedWhileIdle).toBeLessThan(20);
	});

	it("finalizes the generator when the consumer cancels", async () => {
		let finalized = false;

		async function* source(): AsyncGenerator<SseMessage> {
			try {
				let n = 0;
				while (true) {
					yield { data: n++ };
				}
			} finally {
				finalized = true;
			}
		}

		const response = sseResponse(source());
		const reader = response.body?.getReader();
		await reader?.read();
		await reader?.cancel();
		await Bun.sleep(20);

		expect(finalized).toBe(true);
	});

	it("clears the heartbeat as soon as the request is aborted", async () => {
		const controller = new AbortController();
		let ticks = 0;

		async function* source(): AsyncGenerator<SseMessage> {
			yield { data: "first" };
			await Bun.sleep(5000); // never resolves within the test
			ticks++;
		}

		const response = sseResponse(source(), {
			signal: controller.signal,
			heartbeatMs: 10,
		});
		const reader = response.body?.getReader();
		await reader?.read();

		controller.abort();
		await Bun.sleep(100);
		await reader?.cancel().catch(() => undefined);

		// the heartbeat must not keep firing after the client is gone
		expect(ticks).toBe(0);
	});
});
