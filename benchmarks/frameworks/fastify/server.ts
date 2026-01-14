import Fastify from "fastify";

const fastify = Fastify();

fastify.get("/", async (request, reply) => {
	return { message: "Hello World" };
});

const start = async () => {
	try {
		await fastify.listen({ port: 3000 });
		console.log("Fastify server listening on port 3000");
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
