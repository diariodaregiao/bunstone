import { EmailLayout } from "@grupodiariodaregiao/bunstone";
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
        className="box-border rounded-[8px] bg-indigo-600 w-[120px] h-[40px] mt-[12px] text-center font-semibold text-white"
      >
        Acessar Painel
      </Button>
    </Section>
  </EmailLayout>
);
