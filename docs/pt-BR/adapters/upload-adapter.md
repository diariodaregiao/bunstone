# Adaptador de upload (MinIO/S3)

O `UploadAdapter` é uma pequena abstração sobre o cliente S3 nativo do Bun, focada em:

- Fazer upload de um arquivo para um bucket
- Verificar se um objeto existe
- Remover um objeto

## Importação

```ts
import { UploadAdapter } from "@grupodiariodaregiao/bunstone";
```

## Configuração (MinIO)

```ts
const upload = new UploadAdapter({
  endpoint: "http://localhost:9000",
  accessKey: "minioadmin",
  secretKey: "minioadmin",
  bucket: "my-bucket",
});
```

## Upload

`upload()` retorna o caminho completo no bucket, sempre começando com `/`.

```ts
const path = await upload.upload({
  path: "images/2025/12/31/image.avif",
  body: file, // File | Blob | Response | Buffer | ...
  contentType: "image/avif",
});

// path === "/images/2025/12/31/image.avif"
```

## Exists / Remove

```ts
const exists = await upload.exists("/images/2025/12/31/image.avif");
await upload.remove("/images/2025/12/31/image.avif");
```
