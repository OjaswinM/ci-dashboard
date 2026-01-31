import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// health check
app.get("/health", (_, res) => res.json({ ok: true }));

app.listen(3001, () => {
  console.log("API listening on :3001");
});

