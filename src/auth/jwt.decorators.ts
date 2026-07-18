import { UseGuards } from "@/http/guard";
import { State } from "@/http/params";
import { JwtGuard } from "./jwt.guard";

export function Jwt(): ClassDecorator & MethodDecorator {
	return UseGuards(JwtGuard);
}

export function JwtPayload(): ParameterDecorator {
	return State("jwt");
}
