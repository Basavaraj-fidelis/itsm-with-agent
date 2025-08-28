
import { createCABTables } from './server/migrations/create-cab-tables.ts';

async function runMigration() {
  try {
    console.log('Running CAB tables migration...');
    await createCABTables();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
