# Email Service

O `EmailService` permite o envio de e-mails profissionais utilizando **React** para o corpo da mensagem e **Tailwind CSS** para estilização. Ele resolve automaticamente o problema de suporte a CSS em clientes de e-mail ao realizar o _inlining_ dos estilos durante o processo de renderização.

## Recursos

- **Templates React**: Use o poder do React para construir templates reutilizáveis.
- **Tailwind CSS**: Estilize seus e-mails com classes utilitárias que são convertidas para estilos inline compatíveis.
- **Transmparência**: Baseado no `nodemailer` para envio via SMTP.
- **Injeção de Dependência**: Acesse o serviço em qualquer Controller ou Service via DI.

## Configuração

Para habilitar o envio de e-mails, registre o `EmailModule` antes da inicialização do app:

```ts
import { AppStartup, EmailModule } from "@diariodaregiao/bunstone";

// Importe no seu módulo raiz
@Module({
  imports: [
    EmailModule.register({
      host: "smtp.exemplo.com",
      port: 587,
      secure: false, // true para porta 465
      auth: {
        user: "seu-usuario",
        pass: "sua-senha",
      },
      from: '"Bunstone App" <noreply@exemplo.com>',
    }),
  ],
})
class AppModule {}

const app = AppStartup.create(AppModule);
```

## Criando um Template

Utilize o componente `EmailLayout` para fornecer a estrutura base necessária e o suporte ao Tailwind.

```tsx
// templates/WelcomeEmail.tsx
import React from "react";
import { EmailLayout } from "@diariodaregiao/bunstone";
import { Heading, Text, Section, Button } from "@react-email/components";

export const WelcomeEmail = ({ name }: { name: string }) => (
  <EmailLayout preview="Bem-vindo ao nosso sistema!">
    <Heading className="text-2xl font-bold text-gray-800 mb-4">
      Olá, {name}!
    </Heading>
    <Text className="text-gray-600 mb-6">
      Estamos felizes em ter você conosco.
    </Text>
    <Section className="text-center">
      <Button
        href="https://seusite.com"
        className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold"
      >
        Acessar Painel
      </Button>
    </Section>
  </EmailLayout>
);
```

## Enviando E-mails

Injete o `EmailService` no seu Controller ou Service para realizar o envio:

```ts
import { Controller, Post, EmailService } from "@diariodaregiao/bunstone";
import { WelcomeEmail } from "./templates/WelcomeEmail";

@Controller("users")
export class UserController {
  constructor(private readonly emailService: EmailService) {}

  @Post("register")
  async register() {
    // ... lógica de registro

    await this.emailService.send({
      to: "usuario@email.com",
      subject: "Bem-vindo!",
      component: <WelcomeEmail name="Filipi" />
    });

    return { success: true };
  }
}
```

## API do EmailService

### `send(options: SendEmailOptions)`

Envia um e-mail utilizando as opções especificadas:

| Propriedade   | Tipo                 | Descrição                                     |
| :------------ | :------------------- | :-------------------------------------------- |
| `to`          | `string \| string[]` | Destinatário(s).                              |
| `subject`     | `string`             | Assunto do e-mail.                            |
| `component`   | `React.ReactElement` | Componente React que será o corpo do e-mail.  |
| `cc`          | `string \| string[]` | Copiados (opcional).                          |
| `bcc`         | `string \| string[]` | Copiados ocultos (opcional).                  |
| `attachments` | `any[]`              | Anexos compatíveis com Nodemailer (opcional). |

## Observações Importantes

1. **Estilos Inline**: O serviço utiliza o `@react-email/tailwind` para converter as classes em estilos `style=""` nos elementos HTML.
2. **Imagens**: Para imagens, utilize URLs absolutas hospedadas em um CDN, pois imagens locais não são exibidas na maioria dos clientes.
3. **Compatibilidade**: Evite layouts complexos com Flexbox ou Grid avançado, prefira estruturas simples ou tabelas (o `EmailLayout` já ajuda nessa abstração).
