import "reflect-metadata";

/**
 * CONVENÇÃO DE EXPORTS:
 * Toda nova implementação adicionada em lib/ DEVE ser exportada neste arquivo
 * para que consumidores da biblioteca possam utilizá-la.
 *
 * Regras:
 *  - Classes, serviços e módulos: export { NomeDaClasse } from "./lib/..."
 *  - Decorators e utilitários: export * from "./lib/..."
 *  - Interfaces e tipos públicos: export type * from "./lib/..." (ou export type { ... })
 *  - Constantes públicas (ex: symbols de metadata): export { CONSTANTE } from "./lib/..."
 *
 * Nunca deixe uma nova feature da lib sem a respectiva entrada aqui.
 */

export * from "./lib/adapters/cache-adapter";
export * from "./lib/adapters/form-data";
export * from "./lib/adapters/upload-adapter";
export * from "./lib/app-startup";
export { BullMqModule, BullMqModule } from "./lib/bullmq/bullmq-module";
export * from "./lib/bullmq/decorators/process.decorator";
export * from "./lib/bullmq/decorators/processor.decorator";
export { QueueService, QueueService } from "./lib/bullmq/queue.service";
export * from "./lib/components/layout";
export * from "./lib/controller";
export * from "./lib/cqrs/command-bus";
export * from "./lib/cqrs/cqrs-module";
export * from "./lib/cqrs/decorators/command-handler.decorator";
export * from "./lib/cqrs/decorators/event-handler.decorator";
export * from "./lib/cqrs/decorators/query-handler.decorator";
export * from "./lib/cqrs/decorators/saga.decorator";
export * from "./lib/cqrs/event-bus";
export * from "./lib/cqrs/interfaces/command.interface";
export * from "./lib/cqrs/interfaces/event.interface";
export * from "./lib/cqrs/interfaces/query.interface";
export * from "./lib/cqrs/query-bus";
export { SqlModule, SqlService } from "./lib/database/sql-module";
export type {
	SqlConnectionOptions,
	SqlPoolOptions,
	SqlRegisterOptions
} from "./lib/database/sql-module";
export * from "./lib/errors";
export * from "./lib/guard";
export * from "./lib/http-exceptions";
export * from "./lib/http-methods";
export * from "./lib/http-params";
export * from "./lib/injectable";
export type { GuardContract } from "./lib/interfaces/guard-contract";
export * from "./lib/jwt";
export * from "./lib/jwt/jwt-module";
export { JwtService } from "./lib/jwt/jwt.service";
export * from "./lib/module";
export * from "./lib/on-module";
export * from "./lib/openapi";
export { RabbitMQDeadLetterService, RabbitMQDeadLetterService } from "./lib/rabbitmq/dead-letter.service";
export * from "./lib/rabbitmq/decorators/consumer.decorator";
export * from "./lib/rabbitmq/decorators/subscribe.decorator";
export type * from "./lib/rabbitmq/interfaces/rabbitmq-message.interface";
export type * from "./lib/rabbitmq/interfaces/rabbitmq-options.interface";
export { RabbitMQConnection, RabbitMQConnection } from "./lib/rabbitmq/rabbitmq-connection";
export { RabbitMQModule, RabbitMQModule } from "./lib/rabbitmq/rabbitmq-module";
export { RabbitMQService, RabbitMQService } from "./lib/rabbitmq/rabbitmq.service";
export * from "./lib/ratelimit";
export * from "./lib/render";
export * from "./lib/schedule/cron/cron";
export * from "./lib/schedule/timeout/timeout";
export type { OtlpExporterOptions, TelemetryOptions } from "./lib/telemetry/interfaces/telemetry-options.interface";
export { TelemetryModule } from "./lib/telemetry/telemetry-module";
export { TelemetrySdk } from "./lib/telemetry/telemetry.sdk";
export * from "./lib/testing/test";
export * from "./lib/testing/test-app";
export * from "./lib/testing/testing-module";
export type { HttpRequest } from "./lib/types/http-request";
export * from "./lib/types/module-config";
export type { ModuleConfig } from "./lib/types/module-config";
export * from "./lib/types/options";
export type { Options } from "./lib/types/options";
export { ErrorFormatter } from "./lib/utils/error-formatter";
export * from "./lib/utils/logger";

