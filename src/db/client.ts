
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

import * as schema from './schema';

const connectionString = (process.env.DATABASE_URL || "").replace("channel_binding=require", "");
const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
