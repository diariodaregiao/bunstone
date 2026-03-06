# Serviço de e-mail

O `EmailService` permite enviar e-mails profissionais usando **React** para o corpo da mensagem e **Tailwind CSS** para a estilização. Ele resolve automaticamente problemas de suporte a CSS em clientes de e-mail realizando _inlining_ de estilos durante o processo de renderização.

## Recursos

- **Templates em React**: Use o poder do React para criar templates reutilizáveis.
- **Tailwind CSS**: Estilize seus e-mails com classes utilitárias que são convertidas em estilos inline compatíveis.
- **Transparência**: Construído sobre `nodemailer` para envio via SMTP.
- **Injeção de dependência**: Acesse o serviço em qualquer Controller ou Service via DI.

## Configuração

Para habilitar o envio de e-mails, registre o `EmailModule` antes de inicializar a aplicação:

```ts
import { AppStartup, EmailModule } from "@grupodiariodaregiao/bunstone";

// Importe no seu módulo raiz
@Module({
  imports: [
    EmailModule.register({
      host: "smtp.example.com",
      port: 587,
      secure: false, // true para a porta 465
      auth: {
        user: "your-user",
        pass: "your-password",
      },
      from: '"Bunstone App" <noreply@example.com>',
    }),
  ],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
```

## Criando um template

Use o componente `EmailLayout` para fornecer a estrutura base necessária e o suporte a Tailwind.

```tsx
// templates/WelcomeEmail.tsx
import React from "react";
import { EmailLayout } from "@grupodiariodaregiao/bunstone";
import { Heading, Text, Section, Button } from "@react-email/components";

export const WelcomeEmail = ({ name }: { name: string }) => (
  <EmailLayout preview="Boas-vindas ao nosso sistema!">
    <Heading className="text-2xl font-bold text-gray-800 mb-4">
      Olá, {name}!
    </Heading>
    <Text className="text-gray-600 mb-6">
      Estamos felizes em ter você conosco.
    </Text>
    <Section className="text-center">
      <Button
        href="https://yoursite.com"
        className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold"
      >
        Acessar painel
      </Button>
    </Section>
  </EmailLayout>
);
```

## Enviando e-mails

Injete o `EmailService` no seu Controller ou Service para realizar o envio:

```ts
import { Controller, Post, EmailService } from "@grupodiariodaregiao/bunstone";
import { WelcomeEmail } from "./templates/WelcomeEmail";

@Controller("users")
export class UserController {
  constructor(private readonly emailService: EmailService) {}

  @Post("register")
  async register() {
    // ... lógica de cadastro

    await this.emailService.send({
      to: "user@email.com",
      subject: "Bem-vindo!",
      component: <WelcomeEmail name="Filipi" />
    });

    return { success: true };
  }
}
```

## API do EmailService

### `send(options: SendEmailOptions)`

Envia um e-mail usando as opções especificadas:

| Property      | Type                 | Description                                        |
| :------------ | :------------------- | :------------------------------------------------- |
| `to`          | `string \| string[]` | Destinatário(s).                                   |
| `subject`     | `string`             | Assunto do e-mail.                                 |
| `component`   | `React.ReactElement` | Componente React que será o corpo do e-mail.       |
| `cc`          | `string \| string[]` | Cópia carbono (opcional).                          |
| `bcc`         | `string \| string[]` | Cópia carbono oculta (opcional).                   |
| `attachments` | `any[]`              | Anexos compatíveis com Nodemailer (opcional).      |

## Observações importantes

1. **Estilos inline**: O serviço usa `@react-email/tailwind` para converter classes em atributos `style=""` nos elementos HTML.
2. **Imagens**: Para imagens, use URLs absolutas hospedadas em uma CDN, pois imagens locais não são exibidas na maioria dos clientes.
3. **Compatibilidade**: Evite layouts complexos com Flexbox ou Grid avançados; prefira estruturas simples ou tabelas (o `EmailLayout` já ajuda com essa abstração).

## Exemplo prático

Explore a configuração completa e o envio de e-mails em um exemplo funcional:

<<< @/../examples/11-email-adapter/index.ts
