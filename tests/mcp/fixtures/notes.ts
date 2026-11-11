import "reflect-metadata";
import { z } from "zod/v4";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { BadRequestException, NotFoundException } from "@/http/exceptions";
import { UseGuards } from "@/http/guard";
import { Prompt, Resource, ResourceTemplate, Tool } from "@/mcp/decorators";
import type { McpContext, McpGuard } from "@/mcp/types";

export interface Note {
	id: string;
	text: string;
}

@Injectable()
export class NotesService {
	private readonly notes: Note[] = [{ id: "1", text: "Buy milk" }];

	add(text: string): Note {
		const note = { id: String(this.notes.length + 1), text };
		this.notes.push(note);
		return note;
	}

	find(id: string): Note | undefined {
		return this.notes.find((note) => note.id === id);
	}

	all(): Note[] {
		return [...this.notes];
	}
}

/** Refuses calls whose input asks for it, to exercise MCP guards. */
@Injectable()
export class NotForbiddenGuard implements McpGuard {
	static seen: McpContext[] = [];

	canActivate(ctx: McpContext): boolean {
		NotForbiddenGuard.seen.push(ctx);
		return ctx.name !== "forbidden";
	}
}

const NoteSchema = z.object({ id: z.string(), text: z.string() });

@Injectable()
@UseGuards(NotForbiddenGuard)
export class NotesTools {
	constructor(private readonly notes: NotesService) {}

	@Tool({
		description: "Save a note and return it",
		inputSchema: z.object({ text: z.string().min(1) }),
		outputSchema: NoteSchema,
	})
	add({ text }: { text: string }) {
		return this.notes.add(text);
	}

	@Tool({ description: "Greets", inputSchema: z.object({ who: z.string() }) })
	greet({ who }: { who: string }) {
		return `hello ${who}`;
	}

	@Tool({ description: "Reports how it was called" })
	whoami(_input: unknown, ctx: McpContext) {
		return {
			kind: ctx.kind,
			name: ctx.name,
			transport: ctx.transport,
			era: ctx.era,
			client: ctx.authInfo?.clientId ?? null,
			tenant: (ctx.http?.state.tenant as string | undefined) ?? null,
		};
	}

	@Tool({ description: "Always refused by the guard" })
	forbidden() {
		return "never";
	}

	@Tool({ description: "Rejects its input" })
	rejects() {
		throw new BadRequestException("That is not a valid note.");
	}

	@Tool({ description: "Crashes" })
	crashes() {
		throw new Error("database password is hunter2");
	}

	@Resource({ uri: "notes://all", mimeType: "application/json" })
	allNotes() {
		return this.notes.all();
	}

	@Resource({ uri: "notes://logo", mimeType: "image/png" })
	logo() {
		return new Uint8Array([137, 80, 78, 71]);
	}

	@ResourceTemplate({ uriTemplate: "notes://{id}", mimeType: "text/plain" })
	note({ id }: { id: string }) {
		const note = this.notes.find(id);
		if (!note) throw new NotFoundException(`There is no note ${id}`);
		return note.text;
	}

	@Prompt({
		description: "Summarize the notes",
		argsSchema: z.object({ style: z.enum(["bullets", "paragraph"]) }),
	})
	summarize({ style }: { style: string }) {
		return `Summarize as ${style}:\n${this.notes
			.all()
			.map((note) => `- ${note.text}`)
			.join("\n")}`;
	}
}

@Module({
	providers: [NotesService, NotesTools, NotForbiddenGuard],
	exports: [NotesService],
})
export class NotesModule {}
