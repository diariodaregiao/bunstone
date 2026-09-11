import { z } from "zod/v4";

export const UserIdParam = z.object({ id: z.string().min(1) });

export const CreateUser = z.object({
	nome: z.string().min(1),
	sobrenome: z.string().min(1),
	idade: z.number().int().min(0),
});

export const UpdateUser = CreateUser.partial();

export type User = z.infer<typeof CreateUser> & { id: string };
