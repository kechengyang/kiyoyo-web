import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: config.db.max,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const query = <T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values?: unknown[]) =>
  pool.query<T>(text, values);
