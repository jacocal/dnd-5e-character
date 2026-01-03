import { drizzle } from "drizzle-orm/postgres-js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const postgres = require("postgres");
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    // Warn but don't throw immediately to allow build to pass if just type checking, 
    // but runtime will fail if used.
    console.warn("⚠️ DATABASE_URL is not set");
}

const client = postgres(connectionString || "postgres://postgres:postgres@localhost:5432/postgres");
export const db = drizzle(client, { schema });
