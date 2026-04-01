# Bunstone SqlModule — Problema de Timezone com Bun.SQL

## Resumo

O `SqlModule` do bunstone instancia o `Bun.SQL` sem passar a opção `timezone`, fazendo com que o driver interprete valores `DATETIME` do banco de dados usando o timezone local do processo, em vez de UTC. Isso causa deslocamento de horas nas datas retornadas pelas queries.

## Ambiente afetado

- **Driver**: `Bun.SQL` (nativo, `globalThis.Bun.SQL`)
- **Banco de dados**: MariaDB 11 (comportamento idêntico com MySQL)
- **Tipo do campo**: `DATETIME(3)` (sem timezone intrínseco)
- **Timezone do servidor de aplicação**: UTC-3 (ex: `America/Sao_Paulo`)

## Código problemático

```ts
// lib/database/sql-module.ts (bunstone)
class SqlModule {
  static register(connection: string) {
    SqlModule.sqlInstance = new SQL({
      url:
        typeof connection === "string"
          ? connection
          : `${connection.provider}://...`,
      // ❌ sem { timezone: 'utc' }
    });
    return SqlModule;
  }
}
```

## O que acontece

O MariaDB armazena e devolve campos `DATETIME` como valores literais sem informação de timezone:

```
Valor no banco:          2024-01-01 12:00:00   (UTC, literal)
Driver recebe:           "2024-01-01 12:00:00"  (string sem tz)
Bun interpreta como:     2024-01-01 12:00:00 UTC-3
Serializa para UTC:      2024-01-01T15:00:00Z  ← +3h errado
```

## Comportamento esperado

```
Valor no banco:          2024-01-01 12:00:00   (UTC, literal)
Driver recebe:           "2024-01-01 12:00:00"  (string sem tz)
Bun interpreta como:     2024-01-01 12:00:00 UTC  (timezone: 'utc')
Serializa para UTC:      2024-01-01T12:00:00Z  ← correto
```

## Correção esperada no bunstone

O `Bun.SQL` aceita a opção `timezone` na inicialização:

```ts
// lib/database/sql-module.ts (bunstone) — após correção
class SqlModule {
  static register(connection: string | SqlConnectionOptions) {
    SqlModule.sqlInstance = new SQL({
      url:
        typeof connection === "string"
          ? connection
          : `${connection.provider}://...`,
      timezone: "utc", // ✅ garante que DATETIME seja interpretado como UTC
    });
    return SqlModule;
  }
}
```

### Alternativa: expor a opção no `register`

Caso se queira manter flexibilidade, expor `timezone` como opção:

```ts
interface SqlConnectionOptions {
  provider: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  timezone?: string; // ← nova opção
}

// Ou aceitar timezone diretamente na string de conexão
SqlModule.register("mysql://user:pass@host/db?timezone=UTC");
```

## Workaround atual (sem alterar o bunstone)

Adicionar `TZ=UTC` como variável de ambiente no container da aplicação:

```yaml
# compose.yml
services:
  core-api:
    environment:
      TZ: UTC
```

Isso força o processo Bun a operar inteiramente em UTC, fazendo com que o `Bun.SQL` interprete os `DATETIME` recebidos como UTC.

## Referências

- [Bun SQL docs — `timezone` option](https://bun.sh/docs/api/sql#timezone)
- MariaDB `DATETIME` vs `TIMESTAMP`: [https://mariadb.com/kb/en/datetime/](https://mariadb.com/kb/en/datetime/)
