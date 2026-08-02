import { loadEnvConfig } from '@next/env';
loadEnvConfig('./');
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!);
sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB`.then(()=>console.log('done')).catch(console.error).finally(()=>process.exit(0));
