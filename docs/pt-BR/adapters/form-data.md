# Adaptador FormData

Use o decorator de parâmetro `@FormData()` para extrair payloads multipart em um objeto tipado. Ele funciona em parâmetros de handlers dentro de controllers.

## Importação

```ts
import { FormData, type FormDataPayload } from "@bunstone";
```

## Uso

```ts
class UploadController {
  @Post("/upload")
  upload(
    @FormData({
      fileField: "files", // opcional: campo específico de onde ler arquivos
      allowedTypes: ["image/avif"], // opcional: mimes ou extensões permitidas
      jsonField: "meta", // opcional: faz o parse deste campo como JSON
    })
    payload: FormDataPayload
  ) {
    // payload.files: File[]
    // payload.json: JSON parseado de jsonField, se fornecido
  }
}
```

## Opções

- `fileField` (string): Lê arquivos apenas deste campo. O padrão é ler todos os valores de arquivo do formulário.
- `allowedTypes` (string[]): Tipos MIME ou extensões permitidos. Rejeita os demais com bad request.
- `jsonField` (string): Nome do campo a ser parseado como JSON. Rejeita valor não string ou JSON inválido.

## Formato do payload

```ts
type FormDataPayload = {
  files: File[];
  json?: unknown;
};
```

## Exemplo prático

Explore o tratamento de form-data com múltiplos campos:

<<< @/../examples/07-adapters/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/07-adapters/index.ts)
