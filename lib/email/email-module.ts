import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import type React from "react";
import { Injectable } from "../injectable";
import { Module } from "../module";
import type { EmailConfig } from "../types/options";

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
				"EmailService is not configured. Call EmailModule.register() first.",
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
		EmailModule.config = config;
		EmailModule.transporter = nodemailer.createTransport({
			host: config.host,
			port: config.port,
			secure: config.secure,
			auth: config.auth,
		});

		return EmailModule;
	}

	static getTransporter() {
		return EmailModule.transporter;
	}

	static getConfig() {
		return EmailModule.config;
	}
}
