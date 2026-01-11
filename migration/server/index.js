import express from "express";
import cors from "cors";
import testTypesRouter from './routes/test-types.js';
import insertTestRunRouter from './routes/insert-test-run.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// health check
app.get("/health", (_, res) => res.json({ ok: true }));

// Mount routes
app.use('/api/test-types', testTypesRouter);
app.use('/api/insert-test-run', insertTestRunRouter);

app.listen(3001, () => {
  console.log("API listening on :3001");
});
