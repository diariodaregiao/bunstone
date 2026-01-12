import React from "react";
import { EmailLayout } from "../../index";
import { Text, Link, Button, Section, Heading } from "@react-email/components";

export interface WelcomeEmailProps {
  name: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ name }) => {
  return (
    <EmailLayout preview="Bem-vindo ao Bunstone!">
      <Heading className="text-2xl font-bold text-gray-800 mb-4">
        Olá, {name}!
      </Heading>
      <Text className="text-gray-600 mb-4">
        Estamos felizes em ter você aqui. O Bunstone é um framework rápido e
        moderno feito com Bun, React e Elysia.
      </Text>
      <Section className="text-center mt-8">
        <Button
          href="https://github.com/diariodaregiao/bunstone"
          className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold"
        >
          Ver Documentação
        </Button>
      </Section>
      <Text className="text-sm text-gray-400 mt-8">
        Se você tiver qualquer dúvida, responda este e-mail.
      </Text>
    </EmailLayout>
  );
};
