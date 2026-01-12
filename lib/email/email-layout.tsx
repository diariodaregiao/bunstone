import React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Tailwind,
} from "@react-email/components";

export interface EmailLayoutProps {
  preview?: string;
  children: React.ReactNode;
  tailwindConfig?: any;
}

/**
 * A layout component for emails that provides base structure and Tailwind CSS support.
 */
export const EmailLayout: React.FC<EmailLayoutProps> = ({
  preview,
  children,
  tailwindConfig,
}) => {
  return (
    <Html>
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Tailwind config={tailwindConfig}>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px]">
            <Section className="mt-[32px]">{children}</Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
