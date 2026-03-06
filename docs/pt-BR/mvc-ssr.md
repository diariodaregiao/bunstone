# MVC e SSR (SSR sem configuração)

O Bunstone fornece uma forma nativa, sem configuração, de criar aplicações **React** com interatividade completa (`useState`, `useEffect`, etc.) usando um padrão MVC tradicional.

## Primeiros passos

### 1. Configure o diretório de views

Em `AppStartup.create`, especifique o diretório onde seus componentes React estão armazenados.

```tsx
const app = await AppStartup.create(AppModule, {
  viewsDir: "src/views", // O Bunstone irá varrer e gerar bundles de tudo aqui
});
```

### 2. Crie seu componente

Crie um arquivo `.tsx` ou `.jsx` no seu diretório de views. Todos os exports devem ter exatamente o mesmo nome do arquivo, ou usar `default export`.

```tsx
// src/views/Counter.tsx
import React, { useState } from "react";

export const Counter = ({ initialCount = 0 }) => {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="p-4 border rounded shadow">
      <p>Contagem: {count}</p>
      <button onClick={() => setCount(count + 1)}>Incrementar</button>
    </div>
  );
};
```

### 3. Renderize a partir do controller

Use o decorator `@Render(Component)`. O Bunstone cuidará automaticamente do Server-Side Rendering (SSR) e da hidratação no cliente.

```tsx
import { Controller, Get, Render } from "@grupodiariodaregiao/bunstone";
import { Counter } from "../views/Counter";

@Controller("/")
export class AppController {
  @Get("/")
  @Render(Counter)
  index() {
    // Essas props são enviadas automaticamente para o componente
    // tanto no Servidor quanto no Cliente (Hidratação)
    return { initialCount: 10 };
  }
}
```

## Como funciona (A mágica)

O Bunstone automatiza todo o pipeline de SSR para que você possa focar apenas nos seus componentes:

1.  **Geração automática de bundles**: Na inicialização, ele percorre o seu `viewsDir` e usa `Bun.build` para gerar scripts leves de hidratação para cada componente.
2.  **Renderização no servidor**: Quando uma rota é chamada, ele renderiza o componente para string no servidor para carregamento instantâneo da página.
3.  **Sincronização de estado**: Todos os dados retornados pelo seu controller são injetados no HTML e capturados automaticamente pelo React no cliente.
4.  **Interatividade instantânea**: O navegador baixa o pequeno bundle e o React "hidrata" o HTML estático, habilitando hooks como `useState`.

## Personalização

Você pode retornar props especiais do seu controller para personalizar a página:

- `title`: Define o `<title>` da página.
- `description`: Define a meta description.
- `bundle`: (Opcional) Se você quiser sobrescrever o bundle automático para uma rota específica.

```tsx
@Get("/")
@Render(MyPage)
home() {
  return {
    title: "Minha Página Incrível",
    myData: "..."
  };
}
```

## Estilização

Por padrão, o layout inclui **Tailwind CSS** via CDN para prototipação rápida. Para estilos personalizados, você pode adicioná-los à pasta `public/` e eles serão servidos automaticamente.
