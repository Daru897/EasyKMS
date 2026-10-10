import postgres from "postgres";
export type Params = (string | number | boolean | null)[];
export interface Database {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: Params,
  ): Promise<T[]>;
  transaction<T>(work: (tx: Database) => Promise<T>): Promise<T>;
}
let connection: ReturnType<typeof postgres> | undefined;
export function database(): Database {
  if (!process.env.DATABASE_URL)
    throw new Error("Team database is not configured.");
  connection ??= postgres(process.env.DATABASE_URL, {
    max: 5,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  });
  const wrap = (
    sql: ReturnType<typeof postgres> | postgres.TransactionSql,
  ): Database => ({
    async query<T>(query: string, params: Params = []) {
      return (await sql.unsafe(query, params)) as unknown as T[];
    },
    async transaction<T>(work: (tx: Database) => Promise<T>) {
      if ("begin" in sql) return (await sql.begin((tx) => work(wrap(tx)))) as T;
      return work(wrap(sql));
    },
  });
  return wrap(connection);
}
