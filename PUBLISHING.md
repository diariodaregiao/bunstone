# Publicando o Bunstone no npm

Guia passo a passo para publicar `@grupodiariodaregiao/bunstone` no npm.

## Pré-requisitos (uma vez só)

1. Ter uma conta no npm com acesso à org **`@grupodiariodaregiao`**.
2. Bun instalado (o build usa `Bun.build`).
3. Estar logado no npm:

   ```bash
   npm login
   npm whoami   # confirma o usuário logado
   ```

> O pacote é **scoped e público** (`publishConfig.access: "public"` já está no
> `package.json`), então o `npm publish` já sai público sem precisar de flag.

## Publicar uma versão

1. Garanta que está na `main` atualizada e limpa:

   ```bash
   git checkout main
   git pull origin main
   git status        # deve estar limpo
   ```

2. Confira que está tudo verde:

   ```bash
   bun run check     # typecheck + biome + testes
   ```

3. Defina a versão (segue [semver](https://semver.org)). Isso cria o commit e a
   tag do git automaticamente:

   ```bash
   npm version patch   # 1.0.0 -> 1.0.1  (correções)
   npm version minor   # 1.0.0 -> 1.1.0  (features compatíveis)
   npm version major   # 1.0.0 -> 2.0.0  (breaking)
   ```

4. (Opcional) Veja o que vai no pacote **sem publicar**:

   ```bash
   npm publish --dry-run
   # ou gere o tarball e inspecione:
   npm pack && tar tzf grupodiariodaregiao-bunstone-*.tgz | sed 's#^package/##'
   ```

5. Publique:

   ```bash
   npm publish
   ```

   O script **`prepack`** roda sozinho e faz:
   - `npm run build` → gera `dist/index.js` + os tipos (`.d.ts` com os paths `@/*` resolvidos)
   - `npm run agents:build` → regenera `AGENTS.md`, `CLAUDE.md` e `llms.txt`

6. Suba o commit e a tag da versão:

   ```bash
   git push origin main --follow-tags
   ```

## Verificar

```bash
npm view @grupodiariodaregiao/bunstone version
npm view @grupodiariodaregiao/bunstone dist-tags
```

Teste rápido num projeto limpo:

```bash
mkdir /tmp/teste && cd /tmp/teste && bun init -y
bun add @grupodiariodaregiao/bunstone reflect-metadata
bunx @grupodiariodaregiao/bunstone exports        # lista os exports públicos
```

## O que é publicado

Definido em `files` no `package.json`:

- `dist/` — bundle JS + tipos (`.d.ts`)
- `src/` + `tsconfig.json` — fonte + paths (para o CLI e para agentes lerem)
- `bin/` — o CLI `bunstone`
- `docs/*.md`, `AGENTS.md`, `CLAUDE.md`, `llms.txt`, `README.md`, `MIGRATION.md`

## Dicas

- **Sempre publique da `main`** (depois do merge do PR), para a tag do git bater
  com a versão publicada.
- Para um pre-release: `npm version prerelease --preid rc` e
  `npm publish --tag next` (não mexe no `latest`).
- Para despublicar um erro recente (até 72h): `npm unpublish <pkg>@<versão>`.
