import { SqliteWorker } from "@cashapp/sqldelight-sqljs-worker";
import sqljs from "sql.js";

// Initialize the worker with the sql.js module
new SqliteWorker(self, sqljs);
