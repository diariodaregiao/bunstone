import express from "express";

const app = express();

app.get("/", (req, res) => {
	res.json({ message: "Hello World" });
});

app.listen(3000, () => {
	console.log("Express server listening on port 3000");
});
