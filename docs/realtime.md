# Realtime

Bunstone ships two realtime primitives: Server-Sent Events (SSE) for one-way server streaming, and WebSocket gateways for full-duplex messaging. Both integrate with the normal dependency injection container.

## Server-Sent Events

Add `@Sse()` to a controller `@Get()` method whose handler is an **async generator**. Each value you `yield` is an `SseMessage`; Bunstone streams them to the client as `text/event-stream` and automatically cleans up when the client disconnects.

```ts
import { Controller, Get, Sse, type SseMessage } from "@grupodiariodaregiao/bunstone";

@Controller("events")
export class EventsController {
  @Get()
  @Sse()
  async *stream(): AsyncGenerator<SseMessage> {
    yield { event: "tick", id: "1", data: { n: 1 } };
    yield { event: "tick", id: "2", data: { n: 2 } };
    yield { data: "done" };
  }
}
```

### SseMessage

```ts
interface SseMessage {
  data: unknown;      // string is sent as-is, anything else is JSON-stringified
  event?: string;     // event name
  id?: string;        // event id
  retry?: number;     // client reconnection delay in ms
}
```

### Heartbeats

Pass `heartbeatMs` to keep idle connections alive. Bunstone sends a comment ping (`: ping`) on that interval.

```ts
@Get("live")
@Sse({ heartbeatMs: 15_000 })
async *live(): AsyncGenerator<SseMessage> {
  let n = 0;
  while (true) {
    yield { data: { n: n++ } };
    await new Promise((r) => setTimeout(r, 1000));
  }
}
```

When the client disconnects, the request's `AbortSignal` fires, the generator loop stops, and the stream closes. No manual cleanup is required.

## WebSocket Gateways

A gateway is an `@Injectable()` class decorated with `@WebSocketGateway(path)` that implements `WebSocketHandler`. Gateways use normal constructor injection, so you can pull in any provider.

```ts
import {
  Injectable,
  WebSocketGateway,
  type Socket,
  type WebSocketHandler,
} from "@grupodiariodaregiao/bunstone";

@Injectable()
class ClockService {
  stamp() {
    return "tick";
  }
}

@WebSocketGateway("/ws")
@Injectable()
export class EchoGateway implements WebSocketHandler {
  constructor(private readonly clock: ClockService) {}

  open(socket: Socket) {
    socket.send(JSON.stringify({ hello: true }));
  }

  message(socket: Socket, data: unknown) {
    socket.send(JSON.stringify({ echo: data, at: this.clock.stamp() }));
  }
}
```

### WebSocketHandler

```ts
interface WebSocketHandler {
  open?(socket: Socket): void | Promise<void>;
  message(socket: Socket, data: unknown): void | Promise<void>;
  close?(socket: Socket, code: number, reason: string): void | Promise<void>;
}
```

Only `message` is required. Incoming text is parsed as JSON when possible; otherwise `data` is the raw string. Send data back with `socket.send(...)`.

### Registration

Register the gateway class (and its dependencies) in a module's `providers`. Bunstone discovers gateways during startup and wires the upgrade route for its path.

```ts
import { Module } from "@grupodiariodaregiao/bunstone";

@Module({ providers: [ClockService, EchoGateway] })
export class AppModule {}
```

Clients then connect to `ws://<host>/ws`.
