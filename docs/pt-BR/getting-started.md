# Primeiros Passos

Bunstone é um framework baseado em decorators para Bun, inspirado no NestJS. Ele fornece uma forma estruturada de construir APIs escaláveis e fáceis de manter.

## Instalação

Você pode criar um novo projeto usando nossa CLI:

```bash
bunx @grupodiariodaregiao/bunstone new my-app
# or shorthand
bunx @grupodiariodaregiao/bunstone my-app
```

### Alternativamente: Use o Template Inicial

Você também pode começar clonando o repositório e usando o diretório `starter`:

```bash
git clone https://github.com/diariodaregiao/bunstone.git
cp -r bunstone/starter my-app
rm -rf bunstone
cd my-app
rm -rf .git
bun install
```

## Configuração Básica

Os projetos Bunstone seguem uma estrutura modular. Aqui está uma configuração básica:

### `src/main.ts`

```typescript
import "reflect-metadata";
import { AppStartup } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await AppStartup.create(AppModule);
  app.listen(3000);
}

bootstrap();
```

### `src/app.module.ts`

```typescript
import { Module } from "@grupodiariodaregiao/bunstone";
import { AppController } from "./controllers/app.controller";

@Module({
  controllers: [AppController],
})
export class AppModule {}
```

## Executando a Aplicação

```bash
bun dev
```

Sua aplicação estará rodando em `http://localhost:3000`.

## Exemplo Completo

Confira um exemplo completo e independente de uma aplicação básica:

<<< @/../examples/01-basic-app/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/01-basic-app/index.ts)
