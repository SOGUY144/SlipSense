const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = match ? match[1] : null;

if (!dbUrl) throw new Error('DATABASE_URL not found');

const pg = require('postgres')(dbUrl);

async function enableRls() {
  try {
    const tables = await pg`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `;
    
    for (const table of tables) {
      console.log('Enabling RLS for', table.tablename);
      await pg.unsafe(`ALTER TABLE "${table.tablename}" ENABLE ROW LEVEL SECURITY;`);
    }
    
    console.log('Done enabling RLS.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

enableRls();
