import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import { Injectable } from "../injectable";
import { Module } from "../module";
import type { EmailConfig } from "../types/options";
import React from "react";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  component: React.ReactElement;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: any[];
}

@Injectable()
export class EmailService {
  /**
   * Sends an email using a React component as the body.
   * The component will be rendered to HTML and styles will be inlined.
   */
  async send(options: SendEmailOptions): Promise<void> {
    const transporter = EmailModule.getTransporter();
    const config = EmailModule.getConfig();

    if (!transporter) {
      throw new Error(
        "EmailService is not configured. Call EmailModule.register() first."
      );
    }

    const html = await render(options.component);

    await transporter.sendMail({
      from: config?.from,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      html,
      attachments: options.attachments,
    });
  }
}

@Module({
  providers: [EmailService],
  global: true,
})
export class EmailModule {
  private static transporter: nodemailer.Transporter;
  private static config: EmailConfig;

  static register(config: EmailConfig): typeof EmailModule {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    return this;
  }

  static getTransporter() {
    return this.transporter;
  }

  static getConfig() {
    return this.config;
  }
}
