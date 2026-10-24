import { config } from "dotenv";

config({ path: ".env.local" });
if (!process.env.OPENAI_API_KEY) throw new Error("tests/live cần OPENAI_API_KEY trong .env.local");
process.env.DATABASE_URL = "file:./test.db";
