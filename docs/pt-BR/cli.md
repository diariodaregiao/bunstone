# CLI

O Bunstone inclui uma CLI focada em scaffold, diagnósticos locais de desenvolvimento e builds de produção.

## Comandos

### `bunstone new <project-name>`

Cria um novo projeto a partir do starter embutido e executa `bun install`.

```bash
bunx @grupodiariodaregiao/bunstone new my-app
```

Você também pode usar a forma curta:

```bash
bunx @grupodiariodaregiao/bunstone my-app
```

### `bunstone run [bun-flags] <entrypoint>`

Executa um entrypoint do Bun e melhora as mensagens de erro de import com dicas dos exports do Bunstone.

```bash
bunstone run src/main.ts
bunstone run --watch src/main.ts
```

Use quando você quiser o runtime normal do Bun com diagnósticos melhores para imports inválidos do Bunstone.

### `bunstone build [entry] [options]`

Empacota o entrypoint da app e, quando existirem, também gera bundles das views React para hidratação SSR.

```bash
bunstone build src/main.ts
```

#### Opções de build

- `--views <dir>`: diretório que contém as views React. Padrão: `src/views`
- `--out <dir>`: diretório de saída do build. Padrão: `dist`
- `--compile`: compila para um binário standalone
- `--no-bundle`: pula o bundle da aplicação e gera apenas os bundles das views

Exemplos:

```bash
bunstone build src/main.ts --out build
bunstone build --compile
bunstone build --views src/views --no-bundle
```

Se nenhum entrypoint for informado, a CLI tenta estes arquivos nesta ordem:

- `src/index.ts`
- `index.ts`
- `src/main.ts`
- `main.ts`

### `bunstone exports`

Imprime os exports públicos de runtime e os exports somente de tipo do pacote.

```bash
bunstone exports
```

Útil para:

- conferir o nome correto de um decorator ou módulo
- confirmar se um símbolo precisa ser importado com `import type`
- depurar erros como `Export named 'X' not found`

## Fluxo Recomendado

```bash
bunx @grupodiariodaregiao/bunstone new my-app
cd my-app
bunstone run --watch src/main.ts
```

Para builds de produção:

```bash
bunstone build src/main.ts --out dist
```
