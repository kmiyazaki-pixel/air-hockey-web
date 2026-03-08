import Fastify from "fastify";

const app = Fastify();

app.get("/health", async () => {
  return { ok: true };
});

app.listen({ port: 4000 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log("API running at " + address);
});
