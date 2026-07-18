import "reflect-metadata";

/**
 * CONVENÇÃO DE EXPORTS:
 * Toda nova implementação adicionada em lib/ DEVE ser exportada neste arquivo
 * para que consumidores da biblioteca possam utilizá-la.
 *
 * Regras:
 *  - Classes, serviços e módulos: export { NomeDaClasse } from "./src/..."
 *  - Decorators e utilitários: export * from "./src/..."
 *  - Interfaces e tipos públicos: export type * from "./src/..." (ou export type { ... })
 *  - Constantes públicas (ex: symbols de metadata): export { CONSTANTE } from "./src/..."
 *
 * Nunca deixe uma nova feature da lib sem a respectiva entrada aqui.
 */

export * from "./src/adapters/cache-adapter";
export * from "./src/adapters/form-data";
export * from "./src/adapters/upload-adapter";
export * from "./src/app-startup";
export { BullMqModule } from "./src/bullmq/bullmq-module";
export * from "./src/bullmq/decorators/process.decorator";
export * from "./src/bullmq/decorators/processor.decorator";
export { QueueService } from "./src/bullmq/queue.service";
export * from "./src/components/layout";
export * from "./src/controller";
export * from "./src/cqrs/command-bus";
export * from "./src/cqrs/cqrs-module";
export * from "./src/cqrs/decorators/command-handler.decorator";
export * from "./src/cqrs/decorators/event-handler.decorator";
export * from "./src/cqrs/decorators/query-handler.decorator";
export * from "./src/cqrs/decorators/saga.decorator";
export * from "./src/cqrs/event-bus";
export * from "./src/cqrs/interfaces/command.interface";
export * from "./src/cqrs/interfaces/event.interface";
export * from "./src/cqrs/interfaces/query.interface";
export * from "./src/cqrs/query-bus";
export { SqlModule, SqlService } from "./src/database/sql-module";
export type {
	BunSqlClientOptions,
	ConnectionOptions,
	SqlConnectionDetails,
	SqlConnectionOptions,
	SqlModuleOptions,
	SqlPoolOptions,
	SqlRegisterOptions,
} from "./src/database/sql-module";
export { EmailLayout } from "./src/email/email-layout";
export { EmailModule, EmailService } from "./src/email/email-module";
export * from "./src/errors";
export * from "./src/guard";
export * from "./src/http-exceptions";
export * from "./src/http-methods";
export * from "./src/http-params";
export * from "./src/injectable";
export type { GuardContract } from "./src/interfaces/guard-contract";
export * from "./src/jwt";
export * from "./src/jwt/jwt-module";
export { JwtService } from "./src/jwt/jwt.service";
export * from "./src/module";
export * from "./src/on-module";
export * from "./src/openapi";
export { RabbitMQDeadLetterService } from "./src/rabbitmq/dead-letter.service";
export * from "./src/rabbitmq/decorators/consumer.decorator";
export * from "./src/rabbitmq/decorators/subscribe.decorator";
export type * from "./src/rabbitmq/interfaces/rabbitmq-message.interface";
export type * from "./src/rabbitmq/interfaces/rabbitmq-options.interface";
export { RabbitMQConnection } from "./src/rabbitmq/rabbitmq-connection";
export { RabbitMQModule } from "./src/rabbitmq/rabbitmq-module";
export { RabbitMQService } from "./src/rabbitmq/rabbitmq.service";
export * from "./src/ratelimit";
export * from "./src/render";
export * from "./src/schedule/cron/cron";
export * from "./src/schedule/timeout/timeout";
export type { OtlpExporterOptions, TelemetryOptions } from "./src/telemetry/interfaces/telemetry-options.interface";
export { TelemetryModule } from "./src/telemetry/telemetry-module";
export { TelemetrySdk } from "./src/telemetry/telemetry.sdk";
export * from "./src/testing/test";
export * from "./src/testing/test-app";
export * from "./src/testing/testing-module";
export type { HttpRequest } from "./src/types/http-request";
export * from "./src/types/module-config";
export type { ModuleConfig } from "./src/types/module-config";
export * from "./src/types/options";
export type { Options } from "./src/types/options";
export { ErrorFormatter } from "./src/utils/error-formatter";
export * from "./src/utils/logger";

