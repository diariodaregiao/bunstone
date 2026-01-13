# Email Service

The `EmailService` allows sending professional emails using **React** for the message body and **Tailwind CSS** for styling. It automatically resolves CSS support issues in email clients by performing _inlining_ of styles during the rendering process.

## Features

- **React Templates**: Use the power of React to build reusable templates.
- **Tailwind CSS**: Style your emails with utility classes that are converted to compatible inline styles.
- **Transparency**: Built on `nodemailer` for SMTP sending.
- **Dependency Injection**: Access the service in any Controller or Service via DI.

## Configuration

To enable email sending, register the `EmailModule` before initializing the app:

```ts
import { AppStartup, EmailModule } from "@grupodiariodaregiao/bunstone";

// Import in your root module
@Module({
  imports: [
    EmailModule.register({
      host: "smtp.example.com",
      port: 587,
      secure: false, // true for port 465
      auth: {
        user: "your-user",
        pass: "your-password",
      },
      from: '"Bunstone App" <noreply@example.com>',
    }),
  ],
})
class AppModule {}

const app = AppStartup.create(AppModule);
```

## Creating a Template

Use the `EmailLayout` component to provide the necessary base structure and Tailwind support.

```tsx
// templates/WelcomeEmail.tsx
import React from "react";
import { EmailLayout } from "@grupodiariodaregiao/bunstone";
import { Heading, Text, Section, Button } from "@react-email/components";

export const WelcomeEmail = ({ name }: { name: string }) => (
  <EmailLayout preview="Welcome to our system!">
    <Heading className="text-2xl font-bold text-gray-800 mb-4">
      Hello, {name}!
    </Heading>
    <Text className="text-gray-600 mb-6">
      We are happy to have you with us.
    </Text>
    <Section className="text-center">
      <Button
        href="https://yoursite.com"
        className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold"
      >
        Access Dashboard
      </Button>
    </Section>
  </EmailLayout>
);
```

## Sending Emails

Inject the `EmailService` in your Controller or Service to perform the sending:

```ts
import { Controller, Post, EmailService } from "@grupodiariodaregiao/bunstone";
import { WelcomeEmail } from "./templates/WelcomeEmail";

@Controller("users")
export class UserController {
  constructor(private readonly emailService: EmailService) {}

  @Post("register")
  async register() {
    // ... registration logic

    await this.emailService.send({
      to: "user@email.com",
      subject: "Welcome!",
      component: <WelcomeEmail name="Filipi" />
    });

    return { success: true };
  }
}
```

## EmailService API

### `send(options: SendEmailOptions)`

Sends an email using the specified options:

| Property      | Type                 | Description                                        |
| :------------ | :------------------- | :------------------------------------------------- |
| `to`          | `string \| string[]` | Recipient(s).                                      |
| `subject`     | `string`             | Email subject.                                     |
| `component`   | `React.ReactElement` | React component that will be the email body.       |
| `cc`          | `string \| string[]` | Carbon copy (optional).                            |
| `bcc`         | `string \| string[]` | Blind carbon copy (optional).                      |
| `attachments` | `any[]`              | Attachments compatible with Nodemailer (optional). |

## Important Notes

1. **Inline Styles**: The service uses `@react-email/tailwind` to convert classes into `style=""` attributes on HTML elements.
2. **Images**: For images, use absolute URLs hosted on a CDN, as local images are not displayed in most clients.
3. **Compatibility**: Avoid complex layouts with advanced Flexbox or Grid, prefer simple structures or tables (the `EmailLayout` already helps with this abstraction).

## Practical Example

Explore the complete configuration and email sending in a working example:

<<< @/../examples/11-email-adapter/index.ts
