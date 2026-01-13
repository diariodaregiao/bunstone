import { expect, test, describe, spyOn } from "bun:test";
import { EmailModule, EmailService } from "../index";
import nodemailer from "nodemailer";

const WelcomeEmail = ({ name }: { name: string }) => (
  <div>
    <h1>Welcome, {name}!</h1>
    <p>Thanks for joining us.</p>
  </div>
);

describe("EmailModule", () => {
  test("should render component and send email via nodemailer", async () => {
    // Mock nodemailer
    const sendMailMock = {
      sendMail: async (options: any) => {
        return { messageId: "123" };
      },
    };
    const spy = spyOn(sendMailMock, "sendMail");

    // @ts-ignore - Mocking createTransport
    spyOn(nodemailer, "createTransport").mockReturnValue(sendMailMock as any);

    EmailModule.register({
      host: "smtp.example.com",
      port: 587,
      from: "noreply@example.com",
      auth: { user: "test", pass: "test" },
    });

    const emailService = new EmailService();
    await emailService.send({
      to: "user@example.com",
      subject: "Welcome",
      component: <WelcomeEmail name="John" />,
    });

    expect(spy).toHaveBeenCalled();
    const calledWith = spy.mock.calls[0][0];
    expect(calledWith.to).toBe("user@example.com");
    expect(calledWith.subject).toBe("Welcome");
    expect(calledWith.html).toContain("Welcome");
    expect(calledWith.html).toContain("John");
    expect(calledWith.from).toBe("noreply@example.com");
  });
});
